const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../config/db');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_123';

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 */
const registerUser = async (req, res) => {
    const { username, fullname, email, password, phone, location } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const pool = await poolPromise;

        // ── Check email and phone for duplicates separately ──────────────────
        const dupCheck = await pool.request()
            .input('email', sql.VarChar, email)
            .input('phone', sql.VarChar, phone || null)
            .query(`
                SELECT
                    CASE WHEN EXISTS(SELECT 1 FROM Users WHERE email = @email) THEN 1 ELSE 0 END AS email_exists,
                    CASE WHEN @phone IS NOT NULL AND EXISTS(SELECT 1 FROM Users WHERE phone = @phone) THEN 1 ELSE 0 END AS phone_exists
            `);

        const dup = dupCheck.recordset[0];

        // Return field-specific errors
        if (dup.email_exists && dup.phone_exists) {
            return res.status(409).json({
                success: false,
                field: 'both',
                error: 'This email and phone number are already registered.',
            });
        }
        if (dup.email_exists) {
            return res.status(409).json({
                success: false,
                field: 'email',
                error: 'This email is already registered. Please use another email.',
            });
        }
        if (dup.phone_exists) {
            return res.status(409).json({
                success: false,
                field: 'phone',
                error: 'This phone number is already registered. Please use another number.',
            });
        }

        // ── Insert new user ──────────────────────────────────────────────────
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Auto-generate a unique username if not provided
        const baseUsername = (username || email.split('@')[0]).replace(/[^a-z0-9_]/gi, '_');

        await pool.request()
            .input('username', sql.VarChar, baseUsername)
            .input('fullname', sql.VarChar, fullname || null)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .input('phone', sql.VarChar, phone || null)
            .input('location', sql.VarChar, location || null)
            .query(`
                INSERT INTO Users (username, fullname, email, password, phone, location, created_at)
                VALUES (@username, @fullname, @email, @password, @phone, @location, GETDATE());
            `);

        res.status(201).json({ success: true, message: 'Account created successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/users/login
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        const user = result.recordset[0];

        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { id: user.user_id, email: user.email, username: user.username },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.json({
                success: true,
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    fullname: user.fullname,
                    email: user.email,
                    phone: user.phone,
                    location: user.location
                },
                token
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 */
const getUserProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT user_id, username, fullname, email, phone, location, created_at FROM Users WHERE user_id = @id');
        const user = result.recordset[0];
        if (user) {
            res.json({ success: true, data: user });
        } else {
            res.status(404).json({ success: false, error: 'User not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/users/me
 */
const getMe = async (req, res) => {
    const id = req.user.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT user_id, username, fullname, email, phone, location, created_at FROM Users WHERE user_id = @id');
        const user = result.recordset[0];
        if (user) {
            res.json({ success: true, data: user });
        } else {
            res.status(404).json({ success: false, error: 'User not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


/**
 * @desc    Update currently logged-in user profile
 * @route   PUT /api/users/me
 */
const updateMe = async (req, res) => {
    const id = req.user.id;
    const { username, fullname, phone, location } = req.body;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .input('username', sql.VarChar, username || null)
            .input('fullname', sql.VarChar, fullname || null)
            .input('phone', sql.VarChar, phone || null)
            .input('location', sql.VarChar, location || null)
            .query(`
                UPDATE Users
                SET
                    username = COALESCE(@username, username),
                    fullname = COALESCE(@fullname, fullname),
                    phone    = COALESCE(@phone,    phone),
                    location = COALESCE(@location, location)
                WHERE user_id = @id
            `);

        // Return the updated record
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT user_id, username, fullname, email, phone, location, created_at FROM Users WHERE user_id = @id');

        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ success: false, error: 'Username or phone already in use.' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    getMe,
    updateMe,
};

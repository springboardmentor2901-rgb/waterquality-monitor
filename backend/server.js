/**
 * server.js
 * ----------
 * A minimal Express backend that stores user sign-up / sign-in
 * data in a local JSON file (data/users.json).
 *
 * Endpoints:
 *   POST /api/signup   – register a new user
 *   POST /api/login    – authenticate an existing user
 *   GET  /api/users    – list all users (for debugging; remove in production)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const app = express();
const PORT = 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── JSON file path ────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure the data directory and file exist on startup
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const readUsers = () => {
    try {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(raw).users || [];
    } catch {
        return [];
    }
};

const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
};

// ── POST /api/signup ──────────────────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = readUsers();

    // Check duplicate
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash the password before saving — plain text is never stored
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
        email,
        password: hashedPassword,  // ✅ bcrypt hash stored, not plain text
        createdAt: new Date().toISOString(),
        profile: null,
    };
    users.push(newUser);
    writeUsers(users);

    return res.status(201).json({ message: 'Account created successfully.', email });
});

// ── POST /api/login ───────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = readUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'No account found with this email.' });
    }

    // Compare entered password against the stored bcrypt hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    return res.status(200).json({
        message: 'Login successful.',
        email: user.email,
        profile: user.profile || null,
    });
});

// ── POST /api/profile ─────────────────────────────────────────────────────────
app.post('/api/profile', (req, res) => {
    const { email, profile } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    const users = readUsers();
    const idx = users.findIndex(u => u.email === email);

    if (idx === -1) {
        return res.status(404).json({ error: 'User not found.' });
    }

    // Check username uniqueness (case-insensitive, exclude current user)
    if (profile?.username) {
        const usernameTaken = users.some(
            (u, i) => i !== idx &&
                u.profile?.username?.toLowerCase() === profile.username.toLowerCase()
        );
        if (usernameTaken) {
            return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
        }
    }

    users[idx].profile = { ...profile, completedAt: new Date().toISOString() };
    writeUsers(users);

    return res.status(200).json({ message: 'Profile saved.', profile: users[idx].profile });
});

// ── GET /api/check-username ───────────────────────────────────────────────────
// Real-time username availability check used while typing
app.get('/api/check-username', (req, res) => {
    const { username, email } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'Username is required.' });
    }

    const users = readUsers();
    const taken = users.some(
        u => u.email !== email &&
            u.profile?.username?.toLowerCase() === username.toLowerCase()
    );

    return res.json({ available: !taken });
});



// ── GET /api/users (debug only) ───────────────────────────────────────────────
app.get('/api/users', (req, res) => {
    const users = readUsers();
    // Mask passwords before returning
    const safe = users.map(({ password, ...rest }) => rest);
    return res.json({ users: safe });
});


// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅  Auth server running at http://localhost:${PORT}`);
    console.log(`📄  User data stored in: ${USERS_FILE}`);
});

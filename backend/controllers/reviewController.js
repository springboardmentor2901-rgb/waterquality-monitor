const { poolPromise, sql } = require('../config/db');

/**
 * @desc    Get all reviews
 * @route   GET /api/reviews
 */
const getReviews = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT r.*, u.username, u.fullname 
            FROM Reviews r
            JOIN Users u ON r.user_id = u.user_id
            ORDER BY r.created_at DESC
        `);
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Get single review
 * @route   GET /api/reviews/:id
 */
const getReviewById = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Reviews WHERE review_id = @id');

        const review = result.recordset[0];
        if (review) {
            res.json({ success: true, data: review });
        } else {
            res.status(404).json({ success: false, error: 'Review not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 */
const createReview = async (req, res) => {
    const { station_id, rating, review_message, photos } = req.body;
    const user_id = req.user.id;

    if (!station_id || !rating) {
        return res.status(400).json({ success: false, error: 'Station ID and rating are required.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('station_id', sql.Int, station_id)
            .input('rating', sql.Int, rating)
            .input('message', sql.VarChar, review_message || null)
            .input('photos', sql.VarChar, photos || null)
            .input('user_id', sql.Int, user_id)
            .query(`
                INSERT INTO Reviews (station_id, rating, review_message, photos, user_id, created_at)
                VALUES (@station_id, @rating, @message, @photos, @user_id, GETDATE())
            `);

        res.status(201).json({ success: true, message: 'Review posted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 */
const updateReview = async (req, res) => {
    const { id } = req.params;
    const { rating, review_message, photos } = req.body;
    const user_id = req.user.id;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, user_id)
            .input('rating', sql.Int, rating)
            .input('message', sql.VarChar, review_message)
            .input('photos', sql.VarChar, photos)
            .query(`
                UPDATE Reviews 
                SET rating = COALESCE(@rating, rating),
                    review_message = COALESCE(@message, review_message),
                    photos = COALESCE(@photos, photos)
                WHERE review_id = @id AND user_id = @user_id
            `);

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Review updated.' });
        } else {
            res.status(404).json({ success: false, error: 'Review not found or unauthorized.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 */
const deleteReview = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, user_id)
            .query('DELETE FROM Reviews WHERE review_id = @id AND user_id = @user_id');

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Review deleted.' });
        } else {
            res.status(404).json({ success: false, error: 'Review not found or unauthorized.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── Likes Logic ───────────────────────────────────────────────────────────────

const likeReview = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const pool = await poolPromise;
        // Check if already liked
        const check = await pool.request()
            .input('rid', sql.Int, id)
            .input('uid', sql.Int, user_id)
            .query('SELECT * FROM ReviewLikes WHERE review_id = @rid AND user_id = @uid');

        if (check.recordset.length > 0) {
            return res.status(400).json({ success: false, error: 'Already liked.' });
        }

        await pool.request()
            .input('rid', sql.Int, id)
            .input('uid', sql.Int, user_id)
            .query('INSERT INTO ReviewLikes (review_id, user_id, created_at) VALUES (@rid, @uid, GETDATE())');

        res.json({ success: true, message: 'Review liked.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const unlikeReview = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('rid', sql.Int, id)
            .input('uid', sql.Int, user_id)
            .query('DELETE FROM ReviewLikes WHERE review_id = @rid AND user_id = @uid');

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Unliked.' });
        } else {
            res.status(404).json({ success: false, error: 'Like not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const getReviewLikes = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM ReviewLikes WHERE review_id = @id');
        res.json({ success: true, likes: result.recordset[0].count });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── Comments Logic ────────────────────────────────────────────────────────────

const addComment = async (req, res) => {
    const { id } = req.params;
    const { comment_text } = req.body;
    const user_id = req.user.id;

    if (!comment_text) {
        return res.status(400).json({ success: false, error: 'Comment text is required.' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('rid', sql.Int, id)
            .input('uid', sql.Int, user_id)
            .input('text', sql.VarChar, comment_text)
            .query('INSERT INTO ReviewComments (review_id, user_id, comment_text, created_at) VALUES (@rid, @uid, @text, GETDATE())');

        res.status(201).json({ success: true, message: 'Comment added.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const getReviewComments = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT c.*, u.username 
                FROM ReviewComments c
                JOIN Users u ON c.user_id = u.user_id
                WHERE c.review_id = @id
                ORDER BY c.created_at ASC
            `);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const deleteComment = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('user_id', sql.Int, user_id)
            .query('DELETE FROM ReviewComments WHERE comment_id = @id AND user_id = @user_id');

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Comment deleted.' });
        } else {
            res.status(404).json({ success: false, error: 'Comment not found or unauthorized.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getReviews, getReviewById, createReview, updateReview, deleteReview,
    likeReview, unlikeReview, getReviewLikes,
    addComment, getReviewComments, deleteComment
};

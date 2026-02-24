const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_123');

            // Add user info to request
            req.user = decoded;

            next();
        } catch (error) {
            console.error('❌ Auth Error:', error.message);
            res.status(401).json({ success: false, error: 'Not authorized, token failed.' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, error: 'Not authorized, no token.' });
    }
};

module.exports = { protect };

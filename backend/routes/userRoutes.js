const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, getMe, updateMe } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get('/:id', protect, getUserProfile);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    getReviews, getReviewById, createReview, updateReview, deleteReview,
    likeReview, unlikeReview, getReviewLikes,
    addComment, getReviewComments, deleteComment
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Main Review Routes
router.get('/', getReviews);
router.get('/:id', getReviewById);
router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

// Like Routes
router.get('/:id/likes', getReviewLikes);
router.post('/:id/like', protect, likeReview);
router.delete('/:id/like', protect, unlikeReview);

// Comment Routes
router.get('/:id/comments', getReviewComments);
router.post('/:id/comments', protect, addComment);

// Isolated Comment Deletion
// (Note: The user asked for DELETE /api/comments/:id in global requirements)
module.exports = router;

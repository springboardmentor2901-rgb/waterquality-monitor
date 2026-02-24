const express = require('express');
const router = express.Router();
const { getReadings, getReadingsBySensor, createReading } = require('../controllers/readingController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getReadings);
router.get('/sensor/:id', protect, getReadingsBySensor);
router.post('/', protect, createReading);

module.exports = router;

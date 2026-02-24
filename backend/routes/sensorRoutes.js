const express = require('express');
const router = express.Router();
const { getSensors, getSensorById, createSensor, updateSensor, deleteSensor } = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getSensors);
router.get('/:id', protect, getSensorById);
router.post('/', protect, createSensor);
router.put('/:id', protect, updateSensor);
router.delete('/:id', protect, deleteSensor);

module.exports = router;

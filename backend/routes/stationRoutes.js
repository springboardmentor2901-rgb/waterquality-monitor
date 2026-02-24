const express = require('express');
const router = express.Router();
const { getStations, getStationById, searchStations } = require('../controllers/stationController');

router.get('/', getStations);
router.get('/search', searchStations);
router.get('/:id', getStationById);

module.exports = router;

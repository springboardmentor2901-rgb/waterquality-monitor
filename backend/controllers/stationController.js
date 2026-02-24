const { poolPromise, sql } = require('../config/db');

/**
 * @desc    Get all water stations
 * @route   GET /api/stations
 */
const getStations = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM WaterStations');
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Get single water station
 * @route   GET /api/stations/:id
 */
const getStationById = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM WaterStations WHERE station_id = @id');

        const station = result.recordset[0];

        if (station) {
            res.json({ success: true, data: station });
        } else {
            res.status(404).json({ success: false, error: 'Station not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Search stations by name or location
 * @route   GET /api/stations/search
 */
const searchStations = async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ success: false, error: 'Search query is required.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('query', sql.VarChar, `%${q}%`)
            .query(`
                SELECT * FROM WaterStations 
                WHERE station_name LIKE @query OR location LIKE @query
            `);

        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getStations,
    getStationById,
    searchStations
};

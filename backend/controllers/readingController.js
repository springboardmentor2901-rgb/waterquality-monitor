const { poolPromise, sql } = require('../config/db');

/**
 * @desc    Get all water readings
 * @route   GET /api/readings
 */
const getReadings = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM WaterReadings ORDER BY recorded_at DESC');
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Get readings for a specific sensor
 * @route   GET /api/readings/sensor/:id
 */
const getReadingsBySensor = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM WaterReadings WHERE sensor_id = @id ORDER BY recorded_at DESC');

        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Create a new water reading
 * @route   POST /api/readings
 */
const createReading = async (req, res) => {
    const { sensor_id, ph_value, tds_value, turbidity, temperature, recorded_at } = req.body;

    if (!sensor_id) {
        return res.status(400).json({ success: false, error: 'Sensor ID is required.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('sensor_id', sql.Int, sensor_id)
            .input('ph', sql.Decimal(4, 2), ph_value || null)
            .input('tds', sql.Decimal(10, 2), tds_value || null)
            .input('turbidity', sql.Decimal(6, 2), turbidity || null)
            .input('temp', sql.Decimal(5, 2), temperature || null)
            .input('recorded_at', sql.DateTime, recorded_at ? new Date(recorded_at) : new Date())
            .query(`
                INSERT INTO WaterReadings (sensor_id, ph_value, tds_value, turbidity, temperature, recorded_at)
                VALUES (@sensor_id, @ph, @tds, @turbidity, @temp, @recorded_at)
            `);

        res.status(201).json({ success: true, message: 'Reading recorded successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getReadings,
    getReadingsBySensor,
    createReading
};

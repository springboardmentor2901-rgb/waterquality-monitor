const { poolPromise, sql } = require('../config/db');

/**
 * @desc    Get all sensors
 * @route   GET /api/sensors
 */
const getSensors = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Sensors');
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Get single sensor
 * @route   GET /api/sensors/:id
 */
const getSensorById = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Sensors WHERE sensor_id = @id');

        const sensor = result.recordset[0];

        if (sensor) {
            res.json({ success: true, data: sensor });
        } else {
            res.status(404).json({ success: false, error: 'Sensor not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Create a new sensor (Admin Only)
 * @route   POST /api/sensors
 */
const createSensor = async (req, res) => {
    const { sensor_name, sensor_type, station_id, status } = req.body;

    if (!sensor_name || !sensor_type || !station_id) {
        return res.status(400).json({ success: false, error: 'Sensor name, type, and station_id are required.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.VarChar, sensor_name)
            .input('type', sql.VarChar, sensor_type)
            .input('station_id', sql.Int, station_id)
            .input('status', sql.VarChar, status || 'Active')
            .query(`
                INSERT INTO Sensors (sensor_name, sensor_type, station_id, status, installed_at)
                VALUES (@name, @type, @station_id, @status, GETDATE())
            `);

        res.status(201).json({ success: true, message: 'Sensor created successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Update a sensor (Admin Only)
 * @route   PUT /api/sensors/:id
 */
const updateSensor = async (req, res) => {
    const { id } = req.params;
    const { sensor_name, sensor_type, status } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, sensor_name)
            .input('type', sql.VarChar, sensor_type)
            .input('status', sql.VarChar, status)
            .query(`
                UPDATE Sensors 
                SET sensor_name = COALESCE(@name, sensor_name),
                    sensor_type = COALESCE(@type, sensor_type),
                    status = COALESCE(@status, status)
                WHERE sensor_id = @id
            `);

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Sensor updated successfully.' });
        } else {
            res.status(404).json({ success: false, error: 'Sensor not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * @desc    Delete a sensor (Admin Only)
 * @route   DELETE /api/sensors/:id
 */
const deleteSensor = async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Sensors WHERE sensor_id = @id');

        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Sensor deleted successfully.' });
        } else {
            res.status(404).json({ success: false, error: 'Sensor not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getSensors,
    getSensorById,
    createSensor,
    updateSensor,
    deleteSensor
};

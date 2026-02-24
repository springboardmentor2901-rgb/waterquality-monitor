/**
 * migrate_stations.js
 * -------------------
 * One-time migration script to transfer groundwater station data from 
 * multiple JSON files into the SQL Server table 'WaterStations'.
 */

const fs = require('fs');
const path = require('path');
const sql = require('mssql/msnodesqlv8');

// ─── SQL Configuration (Matching server.js) ──────────────────────────────────
const sqlConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=waterdb;Trusted_Connection=yes;',
    connectionTimeout: 60000,
    requestTimeout: 60000
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GROUNDWATER_DATA_DIR = path.join(__dirname, 'groundwater_data');

/**
 * Main Migration Function
 */
async function runMigration() {
    let pool;
    try {
        console.log('🚀 Starting Groundwater Data Migration...');

        // 1. Connect to SQL Server
        pool = await sql.connect(sqlConfig);
        console.log('✅ Connected to SQL Server (waterdb)');

        // 2. Read all JSON files from the directory
        const files = fs.readdirSync(GROUNDWATER_DATA_DIR).filter(file => file.endsWith('.json'));
        console.log(`📄 Found ${files.length} JSON files to process.`);

        let totalProcessed = 0;
        let totalInserted = 0;

        for (const file of files) {
            console.log(`\n🔍 Processing file: ${file}...`);
            const filePath = path.join(GROUNDWATER_DATA_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');

            let jsonData;
            try {
                jsonData = JSON.parse(content);
            } catch (err) {
                console.error(`❌ Error parsing JSON in ${file}:`, err.message);
                continue;
            }

            const districts = jsonData.districts || {};

            // Iterate through districts and then data arrays
            for (const districtName in districts) {
                const districtData = districts[districtName].data || [];

                for (const station of districtData) {
                    try {
                        // Prepare data for insertion
                        const data = {
                            name: station.stationName || 'Unknown Station',
                            location: station.district || districtName,
                            lat: station.latitude ? parseFloat(station.latitude) : null,
                            lng: station.longitude ? parseFloat(station.longitude) : null,
                            dataValue: station.dataValue !== undefined ? parseFloat(station.dataValue) : null,
                            createdAt: station.dataTime ? new Date(station.dataTime) : new Date()
                        };

                        /**
                         * 3. Insert into SQL Server using MERGE logic to avoid duplicates
                         * We consider a station record unique by its name, location, and timestamp.
                         */
                        const result = await pool.request()
                            .input('name', sql.VarChar(255), data.name)
                            .input('location', sql.VarChar(255), data.location)
                            .input('lat', sql.Decimal(10, 6), data.lat)
                            .input('lng', sql.Decimal(10, 6), data.lng)
                            .input('dataValue', sql.Decimal(18, 4), data.dataValue)
                            .input('createdAt', sql.DateTime, data.createdAt)
                            .query(`
                                MERGE INTO WaterStations AS Target
                                USING (SELECT @name AS name, @location AS loc, @createdAt AS ts) AS Source
                                ON (Target.station_name = Source.name AND Target.location = Source.loc AND Target.created_at = Source.ts)
                                WHEN NOT MATCHED THEN
                                    INSERT (station_name, location, latitude, longitude, created_at, data_value)
                                    VALUES (@name, @location, @lat, @lng, @createdAt, @dataValue);
                            `);

                        if (result.rowsAffected[0] > 0) {
                            totalInserted++;
                        }
                        totalProcessed++;

                    } catch (insertErr) {
                        console.error(`❌ Failed to insert station ${station.stationName}:`, insertErr.message);
                    }
                }
            }
        }

        console.log('\n─────────────────────────────────────────────────');
        console.log('🏁 Migration Completed Successfully!');
        console.log(`📊 Total Stations Processed: ${totalProcessed}`);
        console.log(`✨ New Stations Inserted: ${totalInserted}`);
        console.log('─────────────────────────────────────────────────');

    } catch (err) {
        console.error('\n💥 Critical Migration Error:', err.message);
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 SQL Connection Closed.');
        }
    }
}

// Start the migration
runMigration();

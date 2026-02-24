const sql = require('mssql');

const config = {
    server: 'localhost\\SQLEXPRESS',
    database: 'waterdb',
    options: {
        trustServerCertificate: true,
        enableArithAbort: true
    },
    driver: 'msnodesqlv8', // This helps with Windows Authentication if needed, but mssql 12+ supports it better
    connectionTimeout: 30000,
    requestTimeout: 30000,
    authentication: {
        type: 'default',
        options: {
            // Using Windows Authentication (Trusted Connection)
            // No UID/PWD needed if the process runs as the local user
        }
    }
};

// Simplified config for Trusted Connection (Windows Auth)
// Using msnodesqlv8 for better compatibility with local named instances and Windows Auth
const sqlConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=waterdb;Trusted_Connection=yes;',
    driver: 'msnodesqlv8'
};

const pool = new sql.ConnectionPool(sqlConfig);
const poolConnect = pool.connect();

pool.on('error', err => {
    console.error('SQL Pool Error:', err);
});

module.exports = {
    sql,
    pool,
    poolConnect
};

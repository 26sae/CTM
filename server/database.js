const fs = require('fs');

function getDatabaseConfig() {
  const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
  const caPath = process.env.MYSQL_SSL_CA_PATH;
  const caValue = process.env.MYSQL_SSL_CA;
  const ca = caPath
    ? fs.readFileSync(caPath, 'utf8')
    : caValue?.replace(/\\n/g, '\n');
  const isAiven = host.endsWith('.aivencloud.com');

  if (isAiven && !ca) {
    throw new Error('MYSQL_SSL_CA or MYSQL_SSL_CA_PATH is required for Aiven MySQL TLS.');
  }

  const database = process.env.MYSQLDATABASE
    || process.env.MYSQL_DATABASE
    || process.env.DB_NAME;
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;

  if (!database) {
    throw new Error('Set MYSQLDATABASE (or MYSQL_DATABASE / DB_NAME) to the MySQL database name.');
  }
  if (!password) {
    throw new Error('Set MYSQLPASSWORD (or DB_PASSWORD) for the MySQL connection.');
  }

  return {
    host,
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password,
    database,
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
    ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
  };
}

module.exports = { getDatabaseConfig };

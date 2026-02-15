/**
 * Creates Snowflake tables (PUJAS, ADMINS) and seeds one admin from env.
 * Run once after setting Snowflake env vars: npm run init-db
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const snowflake = require('snowflake-sdk');
const bcrypt = require('bcrypt');

const config = {
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA || 'LV',
};

function run(conn, sql, binds = []) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds: binds,
      complete: (err, stmt, rows) => {
        if (err) return reject(err);
        resolve(rows);
      },
    });
  });
}

async function main() {
  if (!config.account || !config.username || !config.password || !config.warehouse || !config.database) {
    console.error('Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USERNAME, SNOWFLAKE_PASSWORD, SNOWFLAKE_WAREHOUSE, SNOWFLAKE_DATABASE (and optional SNOWFLAKE_SCHEMA) in .env');
    process.exit(1);
  }

  const conn = snowflake.createConnection(config);

  await new Promise((resolve, reject) => {
    conn.connect((err) => (err ? reject(err) : resolve()));
  });

  console.log('Creating PUJAS table...');
  await run(conn, `
    CREATE TABLE IF NOT EXISTS PUJAS (
      ID VARCHAR(64) PRIMARY KEY,
      TITLE VARCHAR(500),
      START_DATE DATE,
      START_TIME VARCHAR(20),
      END_DATE DATE,
      END_TIME VARCHAR(20),
      DETAILS VARIANT,
      IMAGE_URL VARCHAR(1000),
      IS_ACTIVE BOOLEAN DEFAULT TRUE,
      CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
    )
  `);

  console.log('Creating ADMINS table...');
  await run(conn, `
    CREATE TABLE IF NOT EXISTS ADMINS (
      ID VARCHAR(64) PRIMARY KEY,
      USERNAME VARCHAR(255) UNIQUE NOT NULL,
      PASSWORD_HASH VARCHAR(255) NOT NULL,
      ROLE VARCHAR(32) DEFAULT 'ADMIN',
      CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
    )
  `);

  try {
    await run(conn, `ALTER TABLE ADMINS ADD COLUMN IF NOT EXISTS ROLE VARCHAR(32) DEFAULT 'ADMIN'`);
  } catch (_) {}

  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await run(conn, 'SELECT 1 FROM ADMINS WHERE USERNAME = ?', [adminUser]);
  if (existing && existing.length > 0) {
    await run(conn, `UPDATE ADMINS SET ROLE = 'SUPER_ADMIN' WHERE USERNAME = ?`, [adminUser]);
    console.log('Super admin user already exists.');
  } else {
    const hash = bcrypt.hashSync(adminPass, 10);
    const id = require('crypto').randomBytes(16).toString('hex');
    await run(conn, 'INSERT INTO ADMINS (ID, USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, ?, ?)', [id, adminUser, hash, 'SUPER_ADMIN']);
    console.log('Seeded super admin user:', adminUser);
  }

  conn.destroy(() => {});
  console.log('Snowflake init done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Database layer: Snowflake when configured, else JSON file.
 * Swap this module later to use PostgreSQL or another DB.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DATA_FILE = path.join(__dirname, '..', 'data', 'pujas.json');
const ADMINS_FILE = path.join(__dirname, '..', 'data', 'admins.json');
const ROLES = { SUPER_ADMIN: 'SUPER_ADMIN', ADMIN: 'ADMIN' };

const SNOWFLAKE_CONFIG = {
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA || 'LV',
};

function useSnowflake() {
  return !!(
    SNOWFLAKE_CONFIG.account &&
    SNOWFLAKE_CONFIG.username &&
    SNOWFLAKE_CONFIG.password &&
    SNOWFLAKE_CONFIG.warehouse &&
    SNOWFLAKE_CONFIG.database
  );
}

// ---------- JSON file (fallback) ----------
function readPujasFile() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { pujas: [] };
  }
}

function writePujasFile(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- Snowflake helpers ----------
function getConnection() {
  const snowflake = require('snowflake-sdk');
  return snowflake.createConnection(SNOWFLAKE_CONFIG);
}

function runQuery(sql, binds = []) {
  return new Promise((resolve, reject) => {
    const conn = getConnection();
    conn.connect((err) => {
      if (err) return reject(err);
      conn.execute({
        sqlText: sql,
        binds: binds,
        complete: (err, stmt, rows) => {
          conn.destroy((destroyErr) => {});
          if (err) return reject(err);
          resolve(rows);
        },
      });
    });
  });
}

// ---------- Public API ----------

async function init() {
  if (!useSnowflake()) {
    console.log('DB: Using JSON file (data/pujas.json). Set Snowflake env vars to use Snowflake.');
    return;
  }
  console.log('DB: Using Snowflake.');
}

async function getPujas() {
  if (!useSnowflake()) {
    return readPujasFile();
  }
  try {
    const rows = await runQuery(
      `SELECT ID, TITLE, START_DATE, START_TIME, END_DATE, END_TIME, DETAILS, IMAGE_URL, IS_ACTIVE
       FROM PUJAS WHERE IS_ACTIVE = TRUE ORDER BY START_DATE DESC, START_TIME`
    );
    const fmt = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : (v || ''));
    const pujas = (rows || []).map((r) => ({
      id: String(r.ID),
      title: r.TITLE,
      startDate: fmt(r.START_DATE),
      startTime: r.START_TIME || '',
      endDate: fmt(r.END_DATE),
      endTime: r.END_TIME || '',
      details: r.DETAILS != null ? (Array.isArray(r.DETAILS) ? r.DETAILS : []) : [],
      imageUrl: r.IMAGE_URL || '',
      isActive: r.IS_ACTIVE !== false,
    }));
    return { pujas };
  } catch (e) {
    console.error('getPujas error:', e.message);
    return { pujas: [] };
  }
}

async function addPuja(puja) {
  if (!useSnowflake()) {
    const data = readPujasFile();
    puja.id = Date.now().toString();
    data.pujas.push(puja);
    writePujasFile(data);
    return puja;
  }
  const id = Date.now().toString();
  const detailsJson = JSON.stringify(puja.details || []);
  const startDateStr = (puja.startDate && String(puja.startDate).trim()) || null;
  const endDateStr = (puja.endDate && String(puja.endDate).trim()) || null;
  const detailsEscaped = detailsJson.replace(/\\/g, '\\\\').replace(/'/g, "''");
  const sql = `INSERT INTO PUJAS (ID, TITLE, START_DATE, START_TIME, END_DATE, END_TIME, DETAILS, IMAGE_URL, IS_ACTIVE)
       SELECT ?, ?, TRY_TO_DATE(?, 'YYYY-MM-DD'), ?, TRY_TO_DATE(?, 'YYYY-MM-DD'), ?, PARSE_JSON('${detailsEscaped}'), ?, ?`;
  const binds = [
    id,
    puja.title || '',
    startDateStr,
    puja.startTime || '',
    endDateStr,
    puja.endTime || '',
    puja.imageUrl || '',
    puja.isActive !== false,
  ];
  try {
    await runQuery(sql, binds);
  } catch (e) {
    const errMsg = e.message || String(e);
    const errCode = e.code != null ? e.code : '';
    const errBody = e.response && e.response.body != null ? JSON.stringify(e.response.body) : '';
    console.error('addPuja error:', errMsg, errCode, errBody || '', e.cause || '');
    throw e;
  }
  return { ...puja, id };
}

async function deletePuja(id) {
  if (!useSnowflake()) {
    const data = readPujasFile();
    data.pujas = data.pujas.filter((p) => p.id !== id);
    writePujasFile(data);
    return;
  }
  await runQuery(`DELETE FROM PUJAS WHERE ID = ?`, [id]);
}

async function verifyAdmin(username, password) {
  if (!username || !password) return { ok: false };
  if (!useSnowflake()) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    if (username === adminUser && password === adminPass) {
      return { ok: true, userId: 'super', role: ROLES.SUPER_ADMIN };
    }
    const admins = readAdminsFile();
    const a = admins.find((x) => x.username === username);
    if (!a || !bcrypt.compareSync(password, a.passwordHash)) return { ok: false };
    return { ok: true, userId: a.id, role: a.role || ROLES.ADMIN };
  }
  try {
    let rows;
    try {
      rows = await runQuery(
        `SELECT ID, PASSWORD_HASH, ROLE FROM ADMINS WHERE USERNAME = ?`,
        [username]
      );
    } catch (colErr) {
      rows = await runQuery(
        `SELECT ID, PASSWORD_HASH FROM ADMINS WHERE USERNAME = ?`,
        [username]
      );
    }
    if (!rows || rows.length === 0) return { ok: false };
    const r = rows[0];
    const hash = r.PASSWORD_HASH != null ? r.PASSWORD_HASH : r.password_hash;
    if (!hash || !bcrypt.compareSync(password, hash)) return { ok: false };
    const role = (r.ROLE != null ? r.ROLE : r.role) || ROLES.SUPER_ADMIN;
    return { ok: true, userId: r.ID || r.id, role };
  } catch (e) {
    console.error('verifyAdmin error:', e.message);
    return { ok: false };
  }
}

function readAdminsFile() {
  try {
    const data = fs.readFileSync(ADMINS_FILE, 'utf8');
    const j = JSON.parse(data);
    return Array.isArray(j.admins) ? j.admins : [];
  } catch (e) {
    return [];
  }
}

function writeAdminsFile(admins) {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify({ admins }, null, 2));
}

async function getAdmins() {
  if (!useSnowflake()) {
    const list = readAdminsFile();
    const superUser = process.env.ADMIN_USERNAME || 'admin';
    const hasSuper = list.some((a) => a.role === ROLES.SUPER_ADMIN);
    const out = list.map((a) => ({ id: a.id, username: a.username, role: a.role || ROLES.ADMIN }));
    if (!hasSuper) out.unshift({ id: 'super', username: superUser, role: ROLES.SUPER_ADMIN });
    return out;
  }
  try {
    const rows = await runQuery(`SELECT ID, USERNAME, ROLE FROM ADMINS ORDER BY CREATED_AT`);
    return (rows || []).map((r) => ({
      id: r.ID,
      username: r.USERNAME,
      role: r.ROLE || ROLES.ADMIN,
    }));
  } catch (e) {
    console.error('getAdmins error:', e.message);
    return [];
  }
}

async function addAdmin(username, password, role = ROLES.ADMIN) {
  if (!username || !password) throw new Error('Username and password required');
  const hash = bcrypt.hashSync(password, 10);
  const id = require('crypto').randomBytes(16).toString('hex');
  if (!useSnowflake()) {
    const admins = readAdminsFile();
    if (admins.some((a) => a.username === username)) throw new Error('Username already exists');
    admins.push({ id, username, passwordHash: hash, role });
    writeAdminsFile(admins);
    return { id, username, role };
  }
  await runQuery(
    `INSERT INTO ADMINS (ID, USERNAME, PASSWORD_HASH, ROLE) VALUES (?, ?, ?, ?)`,
    [id, username, hash, role]
  );
  return { id, username, role };
}

async function deleteAdmin(id) {
  if (!useSnowflake()) {
    const admins = readAdminsFile().filter((a) => a.id !== id);
    writeAdminsFile(admins);
    return;
  }
  await runQuery(`DELETE FROM ADMINS WHERE ID = ?`, [id]);
}

module.exports = {
  init,
  getPujas,
  addPuja,
  deletePuja,
  verifyAdmin,
  getAdmins,
  addAdmin,
  deleteAdmin,
  useSnowflake,
  ROLES,
};

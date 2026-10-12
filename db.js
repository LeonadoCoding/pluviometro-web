const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'pluviometro.db');
const db = new DatabaseSync(DB_PATH);

// Helper to determine agricultural safra from date YYYY-MM-DD
function getSafraFromDate(dateStr) {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (month >= 10) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
}

// Initialize tables and security schema
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_rainfall (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      rain_mm REAL NOT NULL,
      safra TEXT NOT NULL,
      property TEXT DEFAULT 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_rain_date ON daily_rainfall(date);
    CREATE INDEX IF NOT EXISTS idx_rain_safra ON daily_rainfall(safra);

    CREATE TABLE IF NOT EXISTS app_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      ip TEXT,
      username TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event);
  `);

  // Seed default admin user if not present
  const userCount = db.prepare('SELECT COUNT(*) as count FROM app_users').get().count;
  if (userCount === 0) {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;
    if (!adminPass || adminPass.length < 16) {
      throw new Error('Configure ADMIN_PASSWORD com pelo menos 16 caracteres antes de inicializar um banco novo.');
    }
    const hash = bcrypt.hashSync(adminPass, 12);
    db.prepare('INSERT INTO app_users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(adminUser, hash, 'admin');
    console.log(`🔐 Administrador inicial "${adminUser}" criado com hash BCrypt.`);
  }

  // Check if rainfall seed needed
  const countRow = db.prepare('SELECT COUNT(*) as count FROM daily_rainfall').get();
  if (countRow.count === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  const seedFile = path.join(__dirname, '..', 'seed_data.json');
  if (!fs.existsSync(seedFile)) {
    console.warn('seed_data.json not found at', seedFile);
    return;
  }

  const raw = fs.readFileSync(seedFile, 'utf8');
  const items = JSON.parse(raw);
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO daily_rainfall (date, rain_mm, safra, property, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const item of items) {
      const safra = item.safra || getSafraFromDate(item.date);
      insertStmt.run(
        item.date,
        item.rain_mm,
        safra,
        item.property || 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS',
        item.notes || null
      );
    }
    db.exec('COMMIT;');
    console.log(`Seeded ${items.length} records into database.`);
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Failed to seed database:', err);
  }
}

function resetToSeed() {
  db.exec('DELETE FROM daily_rainfall;');
  seedDatabase();
  return { success: true, count: db.prepare('SELECT COUNT(*) as count FROM daily_rainfall').get().count };
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM app_users WHERE username = ?').get(username);
}

function updateUserPassword(username, newHash) {
  const stmt = db.prepare(`
    UPDATE app_users 
    SET password_hash = ?, updated_at = datetime('now', 'localtime') 
    WHERE username = ?
  `);
  return stmt.run(newHash, username);
}

function logSecurityEvent(event, ip, username, details) {
  try {
    const stmt = db.prepare('INSERT INTO audit_logs (event, ip, username, details) VALUES (?, ?, ?, ?)');
    stmt.run(event, ip || 'unknown', username || 'anonymous', details || null);
  } catch (e) {
    console.error('Failed to log security event:', e);
  }
}

initDb();

module.exports = {
  db,
  getSafraFromDate,
  resetToSeed,
  getUserByUsername,
  updateUserPassword,
  logSecurityEvent,
  DB_PATH,
  DATA_DIR
};

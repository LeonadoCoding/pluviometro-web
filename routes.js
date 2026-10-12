const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const {
  db,
  getSafraFromDate,
  resetToSeed,
  getUserByUsername,
  updateUserPassword,
  logSecurityEvent
} = require('./db');
const {
  MONTHS_SAFRA,
  calculateSafraMetrics,
  calculateGlobalKPIs
} = require('./calculations');
const {
  generateToken,
  verifyToken,
  requireAuth
} = require('./auth');

// Security helper: Extract client IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

// Security helper: Validate Gregorian calendar date YYYY-MM-DD
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dateObj = new Date(y, m - 1, d);
  return (
    dateObj.getFullYear() === y &&
    dateObj.getMonth() === m - 1 &&
    dateObj.getDate() === d
  );
}

// Security helper: Sanitize strings against XSS / injection and limit length
function sanitizeText(str, maxLength = 255) {
  if (!str) return null;
  const sanitized = String(str)
    .replace(/[<>]/g, '') // remove direct angle brackets
    .replace(/[\x00-\x1F\x7F]/g, '') // remove non-printable ASCII control characters
    .trim();
  return sanitized.length > 0 ? sanitized.slice(0, maxLength) : null;
}

// ==========================================
// Authentication Endpoints
// ==========================================

// Login with BCrypt hash verification and security audit logging
router.post('/auth/login', (req, res) => {
  const clientIp = getClientIp(req);
  const { username, password } = req.body || {};

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    logSecurityEvent('LOGIN_REJECTED', clientIp, 'invalid_input', 'Tentativa de login sem parâmetros obrigatórios');
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const cleanUser = username.trim().toLowerCase();
  const userInDb = getUserByUsername(cleanUser);

  if (!userInDb || !bcrypt.compareSync(password, userInDb.password_hash)) {
    logSecurityEvent('LOGIN_FAILED', clientIp, cleanUser, 'Credenciais incorretas');
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique usuário e senha.' });
  }

  // Generate secure JWT token
  const token = generateToken(userInDb);
  logSecurityEvent('LOGIN_SUCCESS', clientIp, cleanUser, 'Acesso autenticado');

  return res.json({
    success: true,
    token,
    user: {
      username: userInDb.username,
      name: 'Administrador Oilema',
      role: userInDb.role
    }
  });
});

// Verify token validity
router.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, user: decoded });
});

// Change admin password (Protected)
router.post('/auth/change-password', requireAuth, (req, res) => {
  const clientIp = getClientIp(req);
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'A senha atual e a nova senha são obrigatórias.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres.' });
  }

  const username = req.user.username;
  const userInDb = getUserByUsername(username);
  if (!userInDb) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (!bcrypt.compareSync(currentPassword, userInDb.password_hash)) {
    logSecurityEvent('PASSWORD_CHANGE_FAILED', clientIp, username, 'Senha atual incorreta');
    return res.status(400).json({ error: 'Senha atual incorreta.' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'A nova senha não pode ser idêntica à senha atual.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 12);
  updateUserPassword(username, newHash);
  logSecurityEvent('PASSWORD_CHANGED', clientIp, username, 'Senha de acesso alterada com sucesso');

  return res.json({ success: true, message: 'Senha alterada com sucesso!' });
});

// View audit logs (Protected)
router.get('/auth/audit', requireAuth, (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50').all();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao recuperar logs de auditoria' });
  }
});

// Healthcheck
router.get('/health', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM daily_rainfall').get().count;
  res.json({
    status: 'ok',
    recordsCount: count,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// Pluviometer Records Endpoints (Protected)
// ==========================================

// List records with validated filters
router.get('/records', requireAuth, (req, res) => {
  const { safra, month, year } = req.query;
  let limit = parseInt(req.query.limit, 10);
  let offset = parseInt(req.query.offset, 10);

  // Clamp limits to prevent DoS
  limit = isNaN(limit) || limit < 1 ? 500 : Math.min(limit, 1000);
  offset = isNaN(offset) || offset < 0 ? 0 : offset;

  let query = 'SELECT * FROM daily_rainfall WHERE 1=1';
  const params = [];

  if (safra && /^\d{4}\/\d{4}$/.test(safra)) {
    query += ' AND safra = ?';
    params.push(safra);
  }
  if (month && /^(0?[1-9]|1[0-2])$/.test(month)) {
    query += " AND strftime('%m', date) = ?";
    params.push(month.padStart(2, '0'));
  }
  if (year && /^\d{4}$/.test(year)) {
    query += " AND strftime('%Y', date) = ?";
    params.push(year);
  }

  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const records = db.prepare(query).all(...params);
  res.json({ records });
});

// Upsert a daily record (Strict Validation)
router.post('/records', requireAuth, (req, res) => {
  const { date, rain_mm, notes, property } = req.body || {};

  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Data inválida. O formato deve ser AAAA-MM-DD.' });
  }

  const parsedRain = typeof rain_mm === 'string' ? parseFloat(rain_mm.replace(',', '.')) : parseFloat(rain_mm);
  if (isNaN(parsedRain) || parsedRain < 0 || parsedRain > 2000) {
    return res.status(400).json({ error: 'A quantidade de chuva deve ser um valor positivo entre 0 e 2000 mm.' });
  }

  const cleanRain = Math.round(parsedRain * 10) / 10;
  const safra = getSafraFromDate(date);
  const cleanProperty = sanitizeText(property, 100) || 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS';
  const cleanNotes = sanitizeText(notes, 500);

  const stmt = db.prepare(`
    INSERT INTO daily_rainfall (date, rain_mm, safra, property, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(date) DO UPDATE SET
      rain_mm = excluded.rain_mm,
      safra = excluded.safra,
      property = excluded.property,
      notes = excluded.notes,
      updated_at = datetime('now', 'localtime')
  `);

  stmt.run(date, cleanRain, safra, cleanProperty, cleanNotes);

  const updatedRecord = db.prepare('SELECT * FROM daily_rainfall WHERE date = ?').get(date);
  res.status(201).json({ success: true, record: updatedRecord });
});

// Delete a daily record (Validated)
router.delete('/records/:id', requireAuth, (req, res) => {
  const recordId = parseInt(req.params.id, 10);
  if (isNaN(recordId) || recordId <= 0) {
    return res.status(400).json({ error: 'ID do registro inválido.' });
  }

  const stmt = db.prepare('DELETE FROM daily_rainfall WHERE id = ?');
  const result = stmt.run(recordId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Registro não encontrado.' });
  }
  res.json({ success: true, deletedId: recordId });
});

// Dashboard metrics (Protected)
router.get('/metrics', requireAuth, (req, res) => {
  const allRecords = db.prepare('SELECT * FROM daily_rainfall ORDER BY date ASC').all();
  const safras = [...new Set(allRecords.map(r => r.safra))].sort();

  const requestedSafra = req.query.safra;
  const selectedSafra = (requestedSafra && /^\d{4}\/\d{4}$/.test(requestedSafra))
    ? requestedSafra
    : (safras.length > 0 ? safras[safras.length - 1] : null);

  // Per-safra metrics
  const safraMetricsMap = {};
  for (const s of safras) {
    safraMetricsMap[s] = calculateSafraMetrics(s, allRecords);
  }

  // Historical progression
  const historicalProgression = MONTHS_SAFRA.map(m => {
    const item = { monthCode: m.code, monthName: m.name };
    for (const s of safras) {
      const sData = safraMetricsMap[s];
      const mProg = sData ? sData.progression.find(p => p.monthCode === m.code) : null;
      item[`${s}_monthly`] = mProg ? mProg.monthTotal : 0;
      item[`${s}_cum`] = mProg ? mProg.cumulative : 0;
    }
    return item;
  });

  // Consolidated table rows
  const consolidatedMatrix = MONTHS_SAFRA.map(m => {
    const row = {
      monthCode: m.code,
      monthName: m.name,
      safras: {}
    };
    for (const s of safras) {
      const sData = safraMetricsMap[s];
      const mData = sData ? sData.months[m.code] : null;
      row.safras[s] = {
        total_mm: mData ? mData.total_mm : 0,
        average_mm_day: mData ? mData.average_mm_day : 0,
        rainy_days: mData ? mData.rainy_days : 0,
        daysInMonth: mData ? mData.daysInMonth : 30
      };
    }
    return row;
  });

  // Global KPIs
  const globalKpis = calculateGlobalKPIs(allRecords);

  res.json({
    availableSafras: safras,
    currentSafra: selectedSafra,
    currentSafraMetrics: safraMetricsMap[selectedSafra] || null,
    safraMetricsMap,
    historicalProgression,
    consolidatedMatrix,
    kpis: globalKpis,
    monthsList: MONTHS_SAFRA
  });
});

// Export all records (Protected)
router.get('/export', requireAuth, (req, res) => {
  const records = db.prepare('SELECT * FROM daily_rainfall ORDER BY date ASC').all();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="pluviometro_backup.json"');
  res.json(records);
});

// Import records (Protected & Rate/Size Limited)
router.post('/import', requireAuth, (req, res) => {
  const clientIp = getClientIp(req);
  const items = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Estrutura inválida. Esperada uma lista de registros.' });
  }

  // Guard against memory exhaust / DoS
  if (items.length > 5000) {
    return res.status(400).json({ error: 'O limite máximo para importação em lote é de 5.000 registros por vez.' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO daily_rainfall (date, rain_mm, safra, property, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(date) DO UPDATE SET
      rain_mm = excluded.rain_mm,
      safra = excluded.safra,
      property = excluded.property,
      notes = excluded.notes,
      updated_at = datetime('now', 'localtime')
  `);

  db.exec('BEGIN TRANSACTION;');
  let imported = 0;
  try {
    for (const item of items) {
      if (!isValidDate(item.date) || item.rain_mm === undefined || item.rain_mm === null) continue;
      const rain = typeof item.rain_mm === 'string' ? parseFloat(item.rain_mm.replace(',', '.')) : parseFloat(item.rain_mm);
      if (isNaN(rain) || rain < 0 || rain > 2000) continue;

      const safra = item.safra || getSafraFromDate(item.date);
      const prop = sanitizeText(item.property, 100) || 'UBS SEMENTES OILEMA - PLACAS - BARREIRAS';
      const notes = sanitizeText(item.notes, 500);

      insertStmt.run(
        item.date,
        Math.round(rain * 10) / 10,
        safra,
        prop,
        notes
      );
      imported++;
    }
    db.exec('COMMIT;');
    logSecurityEvent('DATA_IMPORTED', clientIp, req.user?.username, `${imported} registros importados com sucesso`);
    res.json({ success: true, count: imported });
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Falha ao importar registros.', details: err.message });
  }
});

// Reset database to initial Excel seed (Protected)
router.post('/reset-seed', requireAuth, (req, res) => {
  const clientIp = getClientIp(req);
  try {
    const result = resetToSeed();
    logSecurityEvent('DATABASE_RESET', clientIp, req.user?.username, 'Base restaurada para o estado original da planilha');
    res.json({ success: true, message: 'Base restaurada com sucesso com os dados da planilha.', count: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao restaurar banco de dados.', details: err.message });
  }
});

module.exports = router;

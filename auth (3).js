const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SECRET_FILE = path.join(DATA_DIR, 'jwt.secret');

// Secure persistent JWT secret: use ENV if provided, or generate strong 64-byte random secret saved to data/jwt.secret
function getOrGenerateJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SECRET_FILE)) {
      const savedSecret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (savedSecret.length >= 32) return savedSecret;
    }
    const generated = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch (e) {
    console.warn('Could not persist JWT secret to file, using secure in-memory generation:', e.message);
    return crypto.randomBytes(64).toString('hex');
  }
}

const JWT_SECRET = getOrGenerateJwtSecret();
const ADMIN_USER = process.env.ADMIN_USER || 'admin';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'admin' },
    JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login para continuar.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido ou expirado. Faça login novamente.' });
  }

  req.user = decoded;
  next();
}

module.exports = {
  ADMIN_USER,
  generateToken,
  verifyToken,
  requireAuth
};

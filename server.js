const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { DB_PATH } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy (for Docker / VPS / Nginx)
app.set('trust proxy', 1);

// HTTP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "*"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Prevent HTTP Parameter Pollution & disable x-powered-by
app.disable('x-powered-by');

// CORS Configuration
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin.split(','),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  })
);

// Body parser with 1MB limit (mitigates memory exhaustion / DoS)
app.use(express.json({ limit: '1mb' }));

// Rate Limiter: General API requests (600 requests per 15 min per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições originadas deste IP. Aguarde alguns minutos.' }
});

// Rate Limiter: Strict on Login to prevent brute force (10 attempts per 15 min per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de login a partir deste IP. Bloqueado temporariamente por 15 minutos para segurança do portal.'
  }
});

// Apply rate limits
app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);

// API Routes
app.use('/api', routes);

// Serve static frontend in production if built
const candidateDistPaths = [
  process.env.CLIENT_DIST,
  path.join(__dirname, '..', '..', 'client', 'dist'),
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(process.cwd(), 'client', 'dist')
].filter(Boolean);

const clientDist = candidateDistPaths.find(p => fs.existsSync(p));

if (clientDist) {
  console.log(`Serving static client files from ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.log('Static client dist not detected. Running in API-only mode.');
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🌧️  Pluviômetro Web API rodando na porta ${PORT}`);
  console.log(`📁 Banco SQLite ativo: ${DB_PATH}`);
  console.log(`🔒 Camada de Segurança: Helmet + Rate Limiter + BCrypt ativados`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=======================================================`);
});

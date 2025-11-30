require('dotenv').config();
const express = require('express');
const cors = require('cors');
const config = require('./config');

// Import des routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const missionsRoutes = require('./routes/missions');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');
const xrplRoutes = require('./routes/xrpl');
const blockchainRoutes = require('./routes/blockchain');

// Import middleware
const { authenticate, requireAdmin } = require('./middleware/auth');

const app = express();

// Middlewares
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// Route principale
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur Zencity API 🚀',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    roles: ['admin', 'organization', 'client'],
    blockchain: 'XRPL Testnet',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      missions: '/api/missions',
      admin: '/api/admin',
      blockchain: '/api/blockchain',
      leaderboard: '/api/leaderboard',
      xrpl: '/api/xrpl',
      health: '/health'
    }
  });
});

// Route de santé (health check)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, usersRoutes);
app.use('/api/missions', missionsRoutes); // Auth gérée dans le router
app.use('/api/admin', adminRoutes); // Auth gérée dans le router
app.use('/api/blockchain', blockchainRoutes); // Auth gérée dans le router
app.use('/api/leaderboard', leaderboardRoutes); // Public
app.use('/api/xrpl', authenticate, xrplRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(500).json({ success: false, error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

// Import et initialisation de la base de données Supabase
const db = require('./services/supabase');

// Démarrage du serveur
const PORT = config.port || 3000;

async function startServer() {
  // Initialiser Supabase
  await db.init();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Zencity API                                  ║
║   ────────────────────────────────────────────────────    ║
║   Server:  http://localhost:${PORT}                       ║
║   Env:     ${config.nodeEnv}                                ║
║   XRPL:    ${config.xrpl.network}                                   ║
║   DB:      Supabase (PostgreSQL)                          ║
║                                                           ║
║   👤 Admin: admin@impact-identity.com / admin123          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);

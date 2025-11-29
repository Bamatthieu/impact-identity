const express = require('express');
const router = express.Router();
const db = require('../services/database');

// GET /api/leaderboard - Classement des utilisateurs
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const leaderboard = db.getLeaderboard(limit);
  res.json({ success: true, data: leaderboard });
});

// GET /api/leaderboard/badges - Liste des badges disponibles
router.get('/badges', (req, res) => {
  const badges = db.getBadges();
  res.json({ success: true, data: badges });
});

// GET /api/leaderboard/citizen-levels - Niveaux citoyens
router.get('/citizen-levels', (req, res) => {
  const levels = db.getCitizenLevels();
  res.json({ success: true, data: levels });
});

// GET /api/leaderboard/stats - Statistiques globales
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, data: stats });
});

module.exports = router;

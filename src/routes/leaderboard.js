const express = require('express');
const router = express.Router();
const db = require('../services/supabase');

// GET /api/leaderboard - Classement des utilisateurs
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const leaderboard = await db.getLeaderboard(limit);
  res.json({ success: true, data: leaderboard });
});

// GET /api/leaderboard/badges - Liste des badges disponibles
router.get('/badges', async (req, res) => {
  const badges = await db.getBadges();
  res.json({ success: true, data: badges });
});

// GET /api/leaderboard/citizen-levels - Niveaux citoyens
router.get('/citizen-levels', async (req, res) => {
  const levels = await db.getCitizenLevels();
  res.json({ success: true, data: levels });
});

// GET /api/leaderboard/stats - Statistiques globales
router.get('/stats', async (req, res) => {
  const stats = await db.getStats();
  res.json({ success: true, data: stats });
});

module.exports = router;

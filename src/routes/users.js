const express = require('express');
const router = express.Router();
const db = require('../services/database');
const xrplService = require('../services/xrplService');

// GET /api/users - Liste tous les utilisateurs
router.get('/', (req, res) => {
  const users = db.getAllUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    walletAddress: u.walletAddress,
    totalPoints: u.totalPoints,
    totalActions: u.totalActions,
    badges: u.badges,
    createdAt: u.createdAt
  }));
  res.json({ success: true, data: users });
});

// POST /api/users - Créer un nouvel utilisateur avec wallet XRPL
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Nom et email requis' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = db.getAllUsers().find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email déjà utilisé' });
    }

    // Créer un wallet XRPL pour l'utilisateur
    console.log('🔄 Création du wallet XRPL...');
    const wallet = await xrplService.createWallet();
    console.log('✅ Wallet créé:', wallet.address);

    // Créer l'utilisateur en base
    const user = db.createUser({
      name,
      email,
      walletAddress: wallet.address,
      walletSeed: wallet.seed, // ⚠️ En production, chiffrer ce seed!
      xrpBalance: wallet.balance
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        xrpBalance: wallet.balance,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id - Détails d'un utilisateur
router.get('/:id', async (req, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    // Récupérer les infos XRPL
    const xrpBalance = await xrplService.getBalance(user.walletAddress);
    const nfts = await xrplService.getNFTs(user.walletAddress);
    const tokenBalances = await xrplService.getTokenBalances(user.walletAddress);

    // Récupérer les badges complets
    const badges = db.getBadges().filter(b => user.badges.includes(b.id));

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        xrpBalance,
        totalPoints: user.totalPoints,
        totalActions: user.totalActions,
        badges,
        nfts: nfts.length,
        tokenBalances,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users/:id/actions - Actions d'un utilisateur
router.get('/:id/actions', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
  }

  const actions = db.getActionsByUserId(req.params.id);
  const enrichedActions = actions.map(action => {
    const actionType = db.getActionTypeById(action.actionTypeId);
    return { ...action, actionType };
  });

  res.json({ success: true, data: enrichedActions });
});

// GET /api/users/:id/nfts - NFTs d'un utilisateur
router.get('/:id/nfts', async (req, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const nfts = await xrplService.getNFTs(user.walletAddress);
    
    // Décoder les métadonnées des NFTs
    const decodedNFTs = nfts.map(nft => {
      let metadata = {};
      try {
        if (nft.URI) {
          const decoded = Buffer.from(nft.URI, 'hex').toString('utf-8');
          metadata = JSON.parse(decoded);
        }
      } catch (e) {
        metadata = { raw: nft.URI };
      }
      return { ...nft, metadata };
    });

    res.json({ success: true, data: decodedNFTs });
  } catch (error) {
    console.error('Erreur récupération NFTs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

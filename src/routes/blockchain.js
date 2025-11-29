const express = require('express');
const router = express.Router();
const db = require('../services/supabase');
const xrplService = require('../services/xrplService');
const { authenticate, requireRole } = require('../middleware/auth');

// Toutes les routes nécessitent d'être admin
router.use(authenticate, requireRole(['admin']));

// GET /api/blockchain/status - État de la connexion XRPL
router.get('/status', async (req, res) => {
  try {
    const status = await xrplService.getConnectionStatus();
    res.json({
      success: true,
      data: {
        connected: status.connected,
        network: status.network || 'testnet',
        serverUrl: status.serverUrl || 'wss://s.altnet.rippletest.net:51233'
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        connected: false,
        network: 'testnet',
        error: error.message
      }
    });
  }
});

// GET /api/blockchain/wallets - Liste des wallets créés
router.get('/wallets', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    
    const wallets = users
      .filter(u => u.walletAddress)
      .map(u => ({
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        walletAddress: u.walletAddress,
        createdAt: u.createdAt
      }));

    res.json({
      success: true,
      data: {
        total: wallets.length,
        wallets
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/blockchain/wallet/:address - Détails d'un wallet
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Trouver l'utilisateur associé
    const users = await db.getAllUsers();
    const user = users.find(u => u.walletAddress === address);
    
    // Récupérer les infos du wallet sur XRPL
    let xrplInfo = null;
    try {
      xrplInfo = await xrplService.getAccountInfo(address);
    } catch (e) {
      console.log('Wallet non activé sur XRPL:', e.message);
    }

    // Récupérer les NFTs
    let nfts = [];
    try {
      nfts = await xrplService.getNFTs(address);
    } catch (e) {
      console.log('Erreur récupération NFTs:', e.message);
    }

    res.json({
      success: true,
      data: {
        address,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        } : null,
        xrplInfo,
        nfts,
        nftCount: nfts.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/blockchain/nfts - Tous les NFTs mintés
router.get('/nfts', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const allNFTs = [];
    
    for (const user of users) {
      if (user.walletAddress) {
        try {
          const nfts = await xrplService.getNFTs(user.walletAddress);
          nfts.forEach(nft => {
            allNFTs.push({
              ...nft,
              ownerAddress: user.walletAddress,
              ownerName: user.name,
              ownerRole: user.role
            });
          });
        } catch (e) {
          // Wallet non activé ou erreur
        }
      }
    }

    res.json({
      success: true,
      data: {
        total: allNFTs.length,
        nfts: allNFTs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/blockchain/transactions - Historique des transactions blockchain
router.get('/transactions', async (req, res) => {
  try {
    // Récupérer les missions complétées avec NFT
    const allMissions = await db.getAllMissions();
    const missions = allMissions.filter(m => m.status === 'completed');
    const applications = [];
    
    for (const mission of missions) {
      const missionApps = await db.getApplicationsByMission(mission.id);
      const completedApps = missionApps.filter(a => a.status === 'completed');
      
      for (const app of completedApps) {
        const user = await db.getUserById(app.userId);
        const org = await db.getUserById(mission.organizationId);
        
        applications.push({
          id: app.id,
          type: 'mission_completed',
          missionId: mission.id,
          missionTitle: mission.title,
          userId: app.userId,
          userName: user?.name,
          userWallet: user?.walletAddress,
          organizationName: org?.name,
          reward: mission.reward,
          rewardXRP: mission.rewardXRP,
          completedAt: app.completedAt || mission.completedAt,
          category: mission.categoryId || mission.category
        });
      }
    }

    // Trier par date décroissante
    applications.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.json({
      success: true,
      data: {
        total: applications.length,
        transactions: applications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/blockchain/stats - Statistiques blockchain
router.get('/stats', async (req, res) => {
  try {
    const users = await db.getAllUsers();
    const missions = await db.getAllMissions();
    
    const stats = {
      totalWallets: users.filter(u => u.walletAddress).length,
      clientWallets: users.filter(u => u.walletAddress && u.role === 'client').length,
      organizationWallets: users.filter(u => u.walletAddress && u.role === 'organization').length,
      completedMissions: missions.filter(m => m.status === 'completed').length,
      totalPointsOnChain: users.reduce((sum, u) => sum + (u.totalPoints || 0), 0),
      network: 'XRPL Testnet'
    };

    // Compter les NFTs par catégorie
    const categories = await db.getMissionCategories();
    stats.nftsByCategory = {};
    
    for (const cat of categories) {
      const completedInCategory = missions.filter(
        m => m.status === 'completed' && (m.categoryId === cat.id || m.category === cat.name)
      ).length;
      if (completedInCategory > 0) {
        stats.nftsByCategory[cat.name] = completedInCategory;
      }
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const xrplService = require('../services/xrplService');
const db = require('../services/database');

// GET /api/xrpl/status - Status de la connexion XRPL
router.get('/status', async (req, res) => {
  try {
    const client = await xrplService.connect();
    const serverInfo = await client.request({ command: 'server_info' });
    
    res.json({
      success: true,
      data: {
        connected: client.isConnected(),
        server: serverInfo.result.info.pubkey_node,
        ledgerIndex: serverInfo.result.info.validated_ledger?.seq,
        network: 'testnet'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/xrpl/account/:address - Infos d'un compte XRPL
router.get('/account/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const balance = await xrplService.getBalance(address);
    const nfts = await xrplService.getNFTs(address);
    const tokenBalances = await xrplService.getTokenBalances(address);

    res.json({
      success: true,
      data: {
        address,
        xrpBalance: balance,
        nftsCount: nfts.length,
        nfts,
        tokenBalances
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/xrpl/wallet - Créer un nouveau wallet (pour tests)
router.post('/wallet', async (req, res) => {
  try {
    const wallet = await xrplService.createWallet();
    res.json({ success: true, data: wallet });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/xrpl/nfts/:address - NFTs d'une adresse avec métadonnées décodées
router.get('/nfts/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const nfts = await xrplService.getNFTs(address);
    
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/xrpl/my-wallet - Infos du wallet de l'utilisateur connecté
router.get('/my-wallet', async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Aucun wallet associé à ce compte' 
      });
    }

    // Récupérer le solde XRP en temps réel depuis la blockchain
    const xrpBalance = await xrplService.getBalance(user.walletAddress);
    const nfts = await xrplService.getNFTs(user.walletAddress);
    
    // Récupérer les transactions de la DB
    const transactions = db.getTransactionsByWallet(user.walletAddress);

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

    res.json({
      success: true,
      data: {
        address: user.walletAddress,
        xrpBalance: parseFloat(xrpBalance),
        nftsCount: nfts.length,
        nfts: decodedNFTs,
        transactions: transactions.slice(-20), // 20 dernières transactions
        totalReceived: transactions
          .filter(t => t.to === user.walletAddress && t.status === 'completed')
          .reduce((sum, t) => sum + (t.amount || 0), 0),
        totalSent: transactions
          .filter(t => t.from === user.walletAddress && t.status === 'completed')
          .reduce((sum, t) => sum + (t.amount || 0), 0)
      }
    });
  } catch (error) {
    console.error('Erreur récupération wallet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/xrpl/my-transactions - Transactions de l'utilisateur connecté
router.get('/my-transactions', async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.walletAddress) {
      return res.json({ success: true, data: [] });
    }

    const transactions = db.getTransactionsByWallet(user.walletAddress);
    
    // Enrichir avec les noms des participants
    const enrichedTransactions = transactions.map(tx => {
      const fromUser = db.getAllUsers().find(u => u.walletAddress === tx.from);
      const toUser = db.getAllUsers().find(u => u.walletAddress === tx.to);
      const mission = tx.missionId ? db.getMissionById(tx.missionId) : null;
      
      return {
        ...tx,
        fromName: fromUser?.name || tx.from,
        toName: toUser?.name || tx.to,
        missionTitle: mission?.title || null
      };
    });

    res.json({ success: true, data: enrichedTransactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/xrpl/refresh-balance - Rafraîchir le solde depuis la blockchain
router.post('/refresh-balance', async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Aucun wallet associé' 
      });
    }

    const xrpBalance = await xrplService.getBalance(user.walletAddress);
    
    res.json({
      success: true,
      data: {
        address: user.walletAddress,
        xrpBalance: parseFloat(xrpBalance),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

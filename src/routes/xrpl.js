const express = require('express');
const router = express.Router();
const xrplService = require('../services/xrplService');
const db = require('../services/supabase');
const { authenticate } = require('../middleware/auth');

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
router.get('/my-wallet', authenticate, async (req, res) => {
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
    const transactions = await db.getTransactionsByWallet(user.walletAddress);

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
router.get('/my-transactions', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.walletAddress) {
      return res.json({ success: true, data: [] });
    }

    const transactions = await db.getTransactionsByWallet(user.walletAddress);
    const allUsers = await db.getAllUsers();
    
    // Enrichir avec les noms des participants
    const enrichedTransactions = await Promise.all(transactions.map(async (tx) => {
      const fromUser = allUsers.find(u => u.walletAddress === tx.from);
      const toUser = allUsers.find(u => u.walletAddress === tx.to);
      const mission = tx.missionId ? await db.getMissionById(tx.missionId) : null;
      
      return {
        ...tx,
        fromName: fromUser?.name || tx.from,
        toName: toUser?.name || tx.to,
        missionTitle: mission?.title || null
      };
    }));

    res.json({ success: true, data: enrichedTransactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/xrpl/refresh-balance - Rafraîchir le solde depuis la blockchain
router.post('/refresh-balance', authenticate, async (req, res) => {
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

// POST /api/xrpl/fund-wallet - Ajouter des fonds au wallet (via testnet faucet)
router.post('/fund-wallet', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { amountEUR } = req.body; // Montant en EUR fictif
    
    if (!user.walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Aucun wallet associé' 
      });
    }

    if (!amountEUR || amountEUR <= 0 || amountEUR > 1000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Montant invalide (1-1000 EUR)' 
      });
    }

    // Conversion fictive: 1 EUR = 0.5 XRP (taux fictif pour la démo)
    const amountXRP = Math.floor(amountEUR * 0.5 * 100) / 100; // Arrondi à 2 décimales

    // Sur le testnet, on peut utiliser le faucet pour ajouter des fonds
    // Comme on ne peut pas appeler le faucet directement via API,
    // on va créer un wallet temporaire avec des fonds et transférer
    console.log(`💰 Demande d'ajout de fonds: ${amountEUR} EUR → ${amountXRP} XRP pour ${user.walletAddress}`);
    
    // Créer un wallet temporaire avec des fonds (le testnet faucet donne ~1000 XRP)
    const tempWallet = await xrplService.createWallet();
    console.log(`✅ Wallet temporaire créé avec ${tempWallet.balance} XRP`);

    // Transférer les XRP du wallet temporaire vers le wallet de l'utilisateur
    const result = await xrplService.sendXRP(
      { seed: tempWallet.seed },
      user.walletAddress,
      amountXRP
    );

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Échec du transfert: ' + (result.error || 'Erreur inconnue')
      });
    }

    // Enregistrer la transaction dans la base de données
    const transaction = await db.createTransaction({
      type: 'deposit',
      amount: amountXRP,
      fromUserId: null, // Pas d'utilisateur source (système)
      toUserId: user.id,
      from: tempWallet.address,
      to: user.walletAddress,
      txHash: result.txHash,
      status: 'completed',
      description: `Dépôt de ${amountEUR} EUR (≈ ${amountXRP} XRP)`
    });
    
    // Ajouter le montant EUR pour l'affichage (pas dans la DB)
    transaction.amountEUR = amountEUR;

    // Récupérer le nouveau solde
    const newBalance = await xrplService.getBalance(user.walletAddress);

    res.json({
      success: true,
      data: {
        amountEUR,
        amountXRP,
        txHash: result.txHash,
        newBalance: parseFloat(newBalance),
        address: user.walletAddress,
        message: `${amountXRP} XRP ajoutés avec succès !`
      }
    });
  } catch (error) {
    console.error('❌ Erreur ajout de fonds:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

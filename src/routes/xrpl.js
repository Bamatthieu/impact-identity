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

    // Récupérer le solde XRP en temps réel depuis la blockchain UNIQUEMENT
    let xrpBalance = 0;
    try {
      xrpBalance = parseFloat(await xrplService.getBalance(user.walletAddress)) || 0;
    } catch (e) {
      console.log('Impossible de récupérer le solde blockchain:', e.message);
    }
    
    // Récupérer les NFTs depuis la blockchain
    const nfts = await xrplService.getNFTs(user.walletAddress);
    
    // Récupérer l'historique des transactions depuis la blockchain
    let blockchainTransactions = [];
    try {
      blockchainTransactions = await xrplService.getTransactionHistory(user.walletAddress);
    } catch (e) {
      console.log('Impossible de récupérer les transactions blockchain:', e.message);
    }

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

    // Calculer les totaux reçus/envoyés à partir des transactions blockchain
    const totalReceived = blockchainTransactions
      .filter(t => t.destination === user.walletAddress)
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    const totalSent = blockchainTransactions
      .filter(t => t.account === user.walletAddress)
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    console.log(`💰 Wallet ${user.walletAddress}: solde blockchain = ${xrpBalance} XRP`);

    res.json({
      success: true,
      data: {
        address: user.walletAddress,
        xrpBalance: xrpBalance, // Solde blockchain uniquement
        nftsCount: nfts.length,
        nfts: decodedNFTs,
        transactions: blockchainTransactions.slice(-20), // 20 dernières transactions blockchain
        totalReceived,
        totalSent
      }
    });
  } catch (error) {
    console.error('Erreur récupération wallet:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/xrpl/my-transactions - Transactions de l'utilisateur connecté (depuis la blockchain)
router.get('/my-transactions', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.walletAddress) {
      return res.json({ success: true, data: [] });
    }

    // Récupérer les transactions depuis la blockchain XRPL
    let blockchainTransactions = [];
    try {
      blockchainTransactions = await xrplService.getTransactionHistory(user.walletAddress);
    } catch (e) {
      console.log('Erreur récupération transactions blockchain:', e.message);
    }

    // Récupérer tous les utilisateurs pour enrichir les noms
    const allUsers = await db.getAllUsers();
    
    // Enrichir avec les noms des participants
    const enrichedTransactions = blockchainTransactions.map(tx => {
      const fromUser = allUsers.find(u => u.walletAddress === tx.from);
      const toUser = allUsers.find(u => u.walletAddress === tx.to);
      
      return {
        ...tx,
        fromName: fromUser?.name || (tx.isIncoming ? 'Externe' : 'Vous'),
        toName: toUser?.name || (tx.isOutgoing ? 'Externe' : 'Vous')
      };
    });

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

// POST /api/xrpl/fund-wallet - Ajouter des fonds au wallet via transfert depuis un wallet système
router.post('/fund-wallet', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { amountEUR } = req.body;
    
    console.log('📥 Fund wallet request:', { userId: user?.id, amountEUR, walletAddress: user?.walletAddress });
    
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

    // Conversion: 1 EUR = 0.5 XRP (taux fictif)
    const amountXRP = Math.floor(amountEUR * 0.5 * 100) / 100;

    // Récupérer le solde AVANT
    let balanceBefore = 0;
    try {
      balanceBefore = parseFloat(await xrplService.getBalance(user.walletAddress)) || 0;
    } catch (e) {
      console.log('Solde avant: impossible à récupérer');
    }

    console.log(`💰 Demande d'ajout de ${amountXRP} XRP pour ${user.walletAddress} (solde actuel: ${balanceBefore} XRP)`);
    
    const xrpl = require('xrpl');
    const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    await client.connect();
    
    try {
      // 1. Créer un nouveau wallet système avec des fonds du faucet
      console.log('🏦 Création d\'un wallet système temporaire...');
      const { wallet: systemWallet, balance: systemBalance } = await client.fundWallet();
      console.log(`✅ Wallet système créé: ${systemWallet.address} avec ${systemBalance} XRP`);
      
      // 2. Envoyer les XRP du wallet système vers le wallet de l'utilisateur
      console.log(`💸 Transfert de ${amountXRP} XRP vers ${user.walletAddress}...`);
      
      const payment = {
        TransactionType: 'Payment',
        Account: systemWallet.address,
        Destination: user.walletAddress,
        Amount: xrpl.xrpToDrops(amountXRP.toString())
      };
      
      const prepared = await client.autofill(payment);
      const signed = systemWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);
      
      const success = result.result.meta.TransactionResult === 'tesSUCCESS';
      const txHash = result.result.hash;
      
      console.log(`📤 Transaction: ${txHash} - ${success ? 'SUCCESS' : 'FAILED'}`);
      
      if (!success) {
        throw new Error(`Transaction échouée: ${result.result.meta.TransactionResult}`);
      }
      
      // 3. Récupérer le nouveau solde
      const newBalance = parseFloat(await xrplService.getBalance(user.walletAddress)) || 0;
      
      console.log(`✅ Fonds ajoutés: +${amountXRP} XRP | Nouveau solde: ${newBalance} XRP`);

      await client.disconnect();

      res.json({
        success: true,
        data: {
          amountEUR,
          amountXRP,
          txHash,
          newBalance,
          address: user.walletAddress,
          message: `${amountXRP} XRP ajoutés avec succès !`
        }
      });
    } catch (transferError) {
      await client.disconnect();
      console.error('❌ Erreur transfert:', transferError.message);
      
      return res.status(500).json({
        success: false,
        error: 'Erreur lors du transfert de fonds',
        details: transferError.message
      });
    }
  } catch (error) {
    console.error('❌ Erreur ajout de fonds:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const xrpl = require('xrpl');
const config = require('../config');

class XRPLService {
  constructor() {
    this.client = null;
    this.issuerWallet = null;
  }

  async connect() {
    if (this.client && this.client.isConnected()) {
      return this.client;
    }
    
    this.client = new xrpl.Client(config.xrpl.server);
    await this.client.connect();
    console.log('✅ Connecté au XRPL Testnet');
    return this.client;
  }

  async disconnect() {
    if (this.client && this.client.isConnected()) {
      await this.client.disconnect();
      console.log('🔌 Déconnecté du XRPL');
    }
  }

  // Créer un nouveau wallet (pour un nouvel utilisateur)
  async createWallet() {
    await this.connect();
    const { wallet, balance } = await this.client.fundWallet();
    return {
      address: wallet.address,
      seed: wallet.seed,
      publicKey: wallet.publicKey,
      balance: balance
    };
  }

  // Récupérer le solde d'un wallet
  async getBalance(address) {
    await this.connect();
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      return xrpl.dropsToXrp(response.result.account_data.Balance);
    } catch (error) {
      if (error.data?.error === 'actNotFound') {
        return 0;
      }
      throw error;
    }
  }

  // Envoyer des XRP d'un wallet à un autre
  async sendXRP(fromWallet, toAddress, amountXRP) {
    await this.connect();
    
    try {
      const senderWallet = xrpl.Wallet.fromSeed(fromWallet.seed);
      
      // Convertir XRP en drops (1 XRP = 1,000,000 drops)
      const amountDrops = xrpl.xrpToDrops(amountXRP.toString());
      
      const transaction = {
        TransactionType: 'Payment',
        Account: senderWallet.address,
        Destination: toAddress,
        Amount: amountDrops
      };

      const prepared = await this.client.autofill(transaction);
      const signed = senderWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      const success = result.result.meta.TransactionResult === 'tesSUCCESS';
      
      console.log(`💸 Transfert XRP: ${amountXRP} XRP de ${senderWallet.address} vers ${toAddress} - ${success ? 'Succès' : 'Échec'}`);

      return {
        success,
        txHash: result.result.hash,
        amount: amountXRP,
        from: senderWallet.address,
        to: toAddress,
        transactionResult: result.result.meta.TransactionResult
      };
    } catch (error) {
      console.error('❌ Erreur transfert XRP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mint un NFT Proof-of-Impact (mission completion)
  async mintNFT(wallet, metadata) {
    await this.connect();
    
    const userWallet = xrpl.Wallet.fromSeed(wallet.seed);
    
    // Convertir les métadonnées en hex
    const metadataHex = Buffer.from(JSON.stringify(metadata)).toString('hex').toUpperCase();
    
    const transactionBlob = {
      TransactionType: 'NFTokenMint',
      Account: userWallet.address,
      URI: metadataHex,
      Flags: 8, // tfTransferable
      NFTokenTaxon: 0 // Taxon 0 = Mission NFT
    };

    const prepared = await this.client.autofill(transactionBlob);
    const signed = userWallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    // Récupérer le NFTokenID
    const nfts = await this.getNFTs(userWallet.address);
    const latestNFT = nfts[nfts.length - 1];

    return {
      success: result.result.meta.TransactionResult === 'tesSUCCESS',
      txHash: result.result.hash,
      nftokenId: latestNFT?.NFTokenID || null,
      metadata: metadata
    };
  }

  // Mint un NFT Badge pour un nouveau niveau citoyen
  async mintBadgeNFT(wallet, badgeMetadata, retryCount = 0) {
    await this.connect();
    
    try {
      const userWallet = xrpl.Wallet.fromSeed(wallet.seed);
      
      // Attente progressive en cas de retry
      if (retryCount === 0) {
        // Petit délai initial pour laisser respirer le compte
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // ---------------------------------------------------------
      // 1. OPTIMISATION DES MÉTADONNÉES (Fix URI trop longue)
      // ---------------------------------------------------------
      // On raccourcit les clés pour tenir dans 256 bytes
      const metadata = {
        t: 'badge',                       // type -> t
        lvl: badgeMetadata.levelName,     // levelName -> lvl
        icon: badgeMetadata.levelIcon,    // levelIcon -> icon
        pts: badgeMetadata.totalPoints,   // totalPoints -> pts
        d: new Date().toISOString().split('T')[0] // Date courte YYYY-MM-DD
        // On supprime 'description' et 'platform' qui prennent trop de place
      };
      
      const metadataStr = JSON.stringify(metadata);
      
      // Vérification avant conversion
      if (Buffer.byteLength(metadataStr, 'utf8') > 256) {
         console.warn("⚠️ Attention: Metadata encore trop longue, tentative de réduction ultime...");
         delete metadata.icon; // On sacrifie l'icone si nécessaire
      }

      const metadataHex = Buffer.from(JSON.stringify(metadata)).toString('hex').toUpperCase();
      
      console.log(`🏅 Minting Badge NFT: ${badgeMetadata.levelName} pour ${userWallet.address}`);
      
      // ---------------------------------------------------------
      // 2. GESTION DU LEDGER SEQUENCE (Fix Timeout)
      // ---------------------------------------------------------
      // On récupère le ledger tout frais, APRÈS toutes les attentes
      const currentLedgerIndex = await this.client.getLedgerIndex();
      console.log(`📊 Ledger actuel: ${currentLedgerIndex}, fenêtre jusqu'à ${currentLedgerIndex + 50}`);
      
      const transaction = {
        TransactionType: 'NFTokenMint',
        Account: userWallet.address,
        URI: metadataHex,
        Flags: 8, // 8 = tfTransferable (souvent mieux pour compatibilité), 0 = Soulbound
        NFTokenTaxon: 1, 
        // On donne une fenêtre large de ~3 minutes (50 ledgers)
        LastLedgerSequence: currentLedgerIndex + 50
      };

      // Submit gère l'autofill, la signature et l'envoi
      // On ne passe PAS 'autofill: true' explicitement pour LastLedgerSequence car on l'a défini manuellement
      // Mais xrpl.js va autofill Sequence et Fee automatiquement.
      const submitResponse = await this.client.submit(transaction, { 
        wallet: userWallet 
      });
      
      const txHash = submitResponse.result.tx_json?.hash || submitResponse.result.hash;
      const engineResult = submitResponse.result.engine_result;
      
      console.log(`📤 Badge NFT transaction soumise: ${txHash} (${engineResult})`);
      
      // Vérification stricte
      const isAccepted = engineResult === 'tesSUCCESS' || engineResult.startsWith('tes');
      
      if (!isAccepted) {
        throw new Error(`Transaction rejected: ${engineResult} - ${submitResponse.result.engine_result_message}`);
      }
      
      // Attente validation du réseau
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Récupération du TokenID (identique à votre code)
      let nftokenId = null;
      try {
        const nfts = await this.getNFTs(userWallet.address);
        const latestNFT = nfts[nfts.length - 1];
        nftokenId = latestNFT?.NFTokenID || null;
      } catch (nftError) {
        console.log(`⚠️ NFT minté mais ID pas encore visible: ${nftError.message}`);
      }

      console.log(`✅ Badge NFT ${badgeMetadata.levelName}: Succès (${txHash})`);

      return {
        success: true,
        txHash: txHash,
        nftokenId: nftokenId,
        metadata: metadata,
        levelName: badgeMetadata.levelName,
        levelIcon: badgeMetadata.levelIcon
      };

    } catch (error) {
      console.error('❌ Erreur mint Badge NFT:', error.message);
      
      // Retry intelligent
      if (retryCount < 2 && (
        error.message.includes('Sequence') || 
        error.message.includes('temMALFORMED') || // Parfois temMALFORMED est temporaire sur testnet
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET')
      )) {
        console.log(`🔄 Retry mint Badge NFT (tentative ${retryCount + 2}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.mintBadgeNFT(wallet, badgeMetadata, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message,
        levelName: badgeMetadata.levelName
      };
    }
  }

  // Récupérer les NFTs d'un compte
  async getNFTs(address) {
    await this.connect();
    try {
      const response = await this.client.request({
        command: 'account_nfts',
        account: address
      });
      return response.result.account_nfts || [];
    } catch (error) {
      if (error.data?.error === 'actNotFound') {
        return [];
      }
      throw error;
    }
  }

  // Créer un MPToken (ImpactPoints) - Issuer setup
  async createMPTokenIssuance(issuerWallet, maxAmount = '1000000000') {
    await this.connect();
    
    const wallet = xrpl.Wallet.fromSeed(issuerWallet.seed);
    
    // Note: MPToken est une fonctionnalité plus récente du XRPL
    // Pour le MVP, on utilise un Trust Line classique comme alternative
    const transaction = {
      TransactionType: 'TrustSet',
      Account: wallet.address,
      LimitAmount: {
        currency: 'IMP', // ImpactPoints
        issuer: wallet.address,
        value: maxAmount
      }
    };

    const prepared = await this.client.autofill(transaction);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    return {
      success: result.result.meta.TransactionResult === 'tesSUCCESS',
      txHash: result.result.hash,
      currency: 'IMP',
      issuer: wallet.address
    };
  }

  // Envoyer des ImpactPoints à un utilisateur
  async sendImpactPoints(issuerWallet, destinationAddress, amount) {
    await this.connect();
    
    const wallet = xrpl.Wallet.fromSeed(issuerWallet.seed);
    
    const transaction = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: destinationAddress,
      Amount: {
        currency: 'IMP',
        issuer: wallet.address,
        value: amount.toString()
      }
    };

    const prepared = await this.client.autofill(transaction);
    const signed = wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    return {
      success: result.result.meta.TransactionResult === 'tesSUCCESS',
      txHash: result.result.hash,
      amount: amount,
      destination: destinationAddress
    };
  }

  // Récupérer les balances (incluant ImpactPoints)
  async getTokenBalances(address) {
    await this.connect();
    try {
      const response = await this.client.request({
        command: 'account_lines',
        account: address
      });
      return response.result.lines || [];
    } catch (error) {
      if (error.data?.error === 'actNotFound') {
        return [];
      }
      throw error;
    }
  }

  // Vérifier le statut de connexion
  async getConnectionStatus() {
    try {
      await this.connect();
      return {
        connected: this.client?.isConnected() || false,
        network: 'testnet',
        serverUrl: config.xrpl.server
      };
    } catch (error) {
      return {
        connected: false,
        network: 'testnet',
        serverUrl: config.xrpl.server,
        error: error.message
      };
    }
  }

  // Récupérer les infos d'un compte
  async getAccountInfo(address) {
    await this.connect();
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      return {
        address: address,
        balance: xrpl.dropsToXrp(response.result.account_data.Balance),
        sequence: response.result.account_data.Sequence,
        ownerCount: response.result.account_data.OwnerCount
      };
    } catch (error) {
      if (error.data?.error === 'actNotFound') {
        return {
          address: address,
          balance: 0,
          activated: false
        };
      }
      throw error;
    }
  }
}

module.exports = new XRPLService();

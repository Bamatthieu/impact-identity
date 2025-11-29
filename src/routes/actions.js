const express = require('express');
const router = express.Router();
const db = require('../services/database');
const xrplService = require('../services/xrplService');

// GET /api/actions - Liste toutes les actions
router.get('/', (req, res) => {
  const { status, userId } = req.query;
  let actions = db.getAllActions();

  if (status) {
    actions = actions.filter(a => a.status === status);
  }
  if (userId) {
    actions = actions.filter(a => a.userId === userId);
  }

  const enrichedActions = actions.map(action => {
    const actionType = db.getActionTypeById(action.actionTypeId);
    const user = db.getUserById(action.userId);
    return {
      ...action,
      actionType,
      user: user ? { id: user.id, name: user.name } : null
    };
  });

  res.json({ success: true, data: enrichedActions });
});

// GET /api/actions/types - Liste les types d'actions disponibles
router.get('/types', (req, res) => {
  const actionTypes = db.getActionTypes();
  res.json({ success: true, data: actionTypes });
});

// GET /api/actions/pending - Actions en attente de validation
router.get('/pending', (req, res) => {
  const actions = db.getPendingActions();
  const enrichedActions = actions.map(action => {
    const actionType = db.getActionTypeById(action.actionTypeId);
    const user = db.getUserById(action.userId);
    return {
      ...action,
      actionType,
      user: user ? { id: user.id, name: user.name, walletAddress: user.walletAddress } : null
    };
  });
  res.json({ success: true, data: enrichedActions });
});

// POST /api/actions - Soumettre une nouvelle action
router.post('/', (req, res) => {
  try {
    const { userId, actionTypeId, description, proof } = req.body;

    if (!userId || !actionTypeId) {
      return res.status(400).json({ success: false, error: 'userId et actionTypeId requis' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const actionType = db.getActionTypeById(actionTypeId);
    if (!actionType) {
      return res.status(404).json({ success: false, error: 'Type d\'action non trouvé' });
    }

    const action = db.createAction({
      userId,
      actionTypeId,
      description: description || '',
      proof: proof || null,
      points: actionType.points
    });

    res.status(201).json({
      success: true,
      data: { ...action, actionType }
    });
  } catch (error) {
    console.error('Erreur création action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/actions/:id - Détails d'une action
router.get('/:id', (req, res) => {
  const action = db.getActionById(req.params.id);
  if (!action) {
    return res.status(404).json({ success: false, error: 'Action non trouvée' });
  }

  const actionType = db.getActionTypeById(action.actionTypeId);
  const user = db.getUserById(action.userId);

  res.json({
    success: true,
    data: { ...action, actionType, user: user ? { id: user.id, name: user.name } : null }
  });
});

// POST /api/actions/:id/validate - Valider une action (admin) et mint NFT
router.post('/:id/validate', async (req, res) => {
  try {
    const action = db.getActionById(req.params.id);
    if (!action) {
      return res.status(404).json({ success: false, error: 'Action non trouvée' });
    }

    if (action.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Action déjà traitée' });
    }

    const user = db.getUserById(action.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const actionType = db.getActionTypeById(action.actionTypeId);

    // Mint le NFT Proof-of-Impact
    console.log('🔄 Minting NFT pour action:', action.id);
    const nftMetadata = {
      name: `Proof of Impact - ${actionType.name}`,
      description: action.description || actionType.name,
      category: actionType.category,
      points: actionType.points,
      actionId: action.id,
      userId: user.id,
      userName: user.name,
      validatedAt: new Date().toISOString(),
      icon: actionType.icon
    };

    const nftResult = await xrplService.mintNFT(
      { seed: user.walletSeed },
      nftMetadata
    );
    console.log('✅ NFT minté:', nftResult);

    // Mettre à jour l'action
    const updatedAction = db.updateAction(action.id, {
      status: 'validated',
      validatedAt: new Date().toISOString(),
      nftTokenId: nftResult.nftokenId,
      nftTxHash: nftResult.txHash
    });

    // Mettre à jour les points et le compteur de l'utilisateur
    db.updateUser(user.id, {
      totalPoints: user.totalPoints + actionType.points,
      totalActions: user.totalActions + 1
    });

    // Vérifier et attribuer les badges
    const newBadges = db.checkAndAwardBadges(user.id);

    res.json({
      success: true,
      data: {
        action: { ...updatedAction, actionType },
        nft: nftResult,
        pointsAwarded: actionType.points,
        newBadges
      }
    });
  } catch (error) {
    console.error('Erreur validation action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/actions/:id/reject - Rejeter une action
router.post('/:id/reject', (req, res) => {
  const { reason } = req.body;
  const action = db.getActionById(req.params.id);
  
  if (!action) {
    return res.status(404).json({ success: false, error: 'Action non trouvée' });
  }

  if (action.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Action déjà traitée' });
  }

  const updatedAction = db.updateAction(action.id, {
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason || 'Non spécifiée'
  });

  res.json({ success: true, data: updatedAction });
});

module.exports = router;

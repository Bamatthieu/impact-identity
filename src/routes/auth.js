const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../services/supabase');
const xrplService = require('../services/xrplService');

// POST /api/auth/register - Inscription (Client ou Organisation)
router.post('/register', async (req, res) => {
  console.log('📝 Tentative d\'inscription:', {
    email: req.body.email,
    role: req.body.role,
    organizationName: req.body.organizationName
  });
  
  try {
    const { 
      name, 
      email, 
      password, 
      role, // 'client' ou 'organization'
      // Champs pour les organisations
      organizationName,
      organizationType,
      siret,
      sector,
      description,
      phone,
      address
    } = req.body;

    // Validation de base
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    // Vérifier si role est valide (client ou organization seulement)
    if (!role || !['client', 'organization'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Rôle invalide. Choisissez "client" ou "organization"' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Cet email est déjà utilisé' });
    }

    // Validation pour les clients
    if (role === 'client' && !name) {
      return res.status(400).json({ success: false, error: 'Nom requis pour les clients' });
    }

    // Validation spécifique pour les organisations
    if (role === 'organization') {
      if (!organizationName || !organizationType || !description) {
        return res.status(400).json({ 
          success: false, 
          error: 'Nom, type et description de l\'organisation requis' 
        });
      }
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un wallet XRPL
    let wallet = null;
    try {
      console.log('🔄 Création du wallet XRPL...');
      wallet = await xrplService.createWallet();
      console.log('✅ Wallet créé:', wallet.address);
    } catch (error) {
      console.error('Erreur création wallet:', error);
    }

    // Données utilisateur de base
    const userData = {
      name: role === 'organization' ? organizationName : name,
      email,
      password: hashedPassword,
      role,
      walletAddress: wallet?.address || null,
      walletSeed: wallet?.seed || null
    };

    // Données supplémentaires pour les organisations
    if (role === 'organization') {
      userData.organizationType = organizationType;
      userData.siret = siret || null;
      userData.sector = sector || null;
      userData.description = description;
      userData.phone = phone || null;
      userData.address = address || null;
    }

    const user = await db.createUser(userData);

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    // Préparer la réponse
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      walletAddress: user.walletAddress,
      totalPoints: user.totalPoints,
      createdAt: user.createdAt
    };

    if (role === 'organization') {
      userResponse.organizationType = user.organizationType;
      userResponse.description = user.description;
    }

    res.status(201).json({
      success: true,
      message: role === 'organization' 
        ? 'Organisation créée. En attente de validation par l\'administrateur.'
        : 'Compte créé avec succès',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login - Connexion
router.post('/login', async (req, res) => {
  console.log('🔐 Tentative de connexion:', req.body.email);
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }

    const user = await db.getUserByEmail(email);
    console.log('👤 Utilisateur trouvé:', user ? { id: user.id, email: user.email, role: user.role } : 'NON TROUVÉ');
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le statut pour les organisations
    if (user.role === 'organization' && user.status === 'pending') {
      return res.status(403).json({ 
        success: false, 
        error: 'Votre organisation est en attente de validation par l\'administrateur' 
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        success: false, 
        error: 'Votre compte a été rejeté par l\'administrateur' 
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      walletAddress: user.walletAddress,
      totalPoints: user.totalPoints,
      completedMissions: user.completedMissions,
      badges: user.badges,
      createdAt: user.createdAt
    };

    if (user.role === 'organization') {
      userResponse.organizationType = user.organizationType;
      userResponse.description = user.description;
    }

    res.json({
      success: true,
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me - Récupérer l'utilisateur connecté
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await db.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const badges = await db.getUserBadges(user.id);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      walletAddress: user.walletAddress,
      totalPoints: user.totalPoints,
      completedMissions: user.completedMissions,
      badges,
      createdAt: user.createdAt
    };

    if (user.role === 'organization') {
      userResponse.organizationType = user.organizationType;
      userResponse.description = user.description;
      userResponse.siret = user.siret;
      userResponse.phone = user.phone;
      userResponse.address = user.address;
    }

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/organization-types - Types d'organisations disponibles
router.get('/organization-types', async (req, res) => {
  const types = await db.getOrganizationTypes();
  res.json({
    success: true,
    data: types
  });
});

module.exports = router;

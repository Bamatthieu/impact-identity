const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../services/supabase');

// Middleware pour vérifier l'authentification
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentification requise' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
      walletAddress: user.walletAddress,
      walletSeed: user.walletSeed
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// Middleware pour vérifier le rôle admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// Middleware pour vérifier le rôle client ou admin
const requireClient = (req, res, next) => {
  if (req.user.role !== 'client' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès non autorisé' });
  }
  next();
};

// Middleware générique pour vérifier un ou plusieurs rôles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Accès réservé aux: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

// Middleware pour vérifier que l'organisation est active
const requireActiveOrganization = (req, res, next) => {
  if (req.user.role === 'organization' && req.user.status !== 'active') {
    return res.status(403).json({ 
      success: false, 
      error: 'Votre organisation doit être validée par l\'administrateur' 
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireClient,
  requireRole,
  requireActiveOrganization
};

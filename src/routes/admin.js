const express = require('express');
const router = express.Router();
const db = require('../services/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// Toutes les routes admin nécessitent d'être admin
router.use(authenticate, requireRole(['admin']));

// GET /api/admin/stats - Statistiques globales
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/organizations - Liste des organisations
router.get('/organizations', async (req, res) => {
  try {
    const { status } = req.query; // 'pending', 'active', 'rejected', ou vide pour toutes
    
    let organizations = await db.getUsersByRole('organization');
    
    if (status) {
      organizations = organizations.filter(org => org.status === status);
    }

    const orgTypes = await db.getOrganizationTypes();
    
    const enrichedOrgs = await Promise.all(organizations.map(async (org) => {
      const missions = await db.getMissionsByOrganization(org.id);
      const orgType = orgTypes.find(t => t.id === org.organizationType || t.name === org.organizationType);
      
      return {
        id: org.id,
        name: org.name,
        email: org.email,
        organizationType: org.organizationType,
        organizationTypeName: orgType?.name,
        siret: org.siret,
        description: org.description,
        phone: org.phone,
        address: org.address,
        status: org.status,
        walletAddress: org.walletAddress,
        missionsCount: missions.length,
        createdAt: org.createdAt
      };
    }));

    res.json({
      success: true,
      data: enrichedOrgs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/organizations/pending - Organisations en attente de validation
router.get('/organizations/pending', async (req, res) => {
  try {
    const pendingOrgs = await db.getPendingOrganizations();
    const orgTypes = await db.getOrganizationTypes();
    
    const enrichedOrgs = pendingOrgs.map(org => {
      const orgType = orgTypes.find(t => t.id === org.organizationType || t.name === org.organizationType);
      
      return {
        id: org.id,
        name: org.name,
        email: org.email,
        organizationType: org.organizationType,
        organizationTypeName: orgType?.name,
        siret: org.siret,
        description: org.description,
        phone: org.phone,
        address: org.address,
        status: org.status,
        walletAddress: org.walletAddress,
        createdAt: org.createdAt
      };
    });

    res.json({
      success: true,
      data: enrichedOrgs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/organizations/:id/approve - Approuver une organisation
router.put('/organizations/:id/approve', async (req, res) => {
  try {
    const org = await db.getUserById(req.params.id);
    
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organisation non trouvée' });
    }

    if (org.role !== 'organization') {
      return res.status(400).json({ success: false, error: 'Cet utilisateur n\'est pas une organisation' });
    }

    const updatedOrg = await db.updateUser(req.params.id, { 
      status: 'active'
    });

    res.json({
      success: true,
      message: 'Organisation approuvée',
      data: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        status: updatedOrg.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/organizations/:id/reject - Rejeter une organisation
router.put('/organizations/:id/reject', async (req, res) => {
  try {
    const org = await db.getUserById(req.params.id);
    
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organisation non trouvée' });
    }

    if (org.role !== 'organization') {
      return res.status(400).json({ success: false, error: 'Cet utilisateur n\'est pas une organisation' });
    }

    const { reason } = req.body;

    const updatedOrg = await db.updateUser(req.params.id, { 
      status: 'rejected'
    });

    res.json({
      success: true,
      message: 'Organisation rejetée',
      data: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        status: updatedOrg.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/users - Liste des utilisateurs (clients)
router.get('/users', async (req, res) => {
  try {
    const clients = await db.getUsersByRole('client');
    const allBadges = await db.getBadges();
    
    const enrichedUsers = await Promise.all(clients.map(async (user) => {
      const applications = await db.getApplicationsByUser(user.id);
      const userBadges = await db.getUserBadges(user.id);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        walletAddress: user.walletAddress,
        totalPoints: user.totalPoints,
        completedMissions: user.completedMissions,
        totalApplications: applications.length,
        badges: userBadges,
        createdAt: user.createdAt
      };
    }));

    res.json({
      success: true,
      data: enrichedUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/missions - Toutes les missions
router.get('/missions', async (req, res) => {
  try {
    const { status, organizationId } = req.query;
    
    let missions = await db.getAllMissions();
    
    if (status) {
      missions = missions.filter(m => m.status === status);
    }
    
    if (organizationId) {
      missions = missions.filter(m => m.organizationId === organizationId);
    }

    const categories = await db.getMissionCategories();
    
    const enrichedMissions = await Promise.all(missions.map(async (mission) => {
      const org = await db.getUserById(mission.organizationId);
      const category = categories.find(c => c.id === mission.categoryId || c.name === mission.category);
      const applications = await db.getApplicationsByMission(mission.id);
      
      return {
        ...mission,
        organization: org ? { id: org.id, name: org.name } : null,
        category,
        applicationsCount: applications.length,
        acceptedCount: applications.filter(a => a.status === 'accepted').length,
        completedCount: applications.filter(a => a.status === 'completed').length
      };
    }));

    res.json({
      success: true,
      data: enrichedMissions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/users/:id - Supprimer un utilisateur
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: 'Impossible de supprimer un administrateur' });
    }

    // Soft delete - on change juste le statut
    await db.updateUser(req.params.id, { 
      status: 'deleted'
    });

    res.json({
      success: true,
      message: 'Utilisateur supprimé'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/leaderboard - Classement complet
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leaderboard = await db.getLeaderboard(limit);

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

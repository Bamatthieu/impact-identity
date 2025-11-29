const express = require('express');
const router = express.Router();
const db = require('../services/database');
const { authenticate, requireRole } = require('../middleware/auth');
const xrplService = require('../services/xrplService');

// GET /api/missions - Récupérer les missions publiées (clients) ou toutes (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    let missions;
    
    if (req.user.role === 'admin') {
      missions = db.getAllMissions();
    } else if (req.user.role === 'organization') {
      missions = db.getMissionsByOrganization(req.user.id);
    } else {
      // Clients voient les missions publiées
      missions = db.getPublishedMissions();
    }

    // Enrichir avec les informations de l'organisation
    const enrichedMissions = missions.map(mission => {
      const org = db.getUserById(mission.organizationId);
      const category = db.getMissionCategories().find(c => c.id === mission.categoryId);
      return {
        ...mission,
        organization: org ? { id: org.id, name: org.name, organizationType: org.organizationType } : null,
        category
      };
    });

    res.json({
      success: true,
      data: enrichedMissions
    });
  } catch (error) {
    console.error('Erreur récupération missions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/missions/public - Missions publiques pour la map (sans auth)
router.get('/public', async (req, res) => {
  try {
    const missions = db.getPublishedMissions();
    
    const enrichedMissions = missions.map(mission => {
      const org = db.getUserById(mission.organizationId);
      const category = db.getMissionCategories().find(c => c.id === mission.categoryId);
      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        location: mission.location,
        date: mission.date,
        duration: mission.duration,
        reward: mission.reward,
        maxParticipants: mission.maxParticipants,
        applicationsCount: mission.applicationsCount,
        category,
        organization: org ? { id: org.id, name: org.name } : null
      };
    });

    res.json({
      success: true,
      data: enrichedMissions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/missions/categories - Récupérer les catégories de missions
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: db.getMissionCategories()
  });
});

// GET /api/missions/:id - Récupérer une mission spécifique
router.get('/:id', authenticate, async (req, res) => {
  try {
    const mission = db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    // Vérifier les droits d'accès
    if (req.user.role === 'client' && mission.status !== 'published') {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const org = db.getUserById(mission.organizationId);
    const category = db.getMissionCategories().find(c => c.id === mission.categoryId);
    const applications = db.getApplicationsByMission(mission.id);

    res.json({
      success: true,
      data: {
        ...mission,
        organization: org ? { id: org.id, name: org.name, organizationType: org.organizationType } : null,
        category,
        applications: req.user.role === 'organization' || req.user.role === 'admin' 
          ? applications.map(app => {
              const applicant = db.getUserById(app.userId);
              return {
                ...app,
                applicant: applicant ? { id: applicant.id, name: applicant.name, email: applicant.email } : null
              };
            })
          : undefined
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/missions - Créer une mission (organisations uniquement)
router.post('/', authenticate, requireRole(['organization']), async (req, res) => {
  try {
    // Vérifier que l'organisation est validée
    if (req.user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        error: 'Votre organisation doit être validée pour créer des missions' 
      });
    }

    const {
      title,
      description,
      categoryId,
      location, // { lat, lng, address }
      date,
      duration, // en minutes
      rewardXRP, // récompense en XRP (0-100)
      maxParticipants,
      skills,
      requirements
    } = req.body;

    // Validation
    if (!title || !description || !categoryId || !location || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Titre, description, catégorie, localisation et date requis' 
      });
    }

    if (!location.lat || !location.lng || !location.address) {
      return res.status(400).json({ 
        success: false, 
        error: 'La localisation doit contenir lat, lng et address' 
      });
    }

    // Validation de la récompense XRP (0-100)
    const validRewardXRP = Math.min(100, Math.max(0, parseFloat(rewardXRP) || 0));

    const mission = db.createMission({
      organizationId: req.user.id,
      title,
      description,
      categoryId,
      location,
      date,
      duration: duration || 60,
      rewardXRP: validRewardXRP,
      maxParticipants: maxParticipants || 10,
      skills: skills || [],
      requirements: requirements || ''
    });

    const category = db.getMissionCategories().find(c => c.id === categoryId);

    res.status(201).json({
      success: true,
      message: 'Mission créée avec succès',
      data: {
        ...mission,
        category,
        organization: { id: req.user.id, name: req.user.name }
      }
    });
  } catch (error) {
    console.error('Erreur création mission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/missions/:id - Modifier une mission
router.put('/:id', authenticate, requireRole(['organization', 'admin']), async (req, res) => {
  try {
    const mission = db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    // Vérifier les droits
    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const allowedUpdates = ['title', 'description', 'categoryId', 'location', 'date', 'duration', 'reward', 'maxParticipants', 'skills', 'requirements', 'status'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedMission = db.updateMission(req.params.id, updates);

    res.json({
      success: true,
      message: 'Mission mise à jour',
      data: updatedMission
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/missions/:id - Supprimer une mission
router.delete('/:id', authenticate, requireRole(['organization', 'admin']), async (req, res) => {
  try {
    const mission = db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    // Vérifier qu'il n'y a pas de candidatures acceptées
    const applications = db.getApplicationsByMission(mission.id);
    const hasAccepted = applications.some(a => a.status === 'accepted');
    
    if (hasAccepted) {
      return res.status(400).json({ 
        success: false, 
        error: 'Impossible de supprimer une mission avec des participants acceptés' 
      });
    }

    db.deleteMission(req.params.id);

    res.json({
      success: true,
      message: 'Mission supprimée'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/missions/:id/apply - Candidater à une mission (clients)
router.post('/:id/apply', authenticate, requireRole(['client']), async (req, res) => {
  try {
    const mission = db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (mission.status !== 'published') {
      return res.status(400).json({ success: false, error: 'Cette mission n\'est plus disponible' });
    }

    // Vérifier si déjà candidaté
    const existingApplication = db.getApplicationByUserAndMission(req.user.id, mission.id);
    if (existingApplication) {
      return res.status(400).json({ success: false, error: 'Vous avez déjà candidaté à cette mission' });
    }

    // Vérifier le nombre de participants
    const acceptedApplications = db.getApplicationsByMission(mission.id).filter(a => a.status === 'accepted');
    if (acceptedApplications.length >= mission.maxParticipants) {
      return res.status(400).json({ success: false, error: 'Cette mission est complète' });
    }

    const application = db.createApplication({
      missionId: mission.id,
      userId: req.user.id,
      message: req.body.message || ''
    });

    res.status(201).json({
      success: true,
      message: 'Candidature envoyée',
      data: application
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/missions/:id/applications - Récupérer les candidatures (organisation)
router.get('/:id/applications', authenticate, requireRole(['organization', 'admin']), async (req, res) => {
  try {
    const mission = db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const applications = db.getApplicationsByMission(mission.id);
    
    const enrichedApplications = applications.map(app => {
      const applicant = db.getUserById(app.userId);
      return {
        ...app,
        applicant: applicant ? {
          id: applicant.id,
          name: applicant.name,
          email: applicant.email,
          totalPoints: applicant.totalPoints,
          completedMissions: applicant.completedMissions
        } : null
      };
    });

    res.json({
      success: true,
      data: enrichedApplications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/missions/:id/applications/:appId - Accepter/Rejeter une candidature
router.put('/:id/applications/:appId', authenticate, requireRole(['organization', 'admin']), async (req, res) => {
  try {
    const mission = db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const application = db.getApplicationById(req.params.appId);
    
    if (!application || application.missionId !== mission.id) {
      return res.status(404).json({ success: false, error: 'Candidature non trouvée' });
    }

    const { status } = req.body; // 'accepted' ou 'rejected'
    
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut invalide' });
    }

    const previousStatus = application.status;

    // Si on accepte, vérifier qu'il reste de la place
    if (status === 'accepted' && previousStatus !== 'accepted') {
      const acceptedCount = mission.acceptedCount || 0;
      if (acceptedCount >= mission.maxParticipants) {
        return res.status(400).json({ success: false, error: 'Nombre maximum de participants atteint' });
      }
      // Incrémenter le compteur
      db.updateMission(mission.id, { acceptedCount: acceptedCount + 1 });
    }

    // Si on retire l'acceptation (passage de accepted à rejected)
    if (previousStatus === 'accepted' && status === 'rejected') {
      const acceptedCount = mission.acceptedCount || 0;
      db.updateMission(mission.id, { acceptedCount: Math.max(0, acceptedCount - 1) });
    }

    const updatedApplication = db.updateApplication(req.params.appId, { status });

    // Récupérer la mission mise à jour
    const updatedMission = db.getMissionById(mission.id);

    res.json({
      success: true,
      message: status === 'accepted' ? 'Candidature acceptée' : 'Candidature rejetée',
      data: {
        application: updatedApplication,
        mission: {
          id: updatedMission.id,
          acceptedCount: updatedMission.acceptedCount,
          maxParticipants: updatedMission.maxParticipants,
          remainingSpots: updatedMission.maxParticipants - (updatedMission.acceptedCount || 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/missions/:id/complete - Valider une mission terminée (organisation)
router.post('/:id/complete', authenticate, requireRole(['organization', 'admin']), async (req, res) => {
  try {
    const mission = db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const { participantIds } = req.body; // Liste des IDs des participants ayant complété la mission

    if (!participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ success: false, error: 'Liste des participants requise' });
    }

    const results = [];

    for (const participantId of participantIds) {
      const application = db.getApplicationByUserAndMission(participantId, mission.id);
      
      if (!application || application.status !== 'accepted') {
        continue;
      }

      // Marquer la candidature comme complétée
      db.updateApplication(application.id, { status: 'completed', completedAt: new Date().toISOString() });

      // Mettre à jour les stats du participant
      // Points = durée en heures (1h = 1pt)
      const earnedPoints = mission.points || Math.ceil((mission.duration || 60) / 60);
      
      const participant = db.getUserById(participantId);
      if (participant) {
        const newTotalPoints = (participant.totalPoints || 0) + earnedPoints;
        
        db.updateUser(participantId, {
          totalPoints: newTotalPoints,
          completedMissions: (participant.completedMissions || 0) + 1
        });

        // Déterminer le niveau citoyen
        const citizenLevel = db.getCitizenLevel(newTotalPoints);

        // Mint un NFT pour la mission avec le niveau citoyen
        let nftResult = null;
        try {
          if (participant.walletSeed) {
            nftResult = await xrplService.mintNFT(
              { seed: participant.walletSeed },
              {
                type: 'mission_completion',
                missionId: mission.id,
                missionTitle: mission.title,
                completedAt: new Date().toISOString(),
                earnedPoints: earnedPoints,
                rewardXRP: mission.rewardXRP || 0,
                citizenLevel: citizenLevel.name,
                citizenIcon: citizenLevel.icon,
                category: mission.categoryId,
                totalPoints: newTotalPoints
              }
            );
          }
        } catch (nftError) {
          console.error('Erreur mint NFT:', nftError);
        }

        // Envoyer les XRP réels si récompense définie et wallets disponibles
        let xrpResult = null;
        if (mission.rewardXRP > 0 && participant.walletAddress) {
          try {
            // Récupérer l'organisation pour avoir son wallet
            const organization = db.getUserById(mission.organizationId);
            
            if (organization && organization.walletSeed && organization.walletAddress) {
              console.log(`💰 Transfert de ${mission.rewardXRP} XRP de ${organization.name} vers ${participant.name}`);
              
              // Effectuer le transfert XRP réel sur la blockchain
              xrpResult = await xrplService.sendXRP(
                { seed: organization.walletSeed },
                participant.walletAddress,
                mission.rewardXRP
              );
              
              if (xrpResult.success) {
                console.log(`✅ Transfert XRP réussi: ${xrpResult.txHash}`);
                
                // Enregistrer la transaction dans la DB
                db.createTransaction({
                  type: 'xrp_reward',
                  from: organization.walletAddress,
                  to: participant.walletAddress,
                  amount: mission.rewardXRP,
                  currency: 'XRP',
                  missionId: mission.id,
                  participantId: participantId,
                  txHash: xrpResult.txHash,
                  status: 'completed'
                });
              } else {
                console.error('❌ Échec transfert XRP:', xrpResult.error);
              }
            } else {
              console.warn('⚠️ Organisation sans wallet, transfert XRP impossible');
              xrpResult = {
                success: false,
                error: 'Organisation sans wallet configuré'
              };
            }
          } catch (xrpError) {
            console.error('❌ Erreur envoi XRP:', xrpError);
            xrpResult = {
              success: false,
              error: xrpError.message
            };
          }
        }
        
        results.push({
          participantId,
          success: true,
          earnedPoints,
          totalPoints: newTotalPoints,
          citizenLevel: citizenLevel.name,
          rewardXRP: mission.rewardXRP || 0,
          nft: nftResult,
          xrp: xrpResult
        });

        // Vérifier et attribuer les badges
        db.checkAndAwardBadges(participantId);
      }
    }

    // Marquer la mission comme complétée
    db.updateMission(mission.id, { status: 'completed', completedAt: new Date().toISOString() });

    res.json({
      success: true,
      message: 'Mission validée',
      data: {
        mission: db.getMissionById(mission.id),
        participants: results
      }
    });
  } catch (error) {
    console.error('Erreur validation mission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

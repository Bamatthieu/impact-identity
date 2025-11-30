const express = require('express');
const router = express.Router();
const db = require('../services/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const xrplService = require('../services/xrplService');

// GET /api/missions - Récupérer les missions publiées (clients) ou toutes (admin)
router.get('/', authenticate, async (req, res) => {
  try {
    let missions;
    
    if (req.user.role === 'admin') {
      missions = await db.getAllMissions();
    } else if (req.user.role === 'organization') {
      missions = await db.getMissionsByOrganization(req.user.id);
    } else {
      // Clients voient les missions publiées
      missions = await db.getPublishedMissions();
    }

    const categories = await db.getMissionCategories();

    // Enrichir avec les informations de l'organisation
    const enrichedMissions = await Promise.all(missions.map(async (mission) => {
      const org = await db.getUserById(mission.organizationId);
      const category = categories.find(c => c.id === mission.categoryId || c.name === mission.category);
      return {
        ...mission,
        organization: org ? { id: org.id, name: org.name, organizationType: org.organizationType } : null,
        category
      };
    }));

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
    const missions = await db.getPublishedMissions();
    const categories = await db.getMissionCategories();
    
    const enrichedMissions = await Promise.all(missions.map(async (mission) => {
      const org = await db.getUserById(mission.organizationId);
      const category = categories.find(c => c.id === mission.categoryId || c.name === mission.category);
      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        location: mission.location,
        date: mission.date,
        duration: mission.duration,
        reward: mission.reward,
        rewardXRP: mission.rewardXRP,
        points: mission.points,
        maxParticipants: mission.maxParticipants,
        applicationsCount: mission.applicationsCount,
        category,
        organization: org ? { id: org.id, name: org.name } : null
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

// GET /api/missions/categories - Récupérer les catégories de missions
router.get('/categories', async (req, res) => {
  const categories = await db.getMissionCategories();
  res.json({
    success: true,
    data: categories
  });
});

// GET /api/missions/my-applications - Récupérer les candidatures de l'utilisateur connecté
router.get('/my-applications', authenticate, requireRole(['client']), async (req, res) => {
  try {
    const applications = await db.getApplicationsByUser(req.user.id);
    const categories = await db.getMissionCategories();
    
    // Enrichir avec les informations de la mission et catégorie
    const enrichedApplications = applications.map(app => {
      const category = categories.find(c => c.id === app.mission?.categoryId || c.name === app.mission?.category);
      return {
        ...app,
        mission: app.mission ? {
          ...app.mission,
          category
        } : null
      };
    });

    res.json({
      success: true,
      data: enrichedApplications
    });
  } catch (error) {
    console.error('Erreur récupération candidatures:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/missions/:id - Récupérer une mission spécifique
router.get('/:id', authenticate, async (req, res) => {
  try {
    const mission = await db.getMissionById(req.params.id);
    
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

    const org = await db.getUserById(mission.organizationId);
    const categories = await db.getMissionCategories();
    const category = categories.find(c => c.id === mission.categoryId || c.name === mission.category);
    const applications = await db.getApplicationsByMission(mission.id);

    const enrichedApplications = await Promise.all(applications.map(async (app) => {
      const applicant = await db.getUserById(app.userId);
      return {
        ...app,
        applicant: applicant ? { id: applicant.id, name: applicant.name, email: applicant.email } : null
      };
    }));

    res.json({
      success: true,
      data: {
        ...mission,
        organization: org ? { id: org.id, name: org.name, organizationType: org.organizationType } : null,
        category,
        applications: req.user.role === 'organization' || req.user.role === 'admin' 
          ? enrichedApplications
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
      category,
      location, // { lat, lng, address }
      date,
      duration, // en minutes
      rewardXRP, // récompense en XRP (0-100)
      maxParticipants,
      skills,
      requirements,
      isVolunteer, // Option bénévole (x2 points, 0 XRP)
      bonusPoints // Points bonus pour missions bénévoles
    } = req.body;

    // Debug log
    console.log('📝 Création mission - données reçues:', {
      title: !!title,
      description: !!description,
      categoryId,
      category,
      location,
      date
    });

    // Validation - categoryId peut être un UUID (string) ou un nombre
    const hasCategoryId = categoryId && categoryId !== '' && categoryId !== '0' && categoryId !== 0;
    const hasCategory = category && category !== '';
    
    if (!title || !description || (!hasCategoryId && !hasCategory) || !location || !date) {
      console.log('❌ Validation échouée:', { title: !!title, description: !!description, hasCategoryId, hasCategory, location: !!location, date: !!date });
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

    // Validation de la récompense XRP (0-100, ou 0 si bénévole)
    const validRewardXRP = isVolunteer ? 0 : Math.min(100, Math.max(0, parseFloat(rewardXRP) || 0));

    const mission = await db.createMission({
      organizationId: req.user.id,
      title,
      description,
      categoryId: categoryId || category,
      category: category || categoryId,
      location,
      date,
      duration: duration || 60,
      rewardXRP: validRewardXRP,
      maxParticipants: maxParticipants || 10,
      skills: skills || [],
      requirements: requirements || '',
      isVolunteer: isVolunteer || false,
      bonusPoints: isVolunteer ? (bonusPoints || Math.ceil((duration || 60) / 60)) : 0
    });

    const categories = await db.getMissionCategories();
    const missionCategory = categories.find(c => c.id === (categoryId || category) || c.name === (category || categoryId));

    res.status(201).json({
      success: true,
      message: 'Mission créée avec succès',
      data: {
        ...mission,
        category: missionCategory,
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
    const mission = await db.getMissionById(req.params.id);
    
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

    const updatedMission = await db.updateMission(req.params.id, updates);

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
    const mission = await db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    // Vérifier qu'il n'y a pas de candidatures acceptées
    const applications = await db.getApplicationsByMission(mission.id);
    const hasAccepted = applications.some(a => a.status === 'accepted');
    
    if (hasAccepted) {
      return res.status(400).json({ 
        success: false, 
        error: 'Impossible de supprimer une mission avec des participants acceptés' 
      });
    }

    await db.deleteMission(req.params.id);

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
    const mission = await db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (mission.status !== 'published') {
      return res.status(400).json({ success: false, error: 'Cette mission n\'est plus disponible' });
    }

    // Vérifier si déjà candidaté
    const existingApplication = await db.getApplicationByUserAndMission(req.user.id, mission.id);
    if (existingApplication) {
      return res.status(400).json({ success: false, error: 'Vous avez déjà candidaté à cette mission' });
    }

    // Vérifier le nombre de participants
    const applications = await db.getApplicationsByMission(mission.id);
    const acceptedApplications = applications.filter(a => a.status === 'accepted');
    if (acceptedApplications.length >= mission.maxParticipants) {
      return res.status(400).json({ success: false, error: 'Cette mission est complète' });
    }

    const application = await db.createApplication({
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
    const mission = await db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const applications = await db.getApplicationsByMission(mission.id);
    
    const enrichedApplications = await Promise.all(applications.map(async (app) => {
      const applicant = await db.getUserById(app.userId);
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
    }));

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
    const mission = await db.getMissionById(req.params.id);
    
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    if (req.user.role === 'organization' && mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    const application = await db.getApplicationById(req.params.appId);
    
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
      await db.updateMission(mission.id, { acceptedCount: acceptedCount + 1 });
    }

    // Si on retire l'acceptation (passage de accepted à rejected)
    if (previousStatus === 'accepted' && status === 'rejected') {
      const acceptedCount = mission.acceptedCount || 0;
      await db.updateMission(mission.id, { acceptedCount: Math.max(0, acceptedCount - 1) });
    }

    const updatedApplication = await db.updateApplication(req.params.appId, { status });

    // Récupérer la mission mise à jour
    const updatedMission = await db.getMissionById(mission.id);

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
    const mission = await db.getMissionById(req.params.id);
    
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
      const application = await db.getApplicationByUserAndMission(participantId, mission.id);
      
      if (!application || application.status !== 'accepted') {
        continue;
      }

      // Marquer la candidature comme complétée
      await db.updateApplication(application.id, { status: 'completed' });

      // Mettre à jour les stats du participant
      // Points = durée en heures (1h = 1pt), x2 si bénévole
      const basePoints = mission.points || Math.ceil((mission.duration || 60) / 60);
      const earnedPoints = mission.isVolunteer ? basePoints * 2 : basePoints;
      
      const participant = await db.getUserById(participantId);
      if (participant) {
        const previousTotalPoints = participant.totalPoints || 0;
        const newTotalPoints = previousTotalPoints + earnedPoints;
        
        // Récupérer le niveau citoyen AVANT et APRÈS
        const previousLevel = await db.getCitizenLevel(previousTotalPoints);
        const newLevel = await db.getCitizenLevel(newTotalPoints);
        
        // Détecter si l'utilisateur a changé de niveau
        const leveledUp = previousLevel.id !== newLevel.id;
        
        await db.updateUser(participantId, {
          totalPoints: newTotalPoints
        });

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
                isVolunteer: mission.isVolunteer || false,
                citizenLevel: newLevel?.name || 'Nouveau Citoyen',
                citizenIcon: newLevel?.icon || '🌱',
                category: mission.categoryId || mission.category,
                totalPoints: newTotalPoints
              }
            );
            
            // Enregistrer le NFT mint dans la DB (pour le tracking blockchain)
            if (nftResult && nftResult.nftokenId) {
              await db.createTransaction({
                type: 'nft_mint',
                fromUserId: null,
                toUserId: participantId,
                fromWallet: null,
                toWallet: participant.walletAddress,
                amount: 0,
                currency: 'NFT',
                missionId: mission.id,
                txHash: nftResult.txHash || nftResult.nftokenId,
                status: 'completed',
                description: `NFT mission: ${mission.title}${mission.isVolunteer ? ' (Bénévole)' : ''}`
              });
            }
          }
        } catch (nftError) {
          console.error('Erreur mint NFT:', nftError);
        }

        // 🏅 Si l'utilisateur a changé de niveau, minter un NFT Badge
        let badgeNftResult = null;
        if (leveledUp && participant.walletSeed) {
          try {
            console.log(`🎉 ${participant.name} passe au niveau ${newLevel.name}!`);
            
            badgeNftResult = await xrplService.mintBadgeNFT(
              { seed: participant.walletSeed },
              {
                levelName: newLevel.name,
                levelIcon: newLevel.icon,
                levelColor: newLevel.color,
                minPoints: newLevel.minPoints,
                totalPoints: newTotalPoints,
                userId: participantId,
                userName: participant.name
              }
            );
            
            // Enregistrer le Badge NFT dans la DB
            if (badgeNftResult && badgeNftResult.success) {
              await db.createTransaction({
                type: 'nft_mint', // ✅ Type standard accepté par la DB
                fromUserId: null,
                toUserId: participantId,
                fromWallet: null,
                toWallet: participant.walletAddress,
                amount: 0,
                currency: 'BADGE_NFT', // Permet de différencier badge vs mission NFT
                missionId: null,
                txHash: badgeNftResult.txHash || badgeNftResult.nftokenId,
                status: 'completed',
                description: `🏅 Badge NFT: ${newLevel.name} ${newLevel.icon}`
              });
              
              console.log(`✅ Badge NFT minté: ${newLevel.name} pour ${participant.name}`);
            }
          } catch (badgeError) {
            console.error('Erreur mint Badge NFT:', badgeError);
          }
        }

        // Envoyer les XRP réels si récompense définie et wallets disponibles
        let xrpResult = null;
        if (mission.rewardXRP > 0 && participant.walletAddress) {
          try {
            // Récupérer l'organisation pour avoir son wallet
            const organization = await db.getUserById(mission.organizationId);
            
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
                await db.createTransaction({
                  type: 'reward',
                  fromUserId: mission.organizationId,
                  toUserId: participantId,
                  fromWallet: organization.walletAddress,
                  toWallet: participant.walletAddress,
                  amount: mission.rewardXRP,
                  currency: 'XRP',
                  missionId: mission.id,
                  txHash: xrpResult.txHash,
                  status: 'completed',
                  description: `Récompense mission: ${mission.title}`
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
          previousLevel: previousLevel?.name || 'Nouveau Citoyen',
          citizenLevel: newLevel?.name || 'Nouveau Citoyen',
          leveledUp: leveledUp,
          rewardXRP: mission.rewardXRP || 0,
          nft: nftResult,
          badgeNft: badgeNftResult,
          xrp: xrpResult
        });

        // Vérifier et attribuer les badges
        await db.checkAndAwardBadges(participantId);
      }
    }

    // Marquer la mission comme complétée
    await db.updateMission(mission.id, { status: 'completed' });

    const updatedMission = await db.getMissionById(mission.id);

    res.json({
      success: true,
      message: 'Mission validée',
      data: {
        mission: updatedMission,
        participants: results
      }
    });
  } catch (error) {
    console.error('Erreur validation mission:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/missions/:id/report/:userId - Signaler un participant
router.post('/:id/report/:userId', authenticate, requireRole(['organization']), async (req, res) => {
  try {
    const { reason, details } = req.body;
    const missionId = req.params.id;
    const reportedUserId = req.params.userId;

    // Vérifier la mission
    const mission = await db.getMissionById(missionId);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvée' });
    }

    // Vérifier que c'est bien l'organisation propriétaire
    if (mission.organizationId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Accès refusé' });
    }

    // Vérifier que l'utilisateur signalé existe
    const reportedUser = await db.getUserById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    // Vérifier que l'utilisateur a bien candidaté à cette mission
    const application = await db.getApplicationByUserAndMission(reportedUserId, missionId);
    if (!application) {
      return res.status(400).json({ success: false, error: 'Cet utilisateur n\'a pas participé à cette mission' });
    }

    // Valider la raison
    const validReasons = ['no_show', 'late', 'left_early', 'inappropriate', 'disrespectful', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ success: false, error: 'Raison de signalement invalide' });
    }

    // Créer le signalement (on utilise une table reports ou on l'ajoute si elle n'existe pas)
    try {
      await db.createReport({
        missionId,
        reporterId: req.user.id,
        reportedUserId,
        reason,
        details: details || '',
        status: 'pending'
      });
    } catch (dbError) {
      // Si la table n'existe pas, on log simplement
      console.log('📢 Signalement reçu:', {
        mission: mission.title,
        reporter: req.user.name,
        reported: reportedUser.name,
        reason,
        details
      });
    }

    res.json({
      success: true,
      message: 'Signalement enregistré. Notre équipe examinera votre rapport.',
      data: {
        missionId,
        reportedUserId,
        reason
      }
    });
  } catch (error) {
    console.error('Erreur signalement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/db.json');

// Structure initiale de la base de données
const initialDB = {
  users: [],
  missions: [],
  applications: [], // Candidatures aux missions
  transactions: [], // Transactions XRP/NFT sur la blockchain
  missionCategories: [
    { id: 1, name: 'Environnement', icon: '🌿', color: '#22c55e' },
    { id: 2, name: 'Social', icon: '🤝', color: '#3b82f6' },
    { id: 3, name: 'Éducation', icon: '📚', color: '#f59e0b' },
    { id: 4, name: 'Santé', icon: '🏥', color: '#ef4444' },
    { id: 5, name: 'Culture', icon: '🎭', color: '#8b5cf6' },
    { id: 6, name: 'Sport', icon: '⚽', color: '#06b6d4' },
    { id: 7, name: 'Solidarité', icon: '💪', color: '#ec4899' },
    { id: 8, name: 'Autre', icon: '✨', color: '#6b7280' }
  ],
  organizationTypes: [
    { id: 1, name: 'Entreprise', icon: '🏢' },
    { id: 2, name: 'Association', icon: '🤲' },
    { id: 3, name: 'Mairie', icon: '🏛️' },
    { id: 4, name: 'Collectivité', icon: '🏘️' },
    { id: 5, name: 'ONG', icon: '🌍' },
    { id: 6, name: 'Fondation', icon: '🎗️' },
    { id: 7, name: 'Établissement scolaire', icon: '🎓' },
    { id: 8, name: 'Autre', icon: '�' }
  ],
  badges: [
    { id: 1, name: 'Bon Citoyen', description: '10 points accumulés', icon: '🌱', requirement: { totalPoints: 10 }, level: 1 },
    { id: 2, name: 'Super Citoyen', description: '20 points accumulés', icon: '⭐', requirement: { totalPoints: 20 }, level: 2 },
    { id: 3, name: 'Citoyen Exemplaire', description: '50 points accumulés', icon: '�', requirement: { totalPoints: 50 }, level: 3 },
    { id: 4, name: 'Héros Local', description: '100 points accumulés', icon: '🦸', requirement: { totalPoints: 100 }, level: 4 },
    { id: 5, name: 'Légende', description: '200 points accumulés', icon: '👑', requirement: { totalPoints: 200 }, level: 5 },
    { id: 6, name: 'Première Mission', description: 'Première mission complétée', icon: '�', requirement: { totalMissions: 1 }, level: 0 },
    { id: 7, name: 'Éco-Héros', description: '5 missions environnementales', icon: '🌍', requirement: { category: 1, count: 5 }, level: 0 },
    { id: 8, name: 'Champion Social', description: '5 missions sociales', icon: '💪', requirement: { category: 2, count: 5 }, level: 0 }
  ],
  citizenLevels: [
    { minPoints: 0, maxPoints: 9, name: 'Nouveau Citoyen', icon: '🌱', color: '#9ca3af' },
    { minPoints: 10, maxPoints: 19, name: 'Bon Citoyen', icon: '🌿', color: '#22c55e' },
    { minPoints: 20, maxPoints: 49, name: 'Super Citoyen', icon: '⭐', color: '#3b82f6' },
    { minPoints: 50, maxPoints: 99, name: 'Citoyen Exemplaire', icon: '🏆', color: '#f59e0b' },
    { minPoints: 100, maxPoints: 199, name: 'Héros Local', icon: '🦸', color: '#8b5cf6' },
    { minPoints: 200, maxPoints: Infinity, name: 'Légende', icon: '👑', color: '#ec4899' }
  ]
};

// Créer un admin par défaut
const createDefaultAdmin = () => {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  return {
    id: 'admin-001',
    name: 'Administrateur',
    email: 'admin@impact-identity.com',
    password: hashedPassword,
    role: 'admin',
    status: 'active',
    walletAddress: null,
    walletSeed: null,
    totalPoints: 0,
    completedMissions: 0,
    badges: [],
    createdAt: new Date().toISOString()
  };
};

class Database {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(DB_PATH)) {
        const rawData = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(rawData);
        
        // S'assurer qu'il y a un admin
        const adminExists = this.data.users.some(u => u.role === 'admin');
        if (!adminExists) {
          const admin = createDefaultAdmin();
          this.data.users.push(admin);
          this.save();
          console.log('👤 Admin créé: admin@impact-identity.com / admin123');
        }
      } else {
        this.data = { ...initialDB };
        const admin = createDefaultAdmin();
        this.data.users.push(admin);
        this.save();
        console.log('👤 Admin créé: admin@impact-identity.com / admin123');
      }
    } catch (error) {
      console.error('Erreur chargement DB:', error);
      this.data = initialDB;
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Erreur sauvegarde DB:', error);
    }
  }

  // ==================== USERS ====================
  createUser(userData) {
    const user = {
      id: Date.now().toString(),
      ...userData,
      status: userData.role === 'client' ? 'active' : 'pending', // Organizations need approval
      totalPoints: 0,
      completedMissions: 0,
      badges: [],
      createdAt: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  getUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email) {
    return this.data.users.find(u => u.email === email);
  }

  updateUser(id, updates) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.data.users[index] = { ...this.data.users[index], ...updates };
      this.save();
      return this.data.users[index];
    }
    return null;
  }

  getAllUsers() {
    return this.data.users;
  }

  getUsersByRole(role) {
    return this.data.users.filter(u => u.role === role);
  }

  getPendingOrganizations() {
    return this.data.users.filter(u => u.role === 'organization' && u.status === 'pending');
  }

  // ==================== MISSIONS ====================
  createMission(missionData) {
    // Calculer les points basés sur la durée (1h = 1pt)
    const durationHours = (missionData.duration || 60) / 60;
    const points = Math.ceil(durationHours);
    
    const mission = {
      id: Date.now().toString(),
      ...missionData,
      points, // Points basés sur la durée
      rewardXRP: Math.min(100, Math.max(0, missionData.rewardXRP || 0)), // 0-100 XRP
      acceptedCount: 0, // Nombre de candidatures acceptées
      status: 'published', // draft, published, in-progress, completed, cancelled
      applicationsCount: 0,
      assignedTo: null,
      createdAt: new Date().toISOString()
    };
    this.data.missions.push(mission);
    this.save();
    return mission;
  }

  getMissionById(id) {
    return this.data.missions.find(m => m.id === id);
  }

  getMissionsByOrganization(orgId) {
    return this.data.missions.filter(m => m.organizationId === orgId);
  }

  getPublishedMissions() {
    return this.data.missions.filter(m => m.status === 'published');
  }

  getAllMissions() {
    return this.data.missions;
  }

  updateMission(id, updates) {
    const index = this.data.missions.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.missions[index] = { ...this.data.missions[index], ...updates };
      this.save();
      return this.data.missions[index];
    }
    return null;
  }

  deleteMission(id) {
    const index = this.data.missions.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.missions.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // ==================== APPLICATIONS ====================
  createApplication(applicationData) {
    const application = {
      id: Date.now().toString(),
      ...applicationData,
      status: 'pending', // pending, accepted, rejected, completed
      createdAt: new Date().toISOString()
    };
    this.data.applications.push(application);
    
    // Incrémenter le compteur de candidatures
    const mission = this.getMissionById(applicationData.missionId);
    if (mission) {
      this.updateMission(mission.id, { applicationsCount: (mission.applicationsCount || 0) + 1 });
    }
    
    this.save();
    return application;
  }

  getApplicationById(id) {
    return this.data.applications.find(a => a.id === id);
  }

  getApplicationsByMission(missionId) {
    return this.data.applications.filter(a => a.missionId === missionId);
  }

  getApplicationsByUser(userId) {
    return this.data.applications.filter(a => a.userId === userId);
  }

  getApplicationByUserAndMission(userId, missionId) {
    return this.data.applications.find(a => a.userId === userId && a.missionId === missionId);
  }

  updateApplication(id, updates) {
    const index = this.data.applications.findIndex(a => a.id === id);
    if (index !== -1) {
      this.data.applications[index] = { ...this.data.applications[index], ...updates };
      this.save();
      return this.data.applications[index];
    }
    return null;
  }

  // ==================== TRANSACTIONS ====================
  createTransaction(transactionData) {
    const transaction = {
      id: Date.now().toString(),
      ...transactionData,
      createdAt: new Date().toISOString()
    };
    
    if (!this.data.transactions) {
      this.data.transactions = [];
    }
    
    this.data.transactions.push(transaction);
    this.save();
    return transaction;
  }

  getTransactionById(id) {
    return this.data.transactions?.find(t => t.id === id);
  }

  getTransactionsByUser(userId) {
    return this.data.transactions?.filter(t => 
      t.participantId === userId || t.from === userId || t.to === userId
    ) || [];
  }

  getTransactionsByMission(missionId) {
    return this.data.transactions?.filter(t => t.missionId === missionId) || [];
  }

  getAllTransactions() {
    return this.data.transactions || [];
  }

  getTransactionsByWallet(walletAddress) {
    return this.data.transactions?.filter(t => 
      t.from === walletAddress || t.to === walletAddress
    ) || [];
  }

  // ==================== CATEGORIES & TYPES ====================
  getMissionCategories() {
    return this.data.missionCategories;
  }

  getOrganizationTypes() {
    return this.data.organizationTypes;
  }

  getBadges() {
    return this.data.badges;
  }

  getCitizenLevels() {
    return this.data.citizenLevels;
  }

  getCitizenLevel(points) {
    const levels = this.data.citizenLevels;
    return levels.find(l => points >= l.minPoints && points <= l.maxPoints) || levels[0];
  }

  // ==================== BADGES ====================
  checkAndAwardBadges(userId) {
    const user = this.getUserById(userId);
    if (!user) return [];

    const completedApps = this.getApplicationsByUser(userId).filter(a => a.status === 'completed');
    const newBadges = [];

    for (const badge of this.data.badges) {
      if (user.badges.includes(badge.id)) continue;

      let earned = false;

      if (badge.requirement.totalMissions && completedApps.length >= badge.requirement.totalMissions) {
        earned = true;
      }

      if (badge.requirement.totalPoints && user.totalPoints >= badge.requirement.totalPoints) {
        earned = true;
      }

      if (badge.requirement.category && badge.requirement.count) {
        const categoryMissions = completedApps.filter(a => {
          const mission = this.getMissionById(a.missionId);
          return mission && mission.categoryId === badge.requirement.category;
        });
        if (categoryMissions.length >= badge.requirement.count) {
          earned = true;
        }
      }

      if (earned) {
        user.badges.push(badge.id);
        newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      this.updateUser(userId, { badges: user.badges });
    }

    return newBadges;
  }

  // ==================== STATS ====================
  getStats() {
    const users = this.data.users;
    const missions = this.data.missions;
    const applications = this.data.applications;

    return {
      totalUsers: users.filter(u => u.role === 'client').length,
      totalOrganizations: users.filter(u => u.role === 'organization').length,
      pendingOrganizations: users.filter(u => u.role === 'organization' && u.status === 'pending').length,
      totalMissions: missions.length,
      publishedMissions: missions.filter(m => m.status === 'published').length,
      completedMissions: missions.filter(m => m.status === 'completed').length,
      totalApplications: applications.length,
      totalPointsDistributed: users.reduce((sum, u) => sum + (u.totalPoints || 0), 0)
    };
  }

  getLeaderboard(limit = 10) {
    return this.data.users
      .filter(u => u.role === 'client')
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.name,
        totalPoints: user.totalPoints,
        completedMissions: user.completedMissions,
        badges: user.badges.map(badgeId => this.data.badges.find(b => b.id === badgeId))
      }));
  }
}

module.exports = new Database();

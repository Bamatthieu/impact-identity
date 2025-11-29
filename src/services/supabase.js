const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mvkfkviaidhgfmotclir.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12a2ZrdmlhaWRoZ2Ztb3RjbGlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQxMjUyOCwiZXhwIjoyMDc5OTg4NTI4fQ.ZWwXoEAKg_RQdadK83dGLsbx6SRz0v1IZWZhguex-5o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class Database {
  constructor() {
    this.supabase = supabase;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Vérifier s'il y a un admin
      const { data: admins } = await this.supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .limit(1);

      if (!admins || admins.length === 0) {
        // Créer l'admin par défaut
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await this.supabase.from('users').insert({
          email: 'admin@impact-identity.com',
          password: hashedPassword,
          name: 'Administrateur',
          role: 'admin',
          status: 'active',
          points: 0
        });
        console.log('👤 Admin créé: admin@impact-identity.com / admin123');
      }
      
      this.initialized = true;
      console.log('✅ Connexion Supabase établie');
    } catch (error) {
      console.error('❌ Erreur init Supabase:', error.message);
    }
  }

  // ==================== USERS ====================
  async createUser(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        status: userData.role === 'client' ? 'active' : 'pending',
        points: 0,
        wallet_address: userData.walletAddress || null,
        wallet_seed: userData.walletSeed || null,
        organization_type: userData.organizationType || null,
        description: userData.description || null,
        address: userData.address || null,
        phone: userData.phone || null,
        website: userData.website || null,
        siret: userData.siret || null
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création user:', error);
      throw error;
    }

    return this._formatUser(data);
  }

  async getUserById(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this._formatUser(data);
  }

  async getUserByEmail(email) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return null;
    return this._formatUser(data);
  }

  async updateUser(id, updates) {
    const dbUpdates = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.totalPoints !== undefined) dbUpdates.points = updates.totalPoints;
    if (updates.walletAddress !== undefined) dbUpdates.wallet_address = updates.walletAddress;
    if (updates.walletSeed !== undefined) dbUpdates.wallet_seed = updates.walletSeed;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.website !== undefined) dbUpdates.website = updates.website;

    const { data, error } = await this.supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur update user:', error);
      return null;
    }

    return this._formatUser(data);
  }

  async getAllUsers() {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(u => this._formatUser(u));
  }

  async getUsersByRole(role) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(u => this._formatUser(u));
  }

  async getPendingOrganizations() {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('role', 'organization')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(u => this._formatUser(u));
  }

  _formatUser(dbUser) {
    if (!dbUser) return null;
    return {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      name: dbUser.name,
      role: dbUser.role,
      status: dbUser.status,
      totalPoints: dbUser.points || 0,
      points: dbUser.points || 0,
      walletAddress: dbUser.wallet_address,
      walletSeed: dbUser.wallet_seed,
      organizationType: dbUser.organization_type,
      description: dbUser.description,
      address: dbUser.address,
      phone: dbUser.phone,
      website: dbUser.website,
      siret: dbUser.siret,
      completedMissions: 0, // Calculé dynamiquement si nécessaire
      badges: [], // Récupéré séparément si nécessaire
      createdAt: dbUser.created_at
    };
  }

  // ==================== MISSIONS ====================
  async createMission(missionData) {
    const durationHours = (missionData.duration || 60) / 60;
    const points = Math.ceil(durationHours);

    const { data, error } = await this.supabase
      .from('missions')
      .insert({
        title: missionData.title,
        description: missionData.description,
        organization_id: missionData.organizationId,
        category: missionData.category || missionData.categoryId?.toString(),
        reward_xrp: Math.min(100, Math.max(0, missionData.rewardXRP || 0)),
        points: points,
        duration: missionData.duration || 60,
        max_participants: missionData.maxParticipants || 1,
        current_participants: 0,
        location_address: missionData.location?.address || missionData.address,
        location_lat: missionData.location?.lat || missionData.lat,
        location_lng: missionData.location?.lng || missionData.lng,
        start_date: missionData.startDate,
        end_date: missionData.endDate,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création mission:', error);
      throw error;
    }

    return this._formatMission(data);
  }

  async getMissionById(id) {
    const { data, error } = await this.supabase
      .from('missions')
      .select('*, organization:users!organization_id(id, name, email)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this._formatMission(data);
  }

  async getMissionsByOrganization(orgId) {
    const { data, error } = await this.supabase
      .from('missions')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(m => this._formatMission(m));
  }

  async getPublishedMissions() {
    const { data, error } = await this.supabase
      .from('missions')
      .select('*, organization:users!organization_id(id, name, email)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(m => this._formatMission(m));
  }

  async getAllMissions() {
    const { data, error } = await this.supabase
      .from('missions')
      .select('*, organization:users!organization_id(id, name, email)')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(m => this._formatMission(m));
  }

  async updateMission(id, updates) {
    const dbUpdates = {};
    
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.rewardXRP !== undefined) dbUpdates.reward_xrp = updates.rewardXRP;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.maxParticipants !== undefined) dbUpdates.max_participants = updates.maxParticipants;
    if (updates.currentParticipants !== undefined) dbUpdates.current_participants = updates.currentParticipants;
    if (updates.acceptedCount !== undefined) dbUpdates.current_participants = updates.acceptedCount;

    const { data, error } = await this.supabase
      .from('missions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur update mission:', error);
      return null;
    }

    return this._formatMission(data);
  }

  async deleteMission(id) {
    const { error } = await this.supabase
      .from('missions')
      .delete()
      .eq('id', id);

    return !error;
  }

  _formatMission(dbMission) {
    if (!dbMission) return null;
    return {
      id: dbMission.id,
      title: dbMission.title,
      description: dbMission.description,
      organizationId: dbMission.organization_id,
      organization: dbMission.organization ? {
        id: dbMission.organization.id,
        name: dbMission.organization.name,
        email: dbMission.organization.email
      } : null,
      category: dbMission.category,
      categoryId: dbMission.category,
      rewardXRP: parseFloat(dbMission.reward_xrp) || 0,
      points: dbMission.points || 0,
      duration: dbMission.duration || 60,
      maxParticipants: dbMission.max_participants || 1,
      currentParticipants: dbMission.current_participants || 0,
      acceptedCount: dbMission.current_participants || 0,
      location: {
        address: dbMission.location_address,
        lat: parseFloat(dbMission.location_lat) || null,
        lng: parseFloat(dbMission.location_lng) || null
      },
      address: dbMission.location_address,
      startDate: dbMission.start_date,
      endDate: dbMission.end_date,
      status: dbMission.status === 'active' ? 'published' : dbMission.status,
      applicationsCount: 0, // Calculé si nécessaire
      createdAt: dbMission.created_at
    };
  }

  // ==================== APPLICATIONS ====================
  async createApplication(applicationData) {
    const { data, error } = await this.supabase
      .from('applications')
      .insert({
        mission_id: applicationData.missionId,
        user_id: applicationData.userId,
        status: 'pending',
        message: applicationData.message
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création application:', error);
      throw error;
    }

    return this._formatApplication(data);
  }

  async getApplicationById(id) {
    const { data, error } = await this.supabase
      .from('applications')
      .select('*, user:users!user_id(id, name, email, wallet_address), mission:missions!mission_id(*)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this._formatApplication(data);
  }

  async getApplicationsByMission(missionId) {
    const { data, error } = await this.supabase
      .from('applications')
      .select('*, user:users!user_id(id, name, email, points, wallet_address)')
      .eq('mission_id', missionId)
      .order('applied_at', { ascending: false });

    if (error) return [];
    return data.map(a => this._formatApplication(a));
  }

  async getApplicationsByUser(userId) {
    const { data, error } = await this.supabase
      .from('applications')
      .select('*, mission:missions!mission_id(*, organization:users!organization_id(id, name))')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (error) return [];
    return data.map(a => this._formatApplication(a));
  }

  async getApplicationByUserAndMission(userId, missionId) {
    const { data, error } = await this.supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_id', missionId)
      .single();

    if (error || !data) return null;
    return this._formatApplication(data);
  }

  async updateApplication(id, updates) {
    const dbUpdates = {};
    
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.status === 'accepted' || updates.status === 'rejected') {
      dbUpdates.reviewed_at = new Date().toISOString();
    }
    if (updates.status === 'completed') {
      dbUpdates.completed_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('applications')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur update application:', error);
      return null;
    }

    return this._formatApplication(data);
  }

  _formatApplication(dbApp) {
    if (!dbApp) return null;
    return {
      id: dbApp.id,
      missionId: dbApp.mission_id,
      userId: dbApp.user_id,
      status: dbApp.status,
      message: dbApp.message,
      user: dbApp.user ? {
        id: dbApp.user.id,
        name: dbApp.user.name,
        email: dbApp.user.email,
        totalPoints: dbApp.user.points || 0,
        walletAddress: dbApp.user.wallet_address
      } : null,
      mission: dbApp.mission ? this._formatMission(dbApp.mission) : null,
      appliedAt: dbApp.applied_at,
      reviewedAt: dbApp.reviewed_at,
      completedAt: dbApp.completed_at,
      createdAt: dbApp.applied_at
    };
  }

  // ==================== TRANSACTIONS ====================
  async createTransaction(transactionData) {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        from_user_id: transactionData.fromUserId,
        to_user_id: transactionData.toUserId || transactionData.participantId,
        from_wallet: transactionData.from || transactionData.fromWallet,
        to_wallet: transactionData.to || transactionData.toWallet,
        amount: transactionData.amount,
        currency: transactionData.currency || 'XRP',
        type: transactionData.type,
        mission_id: transactionData.missionId,
        tx_hash: transactionData.txHash || transactionData.hash,
        status: transactionData.status || 'completed',
        description: transactionData.description
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création transaction:', error);
      throw error;
    }

    return this._formatTransaction(data);
  }

  async getTransactionById(id) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this._formatTransaction(data);
  }

  async getTransactionsByUser(userId) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(t => this._formatTransaction(t));
  }

  async getTransactionsByMission(missionId) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(t => this._formatTransaction(t));
  }

  async getAllTransactions() {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(t => this._formatTransaction(t));
  }

  async getTransactionsByWallet(walletAddress) {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .or(`from_wallet.eq.${walletAddress},to_wallet.eq.${walletAddress}`)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data.map(t => this._formatTransaction(t));
  }

  _formatTransaction(dbTx) {
    if (!dbTx) return null;
    return {
      id: dbTx.id,
      fromUserId: dbTx.from_user_id,
      toUserId: dbTx.to_user_id,
      participantId: dbTx.to_user_id,
      from: dbTx.from_wallet,
      to: dbTx.to_wallet,
      fromWallet: dbTx.from_wallet,
      toWallet: dbTx.to_wallet,
      amount: parseFloat(dbTx.amount),
      currency: dbTx.currency,
      type: dbTx.type,
      missionId: dbTx.mission_id,
      txHash: dbTx.tx_hash,
      hash: dbTx.tx_hash,
      status: dbTx.status,
      description: dbTx.description,
      createdAt: dbTx.created_at
    };
  }

  // ==================== CATEGORIES & TYPES ====================
  async getMissionCategories() {
    const { data, error } = await this.supabase
      .from('mission_categories')
      .select('*');

    if (error) return [];
    return data.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color
    }));
  }

  async getOrganizationTypes() {
    const { data, error } = await this.supabase
      .from('organization_types')
      .select('*');

    if (error) return [];
    return data.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description
    }));
  }

  async getBadges() {
    const { data, error } = await this.supabase
      .from('badges')
      .select('*');

    if (error) return [];
    return data.map(b => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      pointsRequired: b.points_required,
      category: b.category
    }));
  }

  async getCitizenLevels() {
    const { data, error } = await this.supabase
      .from('citizen_levels')
      .select('*')
      .order('min_points', { ascending: true });

    if (error) return [];
    return data.map(l => ({
      id: l.id,
      name: l.name,
      minPoints: l.min_points,
      maxPoints: l.max_points || Infinity,
      icon: l.icon,
      color: l.color
    }));
  }

  async getCitizenLevel(points) {
    const levels = await this.getCitizenLevels();
    return levels.find(l => points >= l.minPoints && (l.maxPoints === null || points <= l.maxPoints)) || levels[0];
  }

  // ==================== BADGES ====================
  async getUserBadges(userId) {
    const { data, error } = await this.supabase
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', userId);

    if (error) return [];
    return data.map(ub => ({
      ...ub.badge,
      earnedAt: ub.earned_at
    }));
  }

  async awardBadge(userId, badgeId) {
    const { data, error } = await this.supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur attribution badge:', error);
      return null;
    }

    return data;
  }

  async checkAndAwardBadges(userId) {
    // Récupérer l'utilisateur et ses stats
    const user = await this.getUserById(userId);
    if (!user) return [];

    const badges = await this.getBadges();
    const userBadges = await this.getUserBadges(userId);
    const userBadgeIds = userBadges.map(b => b.id);

    const { data: completedApps } = await this.supabase
      .from('applications')
      .select('*, mission:missions(*)')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const completedCount = completedApps?.length || 0;
    const newBadges = [];

    for (const badge of badges) {
      if (userBadgeIds.includes(badge.id)) continue;

      let earned = false;

      // Badge basé sur les points
      if (badge.pointsRequired && user.totalPoints >= badge.pointsRequired) {
        earned = true;
      }

      // Badge basé sur le nombre de missions
      if (badge.category === 'mission' && completedCount >= 1) {
        earned = true;
      }

      if (earned) {
        await this.awardBadge(userId, badge.id);
        newBadges.push(badge);
      }
    }

    return newBadges;
  }

  // ==================== STATS ====================
  async getStats() {
    const { data: users } = await this.supabase.from('users').select('role, status, points');
    const { data: missions } = await this.supabase.from('missions').select('status');
    const { data: applications } = await this.supabase.from('applications').select('id');

    const usersList = users || [];
    const missionsList = missions || [];
    const applicationsList = applications || [];

    return {
      totalUsers: usersList.filter(u => u.role === 'client').length,
      totalOrganizations: usersList.filter(u => u.role === 'organization').length,
      pendingOrganizations: usersList.filter(u => u.role === 'organization' && u.status === 'pending').length,
      totalMissions: missionsList.length,
      publishedMissions: missionsList.filter(m => m.status === 'active').length,
      completedMissions: missionsList.filter(m => m.status === 'completed').length,
      totalApplications: applicationsList.length,
      totalPointsDistributed: usersList.reduce((sum, u) => sum + (u.points || 0), 0)
    };
  }

  async getLeaderboard(limit = 10) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, name, points')
      .eq('role', 'client')
      .order('points', { ascending: false })
      .limit(limit);

    if (error) return [];

    const leaderboard = [];
    for (let i = 0; i < data.length; i++) {
      const user = data[i];
      const badges = await this.getUserBadges(user.id);
      
      // Compter les missions complétées
      const { count } = await this.supabase
        .from('applications')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      leaderboard.push({
        rank: i + 1,
        id: user.id,
        name: user.name,
        totalPoints: user.points || 0,
        completedMissions: count || 0,
        badges: badges
      });
    }

    return leaderboard;
  }
}

// Export singleton
const db = new Database();
module.exports = db;

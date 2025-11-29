import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const getOrganizationTypes = () => api.get('/auth/organization-types');

// Users
export const getUsers = () => api.get('/users');
export const getUser = (id) => api.get(`/users/${id}`);

// Missions
export const getMissions = () => api.get('/missions');
export const getPublicMissions = () => api.get('/missions/public');
export const getMissionCategories = () => api.get('/missions/categories');
export const getMission = (id) => api.get(`/missions/${id}`);
export const createMission = (data) => api.post('/missions', data);
export const updateMission = (id, data) => api.put(`/missions/${id}`, data);
export const deleteMission = (id) => api.delete(`/missions/${id}`);
export const applyToMission = (id, message) => api.post(`/missions/${id}/apply`, { message });
export const getMissionApplications = (id) => api.get(`/missions/${id}/applications`);
export const updateApplicationStatus = (missionId, appId, status) => api.put(`/missions/${missionId}/applications/${appId}`, { status });
export const completeMission = (id, participantIds) => api.post(`/missions/${id}/complete`, { participantIds });

// Admin
export const getAdminStats = () => api.get('/admin/stats');
export const getOrganizations = (status) => api.get('/admin/organizations', { params: { status } });
export const getPendingOrganizations = () => api.get('/admin/organizations/pending');
export const approveOrganization = (id) => api.put(`/admin/organizations/${id}/approve`);
export const rejectOrganization = (id, reason) => api.put(`/admin/organizations/${id}/reject`, { reason });
export const getAdminUsers = () => api.get('/admin/users');
export const getAdminMissions = (params) => api.get('/admin/missions', { params });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// Leaderboard
export const getLeaderboard = (limit = 10) => api.get('/leaderboard', { params: { limit } });
export const getBadges = () => api.get('/leaderboard/badges');
export const getCitizenLevels = () => api.get('/leaderboard/citizen-levels');

// XRPL / Wallet
export const getXRPLStatus = () => api.get('/xrpl/status');
export const getXRPLAccount = (address) => api.get(`/xrpl/account/${address}`);
export const createWallet = () => api.post('/xrpl/wallet');
export const getMyWallet = () => api.get('/xrpl/my-wallet');
export const getMyTransactions = () => api.get('/xrpl/my-transactions');
export const refreshBalance = () => api.post('/xrpl/refresh-balance');

// Blockchain (Admin)
export const getBlockchainStatus = () => api.get('/blockchain/status');
export const getBlockchainStats = () => api.get('/blockchain/stats');
export const getBlockchainWallets = () => api.get('/blockchain/wallets');
export const getBlockchainWallet = (address) => api.get(`/blockchain/wallet/${address}`);
export const getBlockchainNFTs = () => api.get('/blockchain/nfts');
export const getBlockchainTransactions = () => api.get('/blockchain/transactions');

export default api;

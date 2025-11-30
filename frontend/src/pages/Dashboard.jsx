import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

// Fonction pour déterminer le niveau citoyen
const getCitizenLevel = (points) => {
  if (points >= 200) return { name: 'Légende', icon: '👑', color: '#ec4899', nextLevel: null, progress: 100 };
  if (points >= 100) return { name: 'Héros Local', icon: '🦸', color: '#8b5cf6', nextLevel: 200, progress: ((points - 100) / 100) * 100 };
  if (points >= 50) return { name: 'Citoyen Exemplaire', icon: '🏆', color: '#f59e0b', nextLevel: 100, progress: ((points - 50) / 50) * 100 };
  if (points >= 20) return { name: 'Super Citoyen', icon: '⭐', color: '#3b82f6', nextLevel: 50, progress: ((points - 20) / 30) * 100 };
  if (points >= 10) return { name: 'Bon Citoyen', icon: '🌿', color: '#22c55e', nextLevel: 20, progress: ((points - 10) / 10) * 100 };
  return { name: 'Nouveau Citoyen', icon: '🌱', color: '#9ca3af', nextLevel: 10, progress: (points / 10) * 100 };
};

export default function Dashboard() {
  const { user, isAdmin, isClient, isOrganization } = useAuth();
  const [stats, setStats] = useState(null);
  const [missions, setMissions] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (isAdmin) {
        const statsRes = await api.getAdminStats();
        setStats(statsRes.data.data);
      } else if (isClient) {
        const [missionsRes, applicationsRes] = await Promise.all([
          api.getMissions(),
          api.getMyApplications()
        ]);
        setMissions(missionsRes.data.data);
        setMyApplications(applicationsRes.data.data);
      } else if (isOrganization) {
        const [missionsRes, transactionsRes] = await Promise.all([
          api.getMissions(),
          api.getMyTransactions()
        ]);
        setMissions(missionsRes.data.data);
        // Filtrer les dépôts de fonds de l'organisation
        const deposits = transactionsRes.data.data
          .filter(tx => tx.type === 'deposit' && tx.to === user.walletAddress)
          .map(tx => {
            // Extraire le montant EUR de la description
            const eurMatch = tx.description?.match(/(\d+(?:\.\d+)?)\s*EUR/);
            return {
              ...tx,
              amountEUR: eurMatch ? parseFloat(eurMatch[1]) : null
            };
          });
        setTransactions(deposits);
      } else {
        const missionsRes = await api.getMissions();
        setMissions(missionsRes.data.data);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  // Dashboard Admin
  if (isAdmin) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">🎛️ Dashboard Admin</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-4xl mb-2">👤</div>
              <div className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</div>
              <div className="text-white/80">Utilisateurs</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-4xl mb-2">🏢</div>
              <div className="text-3xl font-bold text-white">{stats?.totalOrganizations || 0}</div>
              <div className="text-white/80">Organisations</div>
              {stats?.pendingOrganizations > 0 && (
                <div className="mt-2 text-orange-300 font-medium">
                  {stats.pendingOrganizations} en attente
                </div>
              )}
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-3xl font-bold text-white">{stats?.totalMissions || 0}</div>
              <div className="text-white/80">Missions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-4xl mb-2">⭐</div>
              <div className="text-3xl font-bold text-white">{stats?.totalPointsDistributed || 0}</div>
              <div className="text-white/80">Points distribués</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/admin/organizations" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6 hover:bg-white/15 transition-all">
              <h2 className="text-xl font-bold text-white mb-2">🏢 Organisations</h2>
              <p className="text-white/80">Gérer et valider les organisations</p>
              {stats?.pendingOrganizations > 0 && (
                <span className="inline-block mt-3 px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-400/30 rounded-full text-sm font-medium">
                  {stats.pendingOrganizations} en attente
                </span>
              )}
            </Link>
            <Link to="/admin/users" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6 hover:bg-white/15 transition-all">
              <h2 className="text-xl font-bold text-white mb-2">👥 Utilisateurs</h2>
              <p className="text-white/80">Voir tous les utilisateurs</p>
            </Link>
            <Link to="/leaderboard" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6 hover:bg-white/15 transition-all">
              <h2 className="text-xl font-bold text-white mb-2">🏆 Classement</h2>
              <p className="text-white/80">Voir le leaderboard</p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Organisation
  if (isOrganization) {
    const myMissions = missions;
    const publishedMissions = myMissions.filter(m => m.status === 'published').length;
    const completedMissions = myMissions.filter(m => m.status === 'completed').length;
    const totalApplications = myMissions.reduce((sum, m) => sum + (m.applicationsCount || 0), 0);

    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">🏢 {user?.name}</h1>
              <p className="text-teal-200">Tableau de bord organisation</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/wallet/fund" className="px-5 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl bg-white/10 border border-white/20 hover:bg-white/20">
                <span className="text-white flex items-center gap-2">
                  <span>💰</span>
                  <span>Ajouter des Fonds</span>
                </span>
              </Link>
              <Link to="/missions/create" className="px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl" style={{
                background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)'
              }}>
                <span className="text-white">+ Créer une mission</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-3xl font-bold text-white">{myMissions.length}</div>
              <div className="text-white/80">Missions créées</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-3xl font-bold text-teal-300">{publishedMissions}</div>
              <div className="text-white/80">Missions actives</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-3xl font-bold text-blue-300">{totalApplications}</div>
              <div className="text-white/80">Candidatures</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="text-3xl font-bold text-purple-300">{completedMissions}</div>
              <div className="text-white/80">Missions terminées</div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Mes missions</h2>
            {myMissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎯</div>
                <p className="text-white/80 mb-4">Vous n'avez pas encore créé de mission</p>
                <Link to="/missions/create" className="inline-block px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all" style={{
                  background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)'
                }}>
                  <span className="text-white">Créer ma première mission</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
            {myMissions.map((mission) => {
                  const acceptedCount = mission.acceptedCount || 0;
                  const remainingSpots = mission.maxParticipants - acceptedCount;
                  
                  return (
                  <Link key={mission.id} to={`/missions/${mission.id}/manage`} className="block p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-teal-400/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{mission.category?.icon}</span>
                          <h3 className="font-semibold text-white">{mission.title}</h3>
                        </div>
                        <p className="text-sm text-white/70 mt-1">
                          📅 {new Date(mission.date).toLocaleDateString('fr-FR')} • 
                          👥 {mission.applicationsCount || 0} candidatures • 
                          ✅ {acceptedCount}/{mission.maxParticipants} acceptés
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-teal-300 font-medium">
                            {mission.points || Math.ceil((mission.duration || 60) / 60)} pts
                          </span>
                          <span className="text-sm text-blue-400 font-medium">
                            {mission.rewardXRP || 0} XRP
                          </span>
                          {remainingSpots <= 0 ? (
                            <span className="text-sm text-red-400 font-medium">Complet</span>
                          ) : (
                            <span className="text-sm text-white/60">
                              {remainingSpots} place{remainingSpots > 1 ? 's' : ''} restante{remainingSpots > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          mission.status === 'published' ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30' :
                          mission.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' : 'bg-white/10 text-white/70 border border-white/20'
                        }`}>
                          {mission.status === 'published' ? 'Active' : mission.status === 'completed' ? 'Terminée' : mission.status}
                        </span>
                        <span className="text-white/40">→</span>
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historique des dépôts de fonds */}
          {transactions.length > 0 && (
            <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>💰</span>
                  <span>Historique des Fonds Ajoutés</span>
                </h2>
                <Link to="/wallet/fund" className="px-4 py-2 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl bg-white/10 border border-white/20 hover:bg-white/20">
                  <span className="text-white text-sm">+ Ajouter des fonds</span>
                </Link>
              </div>

              {/* Statistiques rapides */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-teal-300 text-sm font-medium mb-1">Total déposé</div>
                  <div className="text-2xl font-bold text-white">
                    {transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(2)} XRP
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    ≈ {transactions.reduce((sum, tx) => sum + (tx.amountEUR || 0), 0).toFixed(2)} EUR
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-blue-300 text-sm font-medium mb-1">Nombre de dépôts</div>
                  <div className="text-2xl font-bold text-white">
                    {transactions.length}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-purple-300 text-sm font-medium mb-1">Dernier dépôt</div>
                  <div className="text-sm font-semibold text-white">
                    {new Date(transactions[transactions.length - 1]?.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>

              {/* Liste des dernières transactions */}
              <div className="space-y-3">
                {transactions.slice(-5).reverse().map((tx, index) => (
                  <div 
                    key={tx.id} 
                    className={`bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all ${
                      index === 0 ? 'border-teal-400/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">💳</span>
                          <div>
                            <div className="text-white font-semibold">
                              {tx.description || 'Dépôt de fonds'}
                            </div>
                            <div className="text-white/50 text-xs mt-1">
                              {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        {tx.txHash && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-white/50">Transaction:</span>
                            <a
                              href={`https://testnet.xrpl.org/transactions/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 font-mono hover:underline"
                            >
                              {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 6)}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-teal-300">
                          +{tx.amount} XRP
                        </div>
                        {tx.amountEUR && (
                          <div className="text-white/50 text-sm mt-1">
                            ({tx.amountEUR} EUR)
                          </div>
                        )}
                        <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-300 border border-teal-400/30">
                          ✓ Complété
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {transactions.length > 5 && (
                <div className="mt-4 text-center">
                  <Link to="/wallet/fund" className="text-teal-300 hover:text-teal-200 text-sm font-medium">
                    Voir tout l'historique ({transactions.length} transactions) →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard Client
  const citizenLevel = getCitizenLevel(user?.totalPoints || 0);
  
  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Bonjour {user?.name}</h1>
            <p className="text-teal-200 mt-2">Votre impact au quotidien</p>
          </div>
        </div>

        {/* Niveau citoyen - Card principale avec le gradient */}
        <div className="rounded-3xl shadow-2xl p-8 mb-8" style={{ 
          background: 'linear-gradient(135deg, #34d399 0%, #14b8a6 50%, #3b82f6 100%)'
        }}>
          <div className="text-center mb-6">
            <div className="w-32 h-32 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-xl">
              <span className="text-7xl">{citizenLevel.icon}</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">
              {citizenLevel.name}
            </h2>
            <p className="text-6xl font-bold text-white mb-2">{user?.totalPoints || 0}</p>
            <p className="text-xl text-white/90">points d'impact</p>
          </div>
          {citizenLevel.nextLevel && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-medium">Progression</p>
                <p className="text-white font-bold">{citizenLevel.nextLevel - (user?.totalPoints || 0)} pts restants</p>
              </div>
              <div className="w-full bg-white/30 rounded-full h-4">
                <div 
                  className="h-4 rounded-full transition-all duration-500 bg-white shadow-lg"
                  style={{ width: `${citizenLevel.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link to="/map" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-8 hover:bg-white/15 transition-all flex items-center">
            <div className="text-5xl mr-6">🗺️</div>
            <div>
              <h2 className="text-xl font-bold text-white">Explorer la carte</h2>
              <p className="text-white/80">Découvrez les missions près de chez vous</p>
            </div>
          </Link>
          <Link to="/leaderboard" className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-8 hover:bg-white/15 transition-all flex items-center">
            <div className="text-5xl mr-6">🏆</div>
            <div>
              <h2 className="text-xl font-bold text-white">Classement</h2>
              <p className="text-white/80">Voir les meilleurs contributeurs</p>
            </div>
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Missions disponibles</h2>
            <Link to="/map" className="text-teal-300 hover:text-teal-200 font-medium">Voir tout →</Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.slice(0, 6).map((mission) => (
              <Link key={mission.id} to="/map" className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-teal-400/50 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{mission.category?.icon}</span>
                  <span className="text-sm font-medium text-teal-300">{mission.category?.name}</span>
                </div>
                <h3 className="font-semibold text-white">{mission.title}</h3>
                <p className="text-sm text-white/70 mt-1">{mission.organization?.name}</p>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-white/60">📍 {mission.location?.address?.slice(0, 20)}...</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-teal-300">
                      {mission.points || Math.ceil((mission.duration || 60) / 60)} pts
                    </span>
                    {mission.rewardXRP > 0 && (
                      <span className="font-semibold text-blue-400">
                        + {mission.rewardXRP} XRP
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

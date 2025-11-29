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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      if (isAdmin) {
        const statsRes = await api.getAdminStats();
        setStats(statsRes.data.data);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Dashboard Admin
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">🎛️ Dashboard Admin</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-4xl mb-2">👤</div>
              <div className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
              <div className="text-gray-500">Utilisateurs</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-4xl mb-2">🏢</div>
              <div className="text-3xl font-bold text-gray-900">{stats?.totalOrganizations || 0}</div>
              <div className="text-gray-500">Organisations</div>
              {stats?.pendingOrganizations > 0 && (
                <div className="mt-2 text-orange-600 font-medium">
                  {stats.pendingOrganizations} en attente
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-3xl font-bold text-gray-900">{stats?.totalMissions || 0}</div>
              <div className="text-gray-500">Missions</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-4xl mb-2">⭐</div>
              <div className="text-3xl font-bold text-gray-900">{stats?.totalPointsDistributed || 0}</div>
              <div className="text-gray-500">Points distribués</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/admin/organizations" className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-2">🏢 Organisations</h2>
              <p className="text-gray-600">Gérer et valider les organisations</p>
              {stats?.pendingOrganizations > 0 && (
                <span className="inline-block mt-3 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  {stats.pendingOrganizations} en attente
                </span>
              )}
            </Link>
            <Link to="/admin/users" className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-2">👥 Utilisateurs</h2>
              <p className="text-gray-600">Voir tous les utilisateurs</p>
            </Link>
            <Link to="/leaderboard" className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-2">🏆 Classement</h2>
              <p className="text-gray-600">Voir le leaderboard</p>
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏢 {user?.name}</h1>
              <p className="text-gray-600">Tableau de bord organisation</p>
            </div>
            <Link to="/missions/create" className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700">
              + Créer une mission
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-3xl font-bold text-gray-900">{myMissions.length}</div>
              <div className="text-gray-500">Missions créées</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-3xl font-bold text-green-600">{publishedMissions}</div>
              <div className="text-gray-500">Missions actives</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-3xl font-bold text-blue-600">{totalApplications}</div>
              <div className="text-gray-500">Candidatures</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-3xl font-bold text-purple-600">{completedMissions}</div>
              <div className="text-gray-500">Missions terminées</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mes missions</h2>
            {myMissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🎯</div>
                <p className="text-gray-600 mb-4">Vous n'avez pas encore créé de mission</p>
                <Link to="/missions/create" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700">
                  Créer ma première mission
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
            {myMissions.map((mission) => {
                  const acceptedCount = mission.acceptedCount || 0;
                  const remainingSpots = mission.maxParticipants - acceptedCount;
                  
                  return (
                  <Link key={mission.id} to={`/missions/${mission.id}/manage`} className="block p-4 border rounded-xl hover:border-green-500 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{mission.category?.icon}</span>
                          <h3 className="font-semibold text-gray-900">{mission.title}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          📅 {new Date(mission.date).toLocaleDateString('fr-FR')} • 
                          👥 {mission.applicationsCount || 0} candidatures • 
                          ✅ {acceptedCount}/{mission.maxParticipants} acceptés
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-green-600 font-medium">
                            {mission.points || Math.ceil((mission.duration || 60) / 60)} pts
                          </span>
                          <span className="text-sm text-blue-600 font-medium">
                            {mission.rewardXRP || 0} XRP
                          </span>
                          {remainingSpots <= 0 ? (
                            <span className="text-sm text-red-600 font-medium">Complet</span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              {remainingSpots} place{remainingSpots > 1 ? 's' : ''} restante{remainingSpots > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          mission.status === 'published' ? 'bg-green-100 text-green-700' :
                          mission.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {mission.status === 'published' ? 'Active' : mission.status === 'completed' ? 'Terminée' : mission.status}
                        </span>
                        <span className="text-gray-400">→</span>
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Client
  const citizenLevel = getCitizenLevel(user?.totalPoints || 0);
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👋 Bonjour {user?.name}</h1>
            <p className="text-gray-600">Prêt à faire un impact ?</p>
          </div>
        </div>

        {/* Niveau citoyen */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{citizenLevel.icon}</span>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: citizenLevel.color }}>
                  {citizenLevel.name}
                </h2>
                <p className="text-gray-600">{user?.totalPoints || 0} points d'impact</p>
              </div>
            </div>
            {citizenLevel.nextLevel && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Prochain niveau</p>
                <p className="font-bold" style={{ color: citizenLevel.color }}>
                  {citizenLevel.nextLevel} pts
                </p>
              </div>
            )}
          </div>
          {citizenLevel.nextLevel && (
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${citizenLevel.progress}%`,
                  backgroundColor: citizenLevel.color
                }}
              />
            </div>
          )}
          {citizenLevel.nextLevel && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Plus que {citizenLevel.nextLevel - (user?.totalPoints || 0)} points pour le prochain niveau !
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-sm p-6 text-white">
            <div className="text-4xl font-bold">{user?.totalPoints || 0}</div>
            <div className="opacity-90">Points d'impact</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="text-3xl font-bold text-gray-900">{user?.completedMissions || 0}</div>
            <div className="text-gray-500">Missions complétées</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="text-3xl font-bold text-gray-900">{user?.badges?.length || 0}</div>
            <div className="text-gray-500">Badges obtenus</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="text-xs font-mono text-gray-500 truncate">{user?.walletAddress || 'Non créé'}</div>
            <div className="text-gray-500 mt-1">Wallet XRPL</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link to="/map" className="bg-white rounded-2xl shadow-sm p-8 hover:shadow-md transition-shadow flex items-center">
            <div className="text-5xl mr-6">🗺️</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Explorer la carte</h2>
              <p className="text-gray-600">Découvrez les missions près de chez vous</p>
            </div>
          </Link>
          <Link to="/leaderboard" className="bg-white rounded-2xl shadow-sm p-8 hover:shadow-md transition-shadow flex items-center">
            <div className="text-5xl mr-6">🏆</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Classement</h2>
              <p className="text-gray-600">Voir les meilleurs contributeurs</p>
            </div>
          </Link>
        </div>

        {user?.badges?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mes badges</h2>
            <div className="flex gap-4 flex-wrap">
              {user.badges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-full">
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="font-medium text-yellow-800">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Missions disponibles</h2>
            <Link to="/map" className="text-green-600 hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.slice(0, 6).map((mission) => (
              <Link key={mission.id} to="/map" className="border rounded-xl p-4 hover:border-green-500 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{mission.category?.icon}</span>
                  <span className="text-sm font-medium" style={{ color: mission.category?.color }}>{mission.category?.name}</span>
                </div>
                <h3 className="font-semibold text-gray-900">{mission.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{mission.organization?.name}</p>
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-gray-500">📍 {mission.location?.address?.slice(0, 20)}...</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-600">
                      {mission.points || Math.ceil((mission.duration || 60) / 60)} pts
                    </span>
                    {mission.rewardXRP > 0 && (
                      <span className="font-semibold text-blue-600">
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

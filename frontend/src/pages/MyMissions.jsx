import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyMissions() {
  const { user } = useAuth();
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected, completed

  useEffect(() => {
    loadMyApplications();
  }, []);

  const loadMyApplications = async () => {
    try {
      const res = await api.getMyApplications();
      setMyApplications(res.data.data);
    } catch (error) {
      console.error('Erreur chargement candidatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = myApplications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const counts = {
    all: myApplications.length,
    pending: myApplications.filter(a => a.status === 'pending').length,
    accepted: myApplications.filter(a => a.status === 'accepted').length,
    rejected: myApplications.filter(a => a.status === 'rejected').length,
    completed: myApplications.filter(a => a.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📋 Mes Missions</h1>
            <p className="text-teal-200">Historique et suivi de vos candidatures</p>
          </div>
          <Link to="/map" className="px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl" style={{
            background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)'
          }}>
            <span className="text-white">← Retour à la carte</span>
          </Link>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-white/20 border-2 border-teal-400 shadow-xl'
                : 'bg-white/10 border border-white/20 hover:bg-white/15'
            } backdrop-blur-md`}
          >
            <div className="text-2xl font-bold text-white">{counts.all}</div>
            <div className="text-sm text-white/80">Total</div>
          </button>
          
          <button
            onClick={() => setFilter('pending')}
            className={`p-4 rounded-xl transition-all ${
              filter === 'pending'
                ? 'bg-white/20 border-2 border-yellow-400 shadow-xl'
                : 'bg-white/10 border border-white/20 hover:bg-white/15'
            } backdrop-blur-md`}
          >
            <div className="text-2xl font-bold text-yellow-300">{counts.pending}</div>
            <div className="text-sm text-white/80">En attente</div>
          </button>
          
          <button
            onClick={() => setFilter('accepted')}
            className={`p-4 rounded-xl transition-all ${
              filter === 'accepted'
                ? 'bg-white/20 border-2 border-teal-400 shadow-xl'
                : 'bg-white/10 border border-white/20 hover:bg-white/15'
            } backdrop-blur-md`}
          >
            <div className="text-2xl font-bold text-teal-300">{counts.accepted}</div>
            <div className="text-sm text-white/80">Acceptées</div>
          </button>
          
          <button
            onClick={() => setFilter('rejected')}
            className={`p-4 rounded-xl transition-all ${
              filter === 'rejected'
                ? 'bg-white/20 border-2 border-red-400 shadow-xl'
                : 'bg-white/10 border border-white/20 hover:bg-white/15'
            } backdrop-blur-md`}
          >
            <div className="text-2xl font-bold text-red-300">{counts.rejected}</div>
            <div className="text-sm text-white/80">Refusées</div>
          </button>
          
          <button
            onClick={() => setFilter('completed')}
            className={`p-4 rounded-xl transition-all ${
              filter === 'completed'
                ? 'bg-white/20 border-2 border-blue-400 shadow-xl'
                : 'bg-white/10 border border-white/20 hover:bg-white/15'
            } backdrop-blur-md`}
          >
            <div className="text-2xl font-bold text-blue-300">{counts.completed}</div>
            <div className="text-sm text-white/80">Terminées</div>
          </button>
        </div>

        {/* Liste des missions */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">
                {filter === 'all' && '🎯'}
                {filter === 'pending' && '⏳'}
                {filter === 'accepted' && '✅'}
                {filter === 'rejected' && '❌'}
                {filter === 'completed' && '🏆'}
              </div>
              <p className="text-white/70 text-lg mb-4">
                {filter === 'all' && "Vous n'avez pas encore postulé à des missions"}
                {filter === 'pending' && "Aucune candidature en attente"}
                {filter === 'accepted' && "Aucune mission acceptée"}
                {filter === 'rejected' && "Aucune candidature refusée"}
                {filter === 'completed' && "Aucune mission terminée"}
              </p>
              <Link to="/map" className="inline-block px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all" style={{
                background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)'
              }}>
                <span className="text-white">Découvrir les missions</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => {
                const mission = application.mission;
                const statusConfig = {
                  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icon: '⏳' },
                  accepted: { label: 'Acceptée', color: 'bg-teal-500/20 text-teal-300 border-teal-400/30', icon: '✅' },
                  rejected: { label: 'Refusée', color: 'bg-red-500/20 text-red-300 border-red-400/30', icon: '❌' },
                  completed: { label: 'Terminée', color: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icon: '🏆' }
                };
                const status = statusConfig[application.status] || statusConfig.pending;
                const isPast = new Date(mission?.date) < new Date();
                const isFuture = new Date(mission?.date) > new Date();

                return (
                  <div key={application.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      {/* Contenu principal */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{mission?.category?.icon}</span>
                          <div>
                            <h3 className="font-bold text-white text-lg">{mission?.title}</h3>
                            <p className="text-sm text-white/60">{mission?.category?.name}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/70 mb-3">
                          <span className="flex items-center gap-1">
                            <span>🏢</span>
                            <span>{mission?.organization?.name}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>📍</span>
                            <span>{mission?.location?.address?.slice(0, 30)}...</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>📅</span>
                            <span>{mission?.date ? new Date(mission.date).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : 'Date non définie'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{mission?.duration || 60} min</span>
                          </span>
                        </div>

                        {/* Récompenses */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="px-3 py-1 rounded-lg" style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6)' }}>
                            <span className="text-white font-bold">{mission?.points || 0} pts</span>
                          </div>
                          {mission?.rewardXRP > 0 && (
                            <div className="px-3 py-1 rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                              <span className="text-white font-bold">+ {mission.rewardXRP} XRP</span>
                            </div>
                          )}
                        </div>

                        {/* Message de candidature */}
                        {application.message && (
                          <div className="bg-white/5 rounded-lg p-3 mb-3">
                            <p className="text-sm text-white/80 italic">"{application.message}"</p>
                          </div>
                        )}

                        {/* Dates */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
                          <span>
                            Postulé le {new Date(application.appliedAt).toLocaleDateString('fr-FR')} à {new Date(application.appliedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {application.reviewedAt && (
                            <span>
                              • Réponse le {new Date(application.reviewedAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                          {application.completedAt && (
                            <span>
                              • Terminée le {new Date(application.completedAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status et badges */}
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-2 rounded-xl text-sm font-medium border flex items-center gap-2 ${status.color}`}>
                          <span className="text-lg">{status.icon}</span>
                          <span>{status.label}</span>
                        </span>
                        
                        {application.status === 'completed' && (
                          <div className="text-right">
                            <div className="text-xs text-white/50 mb-1">Points gagnés</div>
                            <div className="text-lg font-bold text-teal-300">+{mission?.points || 0} pts</div>
                          </div>
                        )}

                        {application.status === 'accepted' && isFuture && (
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-full text-xs font-medium">
                            À venir
                          </span>
                        )}

                        {isPast && application.status === 'pending' && (
                          <span className="px-3 py-1 bg-white/10 text-white/50 border border-white/20 rounded-full text-xs">
                            Mission passée
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

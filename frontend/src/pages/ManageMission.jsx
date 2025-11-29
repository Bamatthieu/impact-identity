import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ManageMission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOrganization } = useAuth();
  const [mission, setMission] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOrganization) {
      navigate('/dashboard');
      return;
    }
    loadMission();
  }, [id, isOrganization]);

  const loadMission = async () => {
    try {
      setLoading(true);
      const res = await api.getMission(id);
      setMission(res.data.data);
      
      const appsRes = await api.getMissionApplications(id);
      setApplications(appsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (appId, status) => {
    setActionLoading(appId);
    setError('');
    setSuccess('');
    
    try {
      const res = await api.updateApplicationStatus(id, appId, status);
      
      // Mettre à jour l'application dans la liste
      setApplications(apps => 
        apps.map(app => app.id === appId ? { ...app, status } : app)
      );
      
      // Mettre à jour les infos de la mission
      if (res.data.data.mission) {
        setMission(prev => ({
          ...prev,
          acceptedCount: res.data.data.mission.acceptedCount
        }));
      }
      
      setSuccess(status === 'accepted' ? 'Candidature acceptée !' : 'Candidature refusée');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteMission = async () => {
    const acceptedParticipants = applications.filter(a => a.status === 'accepted');
    if (acceptedParticipants.length === 0) {
      setError('Aucun participant accepté');
      return;
    }

    if (!confirm(`Valider la mission pour ${acceptedParticipants.length} participant(s) ?`)) return;

    setActionLoading('complete');
    setError('');

    try {
      const participantIds = acceptedParticipants.map(a => a.userId);
      await api.completeMission(id, participantIds);
      setSuccess('Mission validée ! Les participants ont reçu leurs récompenses.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur validation');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Mission non trouvée</p>
      </div>
    );
  }

  const acceptedCount = mission.acceptedCount || applications.filter(a => a.status === 'accepted').length;
  const remainingSpots = mission.maxParticipants - acceptedCount;
  const pendingApplications = applications.filter(a => a.status === 'pending');
  const acceptedApplications = applications.filter(a => a.status === 'accepted');
  const rejectedApplications = applications.filter(a => a.status === 'rejected');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 mb-4">
            ← Retour
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{mission.title}</h1>
          <p className="text-gray-600 mt-1">{mission.description}</p>
        </div>

        {/* Alertes */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Stats de la mission */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Places disponibles</p>
            <p className="text-2xl font-bold text-green-600">
              {remainingSpots} / {mission.maxParticipants}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Candidatures</p>
            <p className="text-2xl font-bold text-blue-600">{applications.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Points</p>
            <p className="text-2xl font-bold text-purple-600">
              {mission.points || Math.ceil((mission.duration || 60) / 60)} pts
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Récompense XRP</p>
            <p className="text-2xl font-bold text-orange-600">{mission.rewardXRP || 0} XRP</p>
          </div>
        </div>

        {/* Candidatures en attente */}
        {pendingApplications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
              Candidatures en attente ({pendingApplications.length})
            </h2>
            <div className="space-y-4">
              {pendingApplications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{app.applicant?.name || 'Utilisateur'}</p>
                    <p className="text-sm text-gray-500">{app.applicant?.email}</p>
                    {app.applicant?.totalPoints !== undefined && (
                      <p className="text-sm text-green-600">
                        {app.applicant.totalPoints} pts • {app.applicant.completedMissions || 0} missions
                      </p>
                    )}
                    {app.message && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{app.message}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplicationAction(app.id, 'accepted')}
                      disabled={actionLoading === app.id || remainingSpots <= 0}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        remainingSpots <= 0 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {actionLoading === app.id ? '...' : '✅ Accepter'}
                    </button>
                    <button
                      onClick={() => handleApplicationAction(app.id, 'rejected')}
                      disabled={actionLoading === app.id}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                    >
                      {actionLoading === app.id ? '...' : '❌ Refuser'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants acceptés */}
        {acceptedApplications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Participants acceptés ({acceptedApplications.length})
            </h2>
            <div className="space-y-3">
              {acceptedApplications.map((app) => (
                <div key={app.id} className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-800">{app.applicant?.name || 'Utilisateur'}</p>
                    <p className="text-sm text-green-600">{app.applicant?.email}</p>
                  </div>
                  <button
                    onClick={() => handleApplicationAction(app.id, 'rejected')}
                    disabled={actionLoading === app.id}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>

            {/* Bouton valider la mission */}
            {mission.status !== 'completed' && (
              <button
                onClick={handleCompleteMission}
                disabled={actionLoading === 'complete'}
                className="mt-6 w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-blue-700 transition-all"
              >
                {actionLoading === 'complete' 
                  ? 'Validation en cours...' 
                  : `🎉 Valider la mission (${acceptedApplications.length} participants)`
                }
              </button>
            )}
          </div>
        )}

        {/* Candidatures refusées */}
        {rejectedApplications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-500">
              <span className="w-3 h-3 bg-red-400 rounded-full"></span>
              Candidatures refusées ({rejectedApplications.length})
            </h2>
            <div className="space-y-2">
              {rejectedApplications.map((app) => (
                <div key={app.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="font-medium">{app.applicant?.name || 'Utilisateur'}</p>
                    <p className="text-sm text-gray-500">{app.applicant?.email}</p>
                  </div>
                  <button
                    onClick={() => handleApplicationAction(app.id, 'accepted')}
                    disabled={actionLoading === app.id || remainingSpots <= 0}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    Réintégrer
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {applications.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-xl text-gray-600">Aucune candidature pour le moment</p>
            <p className="text-gray-400 mt-2">Les candidatures apparaîtront ici</p>
          </div>
        )}
      </div>
    </div>
  );
}

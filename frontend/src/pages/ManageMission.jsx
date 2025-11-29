import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { showToast, ConfirmModal, ReportModal } from '../components/Toast';

export default function ManageMission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOrganization } = useAuth();
  const [mission, setMission] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // États pour les modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [reportModal, setReportModal] = useState({ show: false, user: null });
  
  // État pour l'édition
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    address: '',
    date: '',
    duration: 60,
    maxParticipants: 1,
    rewardXRP: 0
  });

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
      const missionData = res.data.data;
      setMission(missionData);
      
      // Initialiser le formulaire d'édition
      setEditForm({
        title: missionData.title || '',
        description: missionData.description || '',
        address: missionData.address || '',
        date: missionData.date ? missionData.date.split('T')[0] : '',
        duration: missionData.duration || 60,
        maxParticipants: missionData.maxParticipants || 1,
        rewardXRP: missionData.rewardXRP || 0
      });
      
      const appsRes = await api.getMissionApplications(id);
      setApplications(appsRes.data.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (appId, status) => {
    setActionLoading(appId);
    
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
      
      showToast(status === 'accepted' ? 'Candidature acceptée !' : 'Candidature refusée', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteMission = async () => {
    const acceptedParticipants = applications.filter(a => a.status === 'accepted');
    if (acceptedParticipants.length === 0) {
      showToast('Aucun participant accepté', 'error');
      return;
    }

    setShowCompleteModal(true);
  };
  
  const confirmCompleteMission = async () => {
    setShowCompleteModal(false);
    setActionLoading('complete');

    try {
      const acceptedParticipants = applications.filter(a => a.status === 'accepted');
      const participantIds = acceptedParticipants.map(a => a.userId);
      
      // Lancer la validation
      const response = await api.completeMission(id, participantIds);
      
      // Vérifier si quelqu'un a monté de niveau
      const participants = response.data.data?.participants || [];
      const leveledUpParticipants = participants.filter(p => p.leveledUp);
      
      // Construire le message de succès
      let message = '✅ Mission validée avec succès !\n\n';
      message += `🎁 Récompenses distribuées :\n`;
      message += `• Points d'impact\n`;
      message += `• NFT de mission\n`;
      if (mission.rewardXRP > 0) {
        message += `• ${mission.rewardXRP} XRP par participant\n`;
      }
      
      if (leveledUpParticipants.length > 0) {
        message += `\n🏅 Niveaux atteints :\n`;
        leveledUpParticipants.forEach(p => {
          message += `• ${p.citizenLevel}\n`;
        });
      }
      
      // Afficher le modal de succès
      setSuccessMessage(message);
      setShowSuccessModal(true);
      setActionLoading(null);
      
      // Rediriger après 3 secondes
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur validation', 'error');
      setActionLoading(null);
    }
  };
  
  // Supprimer la mission
  const handleDeleteMission = async () => {
    setShowDeleteModal(false);
    setActionLoading('delete');
    
    try {
      await api.deleteMission(id);
      showToast('Mission supprimée avec succès', 'success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur suppression', 'error');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Modifier la mission
  const handleUpdateMission = async () => {
    setActionLoading('update');
    
    try {
      await api.updateMission(id, editForm);
      setMission(prev => ({ ...prev, ...editForm }));
      setShowEditMode(false);
      showToast('Mission mise à jour avec succès !', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur modification', 'error');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Signaler un participant
  const handleReportUser = async (reportData) => {
    try {
      await api.reportParticipant(id, reportModal.user.userId, {
        reason: reportData.reason,
        details: reportData.details
      });
      showToast('Signalement envoyé. Nous examinerons votre rapport.', 'success');
      setReportModal({ show: false, user: null });
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur signalement', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Chargement...</p>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-6xl mb-4">❌</div>
        <p className="text-xl font-bold text-red-600">Mission non trouvée</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const acceptedCount = mission.acceptedCount || applications.filter(a => a.status === 'accepted').length;
  const remainingSpots = mission.maxParticipants - acceptedCount;
  const pendingApplications = applications.filter(a => a.status === 'pending');
  const acceptedApplications = applications.filter(a => a.status === 'accepted');
  const rejectedApplications = applications.filter(a => a.status === 'rejected');

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-teal-300 hover:text-teal-200 mb-4">
            ← Retour
          </button>
          
          {showEditMode ? (
            // Mode édition
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">✏️ Modifier la mission</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">Titre</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">Durée (min)</label>
                    <input
                      type="number"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">Participants max</label>
                    <input
                      type="number"
                      value={editForm.maxParticipants}
                      onChange={(e) => setEditForm({ ...editForm, maxParticipants: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">XRP</label>
                    <input
                      type="number"
                      value={editForm.rewardXRP}
                      onChange={(e) => setEditForm({ ...editForm, rewardXRP: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdateMission}
                    disabled={actionLoading === 'update'}
                    className="flex-1 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all shadow-lg hover:shadow-xl text-white"
                    style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}
                  >
                    {actionLoading === 'update' ? 'Enregistrement...' : '✅ Enregistrer'}
                  </button>
                  <button
                    onClick={() => setShowEditMode(false)}
                    className="px-6 py-3 bg-white/10 text-white/90 rounded-lg font-semibold hover:bg-white/15 border border-white/20"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Mode affichage normal
            <>
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{mission.title}</h1>
                    {mission.status === 'completed' && (
                      <span className="px-4 py-1.5 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-full text-sm font-bold shadow-lg">
                        ✅ Validée
                      </span>
                    )}
                    {mission.status === 'published' && (
                      <span className="px-4 py-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-sm font-bold shadow-lg animate-pulse">
                        🔵 En cours
                      </span>
                    )}
                  </div>
                  <p className="text-white/80 mt-2 text-lg">{mission.description}</p>
                  <div className="flex gap-2 mt-3">
                    {mission.isVolunteer && (
                      <span className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30 rounded-full text-sm font-bold shadow-md">
                        💜 Mission Bénévole (x2 points)
                      </span>
                    )}
                    {mission.category && (
                      <span className="inline-flex items-center px-4 py-1.5 bg-white/10 text-white/90 border border-white/20 rounded-full text-sm font-medium">
                        {mission.category.icon || '📋'} {mission.category.name || mission.category}
                      </span>
                    )}
                  </div>
                </div>
                {mission.status !== 'completed' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEditMode(true)}
                      className="px-5 py-3 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-5 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Stats de la mission */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <p className="text-sm text-green-100 font-medium mb-1">Places disponibles</p>
            <p className="text-3xl font-bold text-white">
              {remainingSpots} / {mission.maxParticipants}
            </p>
            <div className="mt-2 w-full bg-green-300 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${((mission.maxParticipants - remainingSpots) / mission.maxParticipants) * 100}%` }}
              />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <p className="text-sm text-blue-100 font-medium mb-1">Candidatures</p>
            <p className="text-3xl font-bold text-white">{applications.length}</p>
            <p className="text-sm text-blue-200 mt-2">
              {pendingApplications.length} en attente
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <p className="text-sm text-purple-100 font-medium mb-1">Points</p>
            <p className="text-3xl font-bold text-white">
              {mission.points || Math.ceil((mission.duration || 60) / 60)} pts
            </p>
            <p className="text-sm text-purple-200 mt-2">
              {mission.isVolunteer ? 'x2 bénévole' : 'par participant'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <p className="text-sm text-orange-100 font-medium mb-1">Récompense XRP</p>
            <p className="text-3xl font-bold text-white">{mission.rewardXRP || 0} XRP</p>
            <p className="text-sm text-orange-200 mt-2">
              {mission.rewardXRP > 0 ? 'par participant' : 'Bénévole'}
            </p>
          </div>
        </div>

        {/* Candidatures en attente */}
        {pendingApplications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-yellow-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
              Candidatures en attente ({pendingApplications.length})
            </h2>
            <div className="space-y-4">
              {pendingApplications.map((app) => (
                <div key={app.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {(app.applicant?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{app.applicant?.name || 'Utilisateur'}</p>
                          <p className="text-sm text-gray-500">{app.applicant?.email}</p>
                        </div>
                      </div>
                      {app.applicant?.totalPoints !== undefined && (
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                            ⭐ {app.applicant.totalPoints} pts
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                            🎯 {app.applicant.completedMissions || 0} missions
                          </span>
                        </div>
                      )}
                      {app.message && (
                        <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                          <p className="text-sm text-gray-700 italic">💬 "{app.message}"</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleApplicationAction(app.id, 'accepted')}
                        disabled={actionLoading === app.id || remainingSpots <= 0}
                        className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                          remainingSpots <= 0 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {actionLoading === app.id ? '⏳' : '✅ Accepter'}
                      </button>
                      <button
                        onClick={() => handleApplicationAction(app.id, 'rejected')}
                        disabled={actionLoading === app.id}
                        className="px-6 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        {actionLoading === app.id ? '⏳' : '❌ Refuser'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants acceptés */}
        {acceptedApplications.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 mb-6 border-2 border-green-300">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></span>
              Participants acceptés ({acceptedApplications.length})
            </h2>
            <div className="space-y-3">
              {acceptedApplications.map((app) => (
                <div key={app.id} className="bg-white border-2 border-green-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                        ✓
                      </div>
                      <div>
                        <p className="font-bold text-green-900">{app.applicant?.name || 'Utilisateur'}</p>
                        <p className="text-sm text-green-600">{app.applicant?.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReportModal({ show: true, user: app })}
                        className="text-sm px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-all font-medium"
                        title="Signaler un comportement inapproprié"
                      >
                        🚩 Signaler
                      </button>
                      <button
                        onClick={() => handleApplicationAction(app.id, 'rejected')}
                        disabled={actionLoading === app.id}
                        className="text-sm px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all font-medium disabled:opacity-50"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton valider la mission */}
            {mission.status !== 'completed' && (
              <button
                onClick={handleCompleteMission}
                disabled={actionLoading === 'complete'}
                className="mt-6 w-full py-5 bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:via-emerald-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'complete' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Validation en cours...
                  </span>
                ) : (
                  `🎉 Valider la mission (${acceptedApplications.length} participant${acceptedApplications.length > 1 ? 's' : ''})`
                )}
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
      
      {/* Modal suppression */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteMission}
        title="Supprimer la mission"
        message={`Êtes-vous sûr de vouloir supprimer la mission "${mission?.title}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        confirmColor="red"
      />
      
      {/* Modal validation mission */}
      <ConfirmModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={confirmCompleteMission}
        title="Valider la mission"
        message={`Valider la mission pour ${applications.filter(a => a.status === 'accepted').length} participant(s) ? Ils recevront leurs récompenses (points et XRP).`}
        confirmText="Valider"
        confirmColor="green"
      />
      
      {/* Modal signalement */}
      <ReportModal
        isOpen={reportModal.show}
        onClose={() => setReportModal({ show: false, user: null })}
        onSubmit={handleReportUser}
        userName={reportModal.user?.applicant?.name || 'Utilisateur'}
      />
      
      {/* Modal de succès */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Mission Validée !</h3>
              <div className="text-left bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 mb-6 border-2 border-green-200">
                <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                  {successMessage}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Redirection vers le dashboard...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

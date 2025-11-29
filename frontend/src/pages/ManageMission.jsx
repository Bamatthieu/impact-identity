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
      const response = await api.completeMission(id, participantIds);
      
      // Vérifier si quelqu'un a monté de niveau
      const participants = response.data.data?.participants || [];
      const leveledUpParticipants = participants.filter(p => p.leveledUp);
      
      if (leveledUpParticipants.length > 0) {
        const badgeMessages = leveledUpParticipants.map(p => 
          `🏅 Badge NFT minté pour niveau ${p.citizenLevel}!`
        ).join(' ');
        showToast(`Mission validée ! ${badgeMessages}`, 'success');
      } else {
        showToast('Mission validée ! Les participants ont reçu leurs récompenses.', 'success');
      }
      
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur validation', 'error');
    } finally {
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
          
          {showEditMode ? (
            // Mode édition
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">✏️ Modifier la mission</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min)</label>
                    <input
                      type="number"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Participants max</label>
                    <input
                      type="number"
                      value={editForm.maxParticipants}
                      onChange={(e) => setEditForm({ ...editForm, maxParticipants: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">XRP</label>
                    <input
                      type="number"
                      value={editForm.rewardXRP}
                      onChange={(e) => setEditForm({ ...editForm, rewardXRP: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleUpdateMission}
                    disabled={actionLoading === 'update'}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === 'update' ? 'Enregistrement...' : '✅ Enregistrer'}
                  </button>
                  <button
                    onClick={() => setShowEditMode(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Mode affichage normal
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{mission.title}</h1>
                  <p className="text-gray-600 mt-1">{mission.description}</p>
                  {mission.isVolunteer && (
                    <span className="inline-flex items-center mt-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      💜 Mission Bénévole (x2 points)
                    </span>
                  )}
                </div>
                {mission.status !== 'completed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEditMode(true)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReportModal({ show: true, user: app })}
                      className="text-sm text-orange-600 hover:text-orange-800 px-3 py-1 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                      title="Signaler un comportement inapproprié"
                    >
                      🚩 Signaler
                    </button>
                    <button
                      onClick={() => handleApplicationAction(app.id, 'rejected')}
                      disabled={actionLoading === app.id}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Retirer
                    </button>
                  </div>
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
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminOrganizations() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadOrganizations();
  }, [isAdmin, navigate]);

  const loadOrganizations = async () => {
    try {
      const res = await api.getOrganizations();
      setOrganizations(res.data.data);
    } catch (error) {
      console.error('Erreur chargement organisations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.approveOrganization(id);
      loadOrganizations();
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors de l\'approbation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await api.rejectOrganization(rejectModal, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      loadOrganizations();
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrgs = filter === 'all' 
    ? organizations 
    : organizations.filter(org => org.status === filter);

  const pendingCount = organizations.filter(org => org.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 mb-4">
            ← Retour au dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">🏢 Gestion des organisations</h1>
          <p className="text-gray-600">{organizations.length} organisations • {pendingCount} en attente</p>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'Toutes', count: organizations.length },
            { key: 'pending', label: 'En attente', count: pendingCount },
            { key: 'active', label: 'Validées', count: organizations.filter(o => o.status === 'active').length },
            { key: 'rejected', label: 'Rejetées', count: organizations.filter(o => o.status === 'rejected').length }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f.key
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Liste des organisations */}
        <div className="space-y-4">
          {filteredOrgs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🏢</div>
              <p className="text-gray-600">Aucune organisation dans cette catégorie</p>
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <div key={org.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {org.organizationType === 1 ? '🏢' :
                         org.organizationType === 2 ? '🤲' :
                         org.organizationType === 3 ? '🏛️' :
                         org.organizationType === 4 ? '🏘️' :
                         org.organizationType === 5 ? '🌍' :
                         org.organizationType === 6 ? '🎗️' :
                         org.organizationType === 7 ? '🎓' : '📋'}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900">{org.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        org.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        org.status === 'active' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {org.status === 'pending' ? 'En attente' :
                         org.status === 'active' ? 'Validée' : 'Rejetée'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{org.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>📧 {org.email}</span>
                      {org.phone && <span>📞 {org.phone}</span>}
                      {org.siret && <span>🏷️ SIRET: {org.siret}</span>}
                      <span>📅 Inscrit le {new Date(org.createdAt).toLocaleDateString('fr-FR')}</span>
                      <span>🎯 {org.missionsCount || 0} missions</span>
                    </div>
                    {org.walletAddress && (
                      <p className="mt-2 text-xs font-mono text-gray-400">
                        Wallet: {org.walletAddress}
                      </p>
                    )}
                  </div>

                  {org.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(org.id)}
                        disabled={actionLoading === org.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        ✅ Approuver
                      </button>
                      <button
                        onClick={() => setRejectModal(org.id)}
                        disabled={actionLoading === org.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        ❌ Rejeter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de rejet */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Rejeter l'organisation</h3>
              <p className="text-gray-600 mb-4">
                Veuillez indiquer la raison du rejet. Elle sera communiquée à l'organisation.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
                rows={3}
                placeholder="Raison du rejet..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRejectModal(null);
                    setRejectReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

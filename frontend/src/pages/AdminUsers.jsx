import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { showToast, ConfirmModal } from '../components/Toast';

// Fonction pour déterminer le niveau citoyen
const getCitizenLevel = (points) => {
  if (points >= 200) return { name: 'Légende', icon: '👑', color: '#ec4899' };
  if (points >= 100) return { name: 'Héros Local', icon: '🦸', color: '#8b5cf6' };
  if (points >= 50) return { name: 'Citoyen Exemplaire', icon: '🏆', color: '#f59e0b' };
  if (points >= 20) return { name: 'Super Citoyen', icon: '⭐', color: '#3b82f6' };
  if (points >= 10) return { name: 'Bon Citoyen', icon: '🌿', color: '#22c55e' };
  return { name: 'Nouveau Citoyen', icon: '🌱', color: '#9ca3af' };
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [isAdmin, navigate]);

  const loadUsers = async () => {
    try {
      const res = await api.getAdminUsers();
      setUsers(res.data.data);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    setActionLoading(deleteModal);
    try {
      await api.deleteUser(deleteModal);
      showToast('Utilisateur supprimé avec succès', 'success');
      setDeleteModal(null);
      loadUsers();
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || user.role === filter;
    return matchesSearch && matchesFilter;
  });

  const clientsCount = users.filter(u => u.role === 'client').length;
  const orgsCount = users.filter(u => u.role === 'organization').length;

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
          <h1 className="text-3xl font-bold text-gray-900">👥 Gestion des utilisateurs</h1>
          <p className="text-gray-600">{users.length} utilisateurs • {clientsCount} bénévoles • {orgsCount} organisations</p>
        </div>

        {/* Recherche et filtres */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Tous', count: users.length },
              { key: 'client', label: 'Bénévoles', count: clientsCount },
              { key: 'organization', label: 'Organisations', count: orgsCount }
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
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-gray-600">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Utilisateur</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Rôle</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Points / Niveau</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Inscription</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const level = getCitizenLevel(user.totalPoints || 0);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === 'client' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'organization' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'client' ? '👤 Bénévole' :
                           user.role === 'organization' ? '🏢 Organisation' :
                           '⚙️ Admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'client' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{level.icon}</span>
                            <div>
                              <div className="font-medium" style={{ color: level.color }}>
                                {user.totalPoints || 0} pts
                              </div>
                              <div className="text-xs text-gray-500">{level.name}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-700' :
                          user.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {user.status === 'active' ? '✓ Actif' :
                           user.status === 'pending' ? '⏳ En attente' :
                           '✕ Rejeté'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => setDeleteModal(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            🗑️ Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'client' && (u.totalPoints || 0) > 0).length}
            </div>
            <div className="text-sm text-gray-500">Bénévoles actifs</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {users.reduce((sum, u) => sum + (u.totalPoints || 0), 0)}
            </div>
            <div className="text-sm text-gray-500">Points totaux</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.walletAddress).length}
            </div>
            <div className="text-sm text-gray-500">Wallets créés</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">
              {users.filter(u => u.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-500">En attente</div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation suppression */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDeleteUser}
        title="Supprimer l'utilisateur"
        message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        confirmText="Supprimer"
        confirmColor="red"
      />
    </div>
  );
}

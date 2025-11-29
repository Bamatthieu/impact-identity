import { useState, useEffect } from 'react'
import { getActions, getActionTypes, getUsers, createAction, getUserActions } from '../api'
import { useAuth } from '../context/AuthContext'

function Actions({ userOnly = false }) {
  const { user, isAdmin } = useAuth()
  const [actions, setActions] = useState([])
  const [actionTypes, setActionTypes] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [formData, setFormData] = useState({ actionTypeId: '', description: '' })

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      let actionsRes;
      if (userOnly && user) {
        // Mode client : seulement ses propres actions
        actionsRes = await getUserActions(user.id)
      } else {
        // Mode admin : toutes les actions
        actionsRes = await getActions()
      }
      
      const typesRes = await getActionTypes()
      setActions(actionsRes.data.data)
      setActionTypes(typesRes.data.data)
      
      if (isAdmin) {
        const usersRes = await getUsers()
        setUsers(usersRes.data.data)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createAction({
        userId: user.id, // Toujours l'utilisateur connecté
        actionTypeId: parseInt(formData.actionTypeId),
        description: formData.description
      })
      setShowModal(false)
      setFormData({ actionTypeId: '', description: '' })
      loadData()
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors de la soumission')
    }
  }

  const filteredActions = filter === 'all' 
    ? actions 
    : actions.filter(a => a.status === filter)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{userOnly ? '✅ Mes Actions' : '✅ Actions'}</h1>
          <p className="text-gray-500">{actions.length} actions {userOnly ? 'soumises' : 'enregistrées'}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="btn-primary"
        >
          + Soumettre une action
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'validated', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status === 'all' && '📋 Toutes'}
            {status === 'pending' && '⏳ En attente'}
            {status === 'validated' && '✅ Validées'}
            {status === 'rejected' && '❌ Rejetées'}
          </button>
        ))}
      </div>

      {/* Action Types Grid */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">📝 Types d'actions disponibles</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actionTypes.map(type => (
            <div key={type.id} className="bg-gray-50 rounded-lg p-3 text-center">
              <span className="text-2xl">{type.icon}</span>
              <p className="font-medium text-sm mt-1">{type.name}</p>
              <p className="text-primary-600 font-bold">{type.points} pts</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {filteredActions.map(action => (
          <div key={action.id} className="card">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{action.actionType?.icon || '📌'}</span>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{action.actionType?.name}</h3>
                    <p className="text-sm text-gray-500">Par {action.user?.name}</p>
                  </div>
                  <span className={`badge ${
                    action.status === 'validated' ? 'badge-success' :
                    action.status === 'pending' ? 'badge-pending' : 'badge-error'
                  }`}>
                    {action.status === 'validated' && '✅ Validée'}
                    {action.status === 'pending' && '⏳ En attente'}
                    {action.status === 'rejected' && '❌ Rejetée'}
                  </span>
                </div>
                
                {action.description && (
                  <p className="mt-2 text-gray-600">{action.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                  <span>⭐ {action.points} points</span>
                  <span>🏷️ {action.actionType?.category}</span>
                  <span>📅 {new Date(action.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>

                {action.nftTokenId && (
                  <p className="text-xs font-mono text-gray-400 mt-2">
                    🎨 NFT: {action.nftTokenId.slice(0, 16)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredActions.length === 0 && (
        <div className="card text-center py-12">
          <span className="text-6xl">📋</span>
          <h3 className="text-xl font-bold mt-4">Aucune action</h3>
          <p className="text-gray-500 mt-2">
            {filter === 'all' 
              ? 'Soumettez votre première action pour commencer'
              : `Aucune action avec le statut "${filter}"`}
          </p>
        </div>
      )}

      {/* Modal soumission */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">📝 Soumettre une action</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Afficher sélecteur utilisateur seulement pour admin */}
              {isAdmin && !userOnly && (
                <div>
                  <label className="block text-sm font-medium mb-1">Utilisateur</label>
                  <select
                    value={formData.userId || user?.id}
                    onChange={e => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2"
                    required
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Type d'action</label>
                <select
                  value={formData.actionTypeId}
                  onChange={e => setFormData({ ...formData, actionTypeId: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Sélectionner un type</option>
                  {actionTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name} ({type.points} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  rows="3"
                  placeholder="Décrivez votre action..."
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Soumettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Actions

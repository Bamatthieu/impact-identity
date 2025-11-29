import { useState, useEffect } from 'react'
import { getUsers, createUser, getUserNFTs } from '../api'
import { showToast } from '../components/Toast'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userNFTs, setUserNFTs] = useState([])
  const [formData, setFormData] = useState({ name: '', email: '' })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await getUsers()
      setUsers(res.data.data)
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createUser(formData)
      showToast('✅ Utilisateur créé avec succès !', 'success')
      setFormData({ name: '', email: '' })
      setShowModal(false)
      loadUsers()
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de la création', 'error')
    } finally {
      setCreating(false)
    }
  }

  const viewUserNFTs = async (user) => {
    setSelectedUser(user)
    try {
      const res = await getUserNFTs(user.id)
      setUserNFTs(res.data.data)
    } catch (error) {
      console.error('Erreur chargement NFTs:', error)
      setUserNFTs([])
    }
  }

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
          <h1 className="text-2xl font-bold">👥 Utilisateurs</h1>
          <p className="text-gray-500">{users.length} utilisateurs enregistrés</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Nouvel utilisateur
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{user.name}</h3>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
              <span className="text-2xl">
                {user.badges?.length > 0 ? '🏅' : '👤'}
              </span>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Points</span>
                <span className="font-bold text-primary-600">{user.totalPoints}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Actions</span>
                <span className="font-medium">{user.totalActions}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400 font-mono truncate" title={user.walletAddress}>
                🔗 {user.walletAddress?.slice(0, 12)}...{user.walletAddress?.slice(-8)}
              </p>
            </div>

            <button
              onClick={() => viewUserNFTs(user)}
              className="mt-4 w-full btn-secondary text-sm"
            >
              Voir NFTs
            </button>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="card text-center py-12">
          <span className="text-6xl">👥</span>
          <h3 className="text-xl font-bold mt-4">Aucun utilisateur</h3>
          <p className="text-gray-500 mt-2">Créez votre premier utilisateur pour commencer</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
            + Créer un utilisateur
          </button>
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">➕ Nouvel utilisateur</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                ⚡ Un wallet XRPL sera automatiquement créé et financé sur le testnet
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? '⏳ Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal NFTs */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">🎨 NFTs de {selectedUser.name}</h2>
                <p className="text-gray-500 text-sm">{userNFTs.length} NFTs</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            {userNFTs.length > 0 ? (
              <div className="grid gap-4">
                {userNFTs.map((nft, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl">{nft.metadata?.icon || '🎨'}</span>
                      <div className="flex-1">
                        <h4 className="font-bold">{nft.metadata?.name || 'NFT'}</h4>
                        <p className="text-sm text-gray-600">{nft.metadata?.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>🏷️ {nft.metadata?.category}</span>
                          <span>⭐ {nft.metadata?.points} pts</span>
                        </div>
                        <p className="text-xs font-mono text-gray-400 mt-2 truncate">
                          ID: {nft.NFTokenID}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl">📭</span>
                <p className="mt-2">Aucun NFT pour le moment</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Users

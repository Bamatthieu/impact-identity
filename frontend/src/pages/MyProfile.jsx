import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUserNFTs, getUserActions } from '../api'

function MyProfile() {
  const { user } = useAuth()
  const [nfts, setNfts] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      const [nftsRes, actionsRes] = await Promise.all([
        getUserNFTs(user.id),
        getUserActions(user.id)
      ])
      setNfts(nftsRes.data.data)
      setActions(actionsRes.data.data)
    } catch (error) {
      console.error('Erreur chargement profil:', error)
    } finally {
      setLoading(false)
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
      {/* Header Profil */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
              👤
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.name}</h1>
              <p className="text-primary-100">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                🌟 {user?.role === 'admin' ? 'Administrateur' : 'Membre Impact'}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 grid grid-cols-2 gap-4 text-center">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-3xl font-bold">{user?.totalPoints || 0}</p>
              <p className="text-primary-100 text-sm">Points</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-3xl font-bold">{user?.totalActions || 0}</p>
              <p className="text-primary-100 text-sm">Actions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Info */}
      {user?.walletAddress && (
        <div className="card">
          <h2 className="text-lg font-bold mb-3">🔗 Mon Wallet XRPL</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Adresse</p>
            <p className="font-mono text-sm break-all">{user.walletAddress}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b">
        {['overview', 'nfts', 'actions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' && '📊 Vue d\'ensemble'}
            {tab === 'nfts' && `🎨 Mes NFTs (${nfts.length})`}
            {tab === 'actions' && `✅ Mes Actions (${actions.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Badges */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">🎖️ Mes Badges</h3>
            {user?.badges?.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {user.badges.map((badge, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
                    <span className="text-3xl">{badge.icon}</span>
                    <p className="font-medium text-sm mt-1">{badge.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Aucun badge pour le moment.<br />
                Complétez des actions pour en débloquer !
              </p>
            )}
          </div>

          {/* Dernières actions */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">📋 Dernières Actions</h3>
            {actions.slice(0, 5).map(action => (
              <div key={action.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{action.actionType?.icon || '📌'}</span>
                  <div>
                    <p className="font-medium text-sm">{action.actionType?.name}</p>
                    <p className="text-xs text-gray-500">{new Date(action.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <span className={`badge text-xs ${
                  action.status === 'validated' ? 'badge-success' :
                  action.status === 'pending' ? 'badge-pending' : 'badge-error'
                }`}>
                  {action.status === 'validated' ? '✅' : action.status === 'pending' ? '⏳' : '❌'}
                </span>
              </div>
            ))}
            {actions.length === 0 && (
              <p className="text-gray-500 text-center py-4">Aucune action soumise</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'nfts' && (
        <div className="card">
          {nfts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nfts.map((nft, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                  <div className="text-center mb-3">
                    <span className="text-5xl">{nft.metadata?.icon || '🎨'}</span>
                  </div>
                  <h4 className="font-bold text-center">{nft.metadata?.name || 'NFT'}</h4>
                  <p className="text-sm text-gray-600 text-center mt-1">{nft.metadata?.description}</p>
                  <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
                    <span>🏷️ {nft.metadata?.category}</span>
                    <span>⭐ {nft.metadata?.points} pts</span>
                  </div>
                  <p className="text-xs font-mono text-gray-400 mt-3 truncate text-center">
                    {nft.NFTokenID?.slice(0, 20)}...
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl">🎨</span>
              <h3 className="text-xl font-bold mt-4">Aucun NFT</h3>
              <p className="text-gray-500 mt-2">
                Vos NFTs "Proof of Impact" apparaîtront ici<br />
                quand vos actions seront validées.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="card">
          {actions.length > 0 ? (
            <div className="space-y-4">
              {actions.map(action => (
                <div key={action.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <span className="text-3xl">{action.actionType?.icon || '📌'}</span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold">{action.actionType?.name}</h4>
                        {action.description && (
                          <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                        )}
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
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span>⭐ {action.points} points</span>
                      <span>📅 {new Date(action.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    {action.nftTokenId && (
                      <p className="text-xs font-mono text-gray-400 mt-2">
                        🎨 NFT: {action.nftTokenId.slice(0, 20)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl">📋</span>
              <h3 className="text-xl font-bold mt-4">Aucune action</h3>
              <p className="text-gray-500 mt-2">
                Soumettez votre première action pour commencer !
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MyProfile

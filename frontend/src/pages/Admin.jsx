import { useState, useEffect } from 'react'
import { getPendingActions, validateAction, rejectAction, getXRPLStatus } from '../api'

function Admin() {
  const [pendingActions, setPendingActions] = useState([])
  const [xrplStatus, setXrplStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [actionsRes, xrplRes] = await Promise.all([
        getPendingActions(),
        getXRPLStatus()
      ])
      setPendingActions(actionsRes.data.data)
      setXrplStatus(xrplRes.data.data)
    } catch (error) {
      console.error('Erreur chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async (actionId) => {
    if (!confirm('Valider cette action ? Un NFT sera minté pour l\'utilisateur.')) return
    
    setProcessing(actionId)
    try {
      const res = await validateAction(actionId)
      alert(`✅ Action validée ! NFT minté avec succès.\n\nPoints attribués: ${res.data.data.pointsAwarded}`)
      loadData()
    } catch (error) {
      alert('❌ Erreur: ' + (error.response?.data?.error || error.message))
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (actionId) => {
    const reason = prompt('Raison du rejet:')
    if (!reason) return

    setProcessing(actionId)
    try {
      await rejectAction(actionId, reason)
      alert('Action rejetée')
      loadData()
    } catch (error) {
      alert('❌ Erreur: ' + (error.response?.data?.error || error.message))
    } finally {
      setProcessing(null)
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
      <div>
        <h1 className="text-2xl font-bold">⚙️ Administration</h1>
        <p className="text-gray-500">Validez les actions pour minter des NFTs sur XRPL</p>
      </div>

      {/* XRPL Status */}
      <div className="card">
        <h2 className="text-lg font-bold mb-3">⛓️ Status XRPL</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${xrplStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{xrplStatus?.connected ? 'Connecté' : 'Déconnecté'}</span>
          </div>
          <div className="text-gray-500">
            Network: <span className="font-mono">{xrplStatus?.network}</span>
          </div>
          {xrplStatus?.ledgerIndex && (
            <div className="text-gray-500">
              Ledger: <span className="font-mono">#{xrplStatus.ledgerIndex}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions en attente */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">⏳ Actions en attente de validation</h2>
          <span className="badge badge-pending">{pendingActions.length}</span>
        </div>

        {pendingActions.length > 0 ? (
          <div className="space-y-4">
            {pendingActions.map(action => (
              <div key={action.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-3xl">{action.actionType?.icon}</span>
                    <div>
                      <h3 className="font-bold">{action.actionType?.name}</h3>
                      <p className="text-sm text-gray-500">
                        Par <strong>{action.user?.name}</strong> • {new Date(action.createdAt).toLocaleString('fr-FR')}
                      </p>
                      {action.description && (
                        <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-primary-600">{action.points} pts</span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleValidate(action.id)}
                        disabled={processing === action.id}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        {processing === action.id ? '⏳' : '✅'} Valider
                      </button>
                      <button
                        onClick={() => handleReject(action.id)}
                        disabled={processing === action.id}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        ❌ Rejeter
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-400">
                  <span className="font-mono">Wallet: {action.user?.walletAddress}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl">✅</span>
            <p className="mt-2">Aucune action en attente</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-bold text-blue-800 mb-2">ℹ️ Comment ça marche ?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>1. Les utilisateurs soumettent des actions (bénévolat, écologie, etc.)</li>
          <li>2. Vous validez ou rejetez les actions ici</li>
          <li>3. Pour chaque action validée, un NFT "Proof of Impact" est minté sur XRPL</li>
          <li>4. L'utilisateur reçoit ses points et peut débloquer des badges</li>
        </ul>
      </div>
    </div>
  )
}

export default Admin

import { useState, useEffect } from 'react'
import { getPendingActions, validateAction, rejectAction, getXRPLStatus } from '../api'
import { showToast, ConfirmModal } from '../components/Toast'

function Admin() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionToValidate, setActionToValidate] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionToReject, setActionToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
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
    setActionToValidate(actionId);
    setShowConfirmModal(true);
  }

  const confirmValidate = async () => {
    setProcessing(actionToValidate)
    try {
      const res = await validateAction(actionToValidate)
      showToast(`✅ Action validée ! NFT minté • ${res.data.data.pointsAwarded} points attribués`, 'success')
      loadData()
    } catch (error) {
      showToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setProcessing(null)
      setActionToValidate(null);
    }
  }

  const handleReject = async (actionId) => {
    setActionToReject(actionId);
    setShowRejectModal(true);
  }

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Veuillez indiquer une raison', 'warning');
      return;
    }

    setProcessing(actionToReject)
    try {
      await rejectAction(actionToReject, rejectReason)
      showToast('Action rejetée', 'success')
      loadData()
      setRejectReason('');
    } catch (error) {
      showToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setProcessing(null)
      setActionToReject(null);
      setShowRejectModal(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">⚙️ Administration</h1>
          <p className="text-teal-200">Validez les actions pour minter des NFTs sur XRPL</p>
        </div>

        {/* XRPL Status */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">⛓️ Status XRPL</h2>
          <div className="flex flex-wrap gap-4 text-white/90">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${xrplStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>{xrplStatus?.connected ? 'Connecté' : 'Déconnecté'}</span>
            </div>
            <div className="text-white/70">
              Network: <span className="font-mono">{xrplStatus?.network}</span>
            </div>
            {xrplStatus?.ledgerIndex && (
              <div className="text-white/70">
                Ledger: <span className="font-mono">#{xrplStatus.ledgerIndex}</span>
              </div>
            )}
          </div>
        </div>

          {/* Actions en attente */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">⏳ Actions en attente de validation</h2>
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 rounded-full text-sm font-medium">{pendingActions.length}</span>
          </div>

          {pendingActions.length > 0 ? (
            <div className="space-y-4">
              {pendingActions.map(action => (
                <div key={action.id} className="bg-white/10 border border-white/10 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{action.actionType?.icon}</span>
                      <div>
                        <h3 className="font-bold text-white">{action.actionType?.name}</h3>
                        <p className="text-sm text-white/70">
                          Par <strong>{action.user?.name}</strong> • {new Date(action.createdAt).toLocaleString('fr-FR')}
                        </p>
                        {action.description && (
                          <p className="text-sm text-white/80 mt-1">{action.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-teal-400">{action.points} pts</span>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleValidate(action.id)}
                          disabled={processing === action.id}
                          className="bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                        >
                          {processing === action.id ? '⏳' : '✅'} Valider
                        </button>
                        <button
                          onClick={() => handleReject(action.id)}
                          disabled={processing === action.id}
                          className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                        >
                          ❌ Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
                    <span className="font-mono">Wallet: {action.user?.walletAddress}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/70">
              <span className="text-4xl">✅</span>
              <p className="mt-2">Aucune action en attente</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 backdrop-blur-md border border-blue-400/20 rounded-xl shadow-xl p-6">
          <h3 className="font-bold text-blue-300 mb-2">ℹ️ Comment ça marche ?</h3>
          <ul className="text-sm text-blue-200/90 space-y-1">
            <li>1. Les utilisateurs soumettent des actions (bénévolat, écologie, etc.)</li>
            <li>2. Vous validez ou rejetez les actions ici</li>
            <li>3. Pour chaque action validée, un NFT "Proof of Impact" est minté sur XRPL</li>
            <li>4. L'utilisateur reçoit ses points et peut débloquer des badges</li>
          </ul>
        </div>
      </div>

      {/* Modal de confirmation de validation */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setActionToValidate(null); }}
        onConfirm={confirmValidate}
        title="Valider cette action ?"
        message="Un NFT sera minté sur la blockchain XRPL pour cet utilisateur. Cette action est irréversible."
        confirmText="Valider et minter le NFT"
        confirmColor="green"
      />

      {/* Modal de rejet personnalisé */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rejeter l'action</h3>
            <p className="text-gray-600 mb-4">Indiquez la raison du rejet (sera envoyée à l'utilisateur)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Photo non conforme, activité déjà validée..."
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); setActionToReject(null); }}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmReject}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin

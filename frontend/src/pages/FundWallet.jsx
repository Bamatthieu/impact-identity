import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

export default function FundWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [amountEUR, setAmountEUR] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);

  const quickAmounts = [10, 20, 50, 100, 200];
  const conversionRate = 0.5; // 1 EUR = 0.5 XRP (fictif)

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [walletRes, transactionsRes] = await Promise.all([
        api.getMyWallet(),
        api.getMyTransactions()
      ]);
      setWallet(walletRes.data.data);
      // Filtrer tous les dépôts et extraire EUR de la description
      const deposits = transactionsRes.data.data
        .filter(tx => tx.type === 'deposit' && tx.to === user.walletAddress)
        .map(tx => {
          // Extraire le montant EUR de la description (ex: "Dépôt de 50 EUR")
          const eurMatch = tx.description?.match(/(\d+(?:\.\d+)?)\s*EUR/);
          return {
            ...tx,
            amountEUR: eurMatch ? parseFloat(eurMatch[1]) : null
          };
        });
      setAllTransactions(deposits);
      // Les 5 derniers pour la sidebar
      setRecentTransactions(deposits.slice(-5).reverse());
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
      showToast('Erreur lors du chargement du wallet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFundWallet = async () => {
    const amount = parseFloat(amountEUR);
    
    if (!amount || amount <= 0 || amount > 1000) {
      showToast('Montant invalide (1-1000 EUR)', 'error');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.fundWallet(amount);
      showToast(res.data.data.message, 'success');
      
      // Recharger les données du wallet
      await loadWalletData();
      
      // Réinitialiser le formulaire
      setAmountEUR('');
      setSelectedAmount(null);
    } catch (error) {
      console.error('Erreur ajout de fonds:', error);
      showToast(error.response?.data?.error || 'Erreur lors de l\'ajout de fonds', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const selectQuickAmount = (amount) => {
    setSelectedAmount(amount);
    setAmountEUR(amount.toString());
  };

  const estimatedXRP = amountEUR ? (parseFloat(amountEUR) * conversionRate).toFixed(2) : '0.00';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">💰 Ajouter des Fonds</h1>
            <p className="text-teal-200">Rechargez votre wallet XRPL avec de l'argent fictif</p>
          </div>
          <Link to="/wallet" className="px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl bg-white/10 border border-white/20 hover:bg-white/20">
            <span className="text-white">← Retour au Wallet</span>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulaire d'ajout */}
          <div className="space-y-6">
            {/* Solde actuel */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <h3 className="text-white/70 text-sm mb-2">Solde actuel</h3>
              <div className="text-4xl font-bold text-white mb-1">
                {wallet?.xrpBalance?.toFixed(2) || '0.00'} XRP
              </div>
              <div className="text-teal-300 text-sm">
                ≈ {(wallet?.xrpBalance / conversionRate).toFixed(2) || '0.00'} EUR (fictif)
              </div>
            </div>

            {/* Montants rapides */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <h3 className="text-white font-semibold mb-4">Montants rapides</h3>
              <div className="grid grid-cols-3 gap-3">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => selectQuickAmount(amount)}
                    className={`p-4 rounded-xl font-semibold transition-all ${
                      selectedAmount === amount
                        ? 'shadow-xl scale-105'
                        : 'bg-white/5 border border-white/20 hover:bg-white/10'
                    }`}
                    style={selectedAmount === amount ? {
                      background: 'linear-gradient(135deg, #34d399, #14b8a6)'
                    } : {}}
                  >
                    <div className={`text-xl font-bold ${selectedAmount === amount ? 'text-white' : 'text-white'}`}>
                      {amount}€
                    </div>
                    <div className={`text-xs ${selectedAmount === amount ? 'text-white/90' : 'text-white/60'}`}>
                      {(amount * conversionRate).toFixed(1)} XRP
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Montant personnalisé */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <h3 className="text-white font-semibold mb-4">Montant personnalisé</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Montant en EUR (fictif)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      value={amountEUR}
                      onChange={(e) => {
                        setAmountEUR(e.target.value);
                        setSelectedAmount(null);
                      }}
                      placeholder="Entrez un montant"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 font-semibold">
                      EUR
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mt-2">Maximum: 1000 EUR</p>
                </div>

                {/* Estimation XRP */}
                {amountEUR && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">Vous recevrez</span>
                      <div className="text-right">
                        <div className="text-xl font-bold text-teal-300">≈ {estimatedXRP} XRP</div>
                        <div className="text-xs text-white/50">Taux: 1 EUR = {conversionRate} XRP</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton d'ajout */}
                <button
                  onClick={handleFundWallet}
                  disabled={processing || !amountEUR || parseFloat(amountEUR) <= 0}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background: processing || !amountEUR || parseFloat(amountEUR) <= 0
                      ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                      : 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)'
                  }}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2 text-white">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Transaction en cours...</span>
                    </span>
                  ) : (
                    <span className="text-white">💳 Ajouter les fonds</span>
                  )}
                </button>
              </div>
            </div>

            {/* Informations */}
            <div className="bg-blue-500/10 backdrop-blur-md border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="text-sm text-blue-200">
                  <p className="font-semibold mb-1">Mode Test - XRPL Testnet</p>
                  <ul className="space-y-1 text-blue-200/80">
                    <li>• Les montants en EUR sont fictifs</li>
                    <li>• Les XRP sont réels sur le testnet</li>
                    <li>• Les transactions sont enregistrées sur la blockchain</li>
                    <li>• Aucune valeur monétaire réelle</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Informations et historique */}
          <div className="space-y-6">
            {/* Détails du wallet */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>🔑</span>
                <span>Détails du Wallet</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-white/60 text-xs mb-1">Adresse XRPL</div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <code className="text-teal-300 text-xs break-all">{wallet?.address}</code>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">NFTs</div>
                    <div className="text-xl font-bold text-white">{wallet?.nftsCount || 0}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="text-white/60 text-xs mb-1">Réseau</div>
                    <div className="text-sm font-semibold text-teal-300">Testnet</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions récentes */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>📊</span>
                <span>Dépôts récents</span>
              </h3>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💸</div>
                  <p className="text-white/60 text-sm">Aucun dépôt encore</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">
                          +{tx.amount} XRP
                        </span>
                        <span className="text-xs text-white/50">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {tx.amountEUR && (
                        <div className="text-xs text-white/60">
                          ({tx.amountEUR} EUR)
                        </div>
                      )}
                      {tx.txHash && (
                        <div className="text-xs text-teal-400 mt-1 truncate">
                          TX: {tx.txHash.substring(0, 20)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aide */}
            <div className="bg-purple-500/10 backdrop-blur-md border border-purple-400/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="text-sm text-purple-200">
                  <p className="font-semibold mb-1">Comment ça marche ?</p>
                  <ul className="space-y-1 text-purple-200/80">
                    <li>1. Choisissez un montant en EUR (fictif)</li>
                    <li>2. Le système convertit en XRP testnet</li>
                    <li>3. Les XRP sont envoyés sur votre wallet</li>
                    <li>4. Transaction visible sur la blockchain</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historique complet des transactions */}
        {allTransactions.length > 0 && (
          <div className="mt-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>📜</span>
                <span>Historique Complet</span>
              </h2>
              <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20">
                <span className="text-white font-semibold">{allTransactions.length} transaction{allTransactions.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-teal-300 text-sm font-medium mb-1">Total déposé</div>
                <div className="text-2xl font-bold text-white">
                  {allTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(2)} XRP
                </div>
                <div className="text-white/50 text-xs mt-1">
                  ≈ {allTransactions.reduce((sum, tx) => sum + (tx.amountEUR || 0), 0).toFixed(2)} EUR
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-blue-300 text-sm font-medium mb-1">Nombre de dépôts</div>
                <div className="text-2xl font-bold text-white">
                  {allTransactions.length}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-purple-300 text-sm font-medium mb-1">Dernier dépôt</div>
                <div className="text-sm font-semibold text-white">
                  {new Date(allTransactions[allTransactions.length - 1]?.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
            </div>

            {/* Table des transactions */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/70 font-semibold text-sm">Date</th>
                    <th className="text-left py-3 px-4 text-white/70 font-semibold text-sm">Description</th>
                    <th className="text-right py-3 px-4 text-white/70 font-semibold text-sm">Montant XRP</th>
                    <th className="text-right py-3 px-4 text-white/70 font-semibold text-sm">Hash Transaction</th>
                    <th className="text-center py-3 px-4 text-white/70 font-semibold text-sm">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {allTransactions.slice().reverse().map((tx, index) => (
                    <tr 
                      key={tx.id} 
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        index === 0 ? 'bg-white/5' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="text-white text-sm">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-white/50 text-xs">
                          {new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white text-sm">
                          {tx.description || 'Dépôt'}
                        </div>
                        <div className="text-white/50 text-xs mt-1">
                          {tx.from?.substring(0, 10)}...
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-teal-300 text-lg">
                          +{tx.amount} XRP
                        </div>
                        {tx.amountEUR && (
                          <div className="text-white/50 text-xs mt-1">
                            ({tx.amountEUR} EUR)
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {tx.txHash ? (
                          <a
                            href={`https://testnet.xrpl.org/transactions/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs font-mono hover:underline"
                          >
                            {tx.txHash.substring(0, 8)}...{tx.txHash.substring(tx.txHash.length - 6)}
                          </a>
                        ) : (
                          <span className="text-white/40 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'completed' 
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
                        }`}>
                          {tx.status === 'completed' ? '✓ Complété' : '⏳ En cours'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note sur la blockchain */}
            <div className="mt-6 bg-blue-500/10 rounded-xl p-4 border border-blue-400/30">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔗</span>
                <div className="text-sm text-blue-200">
                  <p className="font-semibold mb-1">Transactions sur la Blockchain</p>
                  <p className="text-blue-200/80">
                    Toutes les transactions sont enregistrées sur la blockchain XRPL Testnet. 
                    Cliquez sur le hash pour voir les détails sur l'explorateur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

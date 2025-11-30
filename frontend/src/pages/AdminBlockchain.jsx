import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AdminBlockchain() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletDetails, setWalletDetails] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [isAdmin, navigate]);

  const loadData = async () => {
    try {
      const [statusRes, statsRes, walletsRes, txRes] = await Promise.all([
        api.getBlockchainStatus(),
        api.getBlockchainStats(),
        api.getBlockchainWallets(),
        api.getBlockchainTransactions()
      ]);
      setStatus(statusRes.data.data);
      setStats(statsRes.data.data);
      setWallets(walletsRes.data.data.wallets);
      setTransactions(txRes.data.data.transactions);
    } catch (error) {
      console.error('Erreur chargement données blockchain:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletDetails = async (address) => {
    try {
      const res = await api.getBlockchainWallet(address);
      setWalletDetails(res.data.data);
      setSelectedWallet(address);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-white/70 hover:text-white mb-4 transition-colors">
            ← Retour au dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">⛓️ Suivi Blockchain</h1>
              <p className="text-teal-200">Surveillance du réseau XRPL et des transactions</p>
            </div>
            <div className={`px-4 py-2 rounded-xl font-medium border ${
              status?.connected ? 'bg-teal-500/20 text-teal-300 border-teal-400/30' : 'bg-red-500/20 text-red-300 border-red-400/30'
            }`}>
              {status?.connected ? '🟢 Connecté' : '🔴 Déconnecté'} - {status?.network?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Wallets créés</span>
              <span className="text-2xl">💳</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats?.totalWallets || 0}</div>
            <div className="text-sm text-teal-300 mt-1">
              {stats?.clientWallets || 0} clients • {stats?.organizationWallets || 0} orgs
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Missions complétées</span>
              <span className="text-2xl">✅</span>
            </div>
            <div className="text-3xl font-bold text-teal-400">{stats?.completedMissions || 0}</div>
            <div className="text-sm text-teal-300 mt-1">{stats?.totalNFTsMinted || 0} NFTs mintés</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Points distribués</span>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="text-3xl font-bold text-purple-400">{stats?.totalPointsOnChain || 0}</div>
            <div className="text-sm text-teal-300 mt-1">Total on-chain</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70">Réseau</span>
              <span className="text-2xl">🌐</span>
            </div>
            <div className="text-xl font-bold text-blue-400">XRPL Testnet</div>
            <div className="text-xs text-white/50 mt-1 truncate">{status?.serverUrl}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'overview', label: '📊 Vue d\'ensemble', icon: '' },
            { key: 'wallets', label: '💳 Wallets', icon: '' },
            { key: 'transactions', label: '📜 Transactions', icon: '' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-white shadow-lg scale-105'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
              }`}
              style={activeTab === tab.key ? { background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* NFTs par catégorie */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🏷️ NFTs par catégorie</h2>
              {stats?.nftsByCategory && Object.keys(stats.nftsByCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.nftsByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-white/80">{category}</span>
                      <span className="font-bold text-teal-400">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 text-center py-8">Aucun NFT minté pour le moment</p>
              )}
            </div>

            {/* Dernières transactions */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🕐 Dernières activités</h2>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white/10 border border-white/10 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{tx.userName}</div>
                        <div className="text-sm text-white/70">{tx.missionTitle}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-teal-400">+{tx.reward} pts</div>
                        <div className="text-xs text-white/50">
                          {tx.completedAt ? new Date(tx.completedAt).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 text-center py-8">Aucune transaction pour le moment</p>
              )}
            </div>

            {/* Info XRPL */}
            <div className="bg-gradient-to-br from-blue-600/30 to-purple-600/30 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6 text-white md:col-span-2">
              <h2 className="text-xl font-bold mb-4">ℹ️ À propos de l'intégration blockchain</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">🔗 XRPL (XRP Ledger)</h3>
                  <p className="text-sm opacity-90">
                    Blockchain publique, rapide et écologique. Transactions en 3-5 secondes, frais négligeables.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">🖼️ NFT Proof-of-Impact</h3>
                  <p className="text-sm opacity-90">
                    Chaque mission complétée génère un NFT unique certifiant la participation sur la blockchain.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">💳 Wallets automatiques</h3>
                  <p className="text-sm opacity-90">
                    Un wallet XRPL est créé automatiquement pour chaque utilisateur à l'inscription.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wallets' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Liste des wallets */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">💳 Wallets ({wallets.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20 text-left">
                      <th className="pb-3 font-semibold text-white/90">Utilisateur</th>
                      <th className="pb-3 font-semibold text-white/90">Rôle</th>
                      <th className="pb-3 font-semibold text-white/90">Adresse</th>
                      <th className="pb-3 font-semibold text-white/90">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((wallet) => (
                      <tr key={wallet.walletAddress} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                        <td className="py-3 font-medium text-white">{wallet.userName}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            wallet.userRole === 'organization' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' :
                            wallet.userRole === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' :
                            'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                          }`}>
                            {wallet.userRole}
                          </span>
                        </td>
                        <td className="py-3">
                          <code className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded">
                            {wallet.walletAddress.slice(0, 8)}...{wallet.walletAddress.slice(-6)}
                          </code>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => loadWalletDetails(wallet.walletAddress)}
                            className="text-teal-400 hover:text-teal-300 text-sm transition-colors"
                          >
                            Voir détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Détails wallet sélectionné */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🔍 Détails</h2>
              {walletDetails ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-white/70">Propriétaire</div>
                    <div className="font-medium text-white">{walletDetails.user?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-white/70">Adresse complète</div>
                    <code className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded block mt-1 break-all">
                      {walletDetails.address}
                    </code>
                  </div>
                  <div>
                    <div className="text-sm text-white/70">Balance XRP</div>
                    <div className="font-bold text-xl text-blue-400">
                      {walletDetails.xrplInfo?.balance || 0} XRP
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-white/70">NFTs</div>
                    <div className="font-bold text-xl text-teal-400">
                      {walletDetails.nftCount || 0}
                    </div>
                  </div>
                  <a
                    href={`https://testnet.xrpl.org/accounts/${walletDetails.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    🔗 Voir sur XRPL Explorer
                  </a>
                </div>
              ) : (
                <p className="text-white/60 text-center py-8">
                  Sélectionnez un wallet pour voir les détails
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">📜 Historique des transactions ({transactions.length})</h2>
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20 text-left">
                      <th className="pb-3 font-semibold text-white/90">Date</th>
                      <th className="pb-3 font-semibold text-white/90">Type</th>
                      <th className="pb-3 font-semibold text-white/90">Utilisateur</th>
                      <th className="pb-3 font-semibold text-white/90">Mission</th>
                      <th className="pb-3 font-semibold text-white/90">Organisation</th>
                      <th className="pb-3 font-semibold text-white/90 text-right">Récompense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                        <td className="py-3 text-sm text-white/70">
                          {tx.completedAt ? new Date(tx.completedAt).toLocaleString('fr-FR') : '-'}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-full text-xs font-medium">
                            ✅ Mission complétée
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-white">{tx.userName}</div>
                          {tx.userWallet && (
                            <code className="text-xs text-white/50">
                              {tx.userWallet.slice(0, 8)}...
                            </code>
                          )}
                        </td>
                        <td className="py-3 text-white/90">{tx.missionTitle}</td>
                        <td className="py-3 text-white/70">{tx.organizationName}</td>
                        <td className="py-3 text-right">
                          <span className="font-bold text-teal-400">+{tx.reward} pts</span>
                          <div className="text-xs text-white/50">+ 1 NFT</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📜</div>
                <p className="text-white/70">Aucune transaction pour le moment</p>
                <p className="text-white/50 text-sm mt-2">
                  Les transactions apparaîtront quand des missions seront complétées
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

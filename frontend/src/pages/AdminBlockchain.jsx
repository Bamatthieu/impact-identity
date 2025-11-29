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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 mb-4">
            ← Retour au dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">⛓️ Suivi Blockchain</h1>
              <p className="text-gray-600">Surveillance du réseau XRPL et des transactions</p>
            </div>
            <div className={`px-4 py-2 rounded-full font-medium ${
              status?.connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {status?.connected ? '🟢 Connecté' : '🔴 Déconnecté'} - {status?.network?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Wallets créés</span>
              <span className="text-2xl">💳</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalWallets || 0}</div>
            <div className="text-sm text-gray-500 mt-1">
              {stats?.clientWallets || 0} clients • {stats?.organizationWallets || 0} orgs
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Missions complétées</span>
              <span className="text-2xl">✅</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats?.completedMissions || 0}</div>
            <div className="text-sm text-gray-500 mt-1">NFTs mintés</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Points distribués</span>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats?.totalPointsOnChain || 0}</div>
            <div className="text-sm text-gray-500 mt-1">Total on-chain</div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Réseau</span>
              <span className="text-2xl">🌐</span>
            </div>
            <div className="text-xl font-bold text-blue-600">XRPL Testnet</div>
            <div className="text-xs text-gray-500 mt-1 truncate">{status?.serverUrl}</div>
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* NFTs par catégorie */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🏷️ NFTs par catégorie</h2>
              {stats?.nftsByCategory && Object.keys(stats.nftsByCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.nftsByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-700">{category}</span>
                      <span className="font-bold text-green-600">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucun NFT minté pour le moment</p>
              )}
            </div>

            {/* Dernières transactions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🕐 Dernières activités</h2>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{tx.userName}</div>
                        <div className="text-sm text-gray-500">{tx.missionTitle}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">+{tx.reward} pts</div>
                        <div className="text-xs text-gray-400">
                          {tx.completedAt ? new Date(tx.completedAt).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Aucune transaction pour le moment</p>
              )}
            </div>

            {/* Info XRPL */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-sm p-6 text-white md:col-span-2">
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
            <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Wallets ({wallets.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-semibold">Utilisateur</th>
                      <th className="pb-3 font-semibold">Rôle</th>
                      <th className="pb-3 font-semibold">Adresse</th>
                      <th className="pb-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((wallet) => (
                      <tr key={wallet.walletAddress} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 font-medium">{wallet.userName}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            wallet.userRole === 'organization' ? 'bg-blue-100 text-blue-700' :
                            wallet.userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {wallet.userRole}
                          </span>
                        </td>
                        <td className="py-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {wallet.walletAddress.slice(0, 8)}...{wallet.walletAddress.slice(-6)}
                          </code>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => loadWalletDetails(wallet.walletAddress)}
                            className="text-green-600 hover:underline text-sm"
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
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🔍 Détails</h2>
              {walletDetails ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Propriétaire</div>
                    <div className="font-medium">{walletDetails.user?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Adresse complète</div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block mt-1 break-all">
                      {walletDetails.address}
                    </code>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Balance XRP</div>
                    <div className="font-bold text-xl text-blue-600">
                      {walletDetails.xrplInfo?.balance || 0} XRP
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">NFTs</div>
                    <div className="font-bold text-xl text-green-600">
                      {walletDetails.nftCount || 0}
                    </div>
                  </div>
                  <a
                    href={`https://testnet.xrpl.org/accounts/${walletDetails.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🔗 Voir sur XRPL Explorer
                  </a>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Sélectionnez un wallet pour voir les détails
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📜 Historique des transactions ({transactions.length})</h2>
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Type</th>
                      <th className="pb-3 font-semibold">Utilisateur</th>
                      <th className="pb-3 font-semibold">Mission</th>
                      <th className="pb-3 font-semibold">Organisation</th>
                      <th className="pb-3 font-semibold text-right">Récompense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 text-sm text-gray-500">
                          {tx.completedAt ? new Date(tx.completedAt).toLocaleString('fr-FR') : '-'}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            ✅ Mission complétée
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="font-medium">{tx.userName}</div>
                          {tx.userWallet && (
                            <code className="text-xs text-gray-400">
                              {tx.userWallet.slice(0, 8)}...
                            </code>
                          )}
                        </td>
                        <td className="py-3">{tx.missionTitle}</td>
                        <td className="py-3 text-gray-500">{tx.organizationName}</td>
                        <td className="py-3 text-right">
                          <span className="font-bold text-green-600">+{tx.reward} pts</span>
                          <div className="text-xs text-gray-400">+ 1 NFT</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📜</div>
                <p className="text-gray-600">Aucune transaction pour le moment</p>
                <p className="text-gray-400 text-sm mt-2">
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

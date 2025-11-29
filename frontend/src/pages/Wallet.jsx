import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletRes, txRes] = await Promise.all([
        api.getMyWallet(),
        api.getMyTransactions()
      ]);
      setWallet(walletRes.data.data);
      setTransactions(txRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur chargement wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.refreshBalance();
      setWallet(prev => ({
        ...prev,
        xrpBalance: res.data.data.xrpBalance
      }));
    } catch (err) {
      console.error('Erreur refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user?.walletAddress) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="text-6xl mb-4">💳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Aucun wallet</h1>
          <p className="text-gray-600">Votre compte n'a pas de wallet XRPL associé.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💳 Mon Wallet</h1>
          <p className="text-gray-600">Gérez vos XRP et NFTs sur la blockchain XRPL</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>
        )}

        {/* Carte principale du wallet */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 text-white mb-6 shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-blue-200 text-sm">Solde disponible</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {wallet?.xrpBalance?.toFixed(2) || '0.00'}
                </span>
                <span className="text-xl">XRP</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <span className={`text-xl ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
            </button>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-blue-200 text-xs mb-1">Adresse du wallet</p>
            <p className="font-mono text-sm break-all">{wallet?.address}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{wallet?.nftsCount || 0}</p>
              <p className="text-blue-200 text-sm">NFTs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-300">+{wallet?.totalReceived?.toFixed(2) || 0}</p>
              <p className="text-blue-200 text-sm">Reçu</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-300">-{wallet?.totalSent?.toFixed(2) || 0}</p>
              <p className="text-blue-200 text-sm">Envoyé</p>
            </div>
          </div>
        </div>

        {/* NFTs */}
        {wallet?.nfts?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Mes NFTs ({wallet.nfts.length})</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {wallet.nfts.map((nft, index) => (
                <div key={nft.NFTokenID || index} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{nft.metadata?.citizenIcon || '🎖️'}</span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {nft.metadata?.missionTitle || 'Mission Impact'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {nft.metadata?.citizenLevel || 'Certificat'}
                      </p>
                    </div>
                  </div>
                  {nft.metadata && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Points gagnés</span>
                        <span className="font-semibold text-green-600">+{nft.metadata.earnedPoints || 0} pts</span>
                      </div>
                      {nft.metadata.rewardXRP > 0 && (
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-500">XRP reçus</span>
                          <span className="font-semibold text-blue-600">+{nft.metadata.rewardXRP} XRP</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="text-gray-700">
                          {nft.metadata.completedAt 
                            ? new Date(nft.metadata.completedAt).toLocaleDateString('fr-FR')
                            : '-'}
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2 font-mono truncate">
                    ID: {nft.NFTokenID?.slice(0, 20)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📜 Historique des transactions</h2>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-gray-600">Aucune transaction pour le moment</p>
              <p className="text-gray-400 text-sm">Complétez des missions pour recevoir des XRP !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isReceived = tx.to === wallet?.address;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isReceived ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {isReceived ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {tx.missionTitle || tx.type}
                        </p>
                        <p className="text-sm text-gray-500">
                          {isReceived ? `De: ${tx.fromName}` : `À: ${tx.toName}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isReceived ? 'text-green-600' : 'text-red-600'}`}>
                        {isReceived ? '+' : '-'}{tx.amount} {tx.currency}
                      </p>
                      {tx.txHash && (
                        <a 
                          href={`https://testnet.xrpl.org/transactions/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Voir sur XRPL →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

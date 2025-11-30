import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!user?.walletAddress) {
    return (
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="text-6xl mb-4">💳</div>
          <h1 className="text-2xl font-bold text-white mb-2">Aucun wallet</h1>
          <p className="text-white/80">Votre compte n'a pas de wallet XRPL associé.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">💳 Mon Wallet</h1>
            <p className="text-teal-200">Gérez vos XRP et NFTs sur la blockchain XRPL</p>
          </div>
          <Link to="/wallet/fund" className="px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105" style={{
            background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)'
          }}>
            <span className="text-white flex items-center gap-2">
              <span>💰</span>
              <span>Ajouter des Fonds</span>
            </span>
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-6 border border-red-400/30">{error}</div>
        )}

        {/* Carte principale du wallet - Gradient moderne */}
        <div className="rounded-2xl p-6 text-white mb-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-white/80 text-sm font-medium">Solde disponible</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">
                  {wallet?.xrpBalance?.toFixed(2) || '0.00'}
                </span>
                <span className="text-2xl font-semibold">XRP</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-all shadow-lg"
            >
              <span className={`text-2xl ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
            </button>
          </div>
          
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-white/80 text-xs mb-2 font-medium">Adresse du wallet</p>
            <p className="font-mono text-sm break-all">{wallet?.address}</p>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-2xl font-bold">{wallet?.nftsCount || 0}</p>
              <p className="text-white/80 text-xs mt-1">NFTs Total</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-2xl font-bold">
                {wallet?.nfts?.filter(n => n.metadata?.type === 'citizen_badge' || n.metadata?.t === 'badge').length || 0}
              </p>
              <p className="text-white/80 text-xs mt-1">Badges</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-2xl font-bold text-green-300">+{wallet?.totalReceived?.toFixed(2) || 0}</p>
              <p className="text-white/80 text-xs mt-1">Reçu</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <p className="text-2xl font-bold text-red-300">-{wallet?.totalSent?.toFixed(2) || 0}</p>
              <p className="text-white/80 text-xs mt-1">Envoyé</p>
            </div>
          </div>
        </div>

        {/* NFTs */}
        {wallet?.nfts?.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">🏆 Mes NFTs ({wallet.nfts.length})</h2>
            
            {/* Badges NFT (Niveaux Citoyens) */}
            {wallet.nfts.filter(nft => nft.metadata?.type === 'citizen_badge' || nft.metadata?.t === 'badge').length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-purple-300 mb-3">🏅 Badges de Niveau</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {wallet.nfts.filter(nft => nft.metadata?.type === 'citizen_badge' || nft.metadata?.t === 'badge').map((nft, index) => {
                    // Support à la fois l'ancien format (type, levelName) et le nouveau (t, lvl)
                    const isBadge = nft.metadata?.type === 'citizen_badge' || nft.metadata?.t === 'badge';
                    const levelName = nft.metadata?.levelName || nft.metadata?.lvl || 'Badge Citoyen';
                    const levelIcon = nft.metadata?.levelIcon || nft.metadata?.icon || '🏅';
                    const levelColor = nft.metadata?.levelColor || '#8B5CF6';
                    const totalPoints = nft.metadata?.totalPoints || nft.metadata?.pts || 0;
                    const minPoints = nft.metadata?.minPoints || 0;
                    const earnedAt = nft.metadata?.earnedAt || nft.metadata?.d;
                    
                    return (
                    <div 
                      key={nft.NFTokenID || index} 
                      className="bg-white/5 border border-white/20 rounded-xl p-4 hover:bg-white/10 hover:shadow-xl transition-all"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg"
                          style={{ backgroundColor: levelColor + '40', border: `2px solid ${levelColor}` }}
                        >
                          {levelIcon}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-white">
                            {levelName}
                          </p>
                          <p className="text-sm text-purple-300">
                            Badge NFT non-transférable
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-sm border border-white/10">
                        {minPoints > 0 && (
                          <div className="flex justify-between mb-1">
                            <span className="text-white/60">Points requis</span>
                            <span className="font-semibold text-purple-300">{minPoints} pts</span>
                          </div>
                        )}
                        <div className="flex justify-between mb-1">
                          <span className="text-white/60">Points au moment</span>
                          <span className="font-semibold text-teal-300">{totalPoints} pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Obtenu le</span>
                          <span className="text-white/90">
                            {earnedAt 
                              ? new Date(earnedAt).toLocaleDateString('fr-FR')
                              : '-'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-white/40 mt-2 font-mono truncate">
                        ID: {nft.NFTokenID?.slice(0, 20)}...
                      </p>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Missions NFT */}
            {wallet.nfts.filter(nft => nft.metadata?.type !== 'citizen_badge' && nft.metadata?.t !== 'badge').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blue-300 mb-3">🎖️ NFTs de Missions</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {wallet.nfts.filter(nft => nft.metadata?.type !== 'citizen_badge' && nft.metadata?.t !== 'badge').map((nft, index) => (
                    <div key={nft.NFTokenID || index} className="bg-white/5 border border-white/20 rounded-xl p-4 hover:bg-white/10 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{nft.metadata?.citizenIcon || '🎖️'}</span>
                        <div>
                          <p className="font-semibold text-white">
                            {nft.metadata?.missionTitle || 'Mission Impact'}
                          </p>
                          <p className="text-sm text-white/70">
                            {nft.metadata?.citizenLevel || 'Certificat'}
                            {nft.metadata?.isVolunteer && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-400/30">
                                Bénévole 💜
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {nft.metadata && (
                        <div className="bg-white/5 rounded-lg p-3 text-sm border border-white/10">
                          <div className="flex justify-between mb-1">
                            <span className="text-white/60">Points gagnés</span>
                            <span className="font-semibold text-teal-300">+{nft.metadata.earnedPoints || 0} pts</span>
                          </div>
                          {nft.metadata.rewardXRP > 0 && (
                            <div className="flex justify-between mb-1">
                              <span className="text-white/60">XRP reçus</span>
                              <span className="font-semibold text-blue-300">+{nft.metadata.rewardXRP} XRP</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-white/60">Date</span>
                            <span className="text-white/90">
                              {nft.metadata.completedAt 
                                ? new Date(nft.metadata.completedAt).toLocaleDateString('fr-FR')
                                : '-'}
                            </span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-white/40 mt-2 font-mono truncate">
                        ID: {nft.NFTokenID?.slice(0, 20)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transactions */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📜 Historique des transactions</h2>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">📭</p>
              <p className="text-white/80">Aucune transaction pour le moment</p>
              <p className="text-white/60 text-sm">Complétez des missions pour recevoir des XRP !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isReceived = tx.to === wallet?.address;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isReceived ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'
                      }`}>
                        {isReceived ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {tx.missionTitle || tx.type}
                        </p>
                        <p className="text-sm text-white/70">
                          {isReceived ? `De: ${tx.fromName}` : `À: ${tx.toName}`}
                        </p>
                        <p className="text-xs text-white/50">
                          {new Date(tx.createdAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isReceived ? 'text-teal-300' : 'text-red-300'}`}>
                        {isReceived ? '+' : '-'}{tx.amount} {tx.currency}
                      </p>
                      {tx.txHash && (
                        <a 
                          href={`https://testnet.xrpl.org/transactions/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
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

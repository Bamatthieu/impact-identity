import { useState, useEffect } from 'react'
import { getLeaderboard, getBadges } from '../api'

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [leaderboardRes, badgesRes] = await Promise.all([
        getLeaderboard(50),
        getBadges()
      ])
      setLeaderboard(leaderboardRes.data.data)
      setBadges(badgesRes.data.data)
    } catch (error) {
      console.error('Erreur chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">🏆 Classement</h1>
          <p className="text-teal-200 mt-2">Les meilleurs contributeurs Zencity</p>
        </div>

        {/* Podium moderne */}
        {leaderboard.length >= 3 && (
          <div className="flex justify-center items-end gap-6 py-12 mb-8">
            {/* 2ème place */}
            <div className="text-center transform hover:scale-105 transition-all">
              <div className="bg-white/10 backdrop-blur-md border-2 border-gray-400/50 rounded-2xl p-6 w-32 sm:w-40 shadow-xl">
                <span className="text-5xl">🥈</span>
                <p className="font-bold mt-3 truncate text-white">{leaderboard[1]?.name}</p>
                <p className="text-gray-300 font-bold text-lg mt-1">{leaderboard[1]?.totalPoints} pts</p>
              </div>
              <div className="h-24 rounded-b-2xl w-32 sm:w-40 mt-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #9ca3af, #6b7280)' }}></div>
            </div>
            
            {/* 1ère place - Plus grande et centrale */}
            <div className="text-center -mt-8 transform hover:scale-105 transition-all">
              <div className="rounded-2xl p-8 w-36 sm:w-48 shadow-2xl border-2 border-yellow-400/50" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                <span className="text-6xl">🥇</span>
                <p className="font-bold mt-4 truncate text-white text-lg">{leaderboard[0]?.name}</p>
                <p className="text-white font-bold text-2xl mt-2">{leaderboard[0]?.totalPoints} pts</p>
              </div>
              <div className="h-32 rounded-b-2xl w-36 sm:w-48 mt-2 shadow-xl" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}></div>
            </div>
            
            {/* 3ème place */}
            <div className="text-center transform hover:scale-105 transition-all">
              <div className="bg-white/10 backdrop-blur-md border-2 border-orange-400/50 rounded-2xl p-6 w-32 sm:w-40 shadow-xl">
                <span className="text-5xl">🥉</span>
                <p className="font-bold mt-3 truncate text-white">{leaderboard[2]?.name}</p>
                <p className="text-orange-300 font-bold text-lg mt-1">{leaderboard[2]?.totalPoints} pts</p>
              </div>
              <div className="h-20 rounded-b-2xl w-32 sm:w-40 mt-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #fb923c, #ea580c)' }}></div>
            </div>
          </div>
        )}

        {/* Badges disponibles */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-white">🎖️ Badges disponibles</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {badges.map(badge => (
              <div key={badge.id} className="bg-white/5 border border-white/20 rounded-xl p-4 text-center hover:bg-white/10 transition-all">
                <span className="text-4xl">{badge.icon}</span>
                <p className="font-bold mt-2 text-white text-sm">{badge.name}</p>
                <p className="text-xs text-white/60 mt-1">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Classement complet - Table moderne */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold mb-6 text-white">📊 Classement complet</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20 text-left">
                  <th className="pb-4 font-semibold text-white/90">Rang</th>
                  <th className="pb-4 font-semibold text-white/90">Utilisateur</th>
                  <th className="pb-4 font-semibold text-white/90 text-center">Missions</th>
                  <th className="pb-4 font-semibold text-white/90 text-center">Badges</th>
                  <th className="pb-4 font-semibold text-white/90 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user, index) => (
                  <tr key={user.id} className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-all">
                    <td className="py-4">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                    </td>
                    <td className="py-4 font-medium text-white">{user.name}</td>
                    <td className="py-4 text-center text-white/80">{user.completedMissions}</td>
                    <td className="py-4 text-center">
                      <div className="flex justify-center gap-1">
                        {user.badges?.slice(0, 3).map(badge => (
                          <span key={badge?.id} title={badge?.name} className="text-xl">{badge?.icon}</span>
                        ))}
                        {user.badges?.length > 3 && (
                          <span className="text-white/60 text-sm">+{user.badges.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <span className="font-bold text-teal-300 text-lg">{user.totalPoints}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <span className="text-5xl">🏆</span>
              <p className="mt-3 text-white/80">Aucun participant encore</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard

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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏆 Classement</h1>
        <p className="text-gray-500">Les meilleurs contributeurs Impact Identity</p>
      </div>

      {/* Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex justify-center items-end gap-4 py-8">
          {/* 2ème place */}
          <div className="text-center">
            <div className="card bg-gradient-to-b from-gray-100 to-gray-200 w-24 sm:w-32">
              <span className="text-4xl">🥈</span>
              <p className="font-bold mt-2 truncate">{leaderboard[1]?.name}</p>
              <p className="text-primary-600 font-bold">{leaderboard[1]?.totalPoints} pts</p>
            </div>
            <div className="h-20 bg-gray-300 rounded-b-lg w-24 sm:w-32"></div>
          </div>
          
          {/* 1ère place */}
          <div className="text-center -mt-8">
            <div className="card bg-gradient-to-b from-yellow-100 to-yellow-200 w-28 sm:w-36">
              <span className="text-5xl">🥇</span>
              <p className="font-bold mt-2 truncate">{leaderboard[0]?.name}</p>
              <p className="text-primary-600 font-bold text-lg">{leaderboard[0]?.totalPoints} pts</p>
            </div>
            <div className="h-28 bg-yellow-400 rounded-b-lg w-28 sm:w-36"></div>
          </div>
          
          {/* 3ème place */}
          <div className="text-center">
            <div className="card bg-gradient-to-b from-orange-100 to-orange-200 w-24 sm:w-32">
              <span className="text-4xl">🥉</span>
              <p className="font-bold mt-2 truncate">{leaderboard[2]?.name}</p>
              <p className="text-primary-600 font-bold">{leaderboard[2]?.totalPoints} pts</p>
            </div>
            <div className="h-16 bg-orange-400 rounded-b-lg w-24 sm:w-32"></div>
          </div>
        </div>
      )}

      {/* Badges disponibles */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">🎖️ Badges disponibles</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {badges.map(badge => (
            <div key={badge.id} className="bg-gray-50 rounded-lg p-4 text-center">
              <span className="text-3xl">{badge.icon}</span>
              <p className="font-bold mt-2">{badge.name}</p>
              <p className="text-xs text-gray-500">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Classement complet */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">📊 Classement complet</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-semibold">Rang</th>
                <th className="pb-3 font-semibold">Utilisateur</th>
                <th className="pb-3 font-semibold text-center">Missions</th>
                <th className="pb-3 font-semibold text-center">Badges</th>
                <th className="pb-3 font-semibold text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user, index) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3">
                    <span className="text-xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                  </td>
                  <td className="py-3 font-medium">{user.name}</td>
                  <td className="py-3 text-center">{user.completedMissions}</td>
                  <td className="py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {user.badges?.slice(0, 3).map(badge => (
                        <span key={badge?.id} title={badge?.name}>{badge?.icon}</span>
                      ))}
                      {user.badges?.length > 3 && (
                        <span className="text-gray-400">+{user.badges.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-bold text-primary-600">{user.totalPoints}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl">🏆</span>
            <p className="mt-2">Aucun participant encore</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Leaderboard

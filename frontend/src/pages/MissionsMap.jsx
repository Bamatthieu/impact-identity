import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes personnalisées par catégorie
const createCategoryIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Composant pour centrer la carte
function MapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function MissionsMap() {
  const [missions, setMissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [userLocation, setUserLocation] = useState([48.8566, 2.3522]); // Paris par défaut
  const { user, isAuthenticated, isClient } = useAuth();

  useEffect(() => {
    loadData();
    getUserLocation();
  }, []);

  const loadData = async () => {
    try {
      const [missionsRes, categoriesRes] = await Promise.all([
        isAuthenticated ? api.getMissions() : api.getPublicMissions(),
        api.getMissionCategories()
      ]);
      setMissions(missionsRes.data.data);
      setCategories(categoriesRes.data.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Géolocalisation non disponible');
        }
      );
    }
  };

  const handleApply = async (missionId) => {
    try {
      await api.applyToMission(missionId, applicationMessage);
      showToast('✅ Candidature envoyée avec succès !', 'success');
      setApplyingTo(null);
      setApplicationMessage('');
      loadData();
    } catch (error) {
      showToast(error.response?.data?.error || 'Erreur lors de la candidature', 'error');
    }
  };

  const filteredMissions = selectedCategory
    ? missions.filter(m => m.categoryId === selectedCategory)
    : missions;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      {/* Header simplifié et moderne */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 p-4 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">🗺️ Missions près de vous</h1>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
              <span className="text-white font-semibold">{filteredMissions.length} missions</span>
            </div>
          </div>
          
          {/* Filtres par catégorie - Plus compacts et modernes */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedCategory 
                  ? 'bg-white text-gray-900 shadow-lg scale-105' 
                  : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
              }`}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map & Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Carte - avec coins arrondis et ombre */}
        <div className="flex-1 relative m-4 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <MapContainer
            center={userLocation}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="rounded-2xl"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenter center={userLocation} />
            
            {filteredMissions.map((mission) => {
              if (!mission.location?.lat || !mission.location?.lng) return null;
              const category = categories.find(c => c.id === mission.categoryId);
              
              return (
                <Marker
                  key={mission.id}
                  position={[mission.location.lat, mission.location.lng]}
                  icon={createCategoryIcon(category?.color || '#14b8a6')}
                  eventHandlers={{
                    click: () => setSelectedMission(mission)
                  }}
                >
                  <Popup>
                    <div className="p-3 min-w-[250px]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{category?.icon || '📍'}</span>
                        <h3 className="font-bold text-lg flex-1">{mission.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">🏢 {mission.organization?.name}</p>
                      <div className="space-y-1 mb-3 text-sm text-gray-700">
                        <p>📍 {mission.location.address.slice(0, 40)}...</p>
                        <p>⏱️ {mission.duration} min</p>
                        <p className="font-semibold text-teal-600">🏆 {mission.points || mission.reward} points</p>
                      </div>
                      <button
                        onClick={() => setSelectedMission(mission)}
                        className="mt-2 w-full text-white py-2 rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
                        style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}
                      >
                        Voir détails →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar - Détail de la mission - Design moderne */}
        {selectedMission && (
          <div className="w-[420px] bg-white/10 backdrop-blur-xl border-l border-white/20 shadow-2xl overflow-y-auto m-4 mr-4 rounded-2xl">
            <div className="p-6">
              <button
                onClick={() => setSelectedMission(null)}
                className="text-teal-300 hover:text-teal-200 mb-4 flex items-center gap-2 font-medium"
              >
                ← Retour à la carte
              </button>

              {/* Badge catégorie moderne */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 text-white"
                  style={{ 
                    backgroundColor: `${selectedMission.category?.color}40`,
                    borderColor: selectedMission.category?.color
                  }}
                >
                  <span className="text-xl">{selectedMission.category?.icon}</span>
                  <span>{selectedMission.category?.name}</span>
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3">{selectedMission.title}</h2>
              
              <div className="flex items-center gap-2 text-teal-200 mb-6">
                <span className="text-xl">🏢</span>
                <span className="font-medium">{selectedMission.organization?.name}</span>
              </div>

              {/* Informations principales - Cards modernes */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-2xl">📍</span>
                  <span className="text-white/90 text-sm flex-1">{selectedMission.location?.address}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-2xl">📅</span>
                  <span className="text-white/90 text-sm flex-1">{formatDate(selectedMission.date)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3 border border-white/10">
                    <span className="text-xl">⏱️</span>
                    <span className="text-white/90 text-sm">{selectedMission.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3 border border-white/10">
                    <span className="text-xl">👥</span>
                    <span className="text-white/90 text-sm">{selectedMission.applicationsCount || 0}/{selectedMission.maxParticipants}</span>
                  </div>
                </div>
              </div>

              {/* Récompense - Card gradient attractive */}
              <div className="mb-6 p-5 rounded-2xl shadow-xl" style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-sm">RÉCOMPENSE</span>
                  <span className="text-3xl font-bold text-white">
                    {selectedMission.points || selectedMission.reward} pts
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span>🏆</span>
                  <span>Points d'impact + NFT certifié</span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="font-bold text-white mb-3 text-lg">📋 Description</h3>
                <p className="text-white/80 leading-relaxed text-sm">{selectedMission.description}</p>
              </div>

              {selectedMission.requirements && (
                <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="font-bold text-white mb-3 text-lg">✅ Prérequis</h3>
                  <p className="text-white/80 leading-relaxed text-sm">{selectedMission.requirements}</p>
                </div>
              )}

              {/* Bouton de candidature - Design moderne */}
              {isAuthenticated && isClient && (
                <div className="mt-6">
                  {applyingTo === selectedMission.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={applicationMessage}
                        onChange={(e) => setApplicationMessage(e.target.value)}
                        placeholder="Message de motivation (optionnel)..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-teal-400 text-white placeholder-white/50"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApply(selectedMission.id)}
                          className="flex-1 text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                          style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}
                        >
                          ✅ Confirmer ma candidature
                        </button>
                        <button
                          onClick={() => setApplyingTo(null)}
                          className="px-4 py-3 bg-white/10 text-white/90 rounded-xl hover:bg-white/15 border border-white/20 font-semibold"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setApplyingTo(selectedMission.id)}
                      className="w-full text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-2xl hover:scale-105 text-lg"
                      style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}
                    >
                      ✋ Participer à cette mission
                    </button>
                  )}
                </div>
              )}

              {!isAuthenticated && (
                <div className="mt-6 p-5 bg-white/5 rounded-xl text-center border border-white/20">
                  <p className="text-white/80 mb-4 font-medium">Connectez-vous pour participer</p>
                  <a
                    href="/login"
                    className="inline-block text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}
                  >
                    Se connecter
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

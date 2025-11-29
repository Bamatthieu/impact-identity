import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

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
      alert('Candidature envoyée avec succès !');
      setApplyingTo(null);
      setApplicationMessage('');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors de la candidature');
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🗺️ Missions près de vous</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">{filteredMissions.length} missions disponibles</span>
          </div>
        </div>
        
        {/* Filtres par catégorie */}
        <div className="max-w-7xl mx-auto mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedCategory === cat.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map & Sidebar */}
      <div className="flex-1 flex">
        {/* Carte */}
        <div className="flex-1 relative">
          <MapContainer
            center={userLocation}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
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
                  icon={createCategoryIcon(category?.color || '#666')}
                  eventHandlers={{
                    click: () => setSelectedMission(mission)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg">{mission.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{mission.organization?.name}</p>
                      <p className="text-sm mt-2">📍 {mission.location.address}</p>
                      <p className="text-sm">📅 {formatDate(mission.date)}</p>
                      <p className="text-sm">🏆 {mission.reward} points</p>
                      <button
                        onClick={() => setSelectedMission(mission)}
                        className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
                      >
                        Voir détails
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar - Détail de la mission */}
        {selectedMission && (
          <div className="w-96 bg-white shadow-lg overflow-y-auto">
            <div className="p-6">
              <button
                onClick={() => setSelectedMission(null)}
                className="text-gray-500 hover:text-gray-700 mb-4"
              >
                ← Retour à la carte
              </button>

              <div 
                className="w-full h-2 rounded mb-4"
                style={{ backgroundColor: selectedMission.category?.color }}
              ></div>

              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-3"
                style={{ 
                  backgroundColor: `${selectedMission.category?.color}20`,
                  color: selectedMission.category?.color 
                }}
              >
                {selectedMission.category?.icon} {selectedMission.category?.name}
              </span>

              <h2 className="text-2xl font-bold text-gray-900">{selectedMission.title}</h2>
              
              <p className="text-gray-600 mt-2 flex items-center">
                <span className="text-xl mr-2">🏢</span>
                {selectedMission.organization?.name}
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center text-gray-700">
                  <span className="text-xl mr-3">📍</span>
                  <span>{selectedMission.location?.address}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="text-xl mr-3">📅</span>
                  <span>{formatDate(selectedMission.date)}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="text-xl mr-3">⏱️</span>
                  <span>{selectedMission.duration} minutes</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="text-xl mr-3">👥</span>
                  <span>{selectedMission.applicationsCount || 0} / {selectedMission.maxParticipants} participants</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-green-800 font-medium">Récompense</span>
                  <span className="text-2xl font-bold text-green-600">
                    🏆 {selectedMission.reward} pts
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  + NFT de certification blockchain
                </p>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{selectedMission.description}</p>
              </div>

              {selectedMission.requirements && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Prérequis</h3>
                  <p className="text-gray-600">{selectedMission.requirements}</p>
                </div>
              )}

              {/* Bouton de candidature */}
              {isAuthenticated && isClient && (
                <div className="mt-6">
                  {applyingTo === selectedMission.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={applicationMessage}
                        onChange={(e) => setApplicationMessage(e.target.value)}
                        placeholder="Message de motivation (optionnel)..."
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApply(selectedMission.id)}
                          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                        >
                          Confirmer ma candidature
                        </button>
                        <button
                          onClick={() => setApplyingTo(null)}
                          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setApplyingTo(selectedMission.id)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      ✋ Participer à cette mission
                    </button>
                  )}
                </div>
              )}

              {!isAuthenticated && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-600 mb-3">Connectez-vous pour participer</p>
                  <a
                    href="/login"
                    className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
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

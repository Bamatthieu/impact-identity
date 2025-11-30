import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

// Composant Toast pour les alertes
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in`}>
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">✕</button>
    </div>
  );
}

export default function CreateMission() {
  const navigate = useNavigate();
  const { user, isOrganization } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    date: '',
    time: '',
    duration: 60,
    rewardXRP: 10,
    maxParticipants: 10,
    requirements: '',
    address: '',
    lat: '',
    lng: '',
    isVolunteer: false // Option bénévole
  });

  // Calculer les points automatiquement (1h = 1pt, x2 si bénévole)
  const basePoints = Math.ceil(formData.duration / 60);
  const calculatedPoints = formData.isVolunteer ? basePoints * 2 : basePoints;
  // Si bénévole, XRP = 0
  const effectiveXRP = formData.isVolunteer ? 0 : formData.rewardXRP;

  useEffect(() => {
    if (!isOrganization) {
      navigate('/dashboard');
      return;
    }
    loadCategories();
  }, [isOrganization, navigate]);

  const loadCategories = async () => {
    try {
      const res = await api.getMissionCategories();
      setCategories(res.data.data);
    } catch (err) {
      setToast({ message: 'Erreur chargement catégories', type: 'error' });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('handleChange:', { name, value, type, valueType: typeof value }); // Debug
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddressSearch = async () => {
    if (!formData.address) return;
    
    try {
      // Utiliser l'API Nominatim d'OpenStreetMap pour géocoder l'adresse
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`
      );
      const results = await response.json();
      
      if (results.length > 0) {
        setFormData({
          ...formData,
          lat: results[0].lat,
          lng: results[0].lon,
          address: results[0].display_name
        });
        setToast({ message: 'Adresse trouvée !', type: 'success' });
      } else {
        setToast({ message: 'Adresse non trouvée', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Erreur lors de la recherche d\'adresse', type: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation côté client
    console.log('formData avant validation:', formData); // Debug
    
    if (!formData.title.trim()) {
      setToast({ message: 'Le titre est requis', type: 'error' });
      return;
    }
    if (!formData.description.trim()) {
      setToast({ message: 'La description est requise', type: 'error' });
      return;
    }
    if (!formData.categoryId || formData.categoryId === '') {
      setToast({ message: 'Veuillez sélectionner une catégorie', type: 'error' });
      return;
    }
    if (!formData.date) {
      setToast({ message: 'La date est requise', type: 'error' });
      return;
    }
    if (!formData.time) {
      setToast({ message: 'L\'heure est requise', type: 'error' });
      return;
    }
    if (!formData.lat || !formData.lng) {
      setToast({ message: 'Veuillez rechercher et valider l\'adresse', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      // categoryId est un UUID (string), pas un nombre
      // Créer une date ISO complète avec timezone
      const dateTimeStr = `${formData.date}T${formData.time}:00`;
      const missionDate = new Date(dateTimeStr);
      
      const missionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId, // UUID string
        date: missionDate.toISOString(), // Format ISO complet avec timezone
        duration: Number(formData.duration) || 60,
        rewardXRP: effectiveXRP, // 0 si bénévole
        maxParticipants: Number(formData.maxParticipants) || 10,
        requirements: formData.requirements,
        isVolunteer: formData.isVolunteer,
        bonusPoints: formData.isVolunteer ? basePoints : 0, // Points bonus si bénévole
        location: {
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          address: formData.address
        }
      };

      console.log('Envoi mission:', missionData); // Debug

      await api.createMission(missionData);
      setToast({ message: 'Mission créée avec succès !', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('Erreur création mission:', err.response?.data);
      setToast({ message: err.response?.data?.error || 'Erreur lors de la création', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="text-teal-300 hover:text-teal-200 mb-4 font-medium">
            ← Retour
          </button>
          <h1 className="text-3xl font-bold text-white">Créer une mission</h1>
          <p className="text-teal-200">Mobilisez des bénévoles pour votre cause</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Option Bénévole */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-xl p-4">
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  name="isVolunteer"
                  checked={formData.isVolunteer}
                  onChange={handleChange}
                  className="w-6 h-6 text-purple-400 rounded focus:ring-purple-400"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💜</span>
                    <span className="font-bold text-purple-300">Mission 100% Bénévole</span>
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">x2 Points</span>
                  </div>
                  <p className="text-sm text-purple-200 mt-1">
                    Les participants reçoivent 2x plus de points et NFTs, mais 0 XRP
                  </p>
                </div>
              </label>
            </div>

            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Titre de la mission *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white placeholder-white/50"
                placeholder="Ex: Nettoyage du parc central"
                required
              />
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Catégorie *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className={`cursor-pointer p-3 border rounded-lg text-center transition-all ${
                      formData.categoryId === String(cat.id)
                        ? 'border-2 shadow-xl scale-105'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                    style={formData.categoryId === String(cat.id) ? { borderColor: cat.color, backgroundColor: `${cat.color}30` } : {}}
                  >
                    <input
                      type="radio"
                      name="categoryId"
                      value={cat.id}
                      checked={formData.categoryId === String(cat.id)}
                      onChange={handleChange}
                      className="sr-only"
                      required
                    />
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div className="text-sm font-medium text-white">{cat.name}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white placeholder-white/50"
                placeholder="Décrivez la mission en détail..."
                required
              />
            </div>

            {/* Localisation */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Adresse *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white placeholder-white/50"
                  placeholder="Ex: 1 rue de la Paix, 75001 Paris"
                  required
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="px-4 py-3 bg-white/10 text-white/90 rounded-lg hover:bg-white/15 border border-white/20"
                >
                  🔍 Rechercher
                </button>
              </div>
              {formData.lat && formData.lng && (
                <p className="mt-2 text-sm text-teal-300">
                  ✅ Coordonnées trouvées: {formData.lat}, {formData.lng}
                </p>
              )}
            </div>

            {/* Date et heure */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Heure *
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                  required
                />
              </div>
            </div>

            {/* Durée et participants */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Durée (minutes)
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                >
                  <option value="30" className="bg-gray-800">30 min</option>
                  <option value="60" className="bg-gray-800">1 heure</option>
                  <option value="90" className="bg-gray-800">1h30</option>
                  <option value="120" className="bg-gray-800">2 heures</option>
                  <option value="180" className="bg-gray-800">3 heures</option>
                  <option value="240" className="bg-gray-800">4 heures</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Participants max
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white"
                />
              </div>
            </div>

            {/* Récompense XRP */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Récompense XRP (0-100) {formData.isVolunteer && <span className="text-purple-300">(Désactivé - Mission bénévole)</span>}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  name="rewardXRP"
                  value={formData.rewardXRP}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="1"
                  disabled={formData.isVolunteer}
                  className={`flex-1 ${formData.isVolunteer ? 'opacity-50' : ''}`}
                />
                <span className={`text-2xl font-bold w-24 text-center ${formData.isVolunteer ? 'text-white/40' : 'text-blue-300'}`}>
                  {effectiveXRP} XRP
                </span>
              </div>
              <div className={`mt-3 p-4 rounded-lg border ${formData.isVolunteer ? 'bg-purple-500/20 border-purple-400/30' : 'bg-teal-500/20 border-teal-400/30'}`}>
                <p className={`text-sm font-medium ${formData.isVolunteer ? 'text-purple-200' : 'text-teal-200'}`}>
                  <strong>Points gagnés :</strong> {calculatedPoints} pt{calculatedPoints > 1 ? 's' : ''} 
                  {formData.isVolunteer && <span className="ml-1">(x2 bonus bénévole !)</span>}
                </p>
                <p className={`text-xs mt-1 ${formData.isVolunteer ? 'text-purple-300' : 'text-teal-300'}`}>
                  {formData.isVolunteer 
                    ? `Les participants recevront ${calculatedPoints} points (2x) + un NFT spécial bénévole 💜`
                    : `Les participants recevront ${calculatedPoints} points + ${formData.rewardXRP} XRP + un NFT de certification`
                  }
                </p>
              </div>
            </div>

            {/* Prérequis */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Prérequis (optionnel)
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:ring-2 focus:ring-teal-400 text-white placeholder-white/50"
                placeholder="Ex: Prévoir des gants et des chaussures fermées..."
              />
            </div>

            {/* Bouton soumettre */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-2xl text-lg ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
              style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)' }}
            >
              {loading ? '⏳ Création...' : '🚀 Publier la mission'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth } from '../context/AuthContext';

export default function CreateMission() {
  const navigate = useNavigate();
  const { user, isOrganization } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    lng: ''
  });

  // Calculer les points automatiquement (1h = 1pt)
  const calculatedPoints = Math.ceil(formData.duration / 60);

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
      console.error('Erreur chargement catégories:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
      } else {
        setError('Adresse non trouvée');
      }
    } catch (err) {
      console.error('Erreur géocodage:', err);
      setError('Erreur lors de la recherche d\'adresse');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.lat || !formData.lng) {
      setError('Veuillez rechercher et valider l\'adresse');
      return;
    }

    setLoading(true);

    try {
      const missionData = {
        title: formData.title,
        description: formData.description,
        categoryId: parseInt(formData.categoryId),
        date: `${formData.date}T${formData.time}:00`,
        duration: parseInt(formData.duration),
        rewardXRP: parseFloat(formData.rewardXRP),
        maxParticipants: parseInt(formData.maxParticipants),
        requirements: formData.requirements,
        location: {
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          address: formData.address
        }
      };

      await api.createMission(missionData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 mb-4">
            ← Retour
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Créer une mission</h1>
          <p className="text-gray-600">Mobilisez des bénévoles pour votre cause</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de la mission *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ex: Nettoyage du parc central"
                required
              />
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className={`cursor-pointer p-3 border rounded-lg text-center transition-all ${
                      formData.categoryId === String(cat.id)
                        ? 'border-2 shadow-md'
                        : 'hover:border-gray-400'
                    }`}
                    style={formData.categoryId === String(cat.id) ? { borderColor: cat.color, backgroundColor: `${cat.color}10` } : {}}
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
                    <div className="text-sm font-medium">{cat.name}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Décrivez la mission en détail..."
                required
              />
            </div>

            {/* Localisation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: 1 rue de la Paix, 75001 Paris"
                  required
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  🔍 Rechercher
                </button>
              </div>
              {formData.lat && formData.lng && (
                <p className="mt-2 text-sm text-green-600">
                  ✅ Coordonnées trouvées: {formData.lat}, {formData.lng}
                </p>
              )}
            </div>

            {/* Date et heure */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure *
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            {/* Durée et participants */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée (minutes)
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="30">30 min</option>
                  <option value="60">1 heure</option>
                  <option value="90">1h30</option>
                  <option value="120">2 heures</option>
                  <option value="180">3 heures</option>
                  <option value="240">4 heures</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participants max
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Récompense XRP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Récompense XRP (0-100) *
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
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-blue-600 w-24 text-center">
                  {formData.rewardXRP} XRP
                </span>
              </div>
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Points gagnés :</strong> {calculatedPoints} pt{calculatedPoints > 1 ? 's' : ''} (basé sur la durée: 1h = 1pt)
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Les participants recevront {calculatedPoints} points + {formData.rewardXRP} XRP + un NFT de certification
                </p>
              </div>
            </div>

            {/* Prérequis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prérequis (optionnel)
              </label>
              <textarea
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ex: Prévoir des gants et des chaussures fermées..."
              />
            </div>

            {/* Bouton soumettre */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Création...' : '🚀 Publier la mission'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

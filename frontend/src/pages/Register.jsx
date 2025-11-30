import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

export default function Register() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationType: '',
    siret: '',
    sector: '',
    description: '',
    phone: '',
    address: ''
  });
  const [organizationTypes, setOrganizationTypes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
    loadOrganizationTypes();
  }, [isAuthenticated, navigate]);

  const loadOrganizationTypes = async () => {
    try {
      const res = await api.getOrganizationTypes();
      setOrganizationTypes(res.data.data);
    } catch (err) {
      console.error('Erreur chargement types:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const data = {
        role,
        email: formData.email,
        password: formData.password
      };

      if (role === 'client') {
        data.name = formData.name;
      } else {
        data.organizationName = formData.organizationName;
        data.organizationType = parseInt(formData.organizationType);
        data.siret = formData.siret;
        data.sector = formData.sector;
        data.description = formData.description;
        data.phone = formData.phone;
        data.address = formData.address;
      }

      const result = await register(data);
      
      if (result.isPending) {
        setSuccess('Votre organisation a été créée ! Elle est en attente de validation par l\'administrateur.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Rejoindre Zencity</h1>
            <p className="text-gray-600 mt-2">Choisissez votre type de compte</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => handleRoleSelect('client')}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500 text-left"
            >
              <div className="text-5xl mb-4">👤</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bénévole / Citoyen</h2>
              <p className="text-gray-600 mb-4">
                Participez à des missions d'impact positif, gagnez des points et des badges sur la blockchain.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Découvrez des missions près de chez vous</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Gagnez des NFTs pour vos actions</li>
                <li className="flex items-center"><span className="text-green-500 mr-2">✓</span> Montez dans le classement</li>
              </ul>
            </button>

            <button
              onClick={() => handleRoleSelect('organization')}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 text-left"
            >
              <div className="text-5xl mb-4">🏢</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Organisation</h2>
              <p className="text-gray-600 mb-4">
                Entreprise, Association, Mairie... Créez des missions et mobilisez des bénévoles.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center"><span className="text-blue-500 mr-2">✓</span> Créez et gérez vos missions</li>
                <li className="flex items-center"><span className="text-blue-500 mr-2">✓</span> Validez les participations</li>
                <li className="flex items-center"><span className="text-blue-500 mr-2">✓</span> Impact certifié blockchain</li>
              </ul>
            </button>
          </div>

          <p className="text-center mt-8 text-gray-600">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-green-600 hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={() => setStep(1)}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center"
          >
            ← Retour
          </button>

          <div className="text-center mb-6">
            <div className="text-4xl mb-2">{role === 'client' ? '👤' : '🏢'}</div>
            <h1 className="text-2xl font-bold text-gray-900">
              {role === 'client' ? 'Inscription Bénévole' : 'Inscription Organisation'}
            </h1>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-4">
              <p className="font-medium">✅ {success}</p>
              <Link to="/login" className="text-green-700 underline mt-2 inline-block">
                Retour à la connexion
              </Link>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'client' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'organisation *</label>
                    <input
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type d'organisation *</label>
                    <select
                      name="organizationType"
                      value={formData.organizationType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Sélectionner...</option>
                      {organizationTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SIRET (optionnel)</label>
                    <input
                      type="text"
                      name="siret"
                      value={formData.siret}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {role === 'organization' && (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
                  ⚠️ Les comptes organisation sont soumis à validation.
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  role === 'client' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white ${loading ? 'opacity-50' : ''}`}
              >
                {loading ? 'Inscription...' : 'S\'inscrire'}
              </button>
            </form>
          )}

          <p className="text-center mt-6 text-gray-600 text-sm">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-green-600 hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

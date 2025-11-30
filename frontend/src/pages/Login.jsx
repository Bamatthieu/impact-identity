import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      // Rediriger selon le rôle
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}>
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-6xl">🌍</span>
          <h1 className="text-3xl font-bold text-white mt-4">Zencity</h1>
          <p className="text-teal-200 mt-2">Connectez-vous à votre compte</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-teal-400 focus:bg-white/10 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-lg font-bold text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
              style={{
                background: loading ? 'linear-gradient(135deg, #6b7280, #4b5563)' : 'linear-gradient(135deg, #34d399, #14b8a6, #3b82f6)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/80">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-teal-300 font-semibold hover:text-teal-200 transition-colors">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>

        {/* Info Admin */}
        <div className="mt-6 p-4 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 rounded-xl">
          <p className="text-sm text-blue-200 text-center">
            <strong className="text-blue-100">Compte Admin :</strong><br />
            admin@impact-identity.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

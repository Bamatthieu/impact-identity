import { useState } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MissionsMap from './pages/MissionsMap'
import CreateMission from './pages/CreateMission'
import ManageMission from './pages/ManageMission'
import Leaderboard from './pages/Leaderboard'
import Wallet from './pages/Wallet'
import AdminOrganizations from './pages/AdminOrganizations'
import AdminBlockchain from './pages/AdminBlockchain'

// Composant pour protéger les routes
function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function AppContent() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAdmin, isClient, isOrganization, isAuthenticated, logout } = useAuth()

  // Navigation selon le rôle
  const getNavLinks = () => {
    if (!isAuthenticated) return [];
    
    if (isAdmin) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: '📊' },
        { to: '/admin/organizations', label: 'Organisations', icon: '🏢' },
        { to: '/admin/blockchain', label: 'Blockchain', icon: '⛓️' },
        { to: '/leaderboard', label: 'Classement', icon: '🏆' },
      ];
    }
    
    if (isOrganization) {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: '📊' },
        { to: '/missions/create', label: 'Nouvelle Mission', icon: '➕' },
        { to: '/map', label: 'Carte', icon: '🗺️' },
        { to: '/wallet', label: 'Wallet', icon: '💳' },
      ];
    }
    
    // Client
    return [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
      { to: '/map', label: 'Missions', icon: '🗺️' },
      { to: '/wallet', label: 'Wallet', icon: '💳' },
      { to: '/leaderboard', label: 'Classement', icon: '🏆' },
    ];
  };

  const navLinks = getNavLinks();

  // Ne pas afficher le header sur les pages login/register
  const hideHeader = ['/login', '/register'].includes(location.pathname)

  if (hideHeader) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3">
              <span className="text-3xl">🌍</span>
              <span className="text-xl font-bold text-green-700">Impact Identity</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              
              {/* User info + Logout */}
              {isAuthenticated && (
                <div className="flex items-center ml-4 pl-4 border-l">
                  <div className="mr-4 text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {user?.role === 'organization' ? '🏢 Organisation' : 
                       user?.role === 'admin' ? '⚙️ Admin' : '👤 Bénévole'}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Déconnexion"
                  >
                    🚪
                  </button>
                </div>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium ${
                    location.pathname === link.to
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && (
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg mt-2"
                >
                  🚪 Déconnexion
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/map" element={
            <ProtectedRoute>
              <MissionsMap />
            </ProtectedRoute>
          } />
          
          <Route path="/wallet" element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          } />
          
          {/* Organization routes */}
          <Route path="/missions/create" element={
            <ProtectedRoute roles={['organization']}>
              <CreateMission />
            </ProtectedRoute>
          } />
          
          <Route path="/missions/:id/manage" element={
            <ProtectedRoute roles={['organization']}>
              <ManageMission />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin/organizations" element={
            <ProtectedRoute roles={['admin']}>
              <AdminOrganizations />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/blockchain" element={
            <ProtectedRoute roles={['admin']}>
              <AdminBlockchain />
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

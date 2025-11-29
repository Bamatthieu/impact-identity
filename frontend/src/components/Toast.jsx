import { useEffect, useState } from 'react';

// Contexte global pour les toasts
let toastHandler = null;

export const showToast = (message, type = 'info') => {
  if (toastHandler) {
    toastHandler({ message, type, id: Date.now() });
  }
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastHandler = (toast) => {
      setToasts(prev => [...prev, toast]);
      // Auto-remove après 4s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 4000);
    };
    return () => { toastHandler = null; };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-500', icon: '✓' };
      case 'error':
        return { bg: 'bg-red-500', icon: '✕' };
      case 'warning':
        return { bg: 'bg-yellow-500', icon: '⚠' };
      default:
        return { bg: 'bg-blue-500', icon: 'ℹ' };
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => {
        const { bg, icon } = getStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`${bg} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in min-w-[300px]`}
            style={{
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <span className="text-xl">{icon}</span>
            <span className="font-medium flex-1">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="hover:opacity-70 text-lg"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Modal de confirmation
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmer', confirmColor = 'red' }) {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-scale-in">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 px-4 ${colorClasses[confirmColor]} text-white rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de signalement
export function ReportModal({ isOpen, onClose, onSubmit, participantName }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reasons = [
    { value: 'no_show', label: 'Ne s\'est pas présenté' },
    { value: 'late', label: 'Arrivé très en retard' },
    { value: 'left_early', label: 'Parti avant la fin' },
    { value: 'inappropriate', label: 'Comportement inapproprié' },
    { value: 'disrespectful', label: 'Manque de respect' },
    { value: 'other', label: 'Autre' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) return;
    onSubmit({ reason, details });
    setReason('');
    setDetails('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🚨</span>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Signaler un participant</h3>
            <p className="text-sm text-gray-500">{participantName}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motif du signalement *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Sélectionner un motif</option>
              {reasons.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Détails (optionnel)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Décrivez ce qui s'est passé..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              🚨 Signaler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default { ToastContainer, ConfirmModal, ReportModal, showToast };

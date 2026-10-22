import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

/**
 * Toast - Simple toast notification
 * @param {Object} props
 * @param {boolean} props.show - Whether toast is visible
 * @param {Function} props.onClose - Callback to close toast
 * @param {string} props.message - Toast message
 * @param {string} props.type - Toast type: 'success', 'error', 'info' (default: 'info')
 * @param {number} props.duration - Auto-close duration in ms (default: 3000, set to 0 to disable auto-close)
 */
export default function Toast({
  show,
  onClose,
  message,
  type = 'info',
  duration = 3000
}) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'info':
      default:
        return <AlertCircle size={20} />;
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`toast toast-${type}`}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          role="alert"
          aria-live="polite"
        >
          <div className="toast-icon">{getIcon()}</div>
          <div className="toast-message">{message}</div>
          <button
            className="toast-close-btn"
            onClick={onClose}
            aria-label="Tutup notifikasi"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

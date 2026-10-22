import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ConfirmDialog - Custom confirmation dialog (replaces window.confirm)
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {Function} props.onClose - Callback to close dialog
 * @param {Function} props.onConfirm - Callback when user confirms
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.confirmText - Confirm button text (default: "Konfirmasi")
 * @param {string} props.cancelText - Cancel button text (default: "Batal")
 * @param {boolean} props.destructive - Whether this is a destructive action (red button)
 * @param {boolean} props.loading - Whether action is in progress
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  destructive = false,
  loading = false
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previouslyFocusedRef.current = document.activeElement;
      
      // Focus cancel button after a short delay
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
    } else {
      // Return focus to previously focused element
      previouslyFocusedRef.current?.focus();
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="confirm-dialog-overlay"
          onClick={handleBackdropClick}
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="confirm-dialog-header">
              <h2 id="confirm-dialog-title" className="confirm-dialog-title">
                {title}
              </h2>
              <button
                className="confirm-dialog-close-btn"
                onClick={onClose}
                disabled={loading}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="confirm-dialog-content">
              <p id="confirm-dialog-message" className="confirm-dialog-message">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="confirm-dialog-actions">
              <button
                ref={cancelButtonRef}
                className="confirm-dialog-btn cancel"
                onClick={onClose}
                disabled={loading}
                type="button"
              >
                {cancelText}
              </button>
              <button
                className={`confirm-dialog-btn confirm ${destructive ? 'destructive' : ''}`}
                onClick={handleConfirm}
                disabled={loading}
                type="button"
              >
                {loading ? 'Memproses...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

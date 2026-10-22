import { useEffect, useRef } from 'react';
import { X, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConversationList from './ConversationList';
import ToneSwitch from './ToneSwitch';

/**
 * ConversationDrawer - Mobile drawer that slides from left
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether drawer is open
 * @param {Function} props.onClose - Callback to close drawer
 * @param {string} props.activeConversationId - Currently active conversation ID
 * @param {string} props.activeTone - Current conversation tone
 * @param {Function} props.onSelectConversation - Callback when conversation is selected
 * @param {Function} props.onConversationCreated - Callback when new conversation is created
 * @param {Function} props.onToneChange - Callback when tone is changed
 */
export default function ConversationDrawer({ 
  isOpen,
  onClose,
  activeConversationId,
  activeTone,
  onSelectConversation,
  onConversationCreated,
  onToneChange
}) {
  const drawerRef = useRef(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
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

  const handleSelectConversation = (conversationId) => {
    onSelectConversation(conversationId);
    onClose(); // Close drawer after selection on mobile
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            ref={drawerRef}
            className="conversation-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
          >
            {/* Header */}
            <div className="drawer-header">
              <div className="drawer-logo">
                <div className="drawer-logo-icon">
                  <Bot size={28} strokeWidth={1.5} />
                </div>
                <div className="drawer-logo-text">
                  <h2>AI Tutor</h2>
                  <p>B3Matika</p>
                </div>
              </div>

              <button
                className="drawer-close-btn"
                onClick={onClose}
                aria-label="Tutup drawer"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tone switcher */}
            {activeConversationId && (
              <div className="drawer-tone-switch">
                <ToneSwitch
                  tone={activeTone}
                  onChange={onToneChange}
                />
              </div>
            )}

            {/* Conversation list */}
            <div className="drawer-content">
              <ConversationList
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onConversationCreated={(conv) => {
                  onConversationCreated(conv);
                  onClose(); // Close drawer after creation
                }}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

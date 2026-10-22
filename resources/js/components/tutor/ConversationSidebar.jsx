import { Bot } from 'lucide-react';
import ConversationList from './ConversationList';
import ToneSwitch from './ToneSwitch';

/**
 * ConversationSidebar - Desktop sidebar with conversation list
 * @param {Object} props
 * @param {string} props.activeConversationId - Currently active conversation ID
 * @param {string} props.activeTone - Current conversation tone
 * @param {Function} props.onSelectConversation - Callback when conversation is selected
 * @param {Function} props.onConversationCreated - Callback when new conversation is created
 * @param {Function} props.onToneChange - Callback when tone is changed
 */
export default function ConversationSidebar({ 
  activeConversationId,
  activeTone,
  onSelectConversation,
  onConversationCreated,
  onToneChange
}) {
  return (
    <aside className="conversation-sidebar">
      {/* Header */}
      <div className="conversation-sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Bot size={32} strokeWidth={1.5} />
          </div>
          <div className="sidebar-logo-text">
            <h2>AI Tutor</h2>
            <p>B3Matika</p>
          </div>
        </div>

        {/* Tone switcher */}
        {activeConversationId && (
          <div className="sidebar-tone-switch">
            <ToneSwitch
              tone={activeTone}
              onChange={onToneChange}
            />
          </div>
        )}
      </div>

      {/* Conversation list */}
      <div className="conversation-sidebar-content">
        <ConversationList
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onConversationCreated={onConversationCreated}
        />
      </div>

      {/* Footer hint */}
      <div className="conversation-sidebar-footer">
        <p className="sidebar-hint">
          💡 Klik percakapan untuk memulai chat
        </p>
      </div>
    </aside>
  );
}

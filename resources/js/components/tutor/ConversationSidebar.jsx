import ConversationList from './ConversationList';

/**
 * ConversationSidebar - Desktop sidebar with conversation list
 * @param {Object} props
 * @param {string} props.activeConversationId - Currently active conversation ID
 * @param {Function} props.onSelectConversation - Callback when conversation is selected
 * @param {Function} props.onConversationCreated - Callback when new conversation is created
 * @param {Function} props.onConversationDeleted - Callback when conversation is deleted
 */
export default function ConversationSidebar({ 
  activeConversationId,
  onSelectConversation,
  onConversationCreated,
  onConversationDeleted
}) {
  return (
    <aside className="conversation-sidebar">
      {/* Header */}
      <div className="conversation-sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src="/images/ai-tutor-mascot.jpg" alt="AI Tutor" className="tutor-mascot-img" style={{width: 32, height: 32, borderRadius: '8px'}} />
          </div>
          <div className="sidebar-logo-text">
            <h2>AI Tutor</h2>
            <p>B3Matika</p>
          </div>
        </div>
      </div>

      {/* Conversation list */}
      <div className="conversation-sidebar-content">
        <ConversationList
          activeConversationId={activeConversationId}
          onSelectConversation={onSelectConversation}
          onConversationCreated={onConversationCreated}
          onConversationDeleted={onConversationDeleted}
        />
      </div>
    </aside>
  );
}

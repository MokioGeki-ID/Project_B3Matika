import { useState, useEffect } from 'react';
import { Plus, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConversationItem from './ConversationItem';
import { api } from '@/lib/api';

/**
 * ConversationList - List of conversations with create, rename, delete
 * @param {Object} props
 * @param {string} props.activeConversationId - Currently active conversation ID
 * @param {Function} props.onSelectConversation - Callback when conversation is selected
 * @param {Function} props.onConversationCreated - Callback when new conversation is created
 */
export default function ConversationList({ 
  activeConversationId, 
  onSelectConversation,
  onConversationCreated 
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadConversations = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/tutor/conversations', {
        params: { page: pageNum, limit: 20 }
      });

      const { conversations: data, pagination } = response;

      if (pageNum === 1) {
        setConversations(data);
      } else {
        setConversations(prev => [...prev, ...data]);
      }

      setHasMore(pagination.page < pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Gagal memuat percakapan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleCreateConversation = async () => {
    try {
      setCreating(true);
      setError(null);

      const now = new Date();
      const defaultTitle = `Chat ${now.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;

      const response = await api.post('/api/tutor/conversations', {
        title: defaultTitle,
        tone: 'baku'
      });

      const newConversation = response.conversation;
      
      // Add to list
      setConversations(prev => [newConversation, ...prev]);
      
      // Notify parent
      if (onConversationCreated) {
        onConversationCreated(newConversation);
      }
      
      // Auto-select new conversation
      if (onSelectConversation) {
        onSelectConversation(newConversation.id);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err.message || 'Gagal membuat percakapan baru');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (conversationId, newTitle) => {
    try {
      await api.patch(`/api/tutor/conversations/${conversationId}`, {
        title: newTitle
      });

      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, title: newTitle, updated_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (err) {
      console.error('Error renaming conversation:', err);
      throw err;
    }
  };

  const handleDelete = async (conversationId) => {
    try {
      await api.delete(`/api/tutor/conversations/${conversationId}`);

      // Remove from list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      // If deleted conversation was active, select first available or create new
      if (conversationId === activeConversationId) {
        const remaining = conversations.filter(conv => conv.id !== conversationId);
        if (remaining.length > 0) {
          onSelectConversation(remaining[0].id);
        } else {
          // No conversations left, create new one
          handleCreateConversation();
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      throw err;
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadConversations(page + 1);
    }
  };

  return (
    <div className="conversation-list">
      {/* Create new button */}
      <button
        className="conversation-create-btn"
        onClick={handleCreateConversation}
        disabled={creating}
      >
        {creating ? (
          <Loader size={18} className="spin" />
        ) : (
          <Plus size={18} />
        )}
        <span>Percakapan Baru</span>
      </button>

      {/* Error message */}
      {error && (
        <div className="conversation-list-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && conversations.length === 0 && (
        <div className="conversation-list-loading">
          <Loader size={24} className="spin" />
          <p>Memuat percakapan...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && conversations.length === 0 && !error && (
        <div className="conversation-list-empty">
          <MessageSquare size={48} strokeWidth={1} opacity={0.3} />
          <p>Belum ada percakapan</p>
          <button 
            className="conversation-list-empty-btn"
            onClick={handleCreateConversation}
          >
            Mulai Chat Baru
          </button>
        </div>
      )}

      {/* Conversation list */}
      <div className="conversation-list-items">
        <AnimatePresence>
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={onSelectConversation}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          className="conversation-load-more"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? (
            <Loader size={16} className="spin" />
          ) : (
            'Muat lebih banyak'
          )}
        </button>
      )}
    </div>
  );
}

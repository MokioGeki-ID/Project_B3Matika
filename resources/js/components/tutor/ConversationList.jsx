import { useState, useEffect } from 'react';
import { Plus, Loader, AlertCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConversationItem from './ConversationItem';
import ConversationSearch from './ConversationSearch';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import { api } from '@/lib/api';

/**
 * Group conversations by date
 * @param {Array} conversations - Array of conversations
 * @returns {Object} Grouped conversations
 */
function groupConversationsByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups = {
    today: [],
    yesterday: [],
    lastWeek: [],
    older: [],
  };

  conversations.forEach((conv) => {
    const convDate = new Date(conv.updated_at || conv.created_at);
    const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

    if (convDay.getTime() === today.getTime()) {
      groups.today.push(conv);
    } else if (convDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(conv);
    } else if (convDate >= lastWeek) {
      groups.lastWeek.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

/**
 * ConversationList - List of conversations with create, rename, delete
 * @param {Object} props
 * @param {string} props.activeConversationId - Currently active conversation ID
 * @param {Function} props.onSelectConversation - Callback when conversation is selected
 * @param {Function} props.onConversationCreated - Callback when new conversation is created
 * @param {Function} props.onConversationDeleted - Callback when conversation is deleted
 */
export default function ConversationList({ 
  activeConversationId, 
  onSelectConversation,
  onConversationCreated,
  onConversationDeleted
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  
  // Dialog and toast state
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, conversation: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ show: false, message: '', type: 'info' });
  };

  const loadConversations = async (nextCursor = null) => {
    try {
      setLoading(true);
      setError(null);

      const url = nextCursor
        ? `/tutor/conversations?cursor=${encodeURIComponent(nextCursor)}`
        : '/tutor/conversations';

      const response = await api.get(url);

      const { conversations: data, nextCursor: newCursor, hasMore: more } = response;

      // Filter: hanya tampilkan percakapan yang memiliki minimal 1 pesan
      const filteredData = (data || []).filter(conv => conv.message_count > 0);

      if (!nextCursor) {
        setConversations(filteredData);
      } else {
        setConversations(prev => [...prev, ...filteredData]);
      }

      setHasMore(!!more);
      setCursor(newCursor || null);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err.message || 'Gagal memuat percakapan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleCreateConversation = async () => {
    // Tidak langsung membuat di database, hanya notify parent untuk masuk ke draft state
    if (onConversationCreated) {
      onConversationCreated('draft');
    }
  };

  const handleRename = async (conversationId, newTitle) => {
    try {
      await api.patch(`/tutor/conversations/${conversationId}`, {
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

  const handleDeleteRequest = (conversation) => {
    setDeleteDialog({ isOpen: true, conversation });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.conversation) return;

    const conversationId = deleteDialog.conversation.id;
    const conversationTitle = deleteDialog.conversation.title;

    try {
      await api.delete(`/tutor/conversations/${conversationId}`);

      // Remove from list (optimistic update)
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      // Notify parent that conversation was deleted
      if (onConversationDeleted) {
        onConversationDeleted(conversationId);
      }

      showToast('Percakapan berhasil dihapus', 'success');
      setDeleteDialog({ isOpen: false, conversation: null });
    } catch (err) {
      console.error('Error deleting conversation:', err);
      showToast('Gagal menghapus percakapan', 'error');
      
      // Rollback optimistic update jika gagal
      loadConversations();
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, conversation: null });
  };

  const handleDelete = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      handleDeleteRequest(conversation);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && cursor) {
      loadConversations(cursor);
    }
  };

  // Filter conversations by search query
  const filteredConversations = searchQuery
    ? conversations.filter((conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  // Group filtered conversations
  const groupedConversations = groupConversationsByDate(filteredConversations);

  return (
    <div className="conversation-list">
      {/* Create new button */}
      <button
        className="conversation-create-btn"
        onClick={handleCreateConversation}
        disabled={creating}
      >
        <Plus size={18} />
        <span>Percakapan Baru</span>
      </button>

      {/* Search bar */}
      <div className="conversation-search-wrapper">
        <ConversationSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari percakapan..."
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="conversation-list-error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            className="conversation-list-retry"
            onClick={() => loadConversations()}
          >
            Coba lagi
          </button>
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

      {/* No search results */}
      {!loading && searchQuery && filteredConversations.length === 0 && (
        <div className="conversation-list-empty">
          <MessageSquare size={48} strokeWidth={1} opacity={0.3} />
          <p>Tidak ada hasil untuk "{searchQuery}"</p>
          <button 
            className="conversation-list-empty-btn"
            onClick={() => setSearchQuery('')}
          >
            Hapus Pencarian
          </button>
        </div>
      )}

      {/* Conversation list with grouping */}
      {!loading && filteredConversations.length > 0 && (
        <div className="conversation-list-items">
          {/* Today */}
          {groupedConversations.today.length > 0 && (
            <div className="conversation-group">
              <div className="conversation-group-label">Hari Ini</div>
              <AnimatePresence>
                {groupedConversations.today.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === activeConversationId}
                    onClick={onSelectConversation}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onShowToast={showToast}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Yesterday */}
          {groupedConversations.yesterday.length > 0 && (
            <div className="conversation-group">
              <div className="conversation-group-label">Kemarin</div>
              <AnimatePresence>
                {groupedConversations.yesterday.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === activeConversationId}
                    onClick={onSelectConversation}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onShowToast={showToast}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Last 7 Days */}
          {groupedConversations.lastWeek.length > 0 && (
            <div className="conversation-group">
              <div className="conversation-group-label">7 Hari Terakhir</div>
              <AnimatePresence>
                {groupedConversations.lastWeek.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === activeConversationId}
                    onClick={onSelectConversation}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onShowToast={showToast}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Older */}
          {groupedConversations.older.length > 0 && (
            <div className="conversation-group">
              <div className="conversation-group-label">Lebih Lama</div>
              <AnimatePresence>
                {groupedConversations.older.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === activeConversationId}
                    onClick={onSelectConversation}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onShowToast={showToast}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Hapus percakapan?"
        message={`Percakapan "${deleteDialog.conversation?.title}" beserta semua pesan dan file akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        destructive={true}
        loading={false}
      />

      {/* Toast Notification */}
      <Toast
        show={toast.show}
        onClose={hideToast}
        message={toast.message}
        type={toast.type}
        duration={3000}
      />
    </div>
  );
}

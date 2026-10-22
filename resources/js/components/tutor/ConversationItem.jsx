import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Edit2, Trash2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ConversationItem - Single conversation in the list
 * @param {Object} props
 * @param {Object} props.conversation - Conversation object {id, title, tone, topic_id, created_at, updated_at}
 * @param {boolean} props.isActive - Whether this conversation is currently active
 * @param {Function} props.onClick - Callback when conversation is clicked
 * @param {Function} props.onRename - Callback to rename conversation
 * @param {Function} props.onDelete - Callback to delete conversation (should handle errors and return promise)
 * @param {Function} props.onShowToast - Callback to show toast notification
 */
export default function ConversationItem({ 
  conversation, 
  isActive, 
  onClick, 
  onRename, 
  onDelete,
  onShowToast
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === conversation.title) {
      setIsEditing(false);
      setEditTitle(conversation.title);
      return;
    }

    if (trimmed.length > 80) {
      onShowToast?.('Judul terlalu panjang (maksimal 80 karakter)', 'error');
      return;
    }

    try {
      await onRename(conversation.id, trimmed);
      setIsEditing(false);
      onShowToast?.('Nama percakapan berhasil diubah', 'success');
    } catch (err) {
      onShowToast?.('Gagal mengubah nama percakapan', 'error');
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await onDelete(conversation.id);
    } catch (err) {
      onShowToast?.('Gagal menghapus percakapan', 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(conversation.title);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <motion.div
        className={`conversation-item ${isActive ? 'active' : ''}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <button
          className="conversation-item-btn"
          onClick={() => !isEditing && onClick(conversation.id)}
          disabled={isEditing}
        >
          <div className="conversation-item-icon">
            <MessageSquare size={18} strokeWidth={1.5} />
          </div>

          <div className="conversation-item-content">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                className="conversation-edit-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                maxLength={80}
              />
            ) : (
              <>
                <div className="conversation-item-title" title={conversation.title}>
                  {conversation.title}
                </div>
                <div className="conversation-item-meta">
                  <span className="conversation-item-date">
                    {formatDate(conversation.updated_at || conversation.created_at)}
                  </span>
                </div>
              </>
            )}
          </div>
        </button>

        {/* Action buttons */}
        {!isEditing && (showActions || isActive) && (
          <div className="conversation-item-actions">
            <button
              className="conversation-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              aria-label="Rename conversation"
              title="Ganti nama"
            >
              <Edit2 size={14} />
            </button>
            <button
              className="conversation-action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation.id);
              }}
              aria-label="Delete conversation"
              title="Hapus percakapan"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {isEditing && (
          <div className="conversation-edit-actions">
            <button
              className="conversation-edit-btn save"
              onClick={handleRename}
              aria-label="Save"
              title="Simpan"
            >
              <Check size={14} />
            </button>
            <button
              className="conversation-edit-btn cancel"
              onClick={() => {
                setIsEditing(false);
                setEditTitle(conversation.title);
              }}
              aria-label="Cancel"
              title="Batal"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

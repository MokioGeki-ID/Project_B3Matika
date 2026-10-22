import { X, FileText, File, Image } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * AttachmentPreview - Show uploaded file preview before sending message
 * @param {Object} props
 * @param {Array} props.attachments - Array of attachment objects with {id, file_name, mime_type, size_bytes, preview_url}
 * @param {Function} props.onRemove - Callback to remove attachment (attachment_id)
 */
export default function AttachmentPreview({ attachments = [], onRemove }) {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <Image size={20} />;
    if (mimeType === 'application/pdf') return <FileText size={20} />;
    return <File size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="attachment-preview-container">
      {attachments.map((attachment) => {
        const isImage = attachment.mime_type.startsWith('image/');
        
        return (
          <motion.div
            key={attachment.id}
            className="attachment-preview-item"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <button
              className="attachment-remove-btn"
              onClick={() => onRemove(attachment.id)}
              aria-label={`Hapus ${attachment.file_name}`}
              type="button"
            >
              <X size={14} />
            </button>

            {isImage && attachment.preview_url ? (
              <div className="attachment-image-preview">
                <img 
                  src={attachment.preview_url} 
                  alt={attachment.file_name}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="attachment-file-icon">
                {getFileIcon(attachment.mime_type)}
              </div>
            )}

            <div className="attachment-info">
              <div className="attachment-name" title={attachment.file_name}>
                {attachment.file_name}
              </div>
              <div className="attachment-size">
                {formatFileSize(attachment.size_bytes)}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

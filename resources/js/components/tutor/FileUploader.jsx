import { useState, useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENTS = 3;
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

/**
 * FileUploader - Drag-drop and file picker with preview
 * @param {Object} props
 * @param {string} props.conversationId - Current conversation ID
 * @param {Array} props.attachments - Current attachments array
 * @param {Function} props.onAttachmentsChange - Callback when attachments change
 * @param {boolean} props.disabled - Disable uploader
 */
export default function FileUploader({ conversationId, attachments = [], onAttachmentsChange, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} terlalu besar. Maksimal 5MB.`;
    }

    // Check MIME type
    if (!ALLOWED_TYPES[file.type]) {
      return `Tipe file ${file.name} tidak didukung. Gunakan JPG, PNG, WebP, PDF, TXT, atau DOCX.`;
    }

    return null;
  };

  const uploadFile = async (file) => {
    setError(null);
    
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return null;
    }

    // Check max attachments
    if (attachments.length >= MAX_ATTACHMENTS) {
      setError(`Maksimal ${MAX_ATTACHMENTS} file per pesan.`);
      return null;
    }

    try {
      setUploading(true);

      // Step 1: Get signed upload URL
      const signedUrlResponse = await api.post('/api/tutor/uploads', {
        conversation_id: conversationId,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size
      });

      const { upload_url, attachment_id } = signedUrlResponse;

      // Step 2: Upload file directly to storage
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Gagal upload file ke storage.');
      }

      // Step 3: Create preview URL if image
      let preview_url = null;
      if (file.type.startsWith('image/')) {
        preview_url = URL.createObjectURL(file);
      }

      // Return attachment object
      return {
        id: attachment_id,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        preview_url
      };

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Gagal upload file. Coba lagi.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    
    // Upload files sequentially
    const newAttachments = [];
    for (const file of fileArray) {
      if (attachments.length + newAttachments.length >= MAX_ATTACHMENTS) {
        setError(`Maksimal ${MAX_ATTACHMENTS} file per pesan.`);
        break;
      }

      const attachment = await uploadFile(file);
      if (attachment) {
        newAttachments.push(attachment);
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleRemove = (attachmentId) => {
    const updated = attachments.filter(a => a.id !== attachmentId);
    onAttachmentsChange(updated);
    
    // Revoke object URL to free memory
    const removed = attachments.find(a => a.id === attachmentId);
    if (removed && removed.preview_url) {
      URL.revokeObjectURL(removed.preview_url);
    }
  };

  const openFilePicker = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="file-uploader">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.values(ALLOWED_TYPES).flat().join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled || uploading}
      />

      {/* Drag-drop zone */}
      <div
        className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFilePicker}
      >
        <Upload size={24} strokeWidth={1.5} />
        <p className="drop-zone-text">
          {uploading ? (
            'Uploading...'
          ) : isDragging ? (
            'Lepas file di sini'
          ) : (
            <>
              <strong>Klik atau drag file</strong>
              <span className="drop-zone-hint">
                JPG, PNG, PDF, DOCX (max 5MB)
              </span>
            </>
          )}
        </p>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="file-uploader-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
            <button
              className="error-close-btn"
              onClick={() => setError(null)}
              aria-label="Tutup pesan error"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="file-uploader-attachments">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-item">
              <button
                className="attachment-remove"
                onClick={() => handleRemove(attachment.id)}
                aria-label={`Hapus ${attachment.file_name}`}
                type="button"
              >
                <X size={14} />
              </button>

              {attachment.mime_type.startsWith('image/') && attachment.preview_url ? (
                <img
                  src={attachment.preview_url}
                  alt={attachment.file_name}
                  className="attachment-thumbnail"
                />
              ) : (
                <div className="attachment-file-icon">
                  <Upload size={20} />
                </div>
              )}

              <span className="attachment-filename" title={attachment.file_name}>
                {attachment.file_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

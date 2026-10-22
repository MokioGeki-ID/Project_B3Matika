import { User, Bot, Image as ImageIcon, FileText, File } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { parseAIResponse, highlightRecommendations } from '@/utils/aiResponseParser';
import MaterialCard from './MaterialCard';
import VideoCard from './VideoCard';

/**
 * MessageBubble - Display user or AI message with attachments and recommendations
 * @param {Object} props
 * @param {Object} props.message - Message object {id, role, content, meta, created_at, attachments}
 * @param {Array} props.topics - Available topics for material recommendations
 * @param {Array} props.videos - Available videos for recommendations
 */
export default function MessageBubble({ message, topics = [], videos = [] }) {
  const isUser = message.role === 'user';
  const { content, meta = {}, attachments = [] } = message;

  // Parse AI response for recommendations
  const { topicIds, videoCodes } = isUser ? { topicIds: [], videoCodes: [] } : parseAIResponse(content);

  // Highlight recommendations in text
  const highlightedContent = isUser ? content : highlightRecommendations(content);

  // Get file icon
  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={16} />;
    if (mimeType === 'application/pdf') return <FileText size={16} />;
    return <File size={16} />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get recommended topics
  const recommendedTopics = topicIds
    .map(id => topics.find(t => t.id === id))
    .filter(Boolean);

  // Get recommended videos
  const recommendedVideos = videoCodes
    .map(code => videos.find(v => v.code === code))
    .filter(Boolean);

  return (
    <motion.div 
      className={`message-bubble ${isUser ? 'message-user' : 'message-ai'}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`}>
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </div>

      {/* Content */}
      <div className="message-content">
        {/* Attachments (for user messages) */}
        {isUser && attachments && attachments.length > 0 && (
          <div className="message-attachments">
            {attachments.map((attachment) => {
              const isImage = attachment.mime_type.startsWith('image/');
              
              return (
                <div key={attachment.id} className="message-attachment">
                  {isImage && attachment.url ? (
                    <a 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="message-attachment-image"
                    >
                      <img 
                        src={attachment.url} 
                        alt={attachment.file_name}
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="message-attachment-file"
                    >
                      <div className="attachment-file-icon">
                        {getFileIcon(attachment.mime_type)}
                      </div>
                      <div className="attachment-file-info">
                        <div className="attachment-file-name" title={attachment.file_name}>
                          {attachment.file_name}
                        </div>
                        <div className="attachment-file-size">
                          {formatFileSize(attachment.size_bytes)}
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Text content */}
        <div className={`message-text ${isUser ? 'text-user' : 'text-ai'}`}>
          {isUser ? (
            <p>{content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: 'var(--navy)' }}>{children}</strong>,
                ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ol>,
                li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                code: ({ inline, children }) => inline
                  ? <code className="inline-code">{children}</code>
                  : <pre className="code-block"><code>{children}</code></pre>,
                blockquote: ({ children }) => <blockquote className="message-quote">{children}</blockquote>,
              }}
            >
              {highlightedContent}
            </ReactMarkdown>
          )}
        </div>

        {/* Material recommendations (only for AI messages) */}
        {!isUser && recommendedTopics.length > 0 && (
          <div className="message-recommendations">
            <div className="recommendations-label">📚 Materi yang Direkomendasikan:</div>
            <div className="recommendations-grid">
              {recommendedTopics.map((topic) => (
                <MaterialCard
                  key={topic.id}
                  topicId={topic.id}
                  title={topic.title}
                  grade={`Kelas ${topic.grade}`}
                  description={topic.description}
                />
              ))}
            </div>
          </div>
        )}

        {/* Video recommendations (only for AI messages) */}
        {!isUser && recommendedVideos.length > 0 && (
          <div className="message-recommendations">
            <div className="recommendations-label">🎥 Video Tutorial:</div>
            <div className="recommendations-grid">
              {recommendedVideos.map((video) => (
                <VideoCard
                  key={video.code}
                  videoCode={video.code}
                  title={video.title}
                  duration={video.duration}
                  youtubeUrl={video.url}
                  thumbnailUrl={video.thumbnail}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="message-timestamp">
        {new Date(message.created_at).toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </motion.div>
  );
}

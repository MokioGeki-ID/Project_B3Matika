import { Play, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * VideoCard - Display recommended video tutorial
 * @param {Object} props
 * @param {string} props.videoCode - Video code from AI (e.g., "V1", "V2")
 * @param {string} props.title - Video title
 * @param {string} props.duration - Video duration (e.g., "5:30")
 * @param {string} props.youtubeUrl - YouTube URL
 * @param {string} props.thumbnailUrl - YouTube thumbnail URL (optional)
 */
export default function VideoCard({ videoCode, title, duration, youtubeUrl, thumbnailUrl }) {
  // Extract YouTube video ID for thumbnail if not provided
  const getYouTubeThumbnail = (url) => {
    if (thumbnailUrl) return thumbnailUrl;
    
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    
    return null;
  };

  const thumbnail = getYouTubeThumbnail(youtubeUrl);

  return (
    <motion.div
      className="video-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <a 
        href={youtubeUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="video-card-link"
      >
        <div className="video-card-thumbnail">
          {thumbnail ? (
            <img src={thumbnail} alt={title} loading="lazy" />
          ) : (
            <div className="video-card-placeholder">
              <Play size={48} strokeWidth={1.5} />
            </div>
          )}
          <div className="video-card-play-overlay">
            <div className="video-play-button">
              <Play size={32} fill="white" />
            </div>
          </div>
        </div>

        <div className="video-card-content">
          <div className="video-card-header">
            <span className="video-card-code">{videoCode}</span>
            {duration && (
              <span className="video-card-duration">
                <Clock size={12} /> {duration}
              </span>
            )}
          </div>
          
          <h4 className="video-card-title">{title}</h4>
          
          <div className="video-card-footer">
            <span className="video-card-platform">YouTube</span>
            <ExternalLink size={14} />
          </div>
        </div>
      </a>
    </motion.div>
  );
}

import { Play, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  extractYouTubeId,
  normalizeYouTubeUrl,
  getYouTubeThumbnailWithFallbacks,
  isValidYouTubeUrl
} from '@/utils/youtubeHelper';

/**
 * VideoCard - Display recommended video tutorial with robust YouTube link handling
 * @param {Object} props
 * @param {string} props.videoCode - Video code from AI (e.g., "V1", "V2")
 * @param {string} props.title - Video title
 * @param {string} props.duration - Video duration (e.g., "5:30")
 * @param {string} props.youtubeUrl - YouTube URL
 * @param {string} props.thumbnailUrl - YouTube thumbnail URL (optional, will be generated if not provided)
 */
export default function VideoCard({ videoCode, title, duration, youtubeUrl, thumbnailUrl }) {
  const [currentThumbnail, setCurrentThumbnail] = useState(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailFallbacks, setThumbnailFallbacks] = useState([]);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  // Validate and normalize YouTube URL
  const videoId = extractYouTubeId(youtubeUrl);
  const normalizedUrl = normalizeYouTubeUrl(youtubeUrl);
  const isValid = isValidYouTubeUrl(youtubeUrl);

  // Initialize thumbnails on mount
  useEffect(() => {
    if (!isValid) {
      setThumbnailError(true);
      return;
    }

    // If custom thumbnail provided, use it first
    if (thumbnailUrl) {
      setCurrentThumbnail(thumbnailUrl);
      setThumbnailFallbacks(getYouTubeThumbnailWithFallbacks(youtubeUrl));
    } else {
      // Generate fallback chain
      const fallbacks = getYouTubeThumbnailWithFallbacks(youtubeUrl);
      setThumbnailFallbacks(fallbacks);
      setCurrentThumbnail(fallbacks[0]);
    }
  }, [youtubeUrl, thumbnailUrl, isValid]);

  // Handle thumbnail load error - try next fallback
  const handleThumbnailError = () => {
    const nextIndex = fallbackIndex + 1;
    
    if (nextIndex < thumbnailFallbacks.length) {
      setFallbackIndex(nextIndex);
      setCurrentThumbnail(thumbnailFallbacks[nextIndex]);
    } else {
      // All fallbacks failed
      setThumbnailError(true);
    }
  };

  // If URL is invalid, show error state
  if (!isValid) {
    return (
      <motion.div
        className="video-card video-card-error"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="video-card-error-content">
          <AlertCircle size={32} />
          <p className="video-card-error-title">URL Video Tidak Valid</p>
          <p className="video-card-error-url">{youtubeUrl}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="video-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <a 
        href={normalizedUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="video-card-link"
      >
        <div className="video-card-thumbnail">
          {!thumbnailError && currentThumbnail ? (
            <>
              <img 
                src={currentThumbnail} 
                alt={title} 
                loading="lazy"
                onError={handleThumbnailError}
              />
              <div className="video-card-play-overlay">
                <div className="video-play-button">
                  <Play size={32} fill="white" />
                </div>
              </div>
            </>
          ) : (
            <div className="video-card-placeholder">
              <Play size={48} strokeWidth={1.5} />
              <p className="video-card-placeholder-text">
                {thumbnailError ? 'Preview tidak tersedia' : 'Memuat...'}
              </p>
            </div>
          )}
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

import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

/**
 * VizBase - Base wrapper for all visualizations
 * Provides: responsive container, fullscreen modal, accessibility
 */
export default function VizBase({ title, caption, alt, children, className = '' }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
    }
  };

  return (
    <>
      {/* Normal view */}
      <figure className={`viz-container ${className}`}>
        <div className="viz-header">
          <figcaption className="viz-title">{title}</figcaption>
          <button
            className="viz-fullscreen-btn"
            onClick={() => setIsFullscreen(true)}
            aria-label="Perbesar gambar"
            title="Perbesar"
          >
            <Maximize2 size={16} />
          </button>
        </div>
        
        <div className="viz-content" role="img" aria-label={alt || title}>
          {children}
        </div>
        
        {caption && <figcaption className="viz-caption">{caption}</figcaption>}
      </figure>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div 
          className="viz-fullscreen-modal"
          onClick={() => setIsFullscreen(false)}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Visualisasi diperbesar"
        >
          <button
            className="viz-modal-close"
            onClick={() => setIsFullscreen(false)}
            aria-label="Tutup"
          >
            <X size={24} />
          </button>
          
          <div 
            className="viz-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="viz-modal-title">{title}</h3>
            <div className="viz-modal-viz">
              {children}
            </div>
            {caption && <p className="viz-modal-caption">{caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}

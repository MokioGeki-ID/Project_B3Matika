import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * ToneSwitch - Toggle between 'Baku' and 'Santai' tone
 * @param {Object} props
 * @param {string} props.tone - Current tone ('baku' or 'santai')
 * @param {Function} props.onChange - Callback when tone changes
 * @param {boolean} props.disabled - Disable the switch
 */
export default function ToneSwitch({ tone = 'baku', onChange, disabled = false }) {
  const [isChanging, setIsChanging] = useState(false);

  const handleToggle = async () => {
    if (disabled || isChanging) return;
    
    const newTone = tone === 'baku' ? 'santai' : 'baku';
    setIsChanging(true);
    
    try {
      await onChange(newTone);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="tone-switch-wrapper">
      <button
        onClick={handleToggle}
        disabled={disabled || isChanging}
        className={`tone-switch ${tone}`}
        aria-label={`Ganti nada ke ${tone === 'baku' ? 'santai' : 'baku'}`}
        title={tone === 'baku' ? 'Ganti ke bahasa santai' : 'Ganti ke bahasa baku'}
      >
        <motion.div
          className="tone-switch-slider"
          animate={{ x: tone === 'santai' ? '100%' : '0%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
        <span className={`tone-label ${tone === 'baku' ? 'active' : ''}`}>
          📚 Baku
        </span>
        <span className={`tone-label ${tone === 'santai' ? 'active' : ''}`}>
          😎 Santai
        </span>
      </button>
      {isChanging && (
        <span className="tone-changing-indicator">Mengubah...</span>
      )}
    </div>
  );
}

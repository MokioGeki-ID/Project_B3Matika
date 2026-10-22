import { motion } from 'framer-motion';

/**
 * TonePicker - Segmented control untuk memilih gaya jawaban
 * @param {Object} props
 * @param {string} props.tone - Current tone ('baku' atau 'santai')
 * @param {Function} props.onChange - Callback saat tone berubah
 * @param {boolean} props.disabled - Whether picker is disabled
 */
export default function TonePicker({ tone = 'baku', onChange, disabled = false }) {
  const options = [
    {
      value: 'baku',
      label: 'Formal',
      description: 'Bahasa baku dan ringkas',
    },
    {
      value: 'santai',
      label: 'Bersahabat',
      description: 'Bahasa santai dan ramah',
    },
  ];

  const handleChange = (newTone) => {
    if (!disabled && newTone !== tone && onChange) {
      onChange(newTone);
    }
  };

  return (
    <div className="tone-picker">
      <label className="tone-picker-label">Gaya Jawaban</label>
      
      <div className="tone-picker-control" role="radiogroup" aria-label="Pilih gaya jawaban">
        {options.map((option) => {
          const isActive = tone === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              className={`tone-option ${isActive ? 'active' : ''}`}
              onClick={() => handleChange(option.value)}
              disabled={disabled}
              role="radio"
              aria-checked={isActive}
              aria-label={option.label}
              title={option.description}
            >
              {isActive && (
                <motion.div
                  className="tone-option-bg"
                  layoutId="tone-active-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="tone-option-label">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tooltip hint */}
      <div className="tone-picker-hint">
        {tone === 'baku' ? 'Bahasa baku dan ringkas' : 'Bahasa santai dan ramah'}
      </div>
    </div>
  );
}

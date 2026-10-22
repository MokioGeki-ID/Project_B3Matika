import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

/**
 * ConversationSearch - Search bar untuk filter riwayat percakapan
 * @param {Object} props
 * @param {string} props.value - Current search query
 * @param {Function} props.onChange - Callback saat query berubah
 * @param {string} props.placeholder - Placeholder text
 */
export default function ConversationSearch({ 
  value = '', 
  onChange, 
  placeholder = 'Cari percakapan...' 
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const handleClear = () => {
    if (onChange) onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`conversation-search ${isFocused ? 'focused' : ''} ${value ? 'has-value' : ''}`}>
      <Search size={16} className="search-icon" />
      
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="Cari percakapan"
      />

      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={handleClear}
          aria-label="Hapus pencarian"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

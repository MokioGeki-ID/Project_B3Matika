import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Loader } from 'lucide-react';

/**
 * Bersihkan markdown dan LaTeX dari text untuk TTS
 * @param {string} text - Text dengan markdown dan LaTeX
 * @returns {string} Plain text untuk dibaca
 */
function cleanTextForSpeech(text) {
  if (!text) return '';

  let cleaned = text;

  // Hapus code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' kode program ');
  cleaned = cleaned.replace(/`[^`]+`/g, ' kode ');

  // Hapus LaTeX inline dan block
  cleaned = cleaned.replace(/\$\$[\s\S]*?\$\$/g, ' rumus ');
  cleaned = cleaned.replace(/\$[^$]+\$/g, ' rumus ');

  // Convert common LaTeX to readable text
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 per $2');
  cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, 'akar $1');
  cleaned = cleaned.replace(/\^2/g, ' kuadrat');
  cleaned = cleaned.replace(/\^3/g, ' kubik');
  cleaned = cleaned.replace(/\^(\d+)/g, ' pangkat $1');
  cleaned = cleaned.replace(/_(\d+)/g, ' indeks $1');

  // Hapus markdown formatting
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2'); // Bold
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2'); // Italic
  cleaned = cleaned.replace(/~~(.*?)~~/g, '$1'); // Strikethrough
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Links
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, 'gambar $1'); // Images

  // Hapus headers
  cleaned = cleaned.replace(/^#+\s+/gm, '');

  // Hapus bullet points
  cleaned = cleaned.replace(/^[\*\-\+]\s+/gm, '');
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '');

  // Hapus multiple newlines
  cleaned = cleaned.replace(/\n\s*\n/g, '. ');
  cleaned = cleaned.replace(/\n/g, ' ');

  // Hapus HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Convert symbols to words
  cleaned = cleaned.replace(/\+/g, ' tambah ');
  cleaned = cleaned.replace(/\-/g, ' kurang ');
  cleaned = cleaned.replace(/\*/g, ' kali ');
  cleaned = cleaned.replace(/\//g, ' bagi ');
  cleaned = cleaned.replace(/=/g, ' sama dengan ');
  cleaned = cleaned.replace(/</g, ' kurang dari ');
  cleaned = cleaned.replace(/>/g, ' lebih dari ');
  cleaned = cleaned.replace(/≤/g, ' kurang dari atau sama dengan ');
  cleaned = cleaned.replace(/≥/g, ' lebih dari atau sama dengan ');
  cleaned = cleaned.replace(/≠/g, ' tidak sama dengan ');
  cleaned = cleaned.replace(/π/g, ' pi ');
  cleaned = cleaned.replace(/∞/g, ' tak hingga ');

  // Hapus multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * VoiceOutput - Text-to-speech component using Web Speech API
 * @param {Object} props
 * @param {string} props.text - Text to read
 * @param {Function} props.onStart - Callback when speech starts
 * @param {Function} props.onEnd - Callback when speech ends
 * @param {Function} props.onError - Callback when error occurs
 */
export default function VoiceOutput({ text, onStart, onEnd, onError }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef(null);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
    }
  }, []);

  // Cleanup on unmount or when text changes
  useEffect(() => {
    return () => {
      handleStop();
    };
  }, [text]);

  const handlePlay = () => {
    if (!isSupported || !text) return;

    // Stop any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    try {
      // Clean text for speech
      const cleanedText = cleanTextForSpeech(text);
      
      if (!cleanedText) {
        if (onError) onError('Tidak ada teks yang dapat dibaca.');
        return;
      }

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'id-ID';
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsPlaying(true);
        if (onStart) onStart();
      };

      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        utteranceRef.current = null;
        
        let errorMessage = 'Gagal memutar suara.';
        
        switch (event.error) {
          case 'canceled':
            errorMessage = null; // User cancelled, not an error
            break;
          case 'interrupted':
            errorMessage = 'Pembacaan terganggu.';
            break;
          case 'audio-busy':
            errorMessage = 'Audio sedang digunakan. Coba lagi.';
            break;
          case 'network':
            errorMessage = 'Koneksi internet bermasalah.';
            break;
          case 'not-allowed':
            errorMessage = 'Izin audio ditolak oleh browser.';
            break;
        }

        if (errorMessage && onError) {
          onError(errorMessage);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

    } catch (err) {
      console.error('Failed to start speech:', err);
      setIsPlaying(false);
      if (onError) onError('Gagal memutar suara.');
    }
  };

  const handleStop = () => {
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      utteranceRef.current = null;
    } catch (err) {
      console.error('Failed to stop speech:', err);
    }
  };

  const handleToggle = () => {
    if (isPlaying) {
      handleStop();
    } else {
      handlePlay();
    }
  };

  if (!isSupported) {
    return (
      <button
        className="voice-output-btn disabled"
        disabled={true}
        title="Browser tidak mendukung text-to-speech"
        aria-label="Text-to-speech tidak tersedia"
      >
        <VolumeX size={16} />
      </button>
    );
  }

  return (
    <button
      className={`voice-output-btn ${isPlaying ? 'playing' : ''}`}
      onClick={handleToggle}
      title={isPlaying ? 'Berhenti' : 'Dengarkan'}
      aria-label={isPlaying ? 'Berhenti membaca' : 'Dengarkan pesan'}
    >
      {isPlaying ? (
        <Loader size={16} className="spin" />
      ) : (
        <Volume2 size={16} />
      )}
      <span className="voice-output-label">
        {isPlaying ? 'Berhenti' : 'Dengarkan'}
      </span>
    </button>
  );
}

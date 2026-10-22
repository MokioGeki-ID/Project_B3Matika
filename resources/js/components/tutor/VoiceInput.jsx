import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * VoiceInput - Speech recognition component using Web Speech API
 * @param {Object} props
 * @param {Function} props.onTranscript - Callback when transcript is received
 * @param {boolean} props.disabled - Whether recording is disabled
 * @param {Function} props.onError - Callback when error occurs
 */
export default function VoiceInput({ onTranscript, disabled = false, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Browser tidak mendukung speech recognition. Gunakan Chrome/Edge terbaru.');
      return;
    }

    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setElapsedTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final && onTranscript) {
        onTranscript(final);
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = 'Terjadi kesalahan saat merekam suara.';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Tidak ada suara terdeteksi. Coba lagi.';
          break;
        case 'audio-capture':
          errorMessage = 'Mikrofon tidak terdeteksi. Periksa perangkat Anda.';
          break;
        case 'not-allowed':
          errorMessage = 'Akses mikrofon ditolak. Izinkan akses di pengaturan browser.';
          break;
        case 'network':
          errorMessage = 'Koneksi internet bermasalah.';
          break;
        case 'aborted':
          // User stopped, not an error
          errorMessage = null;
          break;
      }

      if (errorMessage) {
        setError(errorMessage);
        if (onError) onError(errorMessage);
      }

      handleStop();
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onTranscript, onError]);

  const handleStart = () => {
    if (!isSupported || disabled) return;

    try {
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start();
      }
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Gagal memulai rekaman. Coba lagi.');
    }
  };

  const handleStop = () => {
    try {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    } catch (err) {
      console.error('Failed to stop recognition:', err);
    }
  };

  const handleToggle = () => {
    if (isListening) {
      handleStop();
    } else {
      handleStart();
    }
  };

  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        className="voice-input-btn disabled"
        disabled={true}
        title="Browser tidak mendukung speech recognition"
        aria-label="Speech recognition tidak tersedia"
      >
        <MicOff size={20} />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`voice-input-btn ${isListening ? 'listening' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        title={isListening ? 'Berhenti merekam' : 'Mulai merekam suara'}
        aria-label={isListening ? 'Berhenti merekam' : 'Mulai merekam suara'}
      >
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Mic size={20} />
          </motion.div>
        ) : (
          <Mic size={20} />
        )}
      </button>

      {/* Listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            className="voice-listening-indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="listening-indicator-content">
              <div className="listening-wave">
                <motion.div
                  className="wave-bar"
                  animate={{ scaleY: [1, 1.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="wave-bar"
                  animate={{ scaleY: [1, 2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div
                  className="wave-bar"
                  animate={{ scaleY: [1, 1.5, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
              <span className="listening-text">Mendengarkan...</span>
              <span className="listening-time">{formatTime(elapsedTime)}</span>
            </div>
            
            {interimTranscript && (
              <div className="listening-transcript">
                <span className="transcript-label">Terdeteksi:</span>
                <span className="transcript-text">{interimTranscript}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && !isListening && (
        <div className="voice-error-message">
          {error}
        </div>
      )}
    </>
  );
}

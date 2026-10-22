import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, User, MessageSquare, Gamepad2, GraduationCap, School, Landmark, Lightbulb, Send, BookOpen, Puzzle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { parseVoiceCommand } from '@/utils/voiceCommandParser';
import VoiceButton from '@/components/VoiceButton';

const QUICK_PROMPTS = [
  { label: '📐 Materi SD', text: 'Saya ingin belajar materi matematika SD kelas 4 tentang pecahan' },
  { label: '📏 Materi SMP', text: 'Jelaskan Teorema Pythagoras untuk kelas 8 SMP' },
  { label: '📊 Materi SMA', text: 'Ajari saya tentang turunan fungsi untuk kelas 11 SMA' },
  { label: 'Main Teka-teki', text: 'Ayo bermain teka-teki matematika! Saya mau yang tingkat sederhana' },
  { label: '🔢 Cryptarithm', text: 'Buatkan soal Cryptarithm dasar yang baru untuk saya coba' },
  { label: '🎯 Sudoku Mini', text: 'Saya ingin bermain Sudoku Mini 4x4, tolong buatkan soalnya' },
];


function TypingIndicator() {
  return (
    <motion.div 
      className="chat-bubble chat-bubble-ai"
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
    >
      <div className="chat-avatar chat-avatar-ai" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={20} /></div>
      <div className="chat-msg-body">
        <div className="typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </motion.div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div 
      className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {!isUser && <div className="chat-avatar chat-avatar-ai" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={20} /></div>}
      <div className="chat-msg-body">
        {isUser ? (
          <div className="chat-msg-text chat-user-text">{msg.parts[0].text}</div>
        ) : (
          <div className="chat-msg-text chat-ai-text">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: 'var(--navy)' }}>{children}</strong>,
                ul: ({ children }) => <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>,
                li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
                code: ({ inline, children }) => inline
                  ? <code className="inline-code">{children}</code>
                  : <pre className="materi-code-block"><code>{children}</code></pre>,
              }}
            >
              {msg.parts[0].text}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && <div className="chat-avatar chat-avatar-user" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} /></div>}
    </motion.div>
  );
}

export default function TutorChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appStatus, setAppStatus] = useState('idle'); // idle, listening, processing, speaking
  const [currentLang, setCurrentLang] = useState('id-ID');
  const [apiStatus, setApiStatus] = useState('Menghubungkan'); // Online, Menghubungkan, Tidak tersedia
  const abortControllerRef = useRef(null);

  const { 
    isSupported: isTtsSupported, 
    speak, 
    stop: stopSpeaking, 
    isMuted, 
    toggleMute, 
    setRate 
  } = useSpeechSynthesis(currentLang);

  const handleFinalTranscript = async (transcript) => {
    const command = parseVoiceCommand(transcript);
    
    if (command) {
      handleCommand(command.type);
      return;
    }

    sendMessage(transcript);
  };

  const { 
    isSupported: isSttSupported, 
    isListening, 
    interimTranscript, 
    errorMessage, 
    startListening, 
    stopListening 
  } = useSpeechRecognition({
    lang: currentLang,
    onFinalTranscript: handleFinalTranscript,
    onError: () => setAppStatus('idle')
  });

  useEffect(() => {
    if (isListening) setAppStatus('listening');
    else if (appStatus === 'listening') setAppStatus('idle');
  }, [isListening, appStatus]);

  const handleCommand = (type) => {
    switch (type) {
      case 'REPEAT':
        const lastAiMessage = [...messages].reverse().find(m => m.role === 'model');
        if (lastAiMessage) speak(lastAiMessage.parts[0].text);
        break;
      case 'SLOWER':
        setRate(0.8);
        speak("Baik, saya akan bicara lebih pelan.");
        break;
      case 'STOP_SPEAKING':
        stopSpeaking();
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setLoading(false);
          setAppStatus('idle');
        }
        break;
      case 'CLEAR_CHAT':
        setMessages([]);
        break;
      case 'NEXT_TOPIC':
        sendMessage('Mari kita lanjut ke materi berikutnya.');
        break;
      default:
        break;
    }
    setAppStatus('idle');
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      if (appStatus === 'speaking') {
         stopSpeaking();
      }
      startListening();
    }
  };

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const hasInteracted = useRef(false);

  const scrollToBottom = () => {
    if (!hasInteracted.current) return;
    const scrollContainer = document.querySelector('.chat-messages-area');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/chat?health=1');
        if (res.ok) setApiStatus('Online');
        else setApiStatus('Tidak tersedia');
      } catch (err) {
        setApiStatus('Tidak tersedia');
      }
    };
    checkHealth();

    const fetchHistory = async () => {
      const defaultGreeting = {
        role: 'model',
        parts: [{ text: `Halo ${user ? user.name : 'Siswa'}! 👋 Saya **MathTutor AI** — tutor matematika dan *Game Master* teka-teki logikamu.\n\nAku bisa membantu kamu dengan:\n- 📚 **Belajar materi** matematika SD, SMP, hingga SMA/SMK\n- **Bermain teka-teki** seperti Cryptarithm, Math Riddles, Sudoku Mini, dan lainnya\n- 💡 **Memandu penyelesaian soal** langkah demi langkah\n\nMau mulai dari mana? Pilih topik di bawah atau ketik pertanyaanmu!` }]
      };

      if (!user) {
        setMessages([defaultGreeting]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        setMessages([defaultGreeting]);
      } else {
        const history = data.map(row => ({
          role: row.role,
          parts: [{ text: row.text }]
        }));
        setMessages([defaultGreeting, ...history]);
      }
      setLoading(false);
    };

    fetchHistory();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [user]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    hasInteracted.current = true;
    const userMsg = { role: 'user', parts: [{ text }] };
    const newMessages = [...messages, userMsg];
    // Tambahkan placeholder AI message kosong
    setMessages([...newMessages, { role: 'model', parts: [{ text: '' }] }]);
    setInput('');
    setLoading(true);
    setAppStatus('processing');

    if (user) {
      // Background save user message (jangan di-await)
      supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'user',
        text: text
      }).then();
    }

    try {
      const historyToSend = newMessages
        .filter(m => !m.parts[0].text.startsWith('⚠️') && !m.isError)
        .slice(-12);

      while (historyToSend.length > 0 && historyToSend[0].role === 'model') {
        historyToSend.shift();
      }

      const token = localStorage.getItem('b3_token');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: historyToSend }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch(e) {}
        throw new Error(errData?.error || 'Gagal terhubung ke AI Tutor.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                   throw new Error(parsed.error);
                }
                if (parsed.text) {
                  fullText += parsed.text;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'model', parts: [{ text: fullText }] };
                    return updated;
                  });
                }
              } catch (e) {}
            }
          }
        }
        done = readerDone;
      }

      if (user && fullText) {
        supabase.from('chat_messages').insert({
          user_id: user.id,
          role: 'model',
          text: fullText
        }).then();
      }
      
      if (fullText) {
        setAppStatus('speaking');
        speak(fullText);
      } else {
         setAppStatus('idle');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      const errText = err?.message && err.message !== 'Terjadi kesalahan.'
        ? `⚠️ ${err.message}`
        : '⚠️ Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi dalam beberapa saat.';
      
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'model', parts: [{ text: errText }], isError: true };
        return updated;
      });
      setAppStatus('idle');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div className="page tutor-page-wrap">
      {/* ===== CHAT SECTION — mengisi sisa tinggi layar ===== */}
      <div className="tutor-chat-page">

        {/* Header */}
        <div className="tutor-header">
          <div className="tutor-header-left">
            <div className="tutor-avatar-large" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={40} /></div>
            <div>
              <h1 className="tutor-title">MathTutor AI</h1>
              <p className="tutor-subtitle">Tutor Matematika &amp; Game Master Teka-teki Logika</p>
            </div>
          </div>
          <div className="tutor-status">
            <span className={`status-dot ${apiStatus === 'Online' ? '' : apiStatus === 'Menghubungkan' ? 'status-connecting' : 'status-offline'}`} />
            <span className="status-text">{apiStatus}</span>
          </div>
        </div>

        {/* Skills Strip */}
        <div className="tutor-skills-strip">
          <span className="skill-pill skill-sd"><School size={16} /> Materi SD</span>
          <span className="skill-pill skill-smp"><Landmark size={16} /> Materi SMP</span>
          <span className="skill-pill skill-sma"><GraduationCap size={16} /> Materi SMA</span>
          <span className="skill-pill skill-game"><Gamepad2 size={16} /> Game Teka-teki</span>
          <span className="skill-pill skill-guide"><Lightbulb size={16} /> Panduan Soal</span>
          <span className="skill-pill skill-eval"><BookOpen size={16} /> Evaluasi &amp; Koreksi</span>
        </div>

        {/* Quick prompts */}
        <div className="quick-prompts">
          <p className="quick-label">💬 Mulai dari sini:</p>
          <div className="quick-prompts-grid">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} className="quick-prompt-btn" onClick={() => sendMessage(p.text)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat window — flex:1, messages scroll di sini */}
        <div className="chat-window">
          <div className="chat-messages-area">
            {messages.map((msg, i) => {
              if (msg.role === 'model' && msg.parts[0].text === '' && loading) {
                 return <TypingIndicator key={i} />;
              }
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                   <ChatMessage msg={msg} />
                   {msg.isError && (
                     <div style={{ textAlign: 'center', marginTop: '-8px', marginBottom: '16px' }}>
                       <button 
                         onClick={() => {
                           const lastUserIndex = messages.findLastIndex((m, idx) => m.role === 'user' && idx < i);
                           if (lastUserIndex !== -1) sendMessage(messages[lastUserIndex].parts[0].text);
                         }}
                         style={{ 
                           background: 'var(--red, #ef4444)', color: '#fff', border: 'none', 
                           padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px'
                         }}
                       >
                         Coba lagi
                       </button>
                     </div>
                   )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Status Bar VUI */}
          <div style={{ minHeight: '24px', padding: '0 16px', fontSize: '14px', marginBottom: '8px' }}>
            {errorMessage ? (
               <span style={{ color: 'var(--red, red)' }}>{errorMessage}</span>
            ) : isListening && interimTranscript ? (
               <span style={{ fontStyle: 'italic', color: '#666' }}>Mendengar: "{interimTranscript}"...</span>
            ) : appStatus === 'processing' ? (
               <span style={{ color: '#f59e0b' }}>AI sedang berpikir...</span>
            ) : null}
          </div>

          {/* Input — selalu menempel di bawah */}
          <form className="chat-input-form" style={{ display: 'flex', gap: '10px', alignItems: 'center' }} onSubmit={handleSubmit}>
            {isSttSupported && isTtsSupported && (
              <VoiceButton 
                status={appStatus}
                onClick={handleMicClick}
                isMuted={isMuted}
                onToggleMute={toggleMute}
              />
            )}
            
            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="Tanyakan materi, minta soal latihan, atau ajak bermain teka-teki…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                style={{ flex: 1, resize: 'none' }}
              />
              <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()} aria-label="Kirim">
                <span className="send-icon" style={{ display: 'flex' }}><Send size={18} /></span>
              </button>
            </div>
          </form>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', alignItems: 'center' }}>
            <p className="chat-hint">Enter = kirim · Shift+Enter = baris baru</p>
            {isSttSupported && (
              <select 
                 value={currentLang} 
                 onChange={(e) => setCurrentLang(e.target.value)} 
                 style={{ fontSize: '12px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }}
                 aria-label="Pilih Bahasa"
              >
                <option value="id-ID">ID</option>
                <option value="en-US">EN</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Info cards — di bawah chat, bisa diakses dengan scroll halaman */}
      <div className="tutor-info-grid" style={{ marginTop: '24px' }}>
        <div className="tutor-info-card">
          <div className="info-icon"><BookOpen size={32} strokeWidth={1.5} /></div>
          <h3>Materi Lengkap</h3>
          <p>Penjelasan konsep, rumus, contoh soal bertahap, dan analogi dunia nyata untuk setiap topik.</p>
        </div>
        <div className="tutor-info-card">
          <div className="info-icon"><Puzzle size={32} strokeWidth={1.5} /></div>
          <h3>Teka-teki Interaktif</h3>
          <p>Bermain Cryptarithm, Math Riddles, KenKen, Sudoku Mini, dan Calculords secara percakapan.</p>
        </div>
        <div className="tutor-info-card">
          <div className="info-icon"><GraduationCap size={32} strokeWidth={1.5} /></div>
          <h3>Pembimbing Sabar</h3>
          <p>Tidak pernah langsung memberi jawaban. Memandu dengan petunjuk agar kamu bisa menemukan sendiri.</p>
        </div>
      </div>
    </div>
  );
}

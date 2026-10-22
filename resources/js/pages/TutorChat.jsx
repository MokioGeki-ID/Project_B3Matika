import { useState, useRef, useEffect } from 'react';
import { Menu, Send, Paperclip, X, Loader } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  ConversationSidebar,
  ConversationDrawer,
  MessageBubble,
  TypingIndicator,
  FileUploader,
  AttachmentPreview
} from '@/components/tutor';

export default function TutorChat() {
  const { user } = useAuth();
  
  // Conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  
  // Messages state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // checking, online, offline
  
  // Material & video catalogs (loaded from topics table)
  const [topics, setTopics] = useState([]);
  const [videos, setVideos] = useState([]);
  
  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/chat?health=1');
        if (res.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (err) {
        setApiStatus('offline');
      }
    };
    checkHealth();
  }, []);

  // Load topics catalog for material recommendations (graceful fallback)
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await api.get('/topics');
        setTopics(response.topics || []);
      } catch (err) {
        // Endpoint mungkin belum ada, abaikan error ini
        console.warn('Topics endpoint not available:', err.message);
      }
    };
    loadTopics();
  }, []);

  // Load videos for active conversation's topic
  useEffect(() => {
    const loadVideos = async () => {
      if (!activeConversation?.topic_id) {
        setVideos([]);
        return;
      }

      try {
        const response = await api.get(`/topics/${activeConversation.topic_id}/videos`);
        setVideos(response.videos || []);
      } catch (err) {
        console.warn('Videos endpoint not available:', err.message);
        setVideos([]);
      }
    };
    loadVideos();
  }, [activeConversation?.topic_id]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    loadMessages();
  }, [activeConversationId]);

  const loadMessages = async () => {
    if (!activeConversationId) return;

    try {
      setLoading(true);
      
      const response = await api.get(`/tutor/${activeConversationId}/messages`);
      setMessages(response.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conversationId) => {
    setActiveConversationId(conversationId);
    
    // Load conversation details dari local state jika ada
    try {
      const convResponse = await api.get('/tutor/conversations');
      const conv = (convResponse.conversations || []).find(c => c.id === conversationId);
      if (conv) setActiveConversation(conv);
    } catch (err) {
      console.warn('Error loading conversation details:', err);
    }
  };

  const handleConversationCreated = (conversation) => {
    setActiveConversationId(conversation.id);
    setActiveConversation(conversation);
    setMessages([]);
  };

  const handleToneChange = async (newTone) => {
    if (!activeConversationId) return;

    try {
      await api.patch(`/tutor/conversations/${activeConversationId}`, {
        tone: newTone
      });

      // Update local state
      setActiveConversation(prev => ({ ...prev, tone: newTone }));
    } catch (err) {
      console.error('Error changing tone:', err);
      alert('Gagal mengubah nada bahasa');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming || !activeConversationId) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage = input.trim();
    const attachmentIds = attachments.map(a => a.id);

    // Clear input and attachments immediately
    setInput('');
    setAttachments([]);
    setShowUploader(false);

    // Add user message to UI
    const userMsg = {
      id: Date.now(), // Temporary ID
      role: 'user',
      content: userMessage,
      attachments: attachments,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    // Add empty AI message placeholder
    const aiMsgId = Date.now() + 1;
    const aiMsg = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      meta: {},
      attachments: [],
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, aiMsg]);

    try {
      // Call chat API with SSE streaming
      const token = localStorage.getItem('b3_token');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          user_message: userMessage,
          attachments: attachmentIds
        }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        let errData;
        try { errData = await res.json(); } catch(e) {}
        throw new Error(errData?.error || 'Gagal terhubung ke AI Tutor.');
      }

      // Read SSE stream
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
                  
                  // Update AI message in real-time
                  setMessages(prev => {
                    const updated = [...prev];
                    const aiMsgIndex = updated.findIndex(m => m.id === aiMsgId);
                    if (aiMsgIndex !== -1) {
                      updated[aiMsgIndex] = {
                        ...updated[aiMsgIndex],
                        content: fullText
                      };
                    }
                    return updated;
                  });
                }
                
                if (parsed.done) {
                  done = true;
                  break;
                }
              } catch (e) {
                if (e.message && !e.message.includes('JSON')) {
                  throw e; // Re-throw application errors, not JSON parse errors
                }
              }
            }
          }
        }
        done = done || readerDone;
      }

      // Reload messages to get actual saved messages with IDs from database
      await loadMessages();

    } catch (err) {
      if (err.name === 'AbortError') return;
      
      console.error('Error sending message:', err);
      
      const errText = err?.message || 'Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi dalam beberapa saat.';
      
      // Update AI message with error
      setMessages(prev => {
        const updated = [...prev];
        const aiMsgIndex = updated.findIndex(m => m.id === aiMsgId);
        if (aiMsgIndex !== -1) {
          updated[aiMsgIndex] = {
            ...updated[aiMsgIndex],
            content: `⚠️ ${errText}`,
            isError: true
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleAttachmentsChange = (newAttachments) => {
    setAttachments(newAttachments);
  };

  // Welcome screen when no conversation selected
  if (!activeConversationId) {
    return (
      <div className="tutor-chat-container">
        <ConversationDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeConversationId={activeConversationId}
          activeTone={activeConversation?.tone || 'baku'}
          onSelectConversation={handleSelectConversation}
          onConversationCreated={handleConversationCreated}
          onToneChange={handleToneChange}
        />

        <ConversationSidebar
          activeConversationId={activeConversationId}
          activeTone={activeConversation?.tone || 'baku'}
          onSelectConversation={handleSelectConversation}
          onConversationCreated={handleConversationCreated}
          onToneChange={handleToneChange}
        />

        <main className="tutor-chat-main">
          <div className="tutor-welcome">
            <button 
              className="mobile-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={24} />
            </button>

            <div className="welcome-content">
              <div className="welcome-logo">
                <img src="/images/ai-tutor-mascot.jpg" alt="AI Tutor B3Matika" className="tutor-mascot-img" />
              </div>
              <h1>Selamat Datang di AI Tutor B3Matika!</h1>
              <p className="welcome-subtitle">
                Tutor Matematika dan Game Master Teka-teki Logika
              </p>
              <p className="welcome-description">
                Saya siap membantu kamu belajar matematika dari SD hingga SMA/SMK,
                bermain teka-teki logika, dan memandu penyelesaian soal step-by-step.
              </p>
              <button 
                className="welcome-cta-btn"
                onClick={() => setDrawerOpen(true)}
              >
                Mulai Percakapan Baru
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="tutor-chat-container">
      <ConversationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeConversationId={activeConversationId}
        activeTone={activeConversation?.tone || 'baku'}
        onSelectConversation={handleSelectConversation}
        onConversationCreated={handleConversationCreated}
        onToneChange={handleToneChange}
      />

      <ConversationSidebar
        activeConversationId={activeConversationId}
        activeTone={activeConversation?.tone || 'baku'}
        onSelectConversation={handleSelectConversation}
        onConversationCreated={handleConversationCreated}
        onToneChange={handleToneChange}
      />

      <main className="tutor-chat-main">
        {/* Header */}
        <header className="tutor-chat-header">
          <button 
            className="mobile-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={24} />
          </button>

          <div className="header-info">
            <div className="header-avatar">
              {/* Logo B3Matika kecil di header chat */}
              <img src="/images/ai-tutor-mascot.jpg" alt="AI Tutor" className="tutor-mascot-img" style={{width: 28, height: 28, borderRadius: '8px'}} />
            </div>
            <div className="header-text">
              <h2 className="header-title">
                {activeConversation?.title || 'AI Tutor'}
              </h2>
              <div className="header-status">
                <span className={`status-dot ${apiStatus === 'online' ? 'online' : apiStatus === 'checking' ? 'checking' : 'offline'}`} />
                <span className="status-text">
                  {apiStatus === 'online' ? 'Online' : apiStatus === 'checking' ? 'Menghubungkan' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Messages area */}
        <div className="tutor-chat-messages">
          {loading && messages.length === 0 ? (
            <div className="messages-loading">
              <Loader size={32} className="spin" />
              <p>Memuat pesan...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="messages-empty">
            <img src="/images/ai-tutor-mascot.jpg" alt="AI Tutor B3Matika" className="tutor-mascot-img" style={{width:64,height:64}} />
              <p>Mulai percakapan dengan mengirim pesan pertama!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  topics={topics}
                  videos={videos}
                />
              ))}
              {streaming && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="tutor-chat-input-area">
          {/* File uploader (expandable) */}
          {showUploader && (
            <div className="input-uploader-panel">
              <div className="uploader-header">
                <h3>Lampirkan File</h3>
                <button
                  className="uploader-close-btn"
                  onClick={() => setShowUploader(false)}
                  aria-label="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
              <FileUploader
                conversationId={activeConversationId}
                attachments={attachments}
                onAttachmentsChange={handleAttachmentsChange}
                disabled={streaming}
              />
            </div>
          )}

          {/* Attachment preview (if any) */}
          <AttachmentPreview
            attachments={attachments}
            onRemove={(id) => {
              setAttachments(prev => prev.filter(a => a.id !== id));
            }}
          />

          {/* Input form */}
          <form className="tutor-chat-input-form" onSubmit={handleSubmit}>
            <button
              type="button"
              className="input-attach-btn"
              onClick={() => setShowUploader(!showUploader)}
              disabled={streaming}
              aria-label="Lampirkan file"
              title="Lampirkan gambar, PDF, atau dokumen"
            >
              <Paperclip size={20} />
              {attachments.length > 0 && (
                <span className="attach-badge">{attachments.length}</span>
              )}
            </button>

            <textarea
              ref={textareaRef}
              className="input-textarea"
              placeholder={streaming ? "AI sedang mengetik..." : "Tanyakan materi, minta soal latihan, atau ajak bermain teka-teki…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              rows={1}
              maxLength={4000}
            />

            <button
              type="submit"
              className="input-send-btn"
              disabled={streaming || !input.trim()}
              aria-label="Kirim pesan"
            >
              {streaming ? (
                <Loader size={20} className="spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>

          <div className="input-hint">
            <span>Enter = kirim · Shift+Enter = baris baru</span>
            <span className="input-char-count">
              {input.length}/4000
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

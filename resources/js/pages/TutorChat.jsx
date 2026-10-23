import { useState, useRef, useEffect } from 'react';
import { Menu, Send, Paperclip, X, Loader } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import {
  ConversationSidebar,
  ConversationDrawer,
  MessageBubble,
  TypingIndicator,
  SkeletonLoader,
  FileUploader,
  AttachmentPreview,
  WelcomeState,
  Toast,
  VoiceInput,
  ScrollToBottom
} from '@/components/tutor';
import {
  getActiveConversation,
  saveActiveConversation,
  setDraftState,
  isDraftState,
  clearActiveConversation,
  getDraftInput,
  saveDraftInput,
  clearDraftInput,
  clearTutorSession
} from '@/utils/sessionStorage';

export default function TutorChat() {
  const { user } = useAuth();
  
  // Conversation state
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  
  // Messages state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Material & video catalogs
  const [topics, setTopics] = useState([]);
  const [videos, setVideos] = useState([]);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  // Voice handlers
  const handleVoiceTranscript = (transcript) => {
    // Append transcript to input
    setInput(prev => {
      const newText = prev ? `${prev} ${transcript}` : transcript;
      return newText.trim();
    });
  };

  const handleVoiceError = (error) => {
    showToast(error, 'error');
  };

  // Initialize: restore session or start draft
  useEffect(() => {
    if (!user?.id) return;

    const savedState = getActiveConversation(user.id);
    
    if (savedState === 'draft') {
      // Restore draft state
      setIsDraft(true);
      setActiveConversationId(null);
      setMessages([]);
      
      // Restore draft input if any
      const draftText = getDraftInput(user.id);
      if (draftText) {
        setInput(draftText);
      }
    } else if (savedState) {
      // Try to load saved conversation
      loadConversation(savedState);
    } else {
      // Start with draft (new conversation state)
      handleNewDraft();
    }
  }, [user?.id]);

  // Load conversation by ID
  const loadConversation = async (conversationId, forceReload = false) => {
    try {
      setLoading(true);
      
      // Load conversation details
      const convResponse = await api.get(`/tutor/conversations/${conversationId}`);
      
      if (!convResponse.conversation) {
        // Conversation not found or not owned by user
        clearActiveConversation(user.id);
        handleNewDraft();
        return;
      }

      setActiveConversation(convResponse.conversation);
      setActiveConversationId(conversationId);
      setIsDraft(false);
      
      // Save to session
      saveActiveConversation(user.id, conversationId);
      
      // Load messages
      console.log(`📥 Loading messages for conversation ${conversationId}...`);
      const msgResponse = await api.get(`/tutor/${conversationId}/messages`);
      
      if (msgResponse.messages) {
        console.log(`✅ Loaded ${msgResponse.messages.length} messages`);
        setMessages(msgResponse.messages);
      } else {
        console.warn('⚠️ No messages in response');
        setMessages([]);
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
      
      // If 404 or forbidden, clear and start fresh
      if (err.status === 404 || err.status === 403) {
        clearActiveConversation(user.id);
        handleNewDraft();
      } else {
        showToast('Gagal memuat percakapan', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Start new draft conversation (not saved to DB yet)
  const handleNewDraft = () => {
    setIsDraft(true);
    setActiveConversationId(null);
    setActiveConversation(null);
    setMessages([]);
    setInput('');
    setAttachments([]);
    
    // Save draft state to session
    if (user?.id) {
      setDraftState(user.id);
      clearDraftInput(user.id);
    }
  };

  // Handle conversation selection from sidebar
  const handleSelectConversation = async (conversationId) => {
    if (conversationId === activeConversationId && !isDraft) {
      // Already on this conversation
      return;
    }

    await loadConversation(conversationId);
  };

  // Handle "New Conversation" button
  const handleConversationCreated = (result) => {
    if (result === 'draft') {
      // Don't create new draft if already in draft
      if (isDraft) return;
      
      handleNewDraft();
    } else if (result?.id) {
      // Actual conversation created
      loadConversation(result.id);
    }
  };

  // Handle conversation deleted
  const handleConversationDeleted = (deletedId) => {
    if (deletedId === activeConversationId) {
      // Active conversation was deleted, go to draft
      handleNewDraft();
    }
  };

  // Handle tone change
  const handleToneChange = async (newTone) => {
    if (!activeConversationId || isDraft) return;

    try {
      await api.patch(`/tutor/conversations/${activeConversationId}`, {
        tone: newTone
      });

      setActiveConversation(prev => ({ ...prev, tone: newTone }));
      showToast('Gaya jawaban berhasil diubah', 'success');
    } catch (err) {
      console.error('Error changing tone:', err);
      showToast('Gagal mengubah gaya jawaban', 'error');
    }
  };

  // Load topics catalog
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await api.get('/topics');
        setTopics(response.topics || []);
      } catch (err) {
        console.warn('Topics endpoint not available:', err.message);
      }
    };
    loadTopics();
  }, []);

  // Load videos for active topic
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

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming]);

  // Track scroll position to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Show button if user scrolled up more than 300px from bottom
      setShowScrollButton(distanceFromBottom > 300);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Save draft input to session storage
  useEffect(() => {
    if (isDraft && user?.id && input) {
      saveDraftInput(user.id, input);
    }
  }, [input, isDraft, user?.id]);

  // Clear session on logout
  useEffect(() => {
    if (!user) {
      clearTutorSession(user?.id);
    }
  }, [user]);

  // Send message
  const sendMessage = async (messageText = null) => {
    const textToSend = messageText || input.trim();
    
    if (!textToSend || streaming) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const attachmentIds = attachments.map(a => a.id);
    let conversationId = activeConversationId;

    // If in draft mode, create conversation first
    if (isDraft) {
      try {
        const createResponse = await api.post('/tutor/conversations', {
          title: 'Percakapan Baru', // Temporary title, will be updated after first AI response
          tone: 'baku'
        });

        conversationId = createResponse.conversation.id;
        setActiveConversationId(conversationId);
        setActiveConversation(createResponse.conversation);
        setIsDraft(false);
        
        // Save to session
        if (user?.id) {
          saveActiveConversation(user.id, conversationId);
          clearDraftInput(user.id);
        }
      } catch (err) {
        console.error('Error creating conversation:', err);
        showToast('Gagal membuat percakapan', 'error');
        return;
      }
    }

    // Clear input and attachments immediately
    setInput('');
    setAttachments([]);
    setShowUploader(false);

    // Add user message to UI
    const userMsg = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      content: textToSend,
      attachments: attachments,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    // Add empty AI message placeholder with streaming indicator
    const aiMsgId = 'temp-ai-' + Date.now();
    const aiMsg = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      meta: { isStreaming: true }, // Marker for streaming state
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
          conversation_id: conversationId,
          user_message: textToSend,
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
                  throw e;
                }
              }
            }
          }
        }
        done = done || readerDone;
      }

      // Reload conversation to get updated title (if first message)
      if (messages.length === 0) {
        try {
          const convResponse = await api.get(`/tutor/conversations/${conversationId}`);
          if (convResponse.conversation) {
            setActiveConversation(convResponse.conversation);
          }
        } catch (err) {
          console.warn('Failed to reload conversation:', err);
        }
      }

      // Reload messages to get actual saved messages with real IDs and attachments
      try {
        console.log(`📥 Reloading messages for conversation ${conversationId}...`);
        const msgResponse = await api.get(`/tutor/${conversationId}/messages`);
        
        if (msgResponse.messages && msgResponse.messages.length > 0) {
          console.log(`✅ Loaded ${msgResponse.messages.length} messages`);
          setMessages(msgResponse.messages);
        } else {
          console.warn('⚠️ No messages returned from API, keeping local state');
        }
      } catch (err) {
        console.error('❌ Failed to reload messages:', err);
        // Keep optimistic UI if reload fails
      }

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
      
      showToast('Gagal mengirim pesan', 'error');
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

  // Handle suggestion click from welcome state
  const handleSuggestionClick = (text) => {
    setInput(text);
    // Focus textarea after setting input
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Calculate character count percentage for warning
  const charCount = input.length;
  const charMax = 4000;
  const charPercent = (charCount / charMax) * 100;

  // Main render
  return (
    <div className="tutor-chat-container">
      <ConversationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeConversationId={activeConversationId}
        activeTone={activeConversation?.tone || 'baku'}
        onSelectConversation={handleSelectConversation}
        onConversationCreated={handleConversationCreated}
        onConversationDeleted={handleConversationDeleted}
        onToneChange={handleToneChange}
      />

      <ConversationSidebar
        activeConversationId={activeConversationId}
        activeTone={activeConversation?.tone || 'baku'}
        onSelectConversation={handleSelectConversation}
        onConversationCreated={handleConversationCreated}
        onConversationDeleted={handleConversationDeleted}
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
              <img 
                src="/images/ai-tutor-mascot.jpg" 
                alt="AI Tutor" 
                className="tutor-mascot-img" 
                width={28}
                height={28}
                style={{borderRadius: '8px'}} 
              />
            </div>
            <div className="header-text">
              <h2 className="header-title">
                {activeConversation?.title || 'AI Tutor'}
              </h2>
            </div>
          </div>
        </header>

        {/* Messages area */}
        <div ref={messagesContainerRef} className="tutor-chat-messages">
          {loading ? (
            <SkeletonLoader />
          ) : messages.length === 0 ? (
            <WelcomeState 
              user={user} 
              onSuggestionClick={handleSuggestionClick}
            />
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
                conversationId={activeConversationId || 'temp'}
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

            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={streaming}
              onError={handleVoiceError}
            />

            <textarea
              ref={textareaRef}
              className="input-textarea"
              placeholder={streaming ? "AI sedang mengetik..." : "Tanyakan materi, minta soal latihan, atau ajak bermain teka-teki…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              rows={1}
              maxLength={charMax}
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
            {charPercent > 80 && (
              <span className="input-char-count">
                {charCount}/{charMax}
              </span>
            )}
          </div>
        </div>

        {/* Scroll to bottom button */}
        <ScrollToBottom
          show={showScrollButton}
          onClick={scrollToBottom}
        />
      </main>

      {/* Toast Notification */}
      <Toast
        show={toast.show}
        onClose={() => setToast({ show: false, message: '', type: 'info' })}
        message={toast.message}
        type={toast.type}
        duration={3000}
      />
    </div>
  );
}

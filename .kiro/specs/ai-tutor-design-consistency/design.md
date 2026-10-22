# Design Document: AI Tutor Design Consistency

## Overview

This design document specifies the technical implementation for aligning the AI Tutor interface with the B3Matika design system. The implementation will replace all hardcoded colors with CSS variables, integrate B3Matika branding (logos and typography), refactor the VoiceButton component, and ensure seamless theme switching support across light and dark modes.

**Core Principles:**
- **Design Token First**: All visual properties must reference CSS variables from app.css
- **Zero Hardcoding**: No inline styles or hardcoded color values in components
- **Theme Agnostic**: Components must work identically in light and dark themes
- **Accessibility First**: Maintain WCAG 2.1 AA contrast ratios (4.5:1 for text)
- **Progressive Enhancement**: Voice features and animations respect user preferences

## Architecture

### Design Token System

The AI Tutor interface will consume the existing design token system defined in `app.css`:

```css
:root {
  /* Colors */
  --navy: #1b2468;
  --orange: #f7931e;
  --blue: #0284c7;
  --blue-d: #1d4ed8;
  
  /* Layout */
  --bg: #f9fafb;
  --card: #ffffff;
  --card-bg: #ffffff;
  --text: #111827;
  --text-muted: #6b7280;
  --line: #e5e7eb;
  
  /* Status */
  --ok: #10b981;
  --bad: #ef4444;
  --warn: #f59e0b;
  
  /* Elements */
  --radius: 10px;
  --radius-lg: 16px;
  --shadow: 0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1);
  --shadow-lg: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1);
  --shadow-xl: 0 10px 25px -3px rgba(0,0,0,.12), 0 4px 6px -4px rgba(0,0,0,.07);
  --surface: #f3f4f6;
  --surface-hover: #e5e7eb;
  
  /* AI-specific gradients */
  --ai-user-bg: linear-gradient(135deg,#1b2468,#2a74c8);
  --ai-user-text: #fff;
  --ai-sys-bg: #f3f4f6;
  
  /* Motion */
  --dur-fast: 180ms;
  --dur-med: 280ms;
  --dur-slow: 500ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="dark"] {
  --navy: #e5e7eb;
  --blue: #3b82f6;
  --blue-d: #60a5fa;
  
  --bg: #111827;
  --card: #1f2937;
  --card-bg: #1f2937;
  --text: #f9fafb;
  --text-muted: #9ca3af;
  --line: rgba(255,255,255,.1);
  
  --ok: #34d399;
  --bad: #f87171;
  --warn: #fbbf24;
  
  --surface: #374151;
  --surface-hover: #4b5563;
  
  --ai-user-bg: #374151;
  --ai-user-text: #f9fafb;
  --ai-sys-bg: #1f2937;
}
```

### Component Layer Architecture

```
┌─────────────────────────────────────────────────┐
│          TutorChat (Page Component)             │
│  - Layout orchestration                         │
│  - State management (conversations, messages)   │
│  - Voice state coordination                     │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼────────┐ ┌──▼───────┐ ┌──▼─────────────┐
│ ConversationUI │ │ ChatArea │ │ VoiceControls  │
│  - Sidebar     │ │ - Header │ │ - Microphone   │
│  - Drawer      │ │ - Messages│ │ - Mute toggle  │
│  - Item list   │ │ - Input  │ │                │
└────────────────┘ └──────────┘ └────────────────┘
```

### Theme Integration Flow

```
ThemeContext
    │
    ├─ Sets data-theme="light|dark" on <html>
    │
    └─ CSS variables respond via [data-theme] selector
           │
           └─ All components inherit themed values automatically
```

## Components and Interfaces

### 1. CSS Refactoring Strategy

#### 1.1 Container and Layout

**File:** `resources/css/tutor-components.css`

**Current Issues:**
- Hardcoded colors: `background: white`, `#e5e7eb`, `#f9fafb`
- No dark mode support

**Design Solution:**

```css
.tutor-chat-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg); /* Changed from #f9fafb */
}

.conversation-sidebar {
  width: 320px;
  background: var(--card); /* Changed from white */
  border-right: 1px solid var(--line); /* Changed from #e5e7eb */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversation-sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--line);
  background: var(--card-bg);
}
```

**Rationale:** Using semantic tokens (`--card`, `--line`, `--bg`) instead of color values ensures automatic theme switching and maintains visual hierarchy.

#### 1.2 Logo Integration

**Components to Modify:**
- `ConversationSidebar.jsx`
- `ConversationDrawer.jsx`
- `TutorChat.jsx` (welcome screen and header)

**Current State:**
```jsx
// Current: Generic robot icon
<div className="sidebar-logo-icon">
  <Bot size={32} />
</div>
```

**Design Solution:**
```jsx
// New: B3Matika Logo component
import Logo from '@/components/Logo';

// In sidebar header
<div className="sidebar-logo">
  <Logo size={48} tagline={false} />
</div>

// In message avatars (AI)
<div className="message-avatar avatar-ai">
  <img src="/images/logo.png" alt="B3Matika AI" />
</div>
```

**CSS Support:**
```css
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.sidebar-logo img {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  object-fit: cover;
}

.message-avatar.avatar-ai img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.header-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**Logo Asset Paths:**
- Main logo: `/images/logo.png`
- AI Tutor specific (if needed): `/images/ai-tutor-logo.png`

**Fallback Strategy:**
If logo image fails to load, display LogoMark SVG component:
```jsx
import { LogoMark } from '@/components/Logo';

<div className="message-avatar avatar-ai">
  {logoError ? (
    <LogoMark size={36} />
  ) : (
    <img 
      src="/images/logo.png" 
      alt="B3Matika AI"
      onError={() => setLogoError(true)}
    />
  )}
</div>
```

### 2. Button and Interactive Elements

#### 2.1 Primary Buttons (Create Conversation, Send)

**CSS Design:**
```css
.conversation-create-btn,
.input-send-btn {
  background: var(--blue-d);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
  transition: 
    filter var(--dur-fast) var(--ease-in-out),
    transform var(--dur-fast) var(--ease-out);
}

.conversation-create-btn:hover:not(:disabled),
.input-send-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.conversation-create-btn:active:not(:disabled),
.input-send-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.conversation-create-btn:disabled,
.input-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### 2.2 Secondary Buttons (Attach, Close, Actions)

**CSS Design:**
```css
.input-attach-btn,
.drawer-close-btn,
.conversation-action-btn {
  background: var(--surface);
  color: var(--text-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  cursor: pointer;
  transition: 
    background-color var(--dur-fast) var(--ease-in-out),
    color var(--dur-fast) var(--ease-in-out),
    border-color var(--dur-fast) var(--ease-in-out);
}

.input-attach-btn:hover:not(:disabled),
.drawer-close-btn:hover,
.conversation-action-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--blue);
}

.conversation-action-btn.delete:hover {
  background: var(--bad-bg);
  color: var(--bad);
  border-color: var(--bad);
}
```

#### 2.3 Welcome CTA Button

**CSS Design:**
```css
.welcome-cta-btn {
  padding: 14px 32px;
  background: var(--blue-d);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: 
    background-color var(--dur-med) var(--ease-out),
    transform var(--dur-med) var(--ease-out),
    box-shadow var(--dur-med) var(--ease-out);
}

.welcome-cta-btn:hover {
  background: var(--navy);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.35);
}

[data-theme="dark"] .welcome-cta-btn:hover {
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
}
```

### 3. Message Bubbles

#### 3.1 User Messages

**CSS Design:**
```css
.message-text.text-user {
  background: var(--ai-user-bg);
  color: var(--ai-user-text);
  padding: 12px 16px;
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
}

/* Code blocks in user messages */
.message-text.text-user .inline-code {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 13px;
}
```

#### 3.2 AI Messages

**CSS Design:**
```css
.message-text.text-ai {
  background: var(--card);
  color: var(--text);
  padding: 12px 16px;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  font-size: 14px;
  line-height: 1.6;
}

/* Code blocks in AI messages */
.message-text.text-ai .inline-code {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 13px;
}

[data-theme="dark"] .message-text.text-ai .inline-code {
  background: rgba(255, 255, 255, 0.1);
}

.message-text.text-ai .code-block {
  padding: 12px;
  background: #1e293b;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

[data-theme="dark"] .message-text.text-ai .code-block {
  background: #0f172a;
}

.message-text.text-ai .code-block code {
  color: #e2e8f0;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
}
```

**Rationale:** Code blocks remain dark in both themes for consistency with developer expectations (most code editors use dark themes).

#### 3.3 Material and Video Recommendations

**CSS Design:**
```css
.material-card,
.video-card {
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  transition: 
    border-color var(--dur-fast) var(--ease-in-out),
    box-shadow var(--dur-med) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.material-card:hover {
  border-color: var(--blue);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.video-card:hover {
  border-color: var(--bad);
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.material-card-title,
.video-card-title {
  color: var(--navy);
  font-weight: 600;
}

.material-card-description {
  color: var(--text-muted);
}

.material-card-icon {
  background: var(--materi-obj-bg);
  color: var(--blue);
  border-radius: var(--radius);
}
```

### 4. Input Components

#### 4.1 Textarea

**CSS Design:**
```css
.input-textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 14px;
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: 14px;
  font-family: 'Poppins', system-ui, sans-serif;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: 
    border-color var(--dur-fast) var(--ease-in-out),
    box-shadow var(--dur-fast) var(--ease-in-out);
}

.input-textarea::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.input-textarea:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(31, 162, 232, 0.15);
}

[data-theme="dark"] .input-textarea:focus {
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
}

.input-textarea:disabled {
  background: var(--surface);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.6;
}
```

#### 4.2 Input Area Container

**CSS Design:**
```css
.tutor-chat-input-area {
  background: var(--card);
  border-top: 1px solid var(--line);
  padding: 16px 20px;
}

@media (max-width: 768px) {
  .tutor-chat-input-area {
    padding: 12px;
  }
}

.input-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.input-char-count {
  font-weight: 600;
  color: var(--text-muted);
}
```

### 5. Voice Button Integration

#### 5.1 Component Refactoring

**Current VoiceButton.jsx Issues:**
- Uses inline styles
- Uses emoji icons (not accessible)
- Hardcoded colors
- Not integrated into design system

**New Architecture:**

**File:** `resources/js/components/VoiceControls.jsx` (new file)

```jsx
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export function VoiceControls({ 
  status = 'idle', 
  isMuted = false,
  onToggleRecording,
  onToggleMute,
  disabled = false
}) {
  const isListening = status === 'listening';
  
  return (
    <div className="voice-controls">
      <button
        type="button"
        className={`voice-btn voice-btn-mic ${status}`}
        onClick={onToggleRecording}
        disabled={disabled}
        aria-label={isListening ? 'Berhenti merekam' : 'Mulai bicara'}
        title={isListening ? 'Berhenti merekam' : 'Mulai bicara'}
      >
        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      <button
        type="button"
        className={`voice-btn voice-btn-mute ${isMuted ? 'muted' : ''}`}
        onClick={onToggleMute}
        disabled={disabled}
        aria-label={isMuted ? 'Nyalakan suara AI' : 'Matikan suara AI'}
        title={isMuted ? 'Nyalakan suara AI' : 'Matikan suara AI'}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </div>
  );
}
```

**CSS Design:**

**File:** `resources/css/tutor-components.css` (add to existing file)

```css
/* === VOICE CONTROLS === */
.voice-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.voice-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 
    background-color var(--dur-fast) var(--ease-in-out),
    transform var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-in-out);
}

.voice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-btn:active:not(:disabled) {
  transform: scale(0.95);
}

/* Microphone button states */
.voice-btn-mic.idle {
  background: var(--blue-d);
  color: white;
}

.voice-btn-mic.listening {
  background: var(--bad);
  color: white;
  animation: voice-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.voice-btn-mic.processing {
  background: var(--warn);
  color: white;
}

.voice-btn-mic.speaking {
  background: var(--ok);
  color: white;
}

.voice-btn-mic:hover:not(:disabled):not(.listening) {
  filter: brightness(1.08);
}

/* Mute button states */
.voice-btn-mute {
  background: var(--surface);
  color: var(--text);
}

.voice-btn-mute.muted {
  background: var(--surface);
  color: var(--text-muted);
  opacity: 0.7;
}

.voice-btn-mute:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text);
}

/* Voice pulse animation */
@keyframes voice-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

/* Dark theme adjustments */
[data-theme="dark"] .voice-btn-mic.listening {
  animation: voice-pulse-dark 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes voice-pulse-dark {
  0% {
    box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(248, 113, 113, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(248, 113, 113, 0);
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .voice-btn-mic.listening {
    animation: none;
  }
  
  .voice-btn {
    transition: none;
  }
}
```

#### 5.2 Integration into Input Form

**Modified TutorChat.jsx input area:**

```jsx
<form className="tutor-chat-input-form" onSubmit={handleSubmit}>
  <button
    type="button"
    className="input-attach-btn"
    onClick={() => setShowUploader(!showUploader)}
    disabled={streaming}
  >
    <Paperclip size={20} />
    {attachments.length > 0 && (
      <span className="attach-badge">{attachments.length}</span>
    )}
  </button>

  {/* NEW: Voice controls */}
  <VoiceControls
    status={voiceStatus}
    isMuted={isVoiceMuted}
    onToggleRecording={handleToggleRecording}
    onToggleMute={handleToggleMute}
    disabled={streaming}
  />

  <textarea
    ref={textareaRef}
    className="input-textarea"
    placeholder={streaming ? "AI sedang mengetik..." : "Tanyakan materi..."}
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
  >
    {streaming ? <Loader size={20} className="spin" /> : <Send size={20} />}
  </button>
</form>
```

**State management additions:**

```jsx
// Add to TutorChat component
const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, processing, speaking
const [isVoiceMuted, setIsVoiceMuted] = useState(false);

const handleToggleRecording = () => {
  if (voiceStatus === 'listening') {
    // Stop recording logic
    setVoiceStatus('processing');
    // ... handle speech-to-text
  } else {
    // Start recording logic
    setVoiceStatus('listening');
    // ... start speech recognition
  }
};

const handleToggleMute = () => {
  setIsVoiceMuted(prev => !prev);
  // ... handle audio mute/unmute
};
```

### 6. Header and Status Indicators

#### 6.1 Chat Header

**CSS Design:**
```css
.tutor-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--card);
  border-bottom: 1px solid var(--line);
  box-shadow: var(--shadow);
}

.header-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 2px 0;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--ok);
}

.status-dot.checking {
  background: var(--warn);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.status-dot.offline {
  background: var(--bad);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot.checking {
    animation: none;
  }
}
```

### 7. Mobile Drawer

**CSS Design:**
```css
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  z-index: 98;
  animation: fadeOverlay var(--dur-med) var(--ease-out);
}

@keyframes fadeOverlay {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.conversation-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 85%;
  max-width: 320px;
  background: var(--card);
  z-index: 99;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  animation: slideDrawer var(--dur-med) var(--ease-out);
}

@keyframes slideDrawer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer-backdrop,
  .conversation-drawer {
    animation: none;
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--line);
  background: var(--card-bg);
}

.drawer-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--surface);
  color: var(--text-muted);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 
    background-color var(--dur-fast) var(--ease-in-out),
    color var(--dur-fast) var(--ease-in-out);
}

.drawer-close-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}
```

### 8. Welcome Screen

**CSS Design:**
```css
.tutor-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
}

.welcome-content {
  max-width: 600px;
}

.welcome-logo {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.welcome-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tutor-welcome h1 {
  font-size: clamp(1.9rem, 5vw, 2.8rem);
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 12px 0;
}

.welcome-subtitle {
  font-size: 16px;
  color: var(--blue-d);
  font-weight: 600;
  margin: 0 0 16px 0;
}

.welcome-description {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0 0 32px 0;
}

@media (max-width: 640px) {
  .welcome-logo {
    width: 100px;
    height: 100px;
  }

  .tutor-welcome h1 {
    font-size: clamp(1.5rem, 5vw, 2rem);
  }

  .welcome-subtitle {
    font-size: 14px;
  }

  .welcome-description {
    font-size: 14px;
  }
}
```

## Data Models

This feature does not introduce new data models. It modifies the presentation layer only, consuming existing conversation, message, and user data structures.

**Existing Models Used:**
- Conversation: `{ id, title, tone, topic_id, created_at, updated_at }`
- Message: `{ id, conversation_id, role, content, meta, attachments, created_at }`
- Attachment: `{ id, filename, file_path, file_type, file_size }`

## Error Handling

### Theme System Errors

**Error Scenario:** CSS variables not loaded or theme system fails

**Handling Strategy:**
```jsx
// In TutorChat.jsx useEffect
useEffect(() => {
  const checkThemeSupport = () => {
    const computedStyle = getComputedStyle(document.documentElement);
    const bgColor = computedStyle.getPropertyValue('--bg').trim();
    
    if (!bgColor) {
      console.error('Design system CSS variables not loaded');
      // Fallback: still functional with browser defaults
    }
  };
  
  checkThemeSupport();
}, []);
```

**Fallback:** Components remain functional with browser default colors. No critical functionality is lost.

### Logo Loading Errors

**Error Scenario:** Logo image fails to load

**Handling Strategy:**
```jsx
const [logoError, setLogoError] = useState(false);

<img 
  src="/images/logo.png" 
  alt="B3Matika AI"
  onError={() => {
    console.error('Failed to load B3Matika logo');
    setLogoError(true);
  }}
/>

{logoError && <LogoMark size={36} />}
```

**Fallback:** SVG LogoMark component renders inline as fallback.

### Voice Feature Errors

**Error Scenario:** Voice API unavailable or blocked by browser

**Handling Strategy:**
```jsx
const [voiceSupported, setVoiceSupported] = useState(true);

useEffect(() => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    setVoiceSupported(false);
    console.warn('Speech recognition not supported in this browser');
  }
}, []);

// Conditionally render voice controls
{voiceSupported && (
  <VoiceControls
    status={voiceStatus}
    isMuted={isVoiceMuted}
    onToggleRecording={handleToggleRecording}
    onToggleMute={handleToggleMute}
    disabled={streaming}
  />
)}
```

**Fallback:** Voice controls hidden if browser doesn't support speech recognition. Text input remains fully functional.

## Correctness Properties

This section defines the verifiable properties that must hold true for the implementation to be considered correct.

### Theme Consistency Properties

**Property 1: Zero Hardcoded Colors**
- **Invariant:** No component CSS should contain literal color values (hex, rgb, named colors) except in theme definition files
- **Verification:** `grep -r "color: #\|background: #\|border.*: #" resources/css/tutor-components.css` should return 0 results
- **Exception:** Code block backgrounds may use fixed dark colors for consistency with developer expectations

**Property 2: Theme Token Coverage**
- **Invariant:** Every visual property (color, background, border-color, shadow) must reference a CSS variable from app.css
- **Verification:** Parse CSS and confirm all color/background declarations use `var(--*)` syntax
- **Test:** Manually inspect computed styles in DevTools - should trace back to CSS variables

**Property 3: Dark Mode Completeness**
- **Invariant:** Every component must render correctly in both light and dark themes without visual regressions
- **Verification:** Screenshot comparison tests pass for both themes with < 0.1% pixel difference threshold
- **Test:** Toggle theme switch 20 times - no flashing, no unstyled content, no layout shifts

**Property 4: Contrast Compliance**
- **Invariant:** All text must maintain ≥4.5:1 contrast ratio (WCAG AA) in both themes
- **Verification:** Automated axe-core tests return 0 contrast violations
- **Test:** Manual check with browser DevTools color picker on all text elements

### Component Integration Properties

**Property 5: Logo Consistency**
- **Invariant:** B3Matika logo must appear in exactly 5 locations: sidebar header, drawer header, chat header, message avatars (AI), and welcome screen
- **Verification:** Count `<img src="/images/logo.png"` occurrences across components = 5
- **Test:** Visual inspection on desktop and mobile - logo visible and properly sized in all locations

**Property 6: Logo Fallback Reliability**
- **Invariant:** If logo image fails to load, SVG fallback must render immediately without broken image icon
- **Verification:** Block network requests to `/images/logo.png` - fallback renders within 100ms
- **Test:** Set `img { display: none; }` in DevTools - SVG LogoMark appears instead

**Property 7: Voice Controls State Machine**
- **Invariant:** Voice button status must follow state machine: idle → listening → processing → speaking → idle (no invalid transitions)
- **Verification:** State transition logs show only valid sequences
- **Test:** Click mic button 100 times in rapid succession - no stuck states, no undefined status values

**Property 8: Voice Controls Visual Feedback**
- **Invariant:** Each voice status must have distinct visual appearance (color + icon change)
- **Verification:** Computed styles for `.voice-btn-mic.idle`, `.listening`, `.processing`, `.speaking` have different background colors
- **Test:** Human observer can distinguish all 4 states without reading status text

### Accessibility Properties

**Property 9: Keyboard Navigation Completeness**
- **Invariant:** All interactive elements must be reachable via keyboard (Tab/Shift+Tab) in logical order
- **Verification:** Tab through entire interface - focus moves to every button, input, link exactly once
- **Test:** Complete full user workflow (create conversation, send message, toggle voice) using only keyboard

**Property 10: ARIA Label Presence**
- **Invariant:** Every icon-only button must have `aria-label` or `title` attribute
- **Verification:** Query all buttons with only SVG children - 100% have aria-label
- **Test:** Screen reader (NVDA/VoiceOver) announces meaningful label for every button

**Property 11: Focus Indicator Visibility**
- **Invariant:** Focus indicators must be visible (min 2px outline) with ≥3:1 contrast against background
- **Verification:** Focus each interactive element - outline visible in both themes
- **Test:** Use browser DevTools to measure outline color contrast ratio

**Property 12: Reduced Motion Compliance**
- **Invariant:** When `prefers-reduced-motion: reduce`, no animations play (except essential UI feedback)
- **Verification:** Set OS to reduced motion - voice pulse animation, drawer slide, transitions all disabled
- **Test:** Toggle reduced motion on/off - animations enable/disable immediately

### Responsive Design Properties

**Property 13: Touch Target Minimum Size**
- **Invariant:** All interactive elements must be ≥40px × 40px on mobile viewports (< 768px)
- **Verification:** Measure bounding box of all buttons on 375px viewport - minimum dimension ≥40px
- **Test:** Use real device touch testing - no accidental mis-taps, all buttons easy to press

**Property 14: Mobile Drawer Behavior**
- **Invariant:** On viewports < 768px, sidebar must be hidden and drawer must open/close correctly
- **Verification:** Resize window from 1920px → 375px - sidebar disappears, menu button appears
- **Test:** Open/close drawer 20 times - smooth animation, no layout jumps, backdrop dismisses drawer

**Property 15: Text Readability on Small Screens**
- **Invariant:** Font sizes must be ≥14px on mobile (except labels which can be ≥11px)
- **Verification:** Check computed font-size on 375px viewport - body text ≥14px
- **Test:** Read full conversation thread on mobile - no squinting required

### Performance Properties

**Property 16: Theme Switch Performance**
- **Invariant:** Theme switching must complete visual update within 300ms
- **Verification:** Performance.now() before/after theme change - delta < 300ms
- **Test:** Toggle theme 50 times rapidly - no lag, no frame drops

**Property 17: Logo Load Performance**
- **Invariant:** Logo image must load < 500ms on 3G connection or fallback to SVG
- **Verification:** Network throttling to 3G - logo appears within 500ms
- **Test:** Lighthouse performance audit - logo not flagged as render-blocking

**Property 18: Animation Performance**
- **Invariant:** Voice pulse animation must maintain 60fps (no jank)
- **Verification:** Chrome DevTools Performance panel - animation frames consistently < 16.67ms
- **Test:** Record 10-second animation - 0 dropped frames

### Data Integrity Properties

**Property 19: Voice State Persistence**
- **Invariant:** Voice mute preference must persist across page reloads
- **Verification:** Toggle mute on → reload page → mute state still on
- **Test:** Set mute preference, close tab, reopen - preference remembered

**Property 20: No Visual Regression**
- **Invariant:** Changes must not alter layouts, sizing, or spacing of unchanged components
- **Verification:** Playwright screenshot diffs show 0 changes outside AI Tutor interface
- **Test:** Compare before/after screenshots of homepage, materi page, quiz page - pixel-perfect match

## Testing Strategy

### Property-Based Testing Assessment

This feature is **NOT suitable for property-based testing** because:

1. **UI Rendering Focus**: The feature primarily involves CSS styling, theme switching, and visual presentation - areas where visual regression testing and snapshot testing are more appropriate than property-based testing.

2. **No Pure Functions**: The changes involve React components with side effects (DOM manipulation, theme context, event handlers) rather than pure transformation logic.

3. **Declarative Configuration**: CSS changes are declarative configuration (color tokens, spacing values) rather than algorithmic logic that could benefit from exhaustive input testing.

4. **State-Based UI**: Component behavior depends on complex UI state (theme, conversation state, voice status) that is better verified through example-based integration tests.

**Appropriate Testing Approach:**
- **Visual Regression Tests** (Playwright screenshots) for CSS and theme correctness
- **Snapshot Tests** for React component output  
- **Example-Based Integration Tests** for user interactions (theme switching, voice controls)
- **Accessibility Tests** (axe-core) for WCAG compliance
- **Manual Testing** for cross-browser compatibility and visual polish

This approach provides appropriate coverage for UI refactoring work where the correctness criteria are visual consistency, accessibility, and responsive behavior rather than algorithmic correctness across input domains.

### Visual Regression Testing

**Tool:** Playwright with screenshot comparison

**Test Cases:**

1. **Theme Switching Test**
```javascript
test('AI Tutor matches design system colors in light theme', async ({ page }) => {
  await page.goto('/ai-tutor');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });
  
  await page.waitForTimeout(200); // Wait for transitions
  
  const container = await page.locator('.tutor-chat-container');
  const bgColor = await container.evaluate(el => 
    getComputedStyle(el).backgroundColor
  );
  
  // Should match --bg in light mode (rgb(249, 250, 251))
  expect(bgColor).toBe('rgb(249, 250, 251)');
});

test('AI Tutor matches design system colors in dark theme', async ({ page }) => {
  await page.goto('/ai-tutor');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  
  await page.waitForTimeout(200);
  
  const container = await page.locator('.tutor-chat-container');
  const bgColor = await container.evaluate(el => 
    getComputedStyle(el).backgroundColor
  );
  
  // Should match --bg in dark mode (rgb(17, 24, 39))
  expect(bgColor).toBe('rgb(17, 24, 39)');
});
```

2. **Logo Rendering Test**
```javascript
test('B3Matika logo displays in sidebar', async ({ page }) => {
  await page.goto('/ai-tutor');
  
  const logo = await page.locator('.sidebar-logo img');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('src', '/images/logo.png');
});

test('AI message avatar shows logo', async ({ page }) => {
  await page.goto('/ai-tutor');
  
  // Create conversation and send message to trigger AI response
  await page.click('.conversation-create-btn');
  await page.fill('.input-textarea', 'Hello');
  await page.click('.input-send-btn');
  
  // Wait for AI response
  await page.waitForSelector('.message-bubble.message-ai', { timeout: 10000 });
  
  const aiAvatar = await page.locator('.message-avatar.avatar-ai img');
  await expect(aiAvatar).toBeVisible();
});
```

3. **Voice Button Test**
```javascript
test('Voice controls render with correct icons', async ({ page }) => {
  await page.goto('/ai-tutor');
  
  // Start conversation
  await page.click('.conversation-create-btn');
  
  const micButton = await page.locator('.voice-btn-mic');
  const muteButton = await page.locator('.voice-btn-mute');
  
  await expect(micButton).toBeVisible();
  await expect(muteButton).toBeVisible();
  
  // Check for lucide-react SVG icons (not emoji)
  const micIcon = await micButton.locator('svg');
  const muteIcon = await muteButton.locator('svg');
  
  await expect(micIcon).toBeVisible();
  await expect(muteIcon).toBeVisible();
});

test('Voice button state changes on click', async ({ page }) => {
  await page.goto('/ai-tutor');
  await page.click('.conversation-create-btn');
  
  const micButton = await page.locator('.voice-btn-mic');
  
  // Initially idle
  await expect(micButton).toHaveClass(/idle/);
  
  // Click to start listening
  await micButton.click();
  await expect(micButton).toHaveClass(/listening/);
  
  // Should have pulse animation
  const animation = await micButton.evaluate(el => 
    getComputedStyle(el).animation
  );
  expect(animation).toContain('voice-pulse');
});
```

4. **Responsive Design Test**
```javascript
test('Mobile drawer appears on narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/ai-tutor');
  
  // Sidebar should be hidden
  const sidebar = await page.locator('.conversation-sidebar');
  await expect(sidebar).toBeHidden();
  
  // Menu button should be visible
  const menuBtn = await page.locator('.mobile-menu-btn');
  await expect(menuBtn).toBeVisible();
  
  // Open drawer
  await menuBtn.click();
  const drawer = await page.locator('.conversation-drawer');
  await expect(drawer).toBeVisible();
});

test('Touch targets meet minimum size on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/ai-tutor');
  
  await page.click('.conversation-create-btn');
  
  // Check voice buttons
  const voiceButtons = await page.locator('.voice-btn').all();
  
  for (const button of voiceButtons) {
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
});
```

### Accessibility Testing

**Tool:** axe-core via Playwright

**Test Cases:**

1. **Contrast Ratio Test**
```javascript
test('Text contrast meets WCAG AA in light mode', async ({ page }) => {
  await page.goto('/ai-tutor');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });
  
  const results = await page.evaluate(() => {
    return new Promise((resolve) => {
      axe.run({
        rules: {
          'color-contrast': { enabled: true }
        }
      }, (err, results) => {
        resolve(results);
      });
    });
  });
  
  expect(results.violations.length).toBe(0);
});

test('Text contrast meets WCAG AA in dark mode', async ({ page }) => {
  await page.goto('/ai-tutor');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  
  const results = await page.evaluate(() => {
    return new Promise((resolve) => {
      axe.run({
        rules: {
          'color-contrast': { enabled: true }
        }
      }, (err, results) => {
        resolve(results);
      });
    });
  });
  
  expect(results.violations.length).toBe(0);
});
```

2. **Keyboard Navigation Test**
```javascript
test('All interactive elements are keyboard accessible', async ({ page }) => {
  await page.goto('/ai-tutor');
  await page.click('.conversation-create-btn');
  
  // Tab through interactive elements
  await page.keyboard.press('Tab'); // Attach button
  await page.keyboard.press('Tab'); // Mic button
  await page.keyboard.press('Tab'); // Mute button
  await page.keyboard.press('Tab'); // Textarea
  await page.keyboard.press('Tab'); // Send button
  
  // Check focus is visible
  const focusedElement = await page.evaluateHandle(() => document.activeElement);
  const className = await page.evaluate(el => el.className, focusedElement);
  
  expect(className).toContain('input-send-btn');
});
```

3. **ARIA Attributes Test**
```javascript
test('Voice buttons have proper ARIA labels', async ({ page }) => {
  await page.goto('/ai-tutor');
  await page.click('.conversation-create-btn');
  
  const micButton = await page.locator('.voice-btn-mic');
  const muteButton = await page.locator('.voice-btn-mute');
  
  await expect(micButton).toHaveAttribute('aria-label', /bicara/i);
  await expect(muteButton).toHaveAttribute('aria-label', /suara/i);
});
```

### Unit Testing

**Tool:** Vitest + React Testing Library

**Test Cases:**

1. **VoiceControls Component Test**
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceControls } from '@/components/VoiceControls';

describe('VoiceControls', () => {
  it('renders microphone and mute buttons', () => {
    render(
      <VoiceControls
        status="idle"
        isMuted={false}
        onToggleRecording={vi.fn()}
        onToggleMute={vi.fn()}
      />
    );
    
    expect(screen.getByLabelText(/bicara/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/suara/i)).toBeInTheDocument();
  });
  
  it('calls onToggleRecording when mic button clicked', () => {
    const handleToggle = vi.fn();
    
    render(
      <VoiceControls
        status="idle"
        isMuted={false}
        onToggleRecording={handleToggle}
        onToggleMute={vi.fn()}
      />
    );
    
    fireEvent.click(screen.getByLabelText(/bicara/i));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });
  
  it('applies correct class based on status', () => {
    const { rerender } = render(
      <VoiceControls
        status="idle"
        isMuted={false}
        onToggleRecording={vi.fn()}
        onToggleMute={vi.fn()}
      />
    );
    
    expect(screen.getByLabelText(/bicara/i)).toHaveClass('idle');
    
    rerender(
      <VoiceControls
        status="listening"
        isMuted={false}
        onToggleRecording={vi.fn()}
        onToggleMute={vi.fn()}
      />
    );
    
    expect(screen.getByLabelText(/berhenti/i)).toHaveClass('listening');
  });
  
  it('disables buttons when disabled prop is true', () => {
    render(
      <VoiceControls
        status="idle"
        isMuted={false}
        onToggleRecording={vi.fn()}
        onToggleMute={vi.fn()}
        disabled={true}
      />
    );
    
    expect(screen.getByLabelText(/bicara/i)).toBeDisabled();
    expect(screen.getByLabelText(/suara/i)).toBeDisabled();
  });
});
```

2. **Theme Integration Test**
```javascript
describe('Theme Integration', () => {
  it('components use CSS variables for colors', () => {
    const { container } = render(<TutorChat />);
    
    const chatContainer = container.querySelector('.tutor-chat-container');
    const styles = getComputedStyle(chatContainer);
    
    // Should not have hardcoded background color
    expect(styles.backgroundColor).not.toBe('rgb(255, 255, 255)');
    expect(styles.backgroundColor).not.toBe('white');
    
    // Should use CSS variable (computed value will be actual color)
    expect(styles.backgroundColor).toBeTruthy();
  });
});
```

### Manual Testing Checklist

**Theme Switching:**
- [ ] Switch from light to dark theme - all colors update smoothly
- [ ] Switch from dark to light theme - no flash of unstyled content
- [ ] System theme changes - app follows OS preference
- [ ] All text remains readable (contrast check)
- [ ] All buttons have visible hover states

**Logo Integration:**
- [ ] B3Matika logo appears in sidebar header
- [ ] Logo appears in mobile drawer header
- [ ] Logo appears in AI message avatars (circular crop)
- [ ] Logo appears in chat header
- [ ] Logo appears in welcome screen (large size)
- [ ] Logo loads correctly or shows SVG fallback

**Voice Features:**
- [ ] Voice buttons appear between attach and textarea
- [ ] Mic button shows correct icon (Mic/MicOff)
- [ ] Mute button shows correct icon (Volume2/VolumeX)
- [ ] Mic button changes state: idle → listening → processing → speaking
- [ ] Listening state shows pulse animation
- [ ] Pulse animation respects prefers-reduced-motion
- [ ] Buttons are disabled during streaming
- [ ] Voice controls hidden if browser doesn't support speech recognition

**Responsive Design:**
- [ ] Desktop (1920px): Sidebar visible, drawer hidden
- [ ] Tablet (768px): Sidebar hidden, menu button visible
- [ ] Mobile (375px): Touch targets ≥40px, text readable
- [ ] Drawer slides in smoothly on mobile
- [ ] Input area doesn't obscure keyboard on iOS

**Accessibility:**
- [ ] All interactive elements keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] ARIA labels present on icon buttons
- [ ] Screen reader announces voice button states
- [ ] Color is not the only means of conveying information

## Implementation Phases

### Phase 1: CSS Token Migration (Priority: High)

**Files to Modify:**
- `resources/css/tutor-components.css`

**Tasks:**
1. Replace all hardcoded colors with CSS variables
   - Search: `background: white`, `background: #ffffff`
   - Replace: `background: var(--card)`
   - Search: `color: #6b7280`, `color: #9ca3af`
   - Replace: `color: var(--text-muted)`
2. Replace spacing values with tokens
   - `border-radius: 10px` → `border-radius: var(--radius)`
   - `border-radius: 16px` → `border-radius: var(--radius-lg)`
3. Replace shadow values with tokens
   - `box-shadow: 0 1px 3px...` → `box-shadow: var(--shadow)`
4. Add dark mode specific overrides where needed
   - Code blocks: `[data-theme="dark"] .code-block { background: #0f172a; }`
5. Update transitions to use motion tokens
   - `transition: all 0.2s` → `transition: background-color var(--dur-fast) var(--ease-in-out)`

**Verification:**
- Run visual regression tests
- Manually test light/dark theme switching
- Check contrast ratios with axe DevTools

### Phase 2: Logo Integration (Priority: High)

**Files to Modify:**
- `resources/js/components/tutor/ConversationSidebar.jsx`
- `resources/js/components/tutor/ConversationDrawer.jsx`
- `resources/js/components/tutor/MessageBubble.jsx`
- `resources/js/pages/TutorChat.jsx`

**Tasks:**
1. Import Logo component
   - `import Logo from '@/components/Logo';`
2. Replace Bot icons in sidebars
   - Sidebar header: `<Logo size={48} tagline={false} />`
   - Drawer header: `<Logo size={40} tagline={false} />`
3. Replace avatar icons in MessageBubble
   - AI avatar: `<img src="/images/logo.png" alt="B3Matika AI" />`
   - Add error handling with SVG fallback
4. Update welcome screen logo
   - `<img src="/images/logo.png" alt="B3Matika AI Tutor" />`
5. Update header avatar
   - `<img src="/images/logo.png" alt="B3Matika AI" />`

**Verification:**
- Check logo appears in all 5 locations
- Test logo error fallback
- Verify circular crop in avatars
- Test on different screen sizes

### Phase 3: Voice Button Refactor (Priority: High)

**Files to Create:**
- `resources/js/components/VoiceControls.jsx`

**Files to Modify:**
- `resources/js/pages/TutorChat.jsx`
- `resources/css/tutor-components.css`

**Tasks:**
1. Create new VoiceControls component
   - Use lucide-react icons (Mic, MicOff, Volume2, VolumeX)
   - Accept status, isMuted, onToggleRecording, onToggleMute props
   - Use CSS classes instead of inline styles
2. Add voice controls CSS to tutor-components.css
   - Button states: idle, listening, processing, speaking
   - Pulse animation for listening state
   - Dark theme animation variant
   - Reduced motion support
3. Integrate into TutorChat input form
   - Add voice state management
   - Position between attach button and textarea
   - Connect to existing voice logic
4. Deprecate old VoiceButton.jsx
   - Keep file for reference until migration complete
   - Update imports across codebase

**Verification:**
- Test all voice button states
- Verify pulse animation
- Test mute toggle
- Check accessibility (ARIA labels, keyboard)
- Test in browsers with/without speech recognition

### Phase 4: Polish and Refinement (Priority: Medium)

**Tasks:**
1. Add smooth transitions to all interactive elements
2. Ensure hover states are consistent
3. Verify all spacing matches design system
4. Test reduced motion preferences
5. Fix any remaining hardcoded values
6. Optimize CSS (remove unused selectors)

**Verification:**
- Full accessibility audit
- Performance check (CSS file size)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Phase 5: Documentation (Priority: Low)

**Tasks:**
1. Update component documentation
2. Add inline code comments for complex CSS
3. Create developer guide for extending AI Tutor UI
4. Document voice integration patterns

## Migration Strategy

### Backward Compatibility

**Approach:** Feature flag for gradual rollout

```javascript
// In TutorChat.jsx
const USE_NEW_DESIGN = true; // Can be controlled by environment variable

return USE_NEW_DESIGN ? (
  <div className="tutor-chat-container">
    {/* New design with CSS variables */}
  </div>
) : (
  <div className="tutor-chat-container-legacy">
    {/* Old design with hardcoded colors */}
  </div>
);
```

### Rollback Plan

If critical issues arise:
1. Set feature flag to `false`
2. CSS changes are non-breaking (variables fall back to computed values)
3. Logo changes can be reverted by re-importing Bot icon
4. Voice button can fall back to old VoiceButton component

### Dependencies

**Required:**
- lucide-react (already installed) - for new voice icons
- B3Matika design system (app.css) - already exists

**No new dependencies required.**

## Performance Considerations

### CSS Performance

**Before (Hardcoded):**
```css
.conversation-sidebar { background: white; }
[data-theme="dark"] .conversation-sidebar { background: #1f2937; }
```

**After (Variables):**
```css
.conversation-sidebar { background: var(--card); }
```

**Impact:**
- Reduces CSS file size (fewer duplicate color declarations)
- Improves theme switching performance (browser only recomputes variables, not selectors)
- No runtime performance penalty (CSS variables are native)

### Animation Performance

**Optimizations:**
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Use `will-change` sparingly for frequently animated elements
- Respect `prefers-reduced-motion`

```css
.voice-btn-mic.listening {
  will-change: box-shadow; /* Only for listening state */
  animation: voice-pulse 1.5s infinite;
}
```

### Image Loading

**Logo optimization:**
- Logo image should be < 50KB
- Use WebP format with PNG fallback
- Lazy load logo in welcome screen (below fold)

```jsx
<img 
  src="/images/logo.png" 
  alt="B3Matika AI"
  loading="lazy" // For welcome screen
  decoding="async"
/>
```

## Security Considerations

### Content Security Policy

Voice features require microphone permissions. Update CSP if needed:

```
permissions-policy: microphone=(self)
```

### XSS Protection

Logo URLs must be validated:

```javascript
const ALLOWED_LOGO_PATHS = ['/images/logo.png', '/images/ai-tutor-logo.png'];

const validateLogoPath = (path) => {
  return ALLOWED_LOGO_PATHS.includes(path);
};
```

## Browser Support

**Minimum Requirements:**
- Chrome/Edge 88+ (CSS variables, modern JS)
- Firefox 85+
- Safari 14+

**Voice Features:**
- Web Speech API: Chrome/Edge 88+, Safari 14.1+
- Not supported: Firefox (will gracefully hide voice controls)

**Graceful Degradation:**
- Voice controls hidden if speech recognition unavailable
- CSS variables fall back to computed values in older browsers
- SVG logo fallback if image fails

## Future Enhancements

1. **Theme Customization:** Allow users to choose accent colors
2. **High Contrast Mode:** Support Windows High Contrast Mode
3. **Voice Waveform Visualization:** Show audio waveform during recording
4. **Animated Logo:** Subtle animation when AI is thinking
5. **Custom Themes:** Allow users to upload custom themes

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-XX  
**Author:** AI Development Team  
**Status:** Ready for Implementation

# Requirements Document

## Introduction

This document specifies the requirements for aligning the AI Tutor interface (/ai-tutor) with the B3Matika website's design system. The current AI Tutor interface uses hardcoded colors (white backgrounds, gray text) that create contrast issues and make it appear disconnected from the rest of the website. This feature will ensure visual consistency across the entire application while preserving all existing functionality, especially the voice features.

## Glossary

- **AI_Tutor_Interface**: The chat interface at /ai-tutor route including conversation sidebar, chat area, message bubbles, and input area
- **Design_System**: The CSS variables and tokens defined in app.css (--bg, --card, --text, --navy, --blue, --orange, etc.)
- **Theme_System**: The light/dark/system theme toggle managed by ThemeContext that applies data-theme attribute to document root
- **Voice_Features**: Microphone button for speech input and speaker button for audio output mute/unmute
- **CSS_Variables**: The custom properties in :root and [data-theme="dark"] that define colors, spacing, shadows, and other design tokens
- **Conversation_Sidebar**: Desktop sidebar at 320px width showing conversation list and logo
- **Message_Bubble**: Individual chat message container (user or AI) with avatar, text, attachments, and recommendations
- **VoiceButton_Component**: The existing React component at resources/js/components/VoiceButton.jsx

## Requirements

### Requirement 1: Apply Theme System to AI Tutor Container

**User Story:** As a user, I want the AI Tutor interface to follow my selected theme (light/dark/system), so that the visual experience is consistent across the entire website.

#### Acceptance Criteria

1. THE AI_Tutor_Interface SHALL use CSS_Variables for all background colors instead of hardcoded values
2. WHEN Theme_System changes from light to dark, THE AI_Tutor_Interface SHALL update all colors within 180ms
3. THE tutor-chat-container SHALL use var(--bg) for background color
4. THE conversation-sidebar SHALL use var(--card) for background and var(--line) for borders
5. THE tutor-chat-main SHALL use var(--bg) for background color
6. FOR ALL theme values (light, dark, system), all text SHALL have minimum contrast ratio of 4.5:1 against its background

### Requirement 2: Align Conversation Sidebar Design

**User Story:** As a user, I want the conversation sidebar to match the website's design language, so that it feels like part of the same application.

#### Acceptance Criteria

1. THE sidebar-logo SHALL display the B3Matika Logo component (from resources/js/components/Logo.jsx) instead of a robot icon
2. THE conversation-create-btn SHALL use var(--blue-d) background with var(--radius) border-radius
3. WHEN user hovers over conversation-create-btn, THE button SHALL use filter brightness(1.08) and translateY(-1px)
4. THE conversation-item active state SHALL use var(--blue-d) for indicator color
5. THE conversation-sidebar-header SHALL use var(--card-bg) background and var(--line) for border-bottom
6. THE sidebar-logo-text SHALL use var(--navy) color for title
7. FOR ALL conversation items, borders SHALL use var(--line) instead of hardcoded #e5e7eb

### Requirement 3: Align Message Bubble Design

**User Story:** As a user, I want message bubbles to follow the website's visual style, so that the chat interface looks professional and cohesive.

#### Acceptance Criteria

1. THE message-avatar for AI SHALL display the B3Matika logo image at 36px size
2. THE message-text.text-user SHALL use var(--ai-user-bg) for background
3. THE message-text.text-ai SHALL use var(--card) for background and var(--text) for text color
4. THE message-text.text-ai SHALL have box-shadow var(--shadow)
5. THE message-timestamp SHALL use var(--text-muted) color
6. FOR ALL code blocks in messages, background SHALL use #1e293b in light mode and #0f172a in dark mode
7. THE message-attachment SHALL use var(--line) for borders
8. WHEN message includes material recommendations, THE material-card SHALL use var(--card-bg) background

### Requirement 4: Align Input Area Design

**User Story:** As a user, I want the message input area to match the website's button and form styles, so that interaction patterns are familiar.

#### Acceptance Criteria

1. THE input-textarea SHALL use var(--card) for background and var(--text) for text color
2. WHEN input-textarea receives focus, THE border color SHALL change to var(--blue) with box-shadow 0 0 0 4px rgba(31,162,232,.15)
3. THE input-send-btn SHALL use var(--blue-d) background color
4. WHEN user hovers over input-send-btn, THE button SHALL use filter brightness(1.08)
5. THE input-attach-btn SHALL use var(--line) for border and var(--text-muted) for icon color
6. THE tutor-chat-input-area SHALL use var(--card) for background
7. THE input-hint SHALL use var(--text-muted) color
8. THE attach-badge SHALL use var(--bad) color for background

### Requirement 5: Align Welcome Screen Design

**User Story:** As a user, I want the welcome screen to use B3Matika branding, so that I immediately recognize the AI Tutor as part of the B3Matika platform.

#### Acceptance Criteria

1. THE welcome-logo SHALL display the B3Matika logo image from /images/logo.png
2. THE tutor-welcome h1 SHALL use var(--navy) color
3. THE welcome-subtitle SHALL use var(--blue-d) color
4. THE welcome-description SHALL use var(--text-muted) color
5. THE welcome-cta-btn SHALL use var(--blue-d) background
6. WHEN user hovers over welcome-cta-btn, THE button SHALL transform translateY(-2px) and use box-shadow 0 4px 12px rgba(29,78,216,.35)

### Requirement 6: Integrate Voice Features with Design System

**User Story:** As a user, I want voice control buttons to be visually clear and follow the website's design, so that I can easily find and use voice features while maintaining visual consistency.

#### Acceptance Criteria

1. THE VoiceButton_Component SHALL be refactored to use CSS classes instead of inline styles
2. THE VoiceButton_Component SHALL use lucide-react icons (Mic, MicOff, Volume2, VolumeX) instead of emoji
3. THE voice button container SHALL be added to tutor-chat-input-form between input-attach-btn and input-textarea
4. WHEN voice status is 'listening', THE microphone button SHALL have background var(--bad) and pulsing animation
5. WHEN voice status is 'processing', THE microphone button SHALL have background var(--warn)
6. WHEN voice status is 'speaking', THE microphone button SHALL have background var(--ok)
7. WHEN voice status is 'idle', THE microphone button SHALL have background var(--blue-d)
8. THE mute toggle button SHALL use var(--surface) background when unmuted and var(--text-muted) when muted
9. FOR ALL voice button states, icons SHALL have minimum size of 20px for visibility
10. THE voice buttons SHALL have border-radius var(--radius)

### Requirement 7: Align Mobile Drawer Design

**User Story:** As a mobile user, I want the conversation drawer to match the website's mobile navigation style, so that the interface feels native on mobile devices.

#### Acceptance Criteria

1. THE drawer-backdrop SHALL use rgba(0,0,0,.45) with backdrop-filter blur(2px)
2. THE conversation-drawer SHALL use var(--card) for background
3. THE drawer-close-btn SHALL use var(--surface) background and var(--text-muted) color
4. WHEN user hovers over drawer-close-btn, THE background SHALL change to var(--surface-hover)
5. THE drawer-header SHALL use var(--line) for border-bottom
6. THE drawer-logo SHALL display the B3Matika Logo component
7. THE conversation-drawer SHALL have box-shadow var(--shadow-xl)

### Requirement 8: Align Header Design

**User Story:** As a user, I want the chat header to match the navbar design, so that navigation feels consistent across pages.

#### Acceptance Criteria

1. THE tutor-chat-header SHALL use var(--card) background
2. THE header-avatar SHALL display B3Matika logo image instead of Bot icon
3. THE header-title SHALL use var(--navy) color
4. THE header-status SHALL use var(--text-muted) color
5. THE status-dot.online SHALL use var(--ok) color
6. THE status-dot.checking SHALL use var(--warn) color with pulse animation
7. THE status-dot.offline SHALL use var(--bad) color
8. THE mobile-menu-btn SHALL use var(--surface) background on hover
9. THE tutor-chat-header SHALL have box-shadow var(--shadow)

### Requirement 9: Align Component Spacing and Borders

**User Story:** As a user, I want all spacing and borders to match the website's visual rhythm, so that the interface feels polished and professional.

#### Acceptance Criteria

1. FOR ALL cards in AI_Tutor_Interface, border-radius SHALL use var(--radius) (10px)
2. FOR ALL large rounded elements (logos, avatars), border-radius SHALL use var(--radius-lg) (16px)
3. THE conversation-item SHALL have padding 12px matching website card padding patterns
4. THE tutor-chat-messages SHALL have padding 20px on desktop and 12px on mobile
5. THE message-bubble SHALL have margin-bottom 20px on desktop and 16px on mobile
6. FOR ALL borders in AI_Tutor_Interface, border-width SHALL be 1px and color SHALL use var(--line)
7. THE tutor-chat-input-area SHALL have padding 16px 20px on desktop and 12px on mobile

### Requirement 10: Align Typography

**User Story:** As a user, I want text in the AI Tutor to use the same fonts and weights as the rest of the website, so that reading feels consistent.

#### Acceptance Criteria

1. FOR ALL text in AI_Tutor_Interface, font-family SHALL inherit from body ('Poppins', system-ui, sans-serif)
2. THE header-title SHALL use font-weight 700 matching website h2 elements
3. THE conversation-item-title SHALL use font-weight 600 matching website card titles
4. THE message-text SHALL use font-size 14px and line-height 1.6
5. THE welcome-content h1 SHALL use font-size clamp(1.9rem, 5vw, 2.8rem) and font-weight 700
6. FOR ALL monospace text (code, file names), font-family SHALL use ui-monospace, Menlo, monospace

### Requirement 11: Preserve Responsive Behavior

**User Story:** As a user on any device, I want the AI Tutor to be fully responsive, so that I can use it comfortably on desktop, tablet, and mobile.

#### Acceptance Criteria

1. WHEN viewport width is less than 769px, THE conversation-sidebar SHALL be hidden
2. WHEN viewport width is less than 769px, THE mobile-menu-btn SHALL be visible
3. WHEN viewport width is greater than 768px, THE mobile-menu-btn SHALL be hidden
4. THE conversation-drawer SHALL have max-width 320px and width 85% on mobile
5. THE message-content SHALL have max-width 70% on desktop and 85% on mobile
6. THE tutor-welcome h1 SHALL use responsive font-size clamp(24px, 5vw, 28px)
7. FOR ALL touch targets (buttons, links), minimum size SHALL be 40px × 40px on mobile

### Requirement 12: Align Animation and Transitions

**User Story:** As a user, I want animations in the AI Tutor to match the website's motion design, so that interactions feel smooth and consistent.

#### Acceptance Criteria

1. FOR ALL color transitions, duration SHALL be var(--dur-fast) (180ms) with easing var(--ease-in-out)
2. FOR ALL transform transitions, duration SHALL be var(--dur-med) (280ms) with easing var(--ease-out)
3. THE conversation-item hover SHALL use transform translateY(-1px) with duration 280ms
4. THE drawer-backdrop animation SHALL use fadeOverlay keyframes defined in app.css
5. THE typing-dots animation SHALL use typing-bounce keyframes with duration 1.4s
6. WHEN prefers-reduced-motion is reduce, ALL animations SHALL have duration 0.01ms
7. THE voice pulse animation SHALL use box-shadow animation with duration 1.5s infinite

## Parser Requirements

Note: This feature does not require custom parsers or serializers. All data structures use existing JSON APIs.


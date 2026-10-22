# Implementation Plan: AI Tutor Design Consistency

## Overview

This implementation plan refactors the AI Tutor interface to align with the B3Matika design system. The work involves migrating all hardcoded colors to CSS variables, integrating B3Matika branding (logos), creating a new VoiceControls component, and ensuring full theme switching support across light and dark modes.

**Implementation Strategy:**
- Phase 1 focuses on core CSS token migration (critical path)
- Phase 2 handles logo integration across all components
- Phase 3 refactors voice buttons into a proper component
- Phase 4 adds testing and polish

## Tasks

- [ ] 1. Phase 1: Core CSS Token Migration
  - [ ] 1.1 Migrate container and layout styles to design tokens
    - Open `resources/css/tutor-components.css`
    - Replace hardcoded colors in `.tutor-chat-container` with `var(--bg)`
    - Replace hardcoded colors in `.conversation-sidebar` with `var(--card)` and `var(--line)`
    - Replace hardcoded colors in `.tutor-chat-main` with `var(--bg)`
    - Replace hardcoded colors in `.conversation-sidebar-header` with `var(--card-bg)` and `var(--line)`
    - Test theme switching between light and dark modes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 1.2 Migrate conversation sidebar styles to design tokens
    - Replace hardcoded colors in `.conversation-create-btn` with `var(--blue-d)`
    - Add hover states using `filter: brightness(1.08)` and `transform: translateY(-1px)`
    - Replace hardcoded colors in `.conversation-item` active state with `var(--blue-d)`
    - Replace hardcoded colors in `.sidebar-logo-text` with `var(--navy)`
    - Replace all conversation item borders with `var(--line)`
    - Add transition properties using `var(--dur-fast)` and `var(--ease-in-out)`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 12.1, 12.2, 12.3_

  - [ ] 1.3 Migrate message bubble styles to design tokens
    - Replace user message background with `var(--ai-user-bg)`
    - Replace user message text color with `var(--ai-user-text)`
    - Replace AI message background with `var(--card)`
    - Replace AI message text color with `var(--text)`
    - Add AI message box-shadow using `var(--shadow)`
    - Replace message timestamp color with `var(--text-muted)`
    - Update code block backgrounds for light mode (#1e293b) and dark mode (#0f172a)
    - Update material recommendation cards with `var(--card-bg)` and `var(--line)`
    - Add hover effects to material cards using `var(--blue)` and `var(--shadow-lg)`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 1.4 Migrate input area styles to design tokens
    - Replace `.input-textarea` background with `var(--card)`
    - Replace `.input-textarea` text color with `var(--text)`
    - Replace `.input-textarea` border color with `var(--line)`
    - Update focus state border to `var(--blue)` with box-shadow `0 0 0 4px rgba(31,162,232,.15)`
    - Replace `.input-send-btn` background with `var(--blue-d)`
    - Add hover state using `filter: brightness(1.08)`
    - Replace `.input-attach-btn` border with `var(--line)` and icon color with `var(--text-muted)`
    - Replace `.tutor-chat-input-area` background with `var(--card)`
    - Replace `.input-hint` color with `var(--text-muted)`
    - Replace `.attach-badge` background with `var(--bad)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 1.5 Migrate button styles to design tokens
    - Replace secondary button backgrounds with `var(--surface)`
    - Replace secondary button hover backgrounds with `var(--surface-hover)`
    - Replace secondary button text colors with `var(--text-muted)`
    - Update button border-radius to use `var(--radius)`
    - Add transition properties using CSS variables
    - Ensure all disabled states use opacity 0.5
    - _Requirements: 4.3, 4.4, 4.5, 9.1_

  - [ ] 1.6 Migrate welcome screen styles to design tokens
    - Replace welcome heading color with `var(--navy)`
    - Replace welcome subtitle color with `var(--blue-d)`
    - Replace welcome description color with `var(--text-muted)`
    - Replace welcome CTA button background with `var(--blue-d)`
    - Add hover state with `var(--navy)` background and box-shadow animation
    - Add dark theme hover box-shadow variant
    - Update responsive font-size to use clamp(1.9rem, 5vw, 2.8rem)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 10.5_

  - [ ] 1.7 Migrate header styles to design tokens
    - Replace `.tutor-chat-header` background with `var(--card)`
    - Replace `.tutor-chat-header` border with `var(--line)`
    - Add box-shadow using `var(--shadow)`
    - Replace `.header-title` color with `var(--navy)`
    - Replace `.header-status` color with `var(--text-muted)`
    - Replace `.status-dot.online` background with `var(--ok)`
    - Replace `.status-dot.checking` background with `var(--warn)`
    - Replace `.status-dot.offline` background with `var(--bad)`
    - Replace `.mobile-menu-btn` hover background with `var(--surface)`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [ ] 1.8 Migrate mobile drawer styles to design tokens
    - Replace `.drawer-backdrop` background with `rgba(0,0,0,.45)`
    - Add backdrop-filter blur(2px)
    - Replace `.conversation-drawer` background with `var(--card)`
    - Add box-shadow using `var(--shadow-xl)`
    - Replace `.drawer-close-btn` background with `var(--surface)`
    - Replace `.drawer-close-btn` hover background with `var(--surface-hover)`
    - Replace `.drawer-close-btn` color with `var(--text-muted)`
    - Replace `.drawer-header` border with `var(--line)`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 2. Checkpoint - Verify CSS token migration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Phase 2: Logo Integration
  - [ ] 3.1 Add logo to conversation sidebar
    - Open `resources/js/pages/TutorChat.jsx` or equivalent sidebar component
    - Import Logo component from `@/components/Logo`
    - Replace Bot icon in sidebar header with `<Logo size={48} tagline={false} />`
    - Add CSS class `.sidebar-logo` for styling
    - Add logo error state handling with fallback to LogoMark
    - _Requirements: 2.1, 5.1_

  - [ ] 3.2 Add logo to mobile conversation drawer
    - Open the ConversationDrawer component
    - Import Logo component
    - Replace Bot icon in drawer header with `<Logo size={48} tagline={false} />`
    - Ensure `.drawer-logo` CSS class is applied
    - Add logo error state handling
    - _Requirements: 7.6_

  - [ ] 3.3 Add logo to AI message avatars
    - Open the message rendering component
    - Replace Bot icon in AI message avatars with `<img src="/images/logo.png" alt="B3Matika AI" />`
    - Add error handler with useState for logoError
    - Add onError callback to fall back to LogoMark component
    - Ensure avatar image has proper CSS class `.message-avatar.avatar-ai`
    - _Requirements: 3.1_

  - [ ] 3.4 Add logo to chat header
    - Open the chat header component
    - Replace Bot icon in header avatar with B3Matika logo image
    - Add CSS class `.header-avatar` for styling
    - Add logo error state handling
    - _Requirements: 8.2_

  - [ ] 3.5 Add logo to welcome screen
    - Open the welcome screen component
    - Replace generic icon with B3Matika logo
    - Add CSS class `.welcome-logo` for styling
    - Add logo image with proper sizing (120px × 120px)
    - Add error state handling
    - _Requirements: 5.1_

  - [ ] 3.6 Add CSS styles for logo elements
    - Open `resources/css/tutor-components.css`
    - Add `.sidebar-logo` styles (display: flex, align-items: center, gap: 12px)
    - Add `.sidebar-logo img` styles (width: 48px, border-radius: var(--radius-lg))
    - Add `.message-avatar.avatar-ai img` styles (100% width/height, border-radius: 50%)
    - Add `.header-avatar` styles (44px × 44px, border-radius: var(--radius-lg))
    - Add `.welcome-logo` styles (120px × 120px, border-radius: var(--radius-lg))
    - Add proper object-fit: cover for all logo images
    - _Requirements: 2.1, 3.1, 5.1, 8.2, 9.2_

- [ ] 4. Checkpoint - Verify logo integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Phase 3: Voice Controls Component
  - [ ] 5.1 Create VoiceControls component
    - Create new file `resources/js/components/VoiceControls.jsx`
    - Import lucide-react icons (Mic, MicOff, Volume2, VolumeX)
    - Create VoiceControls function component with props (status, isMuted, onToggleRecording, onToggleMute, disabled)
    - Implement microphone button with status-based className (idle, listening, processing, speaking)
    - Implement mute toggle button with muted state className
    - Add proper aria-label and title attributes for accessibility
    - Use lucide-react SVG icons instead of emoji
    - _Requirements: 6.1, 6.2, 6.3, 6.9_

  - [ ] 5.2 Add voice controls CSS
    - Open `resources/css/tutor-components.css`
    - Add `.voice-controls` container styles (display: flex, gap: 8px)
    - Add `.voice-btn` base styles (40px × 40px, border-radius: var(--radius))
    - Add `.voice-btn-mic.idle` styles (background: var(--blue-d))
    - Add `.voice-btn-mic.listening` styles (background: var(--bad), animation: voice-pulse)
    - Add `.voice-btn-mic.processing` styles (background: var(--warn))
    - Add `.voice-btn-mic.speaking` styles (background: var(--ok))
    - Add `.voice-btn-mute` styles (background: var(--surface))
    - Add `.voice-btn-mute.muted` styles (color: var(--text-muted), opacity: 0.7)
    - Add @keyframes voice-pulse animation (1.5s infinite, box-shadow)
    - Add dark theme variant @keyframes voice-pulse-dark
    - Add prefers-reduced-motion media query to disable animations
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 6.8, 6.10, 12.5, 12.6, 12.7_

  - [ ] 5.3 Integrate VoiceControls into TutorChat
    - Open `resources/js/pages/TutorChat.jsx`
    - Import VoiceControls component
    - Add voiceStatus state (useState with 'idle' initial value)
    - Add isVoiceMuted state (useState with false initial value)
    - Add handleToggleRecording function
    - Add handleToggleMute function
    - Add VoiceControls component to input form between attach button and textarea
    - Pass status, isMuted, callbacks, and disabled props
    - _Requirements: 6.3_

  - [ ] 5.4 Remove old VoiceButton component
    - Remove or deprecate the old `resources/js/components/VoiceButton.jsx` file
    - Remove any imports of VoiceButton from TutorChat
    - Verify that voice functionality still works correctly
    - _Requirements: 6.1_

- [ ] 6. Checkpoint - Verify voice controls integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Phase 4: Responsive Design and Polish
  - [ ] 7.1 Update responsive breakpoints
    - Open `resources/css/tutor-components.css`
    - Verify conversation sidebar is hidden at max-width: 768px
    - Verify mobile menu button is visible at max-width: 768px
    - Verify conversation drawer has max-width: 320px and width: 85%
    - Verify message content has max-width: 70% on desktop and 85% on mobile
    - Update padding values for mobile (12px instead of 16px/20px)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 9.4, 9.5, 9.6, 9.7_

  - [ ] 7.2 Ensure touch targets meet minimum size
    - Verify all voice buttons are 40px × 40px minimum
    - Verify all interactive buttons are 40px × 40px minimum on mobile
    - Update any buttons smaller than minimum size
    - Test on mobile viewport (375px width)
    - _Requirements: 11.7_

  - [ ] 7.3 Update spacing and borders to use design tokens
    - Replace all hardcoded border-radius values with `var(--radius)` (10px)
    - Replace large rounded elements with `var(--radius-lg)` (16px)
    - Update conversation-item padding to 12px
    - Update tutor-chat-messages padding to 20px desktop, 12px mobile
    - Update message-bubble margin-bottom to 20px desktop, 16px mobile
    - Ensure all borders use 1px width and `var(--line)` color
    - Update tutor-chat-input-area padding to 16px 20px desktop, 12px mobile
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 7.4 Update typography to match design system
    - Verify all text inherits font-family from body ('Poppins', system-ui, sans-serif)
    - Update header-title to font-weight: 700
    - Update conversation-item-title to font-weight: 600
    - Update message-text to font-size: 14px and line-height: 1.6
    - Update welcome h1 to font-size: clamp(1.9rem, 5vw, 2.8rem) and font-weight: 700
    - Ensure all monospace text uses ui-monospace, Menlo, monospace
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 7.5 Update animations and transitions to use design tokens
    - Replace all color transitions with `var(--dur-fast)` (180ms) and `var(--ease-in-out)`
    - Replace all transform transitions with `var(--dur-med)` (280ms) and `var(--ease-out)`
    - Update conversation-item hover transform to translateY(-1px) with 280ms duration
    - Verify drawer-backdrop uses fadeOverlay keyframes from app.css
    - Verify typing-dots uses typing-bounce keyframes with 1.4s duration
    - Add prefers-reduced-motion media query to set all animations to 0.01ms
    - Verify voice pulse animation uses 1.5s infinite duration
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ] 8. Checkpoint - Verify responsive design and polish
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Phase 5: Testing and Validation
  - [ ]* 9.1 Create visual regression test for theme switching
    - Create Playwright test file `tests/e2e/ai-tutor-theme.spec.js`
    - Write test to verify light theme colors match design tokens
    - Write test to verify dark theme colors match design tokens
    - Write test to verify theme transitions complete within 180ms
    - Run tests and verify all pass

  - [ ]* 9.2 Create logo rendering tests
    - Create test to verify B3Matika logo displays in sidebar
    - Create test to verify logo displays in AI message avatars
    - Create test to verify logo displays in chat header
    - Create test to verify logo displays in welcome screen
    - Create test to verify fallback to LogoMark on image load error
    - Run tests and verify all pass

  - [ ]* 9.3 Create voice controls tests
    - Create test to verify voice buttons render with lucide-react icons
    - Create test to verify microphone button changes state on click
    - Create test to verify mute button toggles state
    - Create test to verify voice pulse animation applies in listening state
    - Create test to verify buttons are disabled when streaming
    - Run tests and verify all pass

  - [ ]* 9.4 Create responsive design tests
    - Create test to verify sidebar is hidden on mobile viewport (375px)
    - Create test to verify mobile menu button appears on narrow viewport
    - Create test to verify drawer opens and closes on mobile
    - Create test to verify touch targets meet 40px minimum size
    - Create test to verify responsive font sizes work correctly
    - Run tests and verify all pass

  - [ ]* 9.5 Create accessibility tests
    - Create test using axe-core for WCAG AA contrast ratios in light mode
    - Create test using axe-core for WCAG AA contrast ratios in dark mode
    - Create test to verify all voice buttons have aria-label attributes
    - Create test to verify all interactive elements are keyboard accessible
    - Create test to verify focus states are visible
    - Run tests and verify all pass

  - [ ]* 9.6 Manual cross-browser testing
    - Test in Chrome (latest version)
    - Test in Firefox (latest version)
    - Test in Safari (latest version)
    - Test in Edge (latest version)
    - Verify theme switching works in all browsers
    - Verify voice controls work in all browsers (with fallback)
    - Document any browser-specific issues

- [ ] 10. Final checkpoint - Complete implementation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability (e.g., _Requirements: 1.1, 1.2_)
- Checkpoints ensure incremental validation after each major phase
- CSS token migration is the critical path - all other phases depend on it
- Logo integration uses fallback strategy to ensure robustness
- Voice controls use accessible lucide-react icons instead of emoji
- All animations respect prefers-reduced-motion for accessibility
- Testing phase focuses on visual regression, accessibility, and cross-browser compatibility
- No property-based testing is needed as this is primarily UI/styling work

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"] },
    { "id": 2, "tasks": ["3.6"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3"] },
    { "id": 5, "tasks": ["5.4", "7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6"] }
  ]
}
```

# AI Tutor Integration Testing Guide

## 📋 Pre-Testing Checklist

### 1. Database Setup
- [ ] SQL migrations run di Supabase SQL Editor:
  - [ ] `database/006_video_topics.sql`
  - [ ] `database/007_ai_tutor_chat.sql`
  - [ ] `database/008_rate_limiter_table.sql`
- [ ] Storage bucket `tutor-uploads` created di Supabase Storage
- [ ] RLS policies set untuk `tutor-uploads` bucket
- [ ] Verify tables exist:
  ```sql
  SELECT * FROM tutor_conversations LIMIT 1;
  SELECT * FROM tutor_messages LIMIT 1;
  SELECT * FROM tutor_attachments LIMIT 1;
  SELECT * FROM rate_limits LIMIT 1;
  ```

### 2. Environment Setup
- [ ] `GEMINI_API_KEY` set di environment variables
- [ ] Supabase URL dan key configured
- [ ] Logo placed at `public/images/ai-tutor-logo.png`
- [ ] `npm install` dependencies updated
- [ ] `npm run dev` berjalan tanpa error

### 3. Build Check
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] CSS compiled successfully
- [ ] All imports resolved

---

## 🧪 Unit Testing Checklist

### Backend API Endpoints

#### 1. Conversations API (`/api/tutor/conversations`)

**Test: List Conversations (Empty)**
```bash
# Request
curl -X GET http://localhost:3000/api/tutor/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected Response 200
{
  "conversations": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```
- [ ] Returns empty array for new user
- [ ] Pagination object correct

**Test: Create Conversation**
```bash
# Request
curl -X POST http://localhost:3000/api/tutor/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Pythagoras",
    "tone": "baku"
  }'

# Expected Response 201
{
  "conversation": {
    "id": "uuid",
    "title": "Test Pythagoras",
    "tone": "baku",
    "topic_id": null,
    "created_at": "2026-10-22T...",
    "updated_at": "2026-10-22T..."
  }
}
```
- [ ] Conversation created with correct data
- [ ] UUID generated
- [ ] Default tone is 'baku'
- [ ] Timestamps set

**Test: Create with Invalid Data**
```bash
# Empty title
curl -X POST http://localhost:3000/api/tutor/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'

# Expected Response 422
{"error": "Title wajib diisi"}
```
- [ ] Validation for empty title
- [ ] Validation for title > 80 chars
- [ ] Validation for invalid tone

**Test: Rename Conversation**
```bash
curl -X PATCH http://localhost:3000/api/tutor/conversations/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Belajar Pythagoras Lanjutan"}'

# Expected Response 200
{
  "conversation": {
    "id": "uuid",
    "title": "Belajar Pythagoras Lanjutan",
    "updated_at": "2026-10-22T..."
  }
}
```
- [ ] Title updated correctly
- [ ] `updated_at` timestamp changed

**Test: Change Tone**
```bash
curl -X PATCH http://localhost:3000/api/tutor/conversations/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tone": "santai"}'
```
- [ ] Tone changed to 'santai'
- [ ] Invalid tone rejected

**Test: Delete Conversation**
```bash
curl -X DELETE http://localhost:3000/api/tutor/conversations/{id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected Response 200
{"message": "Percakapan berhasil dihapus"}
```
- [ ] Conversation deleted
- [ ] Messages cascade deleted
- [ ] Attachments cascade deleted
- [ ] Files removed from storage

**Test: IDOR Protection**
```bash
# Try to access other user's conversation
curl -X GET http://localhost:3000/api/tutor/conversations/{other_user_conv_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected Response 404
{"error": "Percakapan tidak ditemukan."}
```
- [ ] Cannot access other user's conversations
- [ ] Cannot rename other user's conversations
- [ ] Cannot delete other user's conversations

---

#### 2. Messages API (`/api/tutor/:id/messages`)

**Test: List Messages (Empty)**
```bash
curl -X GET http://localhost:3000/api/tutor/{conversation_id}/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected Response 200
{
  "messages": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 0
  }
}
```
- [ ] Returns empty array for new conversation
- [ ] Pagination correct

**Test: Send Message (Text Only)**
```bash
curl -X POST http://localhost:3000/api/tutor/{conversation_id}/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_message": "Tolong jelaskan teorema pythagoras",
    "attachments": []
  }'

# Expected: SSE Stream
data: {"text":"Teorema "}
data: {"text":"Pythagoras "}
data: {"text":"adalah..."}
data: {"done":true}
```
- [ ] User message saved to database
- [ ] AI response generated
- [ ] SSE streaming works
- [ ] AI message saved to database

**Test: Send Message with Attachments**
- [ ] User message with 1 attachment
- [ ] User message with 3 attachments
- [ ] Validation: max 3 attachments
- [ ] Attachments linked to message

**Test: Message Validation**
- [ ] Empty message rejected (422)
- [ ] Message > 4000 chars rejected (413)
- [ ] Invalid conversation_id rejected (404)
- [ ] Invalid attachment IDs rejected

---

#### 3. Uploads API (`/api/tutor/uploads`)

**Test: Generate Signed URL**
```bash
curl -X POST http://localhost:3000/api/tutor/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "uuid",
    "file_name": "soal.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 245678
  }'

# Expected Response 200
{
  "upload_url": "https://supabase-storage-url...",
  "attachment_id": "uuid",
  "expires_in": 300
}
```
- [ ] Signed URL generated
- [ ] Attachment record created with status 'pending'
- [ ] URL expires in 5 minutes

**Test: File Upload to Signed URL**
```bash
# Upload file using signed URL
curl -X PUT "https://signed-url..." \
  -H "Content-Type: image/jpeg" \
  --data-binary @soal.jpg
```
- [ ] File uploaded successfully
- [ ] File accessible from storage

**Test: File Validation**
```bash
# File too large (> 5MB)
curl -X POST http://localhost:3000/api/tutor/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"conversation_id":"uuid","file_name":"big.jpg","mime_type":"image/jpeg","size_bytes":6000000}'

# Expected Response 422
{"error": "File terlalu besar. Maksimal 5MB."}
```
- [ ] Validation: size > 5MB rejected
- [ ] Validation: invalid mime type rejected
- [ ] Validation: file_name > 120 chars rejected

**Test: Invalid MIME Types**
- [ ] `.exe` rejected
- [ ] `.zip` rejected
- [ ] `.mp4` rejected
- [ ] Only JPG, PNG, WebP, PDF, TXT, DOCX allowed

---

#### 4. Chat API (`/api/chat`)

**Test: Health Check**
```bash
curl http://localhost:3000/api/chat?health=1

# Expected Response 200
{"status":"ok","message":"Layanan AI siap."}
```
- [ ] Health check returns OK
- [ ] Detects missing API key (503)

**Test: Streaming Response**
- [ ] SSE stream format correct
- [ ] Chunks received in order
- [ ] `done` signal received
- [ ] Connection closed properly

**Test: Error Handling**
- [ ] Invalid conversation_id → 404
- [ ] Missing user_message → 422
- [ ] AI timeout → appropriate error
- [ ] API quota exceeded → 429

---

#### 5. Topics API (NEW)

**Test: List Topics**
```bash
curl http://localhost:3000/api/topics

# Expected Response 200
{
  "topics": [
    {
      "id": 1,
      "grade": 1,
      "title": "Pengenalan Angka",
      "content": "...",
      "slug": "pengenalan-angka",
      "summary": "...",
      "description": "..."
    },
    ...
  ]
}
```
- [ ] All topics returned
- [ ] Ordered by grade then sort_order
- [ ] Description extracted from summary or content

**Test: Get Topic Videos**
```bash
curl http://localhost:3000/api/topics/123/videos

# Expected Response 200
{
  "videos": [
    {
      "code": "V1",
      "title": "Pengenalan Pythagoras",
      "url": "https://youtube.com/watch?v=...",
      "duration": "5:30",
      "thumbnail": "https://img.youtube.com/..."
    }
  ]
}
```
- [ ] Videos returned for topic
- [ ] Empty array if no videos
- [ ] 404 if topic not found

---

#### 6. Rate Limiting

**Test: Message Rate Limit (20/10min)**
```bash
# Send 21 messages quickly
for i in {1..21}; do
  curl -X POST http://localhost:3000/api/tutor/{conversation_id}/messages \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d '{"user_message":"Test '$i'"}'
done

# 21st request should return 429
{"error":"Terlalu banyak pesan. Tunggu X menit lagi."}
```
- [ ] First 20 messages succeed
- [ ] 21st message returns 429
- [ ] Error message shows countdown

**Test: Upload Rate Limit (15/hour)**
- [ ] First 15 uploads succeed
- [ ] 16th upload returns 429

**Test: Conversation Rate Limit (30/hour)**
- [ ] First 30 conversations succeed
- [ ] 31st conversation returns 429

---

## 🎨 Frontend Component Testing

### 1. ConversationList Component

**Test: Initial Load**
- [ ] Shows loading spinner on mount
- [ ] Loads conversations from API
- [ ] Shows empty state if no conversations
- [ ] "Percakapan Baru" button visible

**Test: Create Conversation**
- [ ] Click "Percakapan Baru"
- [ ] Loading indicator shows
- [ ] New conversation added to list
- [ ] Auto-selected after creation
- [ ] Title format: "Chat DD MMM HH:MM"

**Test: Pagination**
- [ ] Load first 20 conversations
- [ ] "Muat lebih banyak" button shows if hasMore
- [ ] Clicking loads next page
- [ ] Conversations appended to list

**Test: Error Handling**
- [ ] Network error shows error message
- [ ] Retry after error works

---

### 2. ConversationItem Component

**Test: Display**
- [ ] Shows conversation icon
- [ ] Shows title (truncated if long)
- [ ] Shows tone badge (😎 or 📚)
- [ ] Shows relative timestamp
- [ ] Active conversation highlighted

**Test: Rename**
- [ ] Click edit icon
- [ ] Input field appears with current title
- [ ] Type new title
- [ ] Press Enter → title saved
- [ ] Press Escape → cancel rename
- [ ] Click outside → save changes
- [ ] Validation: empty title rejected
- [ ] Validation: > 80 chars rejected

**Test: Delete**
- [ ] Click delete icon
- [ ] Confirmation dialog appears
- [ ] Cancel → nothing happens
- [ ] Confirm → conversation deleted
- [ ] Messages deleted (cascade)
- [ ] Attachments deleted (cascade)
- [ ] Next conversation auto-selected

**Test: Hover Effects**
- [ ] Action buttons show on hover (desktop)
- [ ] Action buttons always show on active item
- [ ] Hover background changes

---

### 3. MessageBubble Component

**Test: User Message Display**
- [ ] User avatar (orange gradient)
- [ ] Message bubble (blue background)
- [ ] Right-aligned
- [ ] Timestamp below

**Test: AI Message Display**
- [ ] AI avatar (blue gradient)
- [ ] Message bubble (white background)
- [ ] Left-aligned
- [ ] Markdown rendering works:
  - [ ] **Bold text**
  - [ ] *Italic text*
  - [ ] `Inline code`
  - [ ] Code blocks with syntax highlight
  - [ ] Lists (ul, ol)
  - [ ] Blockquotes

**Test: Attachments Display**
- [ ] Image attachments show thumbnail
- [ ] Click image → opens in new tab (signed URL)
- [ ] PDF shows file icon + name + size
- [ ] Click PDF → opens in new tab
- [ ] Max 3 attachments per message

**Test: Material Recommendations**
- [ ] Parse `TOPIK[123]` from AI response
- [ ] Render MaterialCard for each topic
- [ ] Card shows:
  - [ ] Book icon
  - [ ] Grade badge
  - [ ] Topic title
  - [ ] Description (truncated)
  - [ ] External link icon
- [ ] Click card → navigate to `/materi/:id`
- [ ] Hover effect (scale up, shadow)

**Test: Video Recommendations**
- [ ] Parse `V1`, `V2` from AI response
- [ ] Render VideoCard for each code
- [ ] Card shows:
  - [ ] YouTube thumbnail
  - [ ] Video code badge
  - [ ] Video title
  - [ ] Duration
  - [ ] Play icon overlay on hover
- [ ] Click card → opens YouTube in new tab
- [ ] Hover effect (play button appears)

---

### 4. FileUploader Component

**Test: Drag & Drop**
- [ ] Drag file over zone → border turns blue
- [ ] Drop file → upload starts
- [ ] Multiple files → all uploaded sequentially
- [ ] Preview shown for images
- [ ] File icon shown for non-images

**Test: File Picker**
- [ ] Click zone → file picker opens
- [ ] Select file → upload starts
- [ ] Select multiple → all uploaded

**Test: File Validation**
- [ ] File > 5MB → error message
- [ ] Invalid type (.exe) → error message
- [ ] 4th file → error message (max 3)
- [ ] Valid file → success

**Test: Upload Progress**
- [ ] Shows "Uploading..." text
- [ ] Disable drop zone during upload
- [ ] Show preview after upload complete

**Test: Remove Attachment**
- [ ] Click X button on preview
- [ ] Attachment removed from list
- [ ] Can add more files after remove

---

### 5. ToneSwitch Component

**Test: Display**
- [ ] Shows "📚 Baku" and "😎 Santai" labels
- [ ] Slider on correct side based on current tone
- [ ] Animated transition when switching

**Test: Toggle Functionality**
- [ ] Click switch → tone changes
- [ ] API call made to update conversation
- [ ] Slider animates to other side
- [ ] Shows "Mengubah..." during API call
- [ ] Disabled during API call

**Test: Error Handling**
- [ ] Network error → alert shown
- [ ] Tone reverted to previous value

---

### 6. TutorChat Main Component

**Test: Welcome Screen**
- [ ] Shows when no conversation selected
- [ ] Logo displayed (if file exists)
- [ ] Welcome message shown
- [ ] "Mulai Percakapan Baru" button
- [ ] Mobile menu button visible (mobile)

**Test: Header**
- [ ] Shows AI avatar
- [ ] Shows conversation title
- [ ] Shows status indicator:
  - [ ] Green = online
  - [ ] Yellow = checking
  - [ ] Red = offline
- [ ] Mobile menu button (mobile only)

**Test: Messages Area**
- [ ] Loading state on initial load
- [ ] Empty state if no messages
- [ ] Messages render correctly
- [ ] Auto-scroll to bottom on new message
- [ ] Scroll position maintained on load more

**Test: Input Area**
- [ ] Textarea auto-resizes (min 40px, max 120px)
- [ ] Character counter updates (max 4000)
- [ ] Attach button shows badge if attachments present
- [ ] Send button disabled if empty input
- [ ] Send button disabled while streaming

**Test: File Upload Panel**
- [ ] Click paperclip → uploader panel opens
- [ ] Close button hides panel
- [ ] FileUploader component rendered
- [ ] AttachmentPreview shown below

**Test: Send Message**
- [ ] Type message → click send
- [ ] User message appears immediately
- [ ] Input cleared
- [ ] Attachments cleared
- [ ] Typing indicator appears
- [ ] AI response streams in real-time
- [ ] Message saved after streaming complete

**Test: SSE Streaming**
- [ ] Chunks received and displayed
- [ ] Full text accumulated correctly
- [ ] Done signal stops streaming
- [ ] Error handling if stream fails

**Test: Keyboard Shortcuts**
- [ ] Enter → send message
- [ ] Shift+Enter → new line
- [ ] Escape (when focused) → blur input

---

### 7. Responsive Design Testing

**Test: Desktop (> 768px)**
- [ ] Sidebar visible (320px width)
- [ ] Mobile menu button hidden
- [ ] Message bubbles max 70% width
- [ ] Material/video cards in 2 columns

**Test: Tablet (640px - 768px)**
- [ ] Sidebar hidden
- [ ] Mobile menu button visible
- [ ] Drawer slides from left when clicked
- [ ] Message bubbles max 80% width
- [ ] Material/video cards in 2 columns

**Test: Mobile (< 640px)**
- [ ] Sidebar hidden
- [ ] Mobile menu button visible
- [ ] Drawer 85% width
- [ ] Message bubbles max 85% width
- [ ] Material/video cards in 1 column
- [ ] Touch-friendly button sizes
- [ ] No horizontal scroll

---

## 🔒 Security Testing

### 1. Authentication

**Test: Unauthenticated Access**
- [ ] All conversation endpoints return 401
- [ ] All message endpoints return 401
- [ ] All upload endpoints return 401
- [ ] Health check accessible without auth

### 2. IDOR Protection

**Test: Cross-User Access**
- [ ] Cannot list other user's conversations
- [ ] Cannot read other user's messages
- [ ] Cannot send message to other user's conversation
- [ ] Cannot rename other user's conversation
- [ ] Cannot delete other user's conversation
- [ ] Cannot access other user's attachments

### 3. Input Validation

**Test: SQL Injection**
- [ ] Conversation title with SQL: `'; DROP TABLE --`
- [ ] Message content with SQL
- [ ] No SQL injection possible (parameterized queries)

**Test: XSS Prevention**
- [ ] Message with `<script>alert('XSS')</script>`
- [ ] Conversation title with HTML tags
- [ ] Markdown rendering sanitized
- [ ] No XSS execution

### 4. File Upload Security

**Test: Malicious Files**
- [ ] `.exe` file rejected
- [ ] `.sh` script rejected
- [ ] Oversized file rejected
- [ ] Filename with path traversal (`../../etc/passwd`)

### 5. Rate Limiting

- [ ] Rate limits enforced per user
- [ ] Cannot bypass with multiple tabs
- [ ] Countdown timer accurate
- [ ] Limits reset after window expires

---

## ⚡ Performance Testing

### 1. Load Time

**Test: Initial Page Load**
- [ ] Page loads in < 3 seconds
- [ ] CSS loaded and applied
- [ ] No FOUC (Flash of Unstyled Content)
- [ ] Loading indicators shown appropriately

**Test: Conversation List**
- [ ] 20 conversations load in < 2 seconds
- [ ] Pagination smooth (no flicker)
- [ ] Scroll performance good (60fps)

**Test: Message History**
- [ ] 50 messages load in < 1 second
- [ ] Rendering performance good
- [ ] Auto-scroll smooth

### 2. Streaming Performance

**Test: SSE Streaming**
- [ ] First chunk arrives in < 3 seconds
- [ ] No lag between chunks
- [ ] UI remains responsive during streaming
- [ ] No memory leaks after multiple messages

### 3. File Upload

**Test: Upload Speed**
- [ ] 1MB image uploads in < 5 seconds
- [ ] 5MB PDF uploads in < 10 seconds
- [ ] Multiple files upload sequentially
- [ ] Progress indication accurate

### 4. Memory Usage

**Test: Memory Leaks**
- [ ] Open multiple conversations → no leak
- [ ] Send 50 messages → no leak
- [ ] Upload 20 files → no leak
- [ ] Preview images cleaned up (URL.revokeObjectURL)

---

## 🐛 Bug Report Template

When you find a bug, report it with this format:

```markdown
### Bug Title

**Severity:** Critical / High / Medium / Low

**Environment:**
- Browser: Chrome 120 / Firefox 121 / Safari 17
- Device: Desktop / Mobile / Tablet
- OS: Windows 11 / macOS 14 / Android 13

**Steps to Reproduce:**
1. Go to AI Tutor page
2. Click "Percakapan Baru"
3. ...

**Expected Behavior:**
Conversation should be created and selected.

**Actual Behavior:**
Error message appears: "..."

**Screenshots:**
[Attach screenshots if applicable]

**Console Errors:**
```
Error: ...
```

**Additional Context:**
Any other relevant information.
```

---

## ✅ Sign-Off Checklist

Before marking Phase 3 complete:

### Functionality
- [ ] All API endpoints working
- [ ] All frontend components rendering
- [ ] No console errors
- [ ] No network errors (except expected)

### User Experience
- [ ] Loading states shown
- [ ] Empty states shown
- [ ] Error messages user-friendly
- [ ] Animations smooth
- [ ] Responsive on all devices

### Security
- [ ] Authentication required
- [ ] IDOR protection verified
- [ ] Input validation working
- [ ] Rate limiting enforced

### Performance
- [ ] Page load < 3s
- [ ] API calls < 2s
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] ARIA labels on buttons

### Documentation
- [ ] API documented
- [ ] Components documented
- [ ] Testing guide complete
- [ ] Known issues listed

---

## 📝 Test Execution Log

Log your test results here:

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| API-1   | List Conversations | ⏳ | |
| API-2   | Create Conversation | ⏳ | |
| ... | ... | ... | ... |

**Legend:**
- ⏳ Pending
- ✅ Passed
- ❌ Failed
- ⚠️ Warning
- 🔧 Fixed

---

## 🎯 Priority Testing Order

1. **Critical Path (P0):**
   - [ ] Create conversation
   - [ ] Send message
   - [ ] Receive AI response
   - [ ] Display messages

2. **Core Features (P1):**
   - [ ] File upload
   - [ ] Material recommendations
   - [ ] Video recommendations
   - [ ] Tone switcher

3. **Secondary Features (P2):**
   - [ ] Rename conversation
   - [ ] Delete conversation
   - [ ] Pagination
   - [ ] Rate limiting

4. **Polish (P3):**
   - [ ] Animations
   - [ ] Empty states
   - [ ] Error messages
   - [ ] Mobile responsive

---

**Last Updated:** 2026-10-22  
**Tester:** [Your Name]  
**Status:** In Progress

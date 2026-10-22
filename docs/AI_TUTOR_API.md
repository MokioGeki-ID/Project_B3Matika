# AI Tutor API Documentation

## Overview
Backend API untuk fitur AI Tutor dengan conversation history, file uploads, dan rekomendasi material/video.

## Authentication
Semua endpoint (kecuali health check) memerlukan authentication via JWT token di header `Authorization: Bearer <token>`.

---

## Endpoints

### 1. Conversations Management

#### GET `/api/tutor/conversations`
List semua percakapan user dengan pagination.

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 20, max 50

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Belajar Pythagoras",
      "tone": "baku",
      "topic_id": 123,
      "created_at": "2026-10-22T10:00:00Z",
      "updated_at": "2026-10-22T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

#### POST `/api/tutor/conversations`
Buat percakapan baru.

**Request Body:**
```json
{
  "title": "Belajar Aljabar",
  "tone": "santai",
  "topic_id": 456
}
```

**Validation:**
- `title`: required, string, 1-80 chars
- `tone`: optional, enum `baku|santai`, default `baku`
- `topic_id`: optional, bigint

**Response 201:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Belajar Aljabar",
    "tone": "santai",
    "topic_id": 456,
    "created_at": "2026-10-22T11:00:00Z"
  }
}
```

---

#### PATCH `/api/tutor/conversations/:id`
Update title atau tone percakapan.

**Request Body:**
```json
{
  "title": "Belajar Aljabar Lanjutan",
  "tone": "baku"
}
```

**Validation:**
- `title`: optional, string, 1-80 chars
- `tone`: optional, enum `baku|santai`
- At least one field must be provided

**Response 200:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Belajar Aljabar Lanjutan",
    "tone": "baku",
    "updated_at": "2026-10-22T11:30:00Z"
  }
}
```

---

#### DELETE `/api/tutor/conversations/:id`
Hapus percakapan beserta semua pesan dan file attachments.

**Response 200:**
```json
{
  "message": "Percakapan berhasil dihapus"
}
```

**Note:** Akan menghapus:
- Conversation record
- Semua messages
- Semua attachments dari storage
- Semua attachment records

---

### 2. Messages Management

#### GET `/api/tutor/:id/messages`
List semua pesan dalam satu percakapan.

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 50, max 100

**Response 200:**
```json
{
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "Tolong jelaskan teorema pythagoras",
      "meta": {},
      "created_at": "2026-10-22T10:00:00Z",
      "attachments": [
        {
          "id": "uuid",
          "file_name": "soal.jpg",
          "mime_type": "image/jpeg",
          "size_bytes": 245678,
          "url": "https://signed-url-expires-in-5-min"
        }
      ]
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Teorema Pythagoras adalah...",
      "meta": {
        "topic_ids": [123],
        "video_codes": ["V1", "V2"]
      },
      "created_at": "2026-10-22T10:01:00Z",
      "attachments": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1
  }
}
```

---

#### POST `/api/tutor/:id/messages`
Kirim pesan baru (user) dan dapatkan respon AI.

**Request Body:**
```json
{
  "user_message": "Tolong jelaskan teorema pythagoras",
  "attachments": ["attachment-uuid-1", "attachment-uuid-2"]
}
```

**Validation:**
- `user_message`: required, string, 1-4000 chars
- `attachments`: optional, array of UUIDs, max 3 items

**Response 200 (Server-Sent Events):**
```
data: {"text":"Teorema "}
data: {"text":"Pythagoras "}
data: {"text":"adalah..."}
data: {"done":true}
```

**Error Response:**
```
data: {"error":"AI tidak memberikan jawaban, coba kirim ulang."}
```

---

### 3. File Uploads

#### POST `/api/tutor/uploads`
Generate signed URL untuk upload file langsung ke storage.

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "file_name": "soal-matematika.jpg",
  "mime_type": "image/jpeg",
  "size_bytes": 245678
}
```

**Validation:**
- `conversation_id`: required, UUID
- `file_name`: required, string, max 120 chars
- `mime_type`: required, must be in allowed list:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `application/pdf`
  - `text/plain`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `size_bytes`: required, number, max 5242880 (5MB)

**Response 200:**
```json
{
  "upload_url": "https://storage-signed-url-expires-in-5-min",
  "attachment_id": "uuid",
  "expires_in": 300
}
```

**Upload Flow:**
1. Client request signed URL dari endpoint ini
2. Client upload file langsung ke storage menggunakan `upload_url` (PUT request)
3. Client kirim `attachment_id` bersama message ke POST `/api/tutor/:id/messages`
4. Backend link attachment ke message dan update status menjadi `attached`

---

### 4. AI Chat Proxy

#### POST `/api/chat`
Kirim pesan ke AI dengan context conversation, attachments, dan material/video catalog.

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "user_message": "Tolong jelaskan teorema pythagoras",
  "attachments": ["attachment-uuid-1"]
}
```

**Response:** Server-Sent Events (SSE) stream

**Note:** Endpoint ini digunakan internal oleh `POST /api/tutor/:id/messages`. Frontend bisa langsung pakai endpoint messages.

---

#### GET `/api/chat?health=true`
Health check untuk AI service (no auth required).

**Response 200:**
```json
{
  "status": "ok",
  "message": "Layanan AI siap."
}
```

**Response 503:**
```json
{
  "status": "down",
  "message": "API Key Gemini belum dikonfigurasi."
}
```

---

## Rate Limits

- **Messages**: 20 per 10 minutes
- **Uploads**: 15 per hour
- **Conversations**: 30 per hour

Rate limit tracked per user in `rate_limits` table.

**Rate Limit Response 429:**
```json
{
  "error": "Terlalu banyak pesan. Tunggu 3 menit lagi."
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Token tidak valid atau sudah kedaluwarsa."
}
```

### 404 Not Found
```json
{
  "error": "Percakapan tidak ditemukan."
}
```

### 422 Unprocessable Entity
```json
{
  "error": "conversation_id wajib diisi."
}
```

### 500 Internal Server Error
```json
{
  "error": "Gagal memuat riwayat chat."
}
```

---

## Database Schema

### tutor_conversations
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
title TEXT (1-80 chars)
tone TEXT ('baku' | 'santai') DEFAULT 'baku'
topic_id BIGINT REFERENCES topics(id) NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### tutor_messages
```sql
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE
role TEXT ('user' | 'assistant')
content TEXT (max 12000 chars)
meta JSONB DEFAULT '{}'
created_at TIMESTAMPTZ
```

### tutor_attachments
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES users(id)
conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE
message_id BIGINT REFERENCES tutor_messages(id) NULL
storage_path TEXT UNIQUE
file_name TEXT (max 120 chars)
mime_type TEXT
size_bytes INTEGER (max 5242880)
status TEXT ('pending' | 'attached') DEFAULT 'pending'
created_at TIMESTAMPTZ
```

### rate_limits
```sql
user_id UUID NOT NULL REFERENCES users(id)
action TEXT
window_start TIMESTAMPTZ
attempt_count INTEGER
PRIMARY KEY (user_id, action, window_start)
```

---

## Material & Video Context

AI system prompt includes:

### Topic Catalog Format
```
📚 KATALOG MATERI TERSEDIA:
TOPIK[1] Kelas 1 - Pengenalan Angka
TOPIK[2] Kelas 1 - Penjumlahan Sederhana
...
```

AI can recommend: "Kamu bisa baca materi TOPIK[123] tentang Teorema Pythagoras"

### Video Catalog Format
```
🎥 VIDEO TUTORIAL TERSEDIA:
V1: Pengenalan Pythagoras (5:30)
V2: Contoh Soal Pythagoras (8:15)
...
```

AI can recommend: "Tonton video V1 untuk penjelasan visual"

Backend will replace video codes with actual YouTube links before saving to database.

---

## Security Features

1. **IDOR Protection**: All queries verify `user_id` matches authenticated user
2. **Rate Limiting**: Database-based tracking (serverless-friendly)
3. **File Validation**: Mime type, size, and extension checks
4. **Signed URLs**: 5-minute expiry for uploads (bypass Vercel 4.5MB body limit)
5. **YouTube Sanitization**: Remove unauthorized YouTube links from AI responses
6. **Input Validation**: Length limits on all user inputs
7. **SQL Injection**: Parameterized queries via Supabase client
8. **CASCADE DELETE**: Automatic cleanup of related records

---

## Setup Checklist

- [ ] Run SQL migrations in Supabase:
  - [ ] `database/006_video_topics.sql`
  - [ ] `database/007_ai_tutor_chat.sql`
  - [ ] `database/008_rate_limiter_table.sql`
- [ ] Verify storage bucket `tutor-uploads` exists in Supabase
- [ ] Set RLS policies for `tutor_uploads` bucket
- [ ] Place AI Tutor logo at `public/images/ai-tutor-logo.png`
- [ ] Test all endpoints with Postman/Thunder Client
- [ ] Verify IDOR protection (try accessing other user's conversations)
- [ ] Test rate limiting (send 21 messages quickly)
- [ ] Test file upload flow (signed URL → upload → attach to message)
- [ ] Test conversation deletion (verify cascade delete of messages & attachments)

---

## Next Phase: Frontend

After backend testing complete:

1. Create `ConversationSidebar.jsx` component
2. Create `FileUploader.jsx` component  
3. Create `MaterialCard.jsx` component
4. Create `VideoCard.jsx` component
5. Update `TutorChat.jsx` to use new API
6. Add tone switcher UI
7. Add logo display
8. Mobile-responsive testing
9. Integration testing
10. Deploy & production testing

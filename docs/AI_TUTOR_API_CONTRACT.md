# AI Tutor API Contract

Dokumentasi resmi endpoint API untuk fitur AI Tutor B3Matika.

**Base URL:** `/api/tutor`

**Authentication:** Bearer token di header `Authorization: Bearer {token}`

**Response Format:**
- Success: HTTP 200/201/204 dengan JSON body
- Error: HTTP 4xx/5xx dengan format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "requestId": "req_xxx"
  }
}
```

---

## Conversations

### GET /api/tutor/conversations

List semua conversations user (paginated).

**Query Parameters:**
- `cursor` (optional): Last message timestamp untuk pagination

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Judul percakapan",
      "tone": "baku" | "santai",
      "topic_id": 123 | null,
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "last_message_at": "ISO8601",
      "message_count": 5
    }
  ],
  "nextCursor": "ISO8601" | null,
  "hasMore": true | false
}
```

---

### GET /api/tutor/conversations/:id

Get single conversation by ID.

**Path Parameters:**
- `id`: UUID conversation

**Response 200:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Judul percakapan",
    "tone": "baku" | "santai",
    "topic_id": 123 | null,
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "last_message_at": "ISO8601",
    "message_count": 5
  }
}
```

**Response 404:** Conversation tidak ditemukan atau bukan milik user.

---

### POST /api/tutor/conversations

Create conversation baru.

**Request Body:**
```json
{
  "title": "Judul (opsional, max 80 karakter)",
  "tone": "baku" | "santai",
  "topic_id": 123 | null
}
```

**Response 201:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Judul percakapan",
    "tone": "baku",
    "topic_id": null,
    "created_at": "ISO8601",
    "updated_at": "ISO8601",
    "last_message_at": "ISO8601"
  }
}
```

---

### PATCH /api/tutor/conversations/:id

Update conversation (rename atau ubah tone).

**Path Parameters:**
- `id`: UUID conversation

**Request Body:**
```json
{
  "title": "Judul baru (1-80 karakter)",
  "tone": "baku" | "santai"
}
```

**Response 200:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Judul baru",
    "tone": "santai",
    ...
  }
}
```

**Response 404:** Conversation tidak ditemukan atau bukan milik user.

---

### DELETE /api/tutor/conversations/:id

Delete conversation beserta messages dan attachments.

**Path Parameters:**
- `id`: UUID conversation

**Response 200:**
```json
{
  "message": "Obrolan berhasil dihapus.",
  "deleted_id": "uuid"
}
```

**Response 404:** Conversation tidak ditemukan atau bukan milik user.

**Side Effects:**
- Cascade delete ke `tutor_messages` dan `tutor_attachments`
- Best-effort delete files dari storage bucket

---

## Messages

### GET /api/tutor/:id/messages

Get semua messages dalam conversation.

**Path Parameters:**
- `id`: UUID conversation

**Response 200:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user" | "assistant",
      "content": "Text content",
      "meta": {},
      "created_at": "ISO8601",
      "attachments": [
        {
          "id": "uuid",
          "message_id": "uuid",
          "file_name": "filename.pdf",
          "mime_type": "application/pdf",
          "size_bytes": 12345,
          "url": "signed_url (expires in 5 minutes)",
          "created_at": "ISO8601"
        }
      ]
    }
  ],
  "conversation_id": "uuid"
}
```

**Response 404:** Conversation tidak ditemukan atau bukan milik user.

---

### POST /api/tutor/:id/messages

Send message user dan simpan ke database. 
**CATATAN:** Untuk mendapat AI response, panggil `/api/chat` setelahnya.

**Path Parameters:**
- `id`: UUID conversation

**Request Body:**
```json
{
  "content": "Pesan user (1-4000 karakter)",
  "attachment_ids": ["uuid1", "uuid2"]  // Optional, max 3
}
```

**Response 201:**
```json
{
  "message": {
    "id": "uuid",
    "role": "user",
    "content": "Pesan user",
    "meta": {},
    "created_at": "ISO8601"
  },
  "conversation_id": "uuid",
  "attachments": [
    {
      "id": "uuid",
      "file_name": "filename.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 12345
    }
  ],
  "ai_response_pending": true
}
```

**Response 404:** Conversation tidak ditemukan atau bukan milik user.

**Response 422:** Validation error (content kosong, terlalu panjang, attachment tidak valid).

**Response 429:** Rate limit exceeded.

---

## Uploads

### POST /api/tutor/uploads

Request signed URL untuk upload file ke storage.

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "file_name": "filename.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 12345
}
```

**Response 200:**
```json
{
  "upload_url": "https://supabase.co/storage/...",
  "attachment_id": "uuid",
  "storage_path": "user_id/conversation_id/file_id.pdf",
  "token": "supabase_token",
  "expires_in": 300
}
```

**Allowed MIME Types:**
- `image/jpeg`, `image/png`, `image/webp`
- `application/pdf`
- `text/plain`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)

**Max File Size:** 5 MB

**Response 422:** Validation error (file terlalu besar, mime type tidak didukung).

**Response 404:** Conversation tidak ditemukan atau bukan milik user.

---

## Health Check

### GET /api/tutor/health

Diagnostik status AI Tutor (khusus admin).

**Response 200:**
```json
{
  "status": "healthy" | "degraded",
  "timestamp": "ISO8601",
  "checks": {
    "environment": {
      "required": {
        "SUPABASE_URL": true,
        "SUPABASE_SERVICE_ROLE_KEY": true,
        "GEMINI_API_KEY": true,
        "JWT_SECRET": true
      },
      "optional": {},
      "all_required_present": true
    },
    "database": {
      "ok": true,
      "message": "Koneksi database OK"
    },
    "tables": {
      "tutor_conversations": { "exists": true, "message": "OK" },
      "tutor_messages": { "exists": true, "message": "OK" },
      "tutor_attachments": { "exists": true, "message": "OK" },
      "rate_limits": { "exists": true, "message": "OK" }
    },
    "storage": {
      "ok": true,
      "message": "Bucket tutor-uploads tersedia",
      "public": false
    },
    "ai_provider": {
      "ok": true,
      "message": "SDK AI tersedia",
      "keys_count": 2,
      "model": "gemini-3.8-flash"
    }
  }
}
```

**Response 401:** Unauthenticated.

---

## Error Codes

| Code | HTTP | Deskripsi |
|------|------|-----------|
| `ROUTE_NOT_FOUND` | 404 | Endpoint tidak ditemukan |
| `UNAUTHENTICATED` | 401 | Token tidak valid atau sudah expired |
| `FORBIDDEN` | 403 | User tidak punya akses ke resource |
| `VALIDATION_ERROR` | 422 | Input tidak valid |
| `RATE_LIMITED` | 429 | Terlalu banyak request |
| `AI_UNAVAILABLE` | 502/503 | Penyedia AI tidak bisa dihubungi |
| `AI_TIMEOUT` | 504 | AI response timeout |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limits

- **Create conversation:** 10 per 5 menit
- **Send message:** 20 per menit
- **Upload file:** 10 per 5 menit

Rate limit dihitung per `user_id`.

---

## Notes

1. **Conversation Creation:** Best practice adalah buat conversation saat user mengirim pesan pertama, bukan saat klik tombol "Percakapan Baru".

2. **AI Response:** Backend `/api/tutor/:id/messages` hanya menyimpan pesan user. Untuk mendapat AI response, frontend harus memanggil `/api/chat` dengan `conversation_id` dan `user_message`.

3. **Title Auto-generation:** Jika conversation dibuat dengan title "Percakapan Baru" atau "Obrolan baru", backend akan auto-generate title dari pesan user pertama (maksimal 60 karakter).

4. **File Uploads:** Flow:
   - Request signed URL via `/api/tutor/uploads`
   - Upload file langsung ke Supabase storage via signed URL
   - Kirim `attachment_ids` saat POST message
   - Backend akan link attachments ke message

5. **Streaming:** Endpoint `/api/chat` mengembalikan Server-Sent Events (SSE) untuk streaming AI response real-time.

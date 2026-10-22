# Bugfix Requirements Document

## Introduction

Bug pada halaman AI Tutor (/ai-tutor) di B3Matika yang menyebabkan fitur tidak dapat digunakan sama sekali. Error utama adalah "Se.post is not a function" yang muncul di sidebar, mengakibatkan kegagalan memuat percakapan. Selain itu, terdapat masalah tampilan pada gambar dan ikon yang tidak sesuai dengan logo B3Matika.

Bug ini berdampak kritis karena membuat seluruh fitur AI Tutor tidak dapat diakses oleh pengguna. Penyebab utama adalah ketidaksesuaian antara implementasi API client (`api.js`) yang mengekspor sebuah fungsi, namun kode komponen mengharapkan objek dengan method `get`, `post`, `patch`, dan `delete`.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN pengguna mengakses halaman /ai-tutor THEN sistem menampilkan error "Se.post is not a function" (di mana "Se" adalah hasil minifikasi dari objek `api`) dan menampilkan pesan "Gagal memuat percakapan"

1.2 WHEN komponen `ConversationList` mencoba memanggil `api.get('/api/tutor/conversations')` THEN sistem throw error karena method `get` tidak ada pada fungsi `api`

1.3 WHEN komponen `ConversationList` mencoba memanggil `api.post('/api/tutor/conversations')` THEN sistem throw error karena method `post` tidak ada pada fungsi `api`

1.4 WHEN komponen `ConversationList` mencoba memanggil `api.patch()` atau `api.delete()` THEN sistem throw error karena method tersebut tidak ada pada fungsi `api`

1.5 WHEN komponen `TutorChat` mencoba memanggil `api.get()` atau `api.patch()` THEN sistem throw error karena method tersebut tidak ada pada fungsi `api`

1.6 WHEN halaman /ai-tutor ditampilkan di welcome screen THEN gambar logo AI Tutor menampilkan broken image karena file `/images/ai-tutor-logo.png` tidak ada

1.7 WHEN sidebar AI Tutor ditampilkan THEN ikon yang muncul adalah ikon robot generic (dari lucide-react `Bot` component) bukan logo B3Matika

1.8 WHEN error terjadi pada pemanggilan API THEN seluruh UI AI Tutor menjadi tidak responsif dan tidak ada error handling yang memadai untuk menampilkan pesan user-friendly

### Expected Behavior (Correct)

2.1 WHEN pengguna mengakses halaman /ai-tutor THEN sistem SHALL memuat daftar percakapan tanpa error dan menampilkan UI yang berfungsi penuh

2.2 WHEN komponen `ConversationList` memanggil `api.get('/api/tutor/conversations')` THEN sistem SHALL mengeksekusi HTTP GET request ke endpoint tersebut dengan token autentikasi yang benar

2.3 WHEN komponen `ConversationList` memanggil `api.post('/api/tutor/conversations', { data })` THEN sistem SHALL mengeksekusi HTTP POST request dengan body data yang diberikan

2.4 WHEN komponen memanggil `api.patch(url, data)` atau `api.delete(url)` THEN sistem SHALL mengeksekusi HTTP request dengan method yang sesuai

2.5 WHEN komponen `TutorChat` memanggil method API (get/post/patch) THEN sistem SHALL berhasil berkomunikasi dengan backend tanpa error

2.6 WHEN halaman /ai-tutor ditampilkan di welcome screen THEN gambar SHALL menampilkan logo B3Matika (menggunakan file `logo.png` atau `logo-b3.jpeg` yang sudah ada di folder public)

2.7 WHEN sidebar AI Tutor ditampilkan THEN ikon SHALL menampilkan logo B3Matika yang sama dengan yang digunakan di navbar utama, bukan ikon robot generic

2.8 WHEN error terjadi pada pemanggilan API THEN sistem SHALL menampilkan pesan error yang jelas dan user-friendly tanpa membuat seluruh UI rusak

### Unchanged Behavior (Regression Prevention)

3.1 WHEN pengguna menggunakan fitur voice input atau voice response di AI Tutor THEN sistem SHALL CONTINUE TO menyediakan fungsionalitas suara tersebut tanpa perubahan

3.2 WHEN pengguna mengirim pesan dengan file attachment THEN sistem SHALL CONTINUE TO dapat mengunggah dan menampilkan attachment dengan benar

3.3 WHEN pengguna menggunakan fitur streaming response dari AI THEN sistem SHALL CONTINUE TO menampilkan response secara real-time seperti sebelumnya

3.4 WHEN pengguna berada di halaman selain /ai-tutor THEN sistem SHALL CONTINUE TO berfungsi normal tanpa terpengaruh oleh perbaikan bug ini

3.5 WHEN API endpoint `/api/chat` dipanggil dengan fetch langsung (bukan melalui api helper) THEN sistem SHALL CONTINUE TO berfungsi seperti sebelumnya

3.6 WHEN komponen lain yang menggunakan fungsi `api()` dengan cara yang benar (memanggil `api(path, { method, body })`) THEN sistem SHALL CONTINUE TO berfungsi tanpa gangguan

3.7 WHEN pengguna mengubah tone percakapan (baku/santai) THEN sistem SHALL CONTINUE TO menyimpan dan menerapkan preferensi tone dengan benar

3.8 WHEN pengguna menghapus percakapan THEN sistem SHALL CONTINUE TO menghapus conversation beserta messages dan attachments dari database dan storage

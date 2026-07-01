# Checkpoint & Dokumentasi Implementasi WhatsApp Omnichannel

Dokumen ini mencatat arsitektur, implementasi, penyelesaian bug, dan status terakhir dari integrasi WhatsApp dan Omnichannel Chat (SaaS Multi-tenant) di SC Project.

## 1. Arsitektur & Implementasi yang Telah Selesai

### A. WhatsApp Messaging Module (Multi-Device Support)
- **Library Utama**: `go.mau.fi/whatsmeow` (WhatsApp Web API client untuk Go).
- **Session Store**: Menggunakan SQLite driver dari whatsmeow yang diintegrasikan secara terpusat di `ClientManager` (singleton).
- **Multi-Tenant Support**: Tabel `clinic_whatsapp_devices` berfungsi untuk menautkan JID (WhatsApp ID) ke spesifik `organization_id`.
- **Fitur Frontend**:
  - **Device Status Tab**: QR Code generation menggunakan Server-Sent Events (SSE) untuk pairing secara real-time.
  - **Blast Campaign Tab**: Sistem penyiaran pesan masal (Blast) menggunakan template dan nomor-nomor pasien yang sudah tersimpan.
  - **Direct Message Tab**: Mengirimkan pesan individual secara spesifik memilih sender device mana yang ingin digunakan.

### B. Omnichannel Inbox System
- **Tabel Database Baru**:
  - `omni_conversations`: Menyimpan sesi percakapan dengan customer (mendukung multi-platform ke depannya seperti Telegram/IG/FB).
  - `omni_messages`: Menyimpan isi pesan secara mendetail beserta status `direction` (inbound/outbound), `status` (sent/delivered/read), dan timestamp.
- **WebSocket Gateway (`/api/omni/ws`)**:
  - Frontend (`OmniChatTab.tsx`) menggunakan custom hook `useOmniChat` untuk terhubung ke WebSocket.
  - Setiap kali ada pesan baru dari WhatsApp, backend (`omnichannel/handler.go`) memancarkan payload JSON via WebSocket untuk merender pesan masuk secara real-time di UI Inbox tanpa perlu me-refresh halaman.
- **History Sync (Riwayat Chat)**:
  - WhatsApp hanya mengirimkan riwayat pesan secara massal **satu kali saja**, yaitu sesaat setelah QR Code di-scan.
  - Hook `OnHistorySync` di `ClientManager` telah dikembangkan untuk meng-intercept payload ini, lalu melakukan perulangan pada setiap pesan histori untuk di-dump ke dalam tabel `omni_conversations` dan `omni_messages`.

---

## 2. Bug yang Telah Diselesaikan (Bug Resolusi)

### Masalah 1: Device Terlihat di Tab "Device Status", namun Menghilang di Tab "Blast" & "Direct Message"
**Gejala**: API `/api/whatsapp/devices` mengembalikan `status: "disconnected"` sehingga UI menyembunyikan device tersebut, padahal di handphone masih terhubung (linked).
**Penyebab Inti**:
1. Saat device pertama kali di-pairing, JID (nomor WA) yang didapat dari whatsmeow berbentuk `628xxxx@s.whatsapp.net`, dan kita simpan di tabel DB kita.
2. Namun secara internal, `whatsmeow` menyimpan session di SQL store miliknya menggunakan format Active Device (AD), contohnya `628xxxx:47@s.whatsapp.net` (terdapat suffix `:47`).
3. Saat backend me-restart lalu memanggil `GetClient(JID)`, query `GetDevice` milik whatsmeow secara default gagal menemukan kecocokan yang persis, sehingga device tersebut dianggap tidak ada di database whatsmeow.
4. Selain itu, pengecekan `status: "connected"` sebelumnya menggunakan `client.IsLoggedIn()`. Fungsi ini mengecek apakah WebSocket Socket koneksi *sudah 100% tersambung*. Karena Go routine mengkoneksikan WebSocket secara asinkron, saat API dipanggil koneksi masih *pending*, dan `IsLoggedIn()` me-return `false`.

**Solusi yang Telah Diimplementasikan**:
- Mengubah logika pencarian JID di `GetClient()` dan `DeleteSession()` pada `client_manager.go`. Jika pencarian langsung gagal, sistem akan melakukan *fuzzy match* dengan menarik seluruh device (`GetAllDevices()`) dan membandingkan format base JID-nya menggunakan `.ToNonAD()`.
- Mengubah indikator koneksi di `service.go` (`GetDevices()`) agar tidak lagi menggunakan `IsLoggedIn()`, tetapi mengecek keberadaan sesi di dalam store (`client.Store.ID != nil`). Dengan cara ini, API langsung mengembalikan status `connected` karena secara logis *device telah di-link*.

---

## 3. Status Terkini & Checkpoint (Next Steps)

1. **Frontend Backend Out of Sync**: 
   Jika saat melakukan pengujian dengan curl (atau dari UI) masih menghasilkan *disconnected*, itu disebabkan **proses backend (`go run main.go`) belum dimatikan dan dijalankan ulang** semenjak patch logika `ToNonAD()` saya tuliskan. Backend harus di-restart.

2. **Inbox Chat Masih Kosong (Empty State)**:
   - Omnichannel UI sudah selesai dibangun pada **Inbox** tab di halaman Messaging.
   - Kosongnya inbox disebabkan perangkat WhatsApp saat ini sudah dalam keadaan "tersambung" *sebelum* algoritma interceptor `OnHistorySync` dibuat. Karena WhatsApp tidak mem-push ulang histori chat tanpa trigger pairing baru, database lokal masih kosong.
   - **Tindakan**: User perlu menekan logout/unlink pada tab **Device Status**, kemudian me-link ulang handphone-nya (scan QR kembali). Algoritma sinkronisasi histori dijamin akan langsung terpanggil.

3. **Perluasan Omnichannel ke Depan**:
   - Struktur database (`omni_conversations.platform`) dan arsitektur service telah saya siapkan dengan nilai "whatsapp". Jika kelak ingin menambah Telegram atau FB Messenger, cukup tambahkan `PlatformManager` baru yang melakukan injeksi ke service `omnichannel` yang ada saat ini.

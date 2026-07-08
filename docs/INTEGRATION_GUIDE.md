# Panduan Integrasi Frontend-Backend

> Dokumen ini menjelaskan bagaimana frontend (React) dan backend (Go) berkomunikasi,  
> termasuk autentikasi, multi-tenant organization, RBAC, dan pola umum integrasi API.

---

## Gambaran Arsitektur

```
┌─────────────────────────────┐       HTTP/REST         ┌──────────────────────────────┐
│   Frontend (React + Vite)   │ ←────────────────────→  │   Backend (Go + Gin)         │
│   http://localhost:5173     │                          │   http://localhost:8080      │
│                             │   Authorization: Bearer  │                              │
│   ApiClient (Axios)         │ ──── <JWT token> ──────→ │   AuthMiddleware             │
│   X-Organization-ID header  │ ──── <org_id> ─────────→ │   OrgMiddleware              │
└─────────────────────────────┘                          └──────────────────────────────┘
                                                                      │
                                                                      ▼
                                                         ┌──────────────────────────────┐
                                                         │   PostgreSQL Database        │
                                                         │   (multi-tenant via org_id)  │
                                                         └──────────────────────────────┘
```

---

## Authentication Flow

### 1. Login

```
Frontend                           Backend
   │                                  │
   │  POST /api/auth/login            │
   │  { email, password }             │
   ├─────────────────────────────────→│
   │                                  │ 1. Validate credentials
   │                                  │ 2. Generate JWT (24h) + Refresh (7d)
   │                                  │ 3. Load user's organizations
   │  { access_token, refresh_token,  │
   │    user, organizations }         │
   │←─────────────────────────────────┤
   │                                  │
   │ localStorage.setItem("access_token", ...)
   │ localStorage.setItem("refresh_token", ...)
   │ localStorage.setItem("active_org_id", orgs[0].id)
   │
   │ AuthContext.signIn(user, orgs)
   │ → load permissions via GET /api/rbac/my-permissions
```

### 2. Request dengan Auth

Setiap request HTTP otomatis di-inject oleh `ApiClient`:

```typescript
// Request interceptor (src/integrations/api/client.ts)
config.headers.Authorization = `Bearer ${localStorage.getItem("access_token")}`;
config.headers["X-Organization-ID"] = localStorage.getItem("active_org_id");
```

### 3. Auto Token Refresh

Jika response `401`:
1. `ApiClient` coba `POST /api/auth/refresh` dengan `refresh_token`
2. Simpan `access_token` baru
3. Ulangi request yang gagal
4. Jika refresh juga gagal → clear tokens + redirect `/admin/login`

### 4. Logout

```typescript
// Frontend
await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
apiClient.clearTokens();  // hapus semua token + org dari localStorage
```

---

## Organization Context

Setiap request ke API protected memerlukan **dua hal**:
1. `Authorization: Bearer <token>` → siapa user ini
2. `X-Organization-ID: <org_id>` → data org mana yang diminta

**Backend** membaca `X-Organization-ID` via `OrgMiddleware` dan:
- Validasi user adalah member aktif org ini
- Set `org_id` dan `org_role` ke Gin context
- Handler gunakan `c.GetString("org_id")` untuk filter data

**Frontend** menyimpan active org di `localStorage` dan inject otomatis via `ApiClient`.

### Ganti Org Aktif (Multi-Org)

```typescript
const { switchOrg } = useAuth();

// User klik org lain di dropdown
await switchOrg(selectedOrg);
// → update localStorage
// → reload permissions dari API
// → React Query akan re-fetch data dengan org baru
```

---

## RBAC — Permission Flow

```
User Login
    │
    ▼
GET /api/rbac/my-permissions
    │
    ▼ Backend query:
    SELECT DISTINCT permission_id FROM role_permissions
    WHERE role = $org_role
    UNION
    SELECT permission_id FROM user_permissions
    WHERE user_id = $user_id AND org_id = $org_id
    │
    ▼
Frontend menyimpan permissions[] di AuthContext
    │
    ┌──────────────────────┬──────────────────────┐
    ▼                      ▼                      ▼
Route Guard           UI Conditional         API Request
(ProtectedRoute)      (hasPermission)        (Backend enforces)
```

### Penggunaan di Frontend

```typescript
const { hasPermission, hasRole } = useAuth();

// Conditional render
{hasPermission("patients:write") && <button>Tambah Pasien</button>}
{hasRole("admin") && <AdminPanel />}

// Route protection
<ProtectedRoute requirePermission="patients:read">
  <Patients />
</ProtectedRoute>
```

### Penggunaan di Backend

```go
// Di routes.go
canRead  := middleware.RequirePermission("patients:read")
canWrite := middleware.RequirePermission("patients:write")

router.GET("/patients", canRead, handler.List)   // hanya user dengan patients:read
router.POST("/patients", canWrite, handler.Create)
```

---

## API Response Format

Backend selalu mengembalikan JSON dalam format yang konsisten:

### Success (tanpa data)
```json
{"success": true, "message": "Berhasil"}
```

### Success (dengan data)
```json
{"success": true, "data": {...}}
```

### Success (list + pagination)
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### Auth success
```json
{
  "success": true,
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {...}
}
```

### Error
```json
{"success": false, "error": "pesan error"}
```

### Parsing di Frontend

```typescript
// GET list
const data = await apiClient.get<{ data: Patient[] }>(API_ENDPOINTS.PATIENTS.LIST);
const patients = data.data ?? [];

// GET single
const data = await apiClient.get<{ data: Patient }>(API_ENDPOINTS.PATIENTS.DETAIL(id));
const patient = data.data;

// POST/PUT
const data = await apiClient.post<{ data: Patient }>(API_ENDPOINTS.PATIENTS.CREATE, payload);
const created = data.data;
```

---

## HTTP Headers yang Diperlukan

| Header               | Wajib?    | Nilai              | Catatan                              |
|----------------------|-----------|--------------------|--------------------------------------|
| `Authorization`      | Ya        | `Bearer <jwt>`     | Semua protected routes               |
| `X-Organization-ID`  | Ya*       | `<org_uuid>`       | *Wajib untuk routes yang butuh data org |
| `Content-Type`       | Ya (POST) | `application/json` | Untuk request dengan body JSON       |
| `Content-Type`       | Ya (upload)| `multipart/form-data` | Untuk upload file               |

---

## Error Handling

### Backend Error Codes

| HTTP Status | Kondisi                                  |
|-------------|------------------------------------------|
| `400`       | Bad request / validasi gagal             |
| `401`       | Token tidak valid atau tidak ada         |
| `403`       | Permission denied / bukan member org     |
| `404`       | Resource tidak ditemukan                 |
| `500`       | Internal server error                    |

### Frontend Error Handling

`ApiClient` mengubah semua Axios error menjadi `ApiError`:

```typescript
class ApiError extends Error {
  statusCode: number;
  data?: unknown;
}

// Di hook, handle error:
onError: (error) => {
  const apiError = error as ApiError;
  if (apiError.statusCode === 403) {
    toast.error("Tidak punya permission untuk aksi ini");
  } else {
    toast.error(apiError.message);
  }
}
```

---

## Multi-Tenant Data Isolation

Semua data di backend **di-isolasi per organizasi**. Contoh query:

```go
// Backend selalu filter organization_id
rows, err := database.DB.Query(`
    SELECT * FROM patients
    WHERE organization_id = $1 AND deleted_at IS NULL`,
    orgID,  // dari c.GetString("org_id")
)
```

Frontend tidak perlu mengirim `organization_id` di request body — sudah di-inject via header `X-Organization-ID` dan ditangani backend.

---

## Static File Uploads

Backend meng-serve file statis dari `./uploads/`:

```
POST /api/cms/upload-image   → Simpan file ke ./uploads/cms/<folder>/
GET  /uploads/cms/...        → Akses file yang sudah diupload
```

Frontend menggunakan `apiClient.postForm()` untuk upload:

```typescript
const formData = new FormData();
formData.append("file", imageFile);
formData.append("folder", "logos");

const result = await apiClient.postForm<{data: {url: string}}>(
  API_ENDPOINTS.CMS.UPLOAD_IMAGE,
  formData
);
const imageUrl = result.data.url;
// → "http://localhost:8080/uploads/cms/logos/filename.jpg"
```

---

## Real-Time Features

### Omnichannel Chat (WebSocket)

```
Frontend                            Backend
   │                                   │
   │  GET /api/omni/conversations      │  → List semua conversation
   │  GET /api/omni/conversations/:id/messages  → Pesan dalam conversation
   │                                   │
   │  WebSocket: /api/omni/ws?org_id=<id>   → Real-time updates
   │←──────────────────────────────────┤
   │  Event: new_message / updated     │
```

Hook `useOmniChat` menghandle WebSocket connection secara otomatis.

---

## CORS Configuration

Backend mengizinkan semua origin di development via `CORSMiddleware`:

```go
// Diizinkan: semua origin, credentials, semua method
// Header khusus yang diizinkan: X-Organization-ID
Access-Control-Allow-Headers: "..., X-Organization-ID"
Access-Control-Allow-Credentials: "true"
```

Untuk production, sebaiknya set origin spesifik.

---

## Environment Variables — Summary

### Frontend (`shasi/.env`)
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_API_TIMEOUT=30000
```

### Backend (`sc-pos-be/.env`)
```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sc_pos
DB_SSLMODE=disable
JWT_SECRET_KEY=change-this-in-production
BASE_URL=http://localhost:8080
```

---

## Cara Menjalankan Keduanya (Development)

```bash
# Terminal 1 — Backend
cd sc-pos-be
cp .env.example .env    # lalu edit kredensial DB
go run main.go
# → Server starting on http://0.0.0.0:8080

# Terminal 2 — Frontend
cd shasi
npm install
npm run dev
# → Local: http://localhost:5173

# Test health
curl http://localhost:8080/health
# → {"status":"ok"}
```

---

## Cara Deploy dengan Docker

```bash
# 1. Copy dan isi .env
cp .env.example .env
# Edit VITE_API_BASE_URL, DB credentials, JWT_SECRET_KEY, dll.

# 2. Run semua services
docker-compose up -d

# Services yang berjalan:
# - postgres    → port 5432 (internal)
# - backend     → port 8080
# - frontend    → port 3000 (Nginx)
# - cloudflared → Cloudflare Tunnel (opsional, untuk public access)
```

---

## Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| `401 Unauthorized` | Token expired atau tidak ada | Re-login, ApiClient auto-handles refresh |
| `403 Forbidden` | Permission tidak ada | Cek `role_permissions` di DB, grant permission via `/rbac` |
| `403: not a member` | Org ID salah atau user bukan member | Pastikan `X-Organization-ID` header dikirim dengan benar |
| `CORS error` | Backend tidak jalan atau URL salah | Cek `VITE_API_BASE_URL`, pastikan backend running |
| Data kosong | Org ID tidak di-set | Login ulang, pastikan `active_org_id` ada di localStorage |
| Token tidak di-refresh | Refresh token expired (7 hari) | Re-login manual |

---

*Last updated: 2026-07-09*

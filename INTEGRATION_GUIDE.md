# SC-POS: Frontend-Backend Integration Guide

Panduan lengkap untuk mengintegrasikan React Frontend dengan Golang Backend.

## 📋 Daftar Isi

1. [Setup Frontend](#setup-frontend)
2. [Setup Backend](#setup-backend)
3. [Testing Integration](#testing-integration)
4. [Troubleshooting](#troubleshooting)
5. [Next Steps](#next-steps)

---

## Setup Frontend

### 1. Install Dependencies

```bash
cd shasi
bun install  # atau npm install / yarn install
```

Dependency baru yang ditambahkan:

- `axios@^1.6.5` - HTTP client library

### 2. Verify Environment Variables

Cek file `.env`:

```env
# Frontend API Configuration
VITE_API_BASE_URL=http://localhost:8080/api
VITE_API_TIMEOUT=30000

# Supabase (untuk auth sementara)
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=...
```

### 3. Start Frontend Dev Server

```bash
bun run dev
# Frontend akan berjalan di http://localhost:5173
```

---

## Setup Backend

### 1. Prerequisites

- **Go 1.21+** - [Download](https://golang.org/dl/)
- **PostgreSQL 12+** - [Download](https://www.postgresql.org/download/)
- **Make** (optional) - macOS: `brew install make`, Linux: `apt install make`

### 2. Create PostgreSQL Database

```bash
# Login ke PostgreSQL
psql -U postgres

# Buat database
CREATE DATABASE sc_pos;

# Keluar
\q
```

### 3. Setup Backend Environment

```bash
cd sc-pos-be
cp .env.example .env
```

Edit `.env` dengan konfigurasi database Anda:

```env
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sc_pos
DB_SSLMODE=disable

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_EXPIRY_HOURS=24
```

### 4. Install Go Dependencies

```bash
make install-deps
# atau
go mod download && go mod tidy
```

### 5. Start Backend Server

```bash
make dev
# Backend akan berjalan di http://localhost:8080
```

Jika berhasil, Anda akan melihat:

```
Running migrations...
Running migration 1...
Running migration 2...
...
🚀 Server starting on http://0.0.0.0:8080
```

---

## Testing Integration

### 1. Test Backend Health Check

```bash
curl http://localhost:8080/health
# Response: {"status":"ok"}
```

### 2. Test API Endpoints

#### Create Patient

```bash
curl -X POST http://localhost:8080/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "full_name": "John Doe",
    "phone": "081234567890"
  }'
```

#### Get All Patients

```bash
curl http://localhost:8080/api/patients \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Frontend Integration

1. Buka [http://localhost:5173](http://localhost:5173) di browser
2. Navigasi ke halaman Patients
3. Cek Network tab di DevTools - requests harus menuju `http://localhost:8080/api/...`

---

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "patient-123",
    "full_name": "John Doe",
    "phone": "081234567890",
    ...
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Troubleshooting

### Port Already in Use

**Frontend (5173):**

```bash
# Kill process
# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Backend (8080):**

```bash
# macOS/Linux:
lsof -ti:8080 | xargs kill -9

# Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Database Connection Error

```
failed to connect to database: connection refused
```

**Solusi:**

1. Pastikan PostgreSQL running: `brew services list` (macOS)
2. Periksa credentials di `.env`
3. Pastikan database `sc_pos` sudah dibuat

### CORS Error

```
Access to XMLHttpRequest at 'http://localhost:8080/api/patients'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solusi:** Backend sudah menghandle CORS. Jika masih error, pastikan:

- Backend running di port 8080
- Frontend mengirim request ke URL yang benar

### Axios Timeout

```
Error: timeout of 30000ms exceeded
```

Naikkan timeout di `.env`:

```env
VITE_API_TIMEOUT=60000  # 60 detik
```

---

## Architecture Overview

### Frontend Architecture

```
React App
    ↓
Pages (Dashboard, Patients, etc)
    ↓
Custom Hooks (usePatients, useServices, etc)
    ↓
React Query (caching & state)
    ↓
API Client (HTTP layer)
    ↓
Axios Instance
    ↓
Backend API
```

### Backend Architecture

```
HTTP Request
    ↓
Routes (route definitions)
    ↓
Middleware (auth, CORS)
    ↓
Handlers (business logic)
    ↓
Repository (data access)
    ↓
Database (PostgreSQL)
```

---

## Database Schema

Berikut adalah tabel utama yang otomatis dibuat:

1. **users** - User authentication & authorization
2. **patients** - Data pasien klinik
3. **services** - Layanan/treatment
4. **products** - Produk yang dijual
5. **staff** - Karyawan klinik
6. **appointments** - Jadwal appointment
7. **transactions** - Riwayat transaksi
8. **transaction_items** - Item dalam transaksi
9. **commissions** - Komisi staff
10. **clinic_settings** - Konfigurasi klinik

---

## Authentication Flow

### Login Process

1. Frontend: POST `/api/auth/login` dengan email & password
2. Backend: Validate credentials & generate JWT token
3. Frontend: Store token di localStorage
4. Frontend: Kirim token di header `Authorization: Bearer <token>` untuk semua request

### Token Management

```typescript
// Otomatis dihandle oleh apiClient
- Send token di setiap request
- Auto-refresh token jika expired
- Redirect ke login jika refresh gagal
```

---

## File Structure

### Frontend

```
shasi/
├── src/
│   ├── integrations/
│   │   └── api/          ← NEW! HTTP client layer
│   │       ├── client.ts
│   │       ├── endpoints.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── hooks/            ← REFACTORED to use HTTP
│   ├── pages/
│   ├── components/
│   ├── contexts/
│   ├── types/
│   └── lib/
├── .env                  ← UPDATE with API URL
├── package.json          ← axios added
└── vite.config.ts
```

### Backend

```
sc-pos-be/
├── config/               ← Configuration
├── internal/
│   ├── auth/            ← JWT & password hashing
│   ├── database/        ← DB connection & migrations
│   ├── handler/         ← HTTP handlers
│   ├── middleware/      ← Auth & CORS
│   ├── models/          ← Domain models
│   ├── repository/      ← Data access layer
│   ├── routes/          ← Route definitions
│   └── utils/           ← Utilities
│   └── modules/         ← Business logic modules per service
├── main.go              ← Entry point
├── go.mod              ← Dependencies
├── .env                ← Configuration
├── Makefile            ← Build commands
└── README.md
```

---

## Development Workflow

### Day-to-Day Development

```bash
# Terminal 1 - Backend
cd sc-pos-be
make dev

# Terminal 2 - Frontend
cd shasi
bun run dev
```

### Making Changes

**Frontend (React):**

1. Edit hook di `src/hooks/`
2. Hot reload otomatis
3. Check Network tab untuk API calls

**Backend (Go):**

1. Edit handler/repository
2. Backend auto-reload (jika pakai Air)
3. Atau manual restart: `make dev`

---

## Next Steps

### Phase 1 (Done ✅)

- ✅ Frontend refactor: HTTP client abstraction
- ✅ Backend scaffolding: Project structure
- ✅ Database design & migrations
- ✅ Authentication middleware
- ✅ API routes definition

### Phase 2 (TODO)

- [ ] Implement remaining handlers (services, products, etc)
- [ ] Complete JWT authentication
- [ ] Database queries & transactions
- [ ] Dashboard analytics
- [ ] Commission calculations

### Phase 3 (TODO)

- [ ] WhatsApp messaging integration
- [ ] Email reminders
- [ ] File uploads (images)
- [ ] Advanced filtering & search
- [ ] Performance optimization

---

## Useful Commands

### Frontend

```bash
cd shasi

bun run dev          # Start dev server
bun run build        # Build for production
bun run lint         # Run ESLint
bun run test         # Run tests
```

### Backend

```bash
cd sc-pos-be

make dev             # Run in dev mode
make build           # Build binary
make test            # Run tests
make clean           # Clean build artifacts
make install-deps    # Install dependencies
```

---

## Environment Variables Reference

### Frontend (.env)

| Variable                        | Description           | Example                     |
| ------------------------------- | --------------------- | --------------------------- |
| `VITE_API_BASE_URL`             | Backend API URL       | `http://localhost:8080/api` |
| `VITE_API_TIMEOUT`              | Request timeout (ms)  | `30000`                     |
| `VITE_SUPABASE_URL`             | Supabase URL (legacy) | `https://...`               |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase key (legacy) | `eyJ...`                    |

### Backend (.env)

| Variable           | Description         | Example       |
| ------------------ | ------------------- | ------------- |
| `SERVER_HOST`      | Server host         | `0.0.0.0`     |
| `SERVER_PORT`      | Server port         | `8080`        |
| `DB_HOST`          | PostgreSQL host     | `localhost`   |
| `DB_PORT`          | PostgreSQL port     | `5432`        |
| `DB_USER`          | PostgreSQL user     | `postgres`    |
| `DB_PASSWORD`      | PostgreSQL password | `password`    |
| `DB_NAME`          | Database name       | `sc_pos`      |
| `DB_SSLMODE`       | SSL mode            | `disable`     |
| `JWT_SECRET_KEY`   | JWT secret          | `your-secret` |
| `JWT_EXPIRY_HOURS` | Token expiry        | `24`          |

---

## Support & Documentation

- Frontend: Lihat [shasi/README.md](../shasi/README.md)
- Backend: Lihat [sc-pos-be/README.md](../sc-pos-be/README.md)

---

**Last Updated:** June 22, 2026

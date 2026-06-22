# SC Project — Panduan Konteks untuk AI Agent

> File ini dibuat untuk membantu AI agent (Devin, Claude, dsb.) memahami project ini secara end-to-end
> tanpa perlu eksplorasi berulang dari nol. Update file ini setiap kali ada perubahan arsitektur besar.

---

## 1. Gambaran Umum Project

**SC Project** adalah sistem manajemen klinik kecantikan (aesthetic clinic / salon).
Terdiri dari dua sub-project dalam satu monorepo:

| Sub-project | Lokasi | Stack | Fungsi |
|---|---|---|---|
| `sc-pos-be` | `sc-pos-be/` | Go + PostgreSQL + Gin | REST API backend |
| `shasi` | `shasi/` | React + TypeScript + Vite | Frontend admin + landing page |

**Root project:** `/Users/macbookpro/pjc/personal/sc-project/`

---

## 2. Backend — `sc-pos-be`

### 2.1 Tech Stack
- **Language:** Go (module: `github.com/sc-pos/backend`)
- **Framework:** Gin (`github.com/gin-gonic/gin`)
- **Database:** PostgreSQL (driver: `lib/pq`, raw `database/sql` — **bukan ORM**)
- **Auth:** JWT (`github.com/golang-jwt/jwt/v5`)
- **UUID:** `github.com/google/uuid`
- **Config:** `.env` via `github.com/joho/godotenv`

### 2.2 Struktur Direktori
```
sc-pos-be/
├── main.go                         # Entry point
├── config/config.go                # Load env vars
├── internal/
│   ├── auth/jwt.go                 # JWT sign/verify + bcrypt
│   ├── database/
│   │   ├── connection.go           # DB connect, pool setup
│   │   └── migrations.go          # DDL — CREATE TABLE IF NOT EXISTS (idempotent)
│   ├── middleware/
│   │   └── auth.go                # AuthMiddleware, RequireRole, CORSMiddleware
│   ├── models/                     # Plain Go structs (no ORM tags, menggunakan `db:` tag)
│   │   ├── user.go
│   │   ├── patient.go
│   │   ├── service.go
│   │   ├── product.go
│   │   ├── staff.go
│   │   ├── appointment.go
│   │   ├── transaction.go
│   │   ├── commission.go
│   │   ├── clinic_settings.go
│   │   ├── stock_movement.go
│   │   └── service_consumable.go
│   ├── modules/                    # Feature modules (handler + service + repository + routes)
│   │   ├── auth/
│   │   ├── patient/
│   │   ├── service/
│   │   ├── product/
│   │   ├── staff/
│   │   ├── appointment/
│   │   ├── transaction/
│   │   ├── commission/
│   │   ├── dashboard/
│   │   ├── settings/
│   │   ├── cms/
│   │   ├── whatsapp/
│   │   ├── stock/                  # stock_movements
│   │   └── consumable/             # service_consumables
│   ├── routes/routes.go            # Central router setup
│   └── utils/response.go          # Standard JSON response helpers
```

### 2.3 Pattern Setiap Module
Setiap module mengikuti pola layered:
```
handler.go    → HTTP layer: binding, validasi, call service
service.go    → Business logic
repository.go → Raw SQL queries ke database
routes.go     → Daftarkan route ke Gin router
```

`NewModule()` di `handler.go` adalah shortcut constructor yang merangkai semua layer.

### 2.4 Environment Variables (`.env`)
```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sc_pos
DB_SSLMODE=disable
JWT_SECRET_KEY=your-secret-key-change-in-production
UPLOAD_DIR=uploads/cms          # opsional, default: uploads/cms
BASE_URL=http://localhost:8080   # untuk generate URL upload
WHATSAPP_API_URL=               # opsional: endpoint eksternal WA
WHATSAPP_API_TOKEN=             # opsional: token API WA
```

### 2.5 Menjalankan Backend
```bash
cd sc-pos-be
cp .env.example .env   # isi DB credentials
go run main.go
# atau: go build -o server . && ./server
```

Migrasi **otomatis berjalan** saat startup (`database.RunMigrations()`).
Semua DDL menggunakan `CREATE TABLE IF NOT EXISTS` dan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — aman dijalankan berulang.

### 2.6 API Response Format (Standard)
Semua endpoint menggunakan `utils.SuccessResponse` / `utils.ErrorResponse`:
```json
// Success
{ "success": true, "data": <payload> }
{ "success": true, "message": "...", "data": <payload> }

// Error
{ "success": false, "error": "pesan error" }

// List (dengan pagination)
{ "success": true, "data": [...], "total": 100, "page": 1, "limit": 20 }

// Auth
{ "success": true, "access_token": "...", "user": {...} }
```

### 2.7 Auth & Role System
- JWT disimpan di `localStorage` frontend (key: `access_token`, `refresh_token`)
- Access token: 24 jam, Refresh token: 7 hari
- Roles: `admin`, `doctor`, `therapist`, `cashier`
- Middleware `RequireRole("admin")` → hanya admin
- Middleware `RequireRole("admin", "doctor", "therapist")` → staff medis + admin
- Context keys dari JWT: `user_id`, `email`, `role`

### 2.8 Semua Route Backend

**Base URL:** `http://localhost:8080/api`

#### Auth (public)
| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/auth/login` | Login, return JWT |
| POST | `/auth/register` | Register user baru (default role: cashier) |
| POST | `/auth/refresh` | Refresh access token |

#### Auth (protected)
| Method | Path | Role |
|--------|------|------|
| GET | `/auth/me` | Semua |
| POST | `/auth/logout` | Semua |

#### Patients
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/patients` | Semua | `?search=nama` untuk filter |
| GET | `/patients/search` | Semua | dedicated search endpoint |
| POST | `/patients` | Semua | |
| GET | `/patients/:id` | Semua | |
| PUT | `/patients/:id` | Semua | |
| DELETE | `/patients/:id` | Semua | soft delete (`is_active=false`) |

#### Services
| Method | Path | Role |
|--------|------|------|
| GET | `/services` | Semua |
| POST | `/services` | Admin |
| GET | `/services/:id` | Semua |
| PUT | `/services/:id` | Admin |
| DELETE | `/services/:id` | Admin |
| GET | `/service-categories` | Semua |
| POST | `/service-categories` | Admin |

#### Products
| Method | Path | Role |
|--------|------|------|
| GET | `/products` | Semua |
| POST | `/products` | Admin |
| GET | `/products/:id` | Semua |
| PUT | `/products/:id` | Admin |
| DELETE | `/products/:id` | Admin |

#### Staff
| Method | Path | Role |
|--------|------|------|
| GET | `/staff` | Semua |
| POST | `/staff` | Admin |
| GET | `/staff/:id` | Semua |
| PUT | `/staff/:id` | Admin |
| DELETE | `/staff/:id` | Admin |

#### Appointments
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/appointments` | Semua | `?date=YYYY-MM-DD&view=day\|week` |
| POST | `/appointments` | Semua | |
| GET | `/appointments/calendar` | Semua | |
| GET | `/appointments/available-slots` | Semua | |
| GET | `/appointments/:id` | Semua | |
| PUT | `/appointments/:id` | Semua | |
| DELETE | `/appointments/:id` | Semua | |

#### Transactions
| Method | Path | Role |
|--------|------|------|
| GET | `/transactions` | Semua |
| POST | `/transactions` | Semua |
| GET | `/transactions/:id` | Semua |
| GET | `/transactions/:id/items` | Semua |
| PUT | `/transactions/:id` | Semua |
| DELETE | `/transactions/:id` | Semua |

#### Commissions
| Method | Path | Role |
|--------|------|------|
| GET | `/commissions` | Admin/Doctor/Therapist |
| GET | `/commissions/staff/:staffId` | Admin |
| POST | `/commissions/update-status` | Admin |

Request body update-status:
```json
{ "ids": ["uuid1", "uuid2"], "status": "paid" }
```

#### Dashboard
| Method | Path | Auth |
|--------|------|------|
| GET | `/dashboard/stats` | Ya |
| GET | `/dashboard/revenue` | Ya (30 hari terakhir) |
| GET | `/dashboard/top-services` | Ya |
| GET | `/dashboard/top-products` | Ya |
| GET | `/dashboard/appointments-today` | Ya |

#### CMS (public)
| Method | Path |
|--------|------|
| GET | `/cms/pages` |
| GET | `/cms/pages/:pageId` |

#### CMS (protected admin)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/cms/pages` | body: `{ "page_id": "...", ...content }` |
| PUT | `/cms/pages/:pageId` | |
| POST | `/cms/upload-image` | **multipart/form-data**: field `file` (image) + `folder` (opsional) |

Upload image returns: `{ "success": true, "data": { "url": "http://..." } }`
File disimpan ke `./uploads/cms/<folder>/` dan dapat diakses via `GET /uploads/...`

#### Settings
| Method | Path | Role |
|--------|------|------|
| GET | `/settings/clinic` | Semua |
| PUT | `/settings/clinic` | Admin |
| POST | `/settings/clinic/logo` | Admin |

#### Stock Movements
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/stock-movements` | Semua | `?product_id=uuid` opsional |
| POST | `/stock-movements` | Admin | Otomatis update `products.current_stock` |

Request body POST:
```json
{
  "product_id": "uuid",
  "movement_type": "in|out|adjustment",
  "quantity": 10,
  "reason": "restock",
  "notes": "...",
  "reference_id": "uuid (opsional)",
  "reference_type": "transaction (opsional)"
}
```

#### Service Consumables
| Method | Path | Role |
|--------|------|------|
| GET | `/services/:serviceId/consumables` | Semua |
| POST | `/services/:serviceId/consumables` | Admin |
| DELETE | `/service-consumables/:id` | Admin |

#### WhatsApp
| Method | Path | Notes |
|--------|------|-------|
| POST | `/whatsapp/send` | `{ "to": "+628...", "message": "..." }` |
| POST | `/whatsapp/send-bulk` | `{ "recipients": [{"to":"...", "patient_name":"..."}], "message": "..." }` |
| GET | `/whatsapp/templates` | List template pesan |

Jika `WHATSAPP_API_URL` tidak diset, endpoint ini hanya simulasi (tidak benar-benar kirim).

---

## 3. Database Schema

### Tabel Utama
```sql
users              -- akun login (id, email, password_hash, role, created_at, updated_at)
patients           -- data pasien (id, patient_code, full_name, phone, whatsapp, email,
                   --   gender, date_of_birth, photo_url, allergy_history, medical_conditions,
                   --   skin_type, notes, tags[], is_active, reminder_opt_in, created_by)
service_categories -- (id, name, description, is_active)
services           -- (id, name, category_id, base_price, duration_minutes, requires_doctor,
                   --   doctor_commission_type, doctor_commission_value,
                   --   therapist_commission_type, therapist_commission_value, is_active)
products           -- (id, name, category, sku, supplier, purchase_price, selling_price,
                   --   current_stock, minimum_stock, unit, expiry_date, is_active)
staff              -- (id, user_id, full_name, role, specialization, phone, is_active)
appointments       -- (id, patient_id, service_id, staff_id, scheduled_at, duration_minutes,
                   --   status, notes, created_by)
transactions       -- (id, patient_id, staff_id, appointment_id, subtotal, discount_amount,
                   --   discount_type, total_amount, payment_method, payment_status, notes, created_by)
transaction_items  -- (id, transaction_id, service_id, product_id, item_type, quantity,
                   --   unit_price, discount_amount, total_price)
commissions        -- (id, transaction_id, staff_id, staff_role, base_amount, commission_type,
                   --   commission_value, commission_amount, status, created_at)
clinic_settings    -- (id, clinic_name, address, phone, email, logo_url, ...)
cms_pages          -- (id, page_id varchar unique, content jsonb, updated_at)
stock_movements    -- (id, product_id, movement_type, quantity, reason, reference_id,
                   --   reference_type, notes, created_by, created_at)
service_consumables-- (id, service_id, product_id, quantity_used, created_at) UNIQUE(service_id, product_id)
```

### Notes Penting DB
- `patients.tags` → tipe `TEXT[]` PostgreSQL, di Go gunakan `pq.Array(&patient.Tags)`
- `cms_pages.content` → tipe `JSONB`
- `appointments.status` → `scheduled | confirmed | completed | cancelled | no_show`
- `transactions.payment_status` → `pending | paid | cancelled | refunded`
- `commissions.status` → `pending | paid | cancelled`
- `stock_movements.movement_type` → `in | out | adjustment`
- Semua delete pasien adalah **soft delete** (`is_active = false`)
- Migration **tidak menggunakan file terpisah** — semua dalam `migrations.go` sebagai SQL string constants

---

## 4. Frontend — `shasi`

### 4.1 Tech Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI:** shadcn/ui (Radix UI) + Tailwind CSS
- **State/Data:** TanStack Query v5 (`@tanstack/react-query`)
- **Routing:** React Router v6
- **HTTP Client:** Axios (wrapped dalam custom `ApiClient`)
- **Forms:** React Hook Form + Zod (di beberapa form)
- **Charts:** Recharts
- **Notifications:** Sonner + shadcn `useToast`

### 4.2 Struktur Direktori
```
shasi/src/
├── App.tsx                     # Root: routes, providers
├── main.tsx                    # Entry, React 18 createRoot
├── index.css                   # Tailwind directives + CSS vars
├── contexts/
│   └── AuthContext.tsx         # Auth state global, useAuth() hook
├── integrations/
│   └── api/
│       ├── client.ts           # ApiClient class (axios wrapper, token mgmt)
│       ├── endpoints.ts        # Semua API_ENDPOINTS constants
│       ├── types.ts            # ApiError, JwtPayload types
│       └── index.ts            # Re-export
│   └── supabase/               # LEGACY — masih ada tapi TIDAK digunakan lagi
│       ├── client.ts           # Supabase client (deprecated)
│       └── types.ts            # Generated Supabase types (deprecated)
├── hooks/                      # Custom hooks per domain
│   ├── useAuth.ts              → alias AuthContext (jika ada)
│   ├── usePatients.ts
│   ├── useAppointments.ts
│   ├── useServices.ts
│   ├── useProducts.ts
│   ├── useStaff.ts
│   ├── useTransactions.ts
│   ├── useTransactionStats.ts
│   ├── useCommissions.ts
│   ├── useCmsData.ts
│   ├── useClinicSettings.ts
│   ├── useDashboard.ts         # (baru) Stats, Revenue, AppointmentsToday dari backend
│   └── useDebounce.ts
├── types/
│   ├── product.ts              # Interface Product (manual, aligned dengan Go model)
│   ├── service.ts              # Interface Service, ServiceCategory, re-export Product
│   └── cms.ts                  # CMS types
├── components/
│   ├── layout/                 # MainLayout, Sidebar, PageHeader
│   ├── auth/ProtectedRoute.tsx # Guard route dengan role check
│   ├── patients/               # PatientFormDialog, PatientList
│   ├── appointments/           # AppointmentCalendar, AppointmentFormDialog
│   ├── services/               # ServiceFormDialog, ServiceList
│   ├── products/               # ProductFormDialog, ProductList
│   ├── staff/                  # StaffFormDialog, StaffList
│   ├── pos/POSInterface.tsx    # Antarmuka kasir/POS
│   ├── cms/ImageUpload.tsx     # Upload gambar ke backend (multipart)
│   ├── filters/DateRangeFilter.tsx
│   ├── landing/                # Semua section landing page publik
│   └── ui/                     # shadcn components (jangan edit manual)
└── pages/
    ├── LandingPage.tsx         # Public landing page (/)
    ├── Auth.tsx                # Login page (/admin/login)
    ├── Dashboard.tsx           # /dashboard
    ├── Patients.tsx            # /patients
    ├── PatientDetail.tsx       # /patients/:id
    ├── Appointments.tsx        # /appointments
    ├── Services.tsx            # /services (admin only)
    ├── Products.tsx            # /products (admin only)
    ├── POS.tsx                 # /pos — kasir
    ├── Transactions.tsx        # /transactions
    ├── Commissions.tsx         # /commissions
    ├── Staff.tsx               # /staff (admin only)
    ├── Settings.tsx            # /settings (admin only)
    ├── WhatsAppMessaging.tsx   # /whatsapp
    ├── CmsManagement.tsx       # /cms (admin only)
    └── NotFound.tsx
```

### 4.3 ApiClient — Cara Pakai
```typescript
import { apiClient, API_ENDPOINTS } from "@/integrations/api";

// GET
const data = await apiClient.get<{ data: Patient[] }>(API_ENDPOINTS.PATIENTS.LIST);

// GET dengan params
const data = await apiClient.get<{ data: Patient[] }>(API_ENDPOINTS.PATIENTS.LIST, { search: "budi" });

// POST
const result = await apiClient.post<{ data: Patient }>(API_ENDPOINTS.PATIENTS.CREATE, payload);

// PUT
await apiClient.put(API_ENDPOINTS.PATIENTS.UPDATE(id), updates);

// DELETE
await apiClient.delete(API_ENDPOINTS.PATIENTS.DELETE(id));

// File upload (multipart) — gunakan fetch langsung karena apiClient pakai application/json
const token = apiClient.getAccessToken();
const formData = new FormData();
formData.append("file", file);
const response = await fetch(`${baseURL}${API_ENDPOINTS.CMS.UPLOAD_IMAGE}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

Token disimpan di `localStorage`:
- `access_token` — JWT access (24 jam)
- `refresh_token` — JWT refresh (7 hari)

Auto-refresh: jika request 401, ApiClient otomatis coba refresh token lalu retry.
Jika refresh gagal → redirect ke `/admin/login`.

### 4.4 Route Pages & Akses
| Path | Page | Role yang boleh akses |
|------|------|-----------------------|
| `/` | LandingPage | Public |
| `/admin/login` | Auth | Public |
| `/dashboard` | Dashboard | Semua (authenticated) |
| `/patients` | Patients | admin, doctor, therapist |
| `/patients/:id` | PatientDetail | admin, doctor, therapist |
| `/appointments` | Appointments | Semua |
| `/services` | Services | admin |
| `/products` | Products | admin |
| `/pos` | POS | Semua |
| `/transactions` | Transactions | admin, cashier |
| `/commissions` | Commissions | admin, doctor, therapist |
| `/staff` | Staff | admin |
| `/settings` | Settings | admin |
| `/whatsapp` | WhatsAppMessaging | admin, cashier |
| `/cms` | CmsManagement | admin |

### 4.5 Hooks Pattern
Semua hooks menggunakan TanStack Query:
```typescript
// Read
const { data, isLoading, error } = useQuery({
  queryKey: ["patients"],
  queryFn: async () => apiClient.get<{data: Patient[]}>(API_ENDPOINTS.PATIENTS.LIST),
});

// Mutate
const mutation = useMutation({
  mutationFn: async (payload) => apiClient.post(...),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    toast.success("...");
  },
  onError: (error) => toast.error(error.message),
});
```

### 4.6 Env Variables Frontend
```env
VITE_API_BASE_URL=http://localhost:8080/api   # default jika tidak diset
VITE_API_TIMEOUT=30000                         # ms, opsional
```

### 4.7 Menjalankan Frontend
```bash
cd shasi
cp .env.example .env   # isi VITE_API_BASE_URL
npm install
npm run dev            # dev server default: http://localhost:5173
npm run build          # production build ke shasi/dist/
```

---

## 5. Alur Data End-to-End (Contoh: Buat Transaksi)

```
User klik "Bayar" di POS.tsx
  → POSInterface.tsx call useTransactions().createTransaction(payload)
    → apiClient.post("/api/transactions", payload)
      → Backend: POST /api/transactions
        → transaction/handler.go → Create()
          → transaction/service.go → Create()
            → transaction/repository.go → INSERT + auto-generate commission
  → onSuccess: invalidate ["transactions"] query
  → UI auto-refresh
```

---

## 6. Integrasi Eksternal

### WhatsApp
- **Status:** Opsional — hanya aktif jika `WHATSAPP_API_URL` diset di `.env`
- Jika tidak diset: endpoint `/whatsapp/send` tetap return success tapi tidak kirim pesan nyata
- Frontend: `WhatsAppMessaging.tsx` — kirim individual atau bulk reminder appointment
- Untuk produksi: integrasikan dengan Wablas, Fonnte, atau penyedia WA API lain

### Image Upload
- File disimpan **lokal** di `sc-pos-be/uploads/cms/`
- Accessible via `GET http://localhost:8080/uploads/cms/<filename>`
- Untuk produksi: pertimbangkan CDN atau object storage (S3, Cloudflare R2)
- Max file size: 5 MB, hanya tipe `image/*`

---

## 7. Hal yang BELUM Diimplementasi / Pekerjaan Tersisa

### Fungsionalitas Backend yang masih stub/kosong
- [ ] `settings/handler.go` → `UploadLogo()` — belum implementasi upload nyata (masih return empty)
- [ ] Commission auto-generate — belum ada logika otomatis buat commission saat transaksi dibuat
- [ ] `appointment/handler.go` → `AvailableSlots()` — perlu cek jadwal staff
- [ ] Pagination — semua endpoint LIST belum ada pagination (`page`, `limit` query params)
- [ ] Soft delete products — sekarang hard delete, perlu konsistensi dengan patients

### Fungsionalitas Frontend yang belum ada
- [ ] Form untuk `stock_movements` (tambah stok manual) di halaman Products
- [ ] UI untuk `service_consumables` (link produk ke layanan) di halaman Services
- [ ] `reminder_opt_in` toggle di form patient
- [ ] WhatsApp bulk reminder menggunakan `SEND_BULK` endpoint (sekarang masih loop individual)
- [ ] Export data (PDF/Excel) untuk laporan transaksi dan komisi
- [ ] Notifikasi real-time (saat ini manual refresh)

### Known Issues
- `internal/repository/patient.go` — ada file duplikat lama di `internal/repository/`, yang aktif ada di `internal/modules/patient/repository.go`. File lama mungkin stale.
- Supabase client (`shasi/src/integrations/supabase/`) masih ada di codebase. Sudah tidak dipakai tapi belum dihapus — aman dibiarkan, tidak di-import oleh kode aktif.
- `useTransactionStats` hook masih fetch dari endpoint yang mungkin belum optimal (fetch semua transaksi lalu filter client-side untuk stats)

---

## 8. Cara Menambah Module Baru (Pola Standar)

Misalnya ingin tambah module `report`:

**Backend:**
1. Buat folder `sc-pos-be/internal/modules/report/`
2. Buat `repository.go` — query SQL
3. Buat `service.go` — business logic
4. Buat `handler.go` — HTTP handlers + `NewModule()`
5. Buat `routes.go` — `RegisterRoutes(router, admin)`
6. Daftarkan di `routes/routes.go`: import + `report.RegisterRoutes(protectedAPI, adminOnly)`
7. Jika perlu tabel baru: tambah migration di `database/migrations.go` (tambah ke array `migrations` + buat konstanta SQL-nya)

**Frontend:**
1. Tambah endpoint di `integrations/api/endpoints.ts`
2. Buat hook `hooks/useReport.ts` (TanStack Query pattern)
3. Buat page `pages/Reports.tsx`
4. Tambah route di `App.tsx` dengan `ProtectedRoute`
5. Tambah link di `components/layout/Sidebar.tsx`

---

## 9. Commands Penting

```bash
# Backend
cd sc-pos-be
go build ./...                    # compile check
go run main.go                    # start dev server
go test ./...                     # run tests (belum ada test files)

# Frontend
cd shasi
npm run dev                       # dev server
npm run build                     # production build
npx tsc --noEmit --ignoreDeprecations 5.0  # typecheck

# Database (contoh psql)
psql -U postgres -d sc_pos        # connect
\dt                               # list tables
```

---

## 10. Git History Ringkas

```
29fc79d - Migrate backend integrations from Supabase to self-managed service
          (WhatsApp, image upload, stock_movements, service_consumables,
           reminder_opt_in, dashboard backend, type cleanup, AGENTS.md)

0db4688 - init (patient search fix)

9ac8eb4 - Initial commit (full project scaffold)
```

---

*Terakhir diupdate: setelah sesi migrasi Supabase → self-managed backend*

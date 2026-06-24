# SC Project — Panduan Konteks untuk AI Agent

> File ini dibuat untuk membantu AI agent (Devin, Claude, dsb.) memahami project ini secara end-to-end
> tanpa perlu eksplorasi berulang dari nol. Update file ini setiap kali ada perubahan arsitektur besar.

---

## 1. Gambaran Umum Project

**SC Project** adalah sistem manajemen klinik kecantikan (aesthetic clinic / salon) dengan arsitektur **multi-tenant SaaS** dan **RBAC granular**.
Terdiri dari dua sub-project dalam satu monorepo:

| Sub-project | Lokasi       | Stack                     | Fungsi                        |
| ----------- | ------------ | ------------------------- | ----------------------------- |
| `sc-pos-be` | `sc-pos-be/` | Go + PostgreSQL + Gin     | REST API backend              |
| `shasi`     | `shasi/`     | React + TypeScript + Vite | Frontend admin + landing page |

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
│   │   ├── service_consumable.go
│   │   ├── organization.go          # Organization, OrganizationMember, Permission, RolePermission, UserPermission
│   │   └── nullable_time.go         # NullableTime — wrapper time.Time untuk JSON/SQL NULL + empty string
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
Schema saat ini adalah **fresh consolidated schema** (4 step: create schema, indexes, seed permissions, seed role permissions).
Setelah perubahan arsitektur multi-tenant + audit trail, direkomendasikan membuat database baru dari nol supaya schema koheren.
DDL tetap idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`), jadi aman dijalankan berulang.

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
- `AuthMiddleware` tidak hanya cek signature JWT, tapi juga verifikasi `user_id` dari JWT masih ada di tabel `users` (menolak token dari database lama/deleted user)
- `OrgMiddleware` membaca `X-Organization-ID`, verifikasi keanggotaan user aktif, dan set `org_id` + `org_role`
- `RequirePermission("resource:action")` → cek effective permission (gabungan `role_permissions` + `user_permissions`) untuk org aktif
- `RequireRole("admin", ...)` → legacy role check, masih dipakai beberapa route admin-only
- Context keys dari JWT: `user_id`, `email`, `role`; ditambah dari OrgMiddleware: `org_id`, `org_role`

### 2.8 Semua Route Backend

**Base URL:** `http://localhost:8080/api`

#### Auth (public)

| Method | Path             | Deskripsi                                  |
| ------ | ---------------- | ------------------------------------------ |
| POST   | `/auth/login`    | Login, return JWT                          |
| POST   | `/auth/register` | Register user baru (default role: cashier) |
| POST   | `/auth/refresh`  | Refresh access token                       |

#### Auth (protected)

| Method | Path           | Role  |
| ------ | -------------- | ----- |
| GET    | `/auth/me`     | Semua |
| POST   | `/auth/logout` | Semua |

#### Patients

| Method | Path               | Role  | Notes                           |
| ------ | ------------------ | ----- | ------------------------------- |
| GET    | `/patients`        | Semua | `?search=nama` untuk filter     |
| GET    | `/patients/search` | Semua | dedicated search endpoint       |
| POST   | `/patients`        | Semua |                                 |
| GET    | `/patients/:id`    | Semua |                                 |
| PUT    | `/patients/:id`    | Semua |                                 |
| DELETE | `/patients/:id`    | Semua | soft delete (`is_active=false`) |

#### Patients (tambahan)

| Method | Path                         | Role  | Notes                                                                 |
| ------ | ---------------------------- | ----- | --------------------------------------------------------------------- |
| GET    | `/patients/:id/visits`       | Semua | Riwayat kunjungan: service, doctor_name, therapist_name               |
| GET    | `/patients/:id/transactions` | Semua | Riwayat transaksi: doctor_name + therapist_name (agregasi dari items) |

#### Services

| Method | Path                      | Role  |
| ------ | ------------------------- | ----- |
| GET    | `/services`               | Semua |
| POST   | `/services`               | Admin |
| GET    | `/services/:id`           | Semua |
| PUT    | `/services/:id`           | Admin |
| DELETE | `/services/:id`           | Admin |
| GET    | `/service-categories`     | Semua |
| POST   | `/service-categories`     | Admin |
| PUT    | `/service-categories/:id` | Admin |
| DELETE | `/service-categories/:id` | Admin |

#### Products

| Method | Path                      | Role  |
| ------ | ------------------------- | ----- |
| GET    | `/products`               | Semua |
| POST   | `/products`               | Admin |
| GET    | `/products/:id`           | Semua |
| PUT    | `/products/:id`           | Admin |
| DELETE | `/products/:id`           | Admin |
| GET    | `/product-categories`     | Semua |
| POST   | `/product-categories`     | Admin |
| PUT    | `/product-categories/:id` | Admin |
| DELETE | `/product-categories/:id` | Admin |

#### Staff

| Method | Path         | Role  |
| ------ | ------------ | ----- |
| GET    | `/staff`     | Semua |
| POST   | `/staff`     | Admin |
| GET    | `/staff/:id` | Semua |
| PUT    | `/staff/:id` | Admin |
| DELETE | `/staff/:id` | Admin |

#### Appointments

| Method | Path                            | Role  | Notes                             |
| ------ | ------------------------------- | ----- | --------------------------------- |
| GET    | `/appointments`                 | Semua | `?date=YYYY-MM-DD&view=day\|week` |
| POST   | `/appointments`                 | Semua |                                   |
| GET    | `/appointments/calendar`        | Semua |                                   |
| GET    | `/appointments/available-slots` | Semua |                                   |
| GET    | `/appointments/:id`             | Semua |                                   |
| PUT    | `/appointments/:id`             | Semua |                                   |
| DELETE | `/appointments/:id`             | Semua |                                   |

#### Transactions

| Method | Path                      | Role  |
| ------ | ------------------------- | ----- | -------------------------------------------------------------------------- |
| GET    | `/transactions`           | Semua |
| POST   | `/transactions`           | Semua | Jika `payment_status = paid`, otomatis generate commission & kurangi stock |
| GET    | `/transactions/:id`       | Semua |
| GET    | `/transactions/:id/items` | Semua | Setiap item include service/product + doctor/therapist                     |
| PUT    | `/transactions/:id`       | Semua |
| DELETE | `/transactions/:id`       | Semua |

#### Commissions

| Method | Path                          | Role                   |
| ------ | ----------------------------- | ---------------------- |
| GET    | `/commissions`                | Admin/Doctor/Therapist |
| GET    | `/commissions/staff/:staffId` | Admin                  |
| POST   | `/commissions/update-status`  | Admin                  |

Request body update-status:

```json
{ "ids": ["uuid1", "uuid2"], "status": "paid" }
```

#### Dashboard

| Method | Path                            | Auth | Notes                                           |
| ------ | ------------------------------- | ---- | ----------------------------------------------- |
| GET    | `/dashboard/stats`              | Ya   | `?from=YYYY-MM-DD&to=YYYY-MM-DD` opsional       |
| GET    | `/dashboard/revenue`            | Ya   | `?from=&to=` opsional; default 30 hari terakhir |
| GET    | `/dashboard/top-services`       | Ya   | `?from=&to=` opsional                           |
| GET    | `/dashboard/top-products`       | Ya   | `?from=&to=` opsional                           |
| GET    | `/dashboard/appointments-today` | Ya   | selalu hari ini, tidak ada filter               |

**Timezone:** Semua filter date range diinterpretasikan sebagai `Asia/Jakarta (UTC+7)`.
`parseDateRange()` menggunakan `time.ParseInLocation("Asia/Jakarta")`.
Query stats "hari ini" juga dihitung dalam WIB, bukan UTC server.

#### CMS (public)

| Method | Path                 |
| ------ | -------------------- |
| GET    | `/cms/pages`         |
| GET    | `/cms/pages/:pageId` |

#### CMS (protected admin)

| Method | Path                 | Notes                                                               |
| ------ | -------------------- | ------------------------------------------------------------------- |
| POST   | `/cms/pages`         | body: `{ "page_id": "...", ...content }`                            |
| PUT    | `/cms/pages/:pageId` |                                                                     |
| POST   | `/cms/upload-image`  | **multipart/form-data**: field `file` (image) + `folder` (opsional) |

Upload image returns: `{ "success": true, "data": { "url": "http://..." } }`
File disimpan ke `./uploads/cms/<folder>/` dan dapat diakses via `GET /uploads/...`

#### Settings

| Method | Path                    | Role  |
| ------ | ----------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| GET    | `/settings/clinic`      | Semua |
| PUT    | `/settings/clinic`      | Admin | `invoice_header_title`, `invoice_header_description`, `invoice_footer_text` dipakai untuk cetak struk |
| POST   | `/settings/clinic/logo` | Admin |

#### Stock Movements

| Method | Path               | Role  | Notes                                    |
| ------ | ------------------ | ----- | ---------------------------------------- |
| GET    | `/stock-movements` | Semua | `?product_id=uuid` opsional              |
| POST   | `/stock-movements` | Admin | Otomatis update `products.current_stock` |

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

| Method | Path                       | Role  | Notes                                             |
| ------ | -------------------------- | ----- | ------------------------------------------------- |
| GET    | `/service-consumables`     | Semua | `?service_id=uuid` opsional                       |
| POST   | `/service-consumables`     | Admin | body: `{ service_id, product_id, quantity_used }` |
| DELETE | `/service-consumables/:id` | Admin |                                                   |

#### WhatsApp

| Method | Path                  | Notes                                                                      |
| ------ | --------------------- | -------------------------------------------------------------------------- |
| POST   | `/whatsapp/send`      | `{ "to": "+628...", "message": "..." }`                                    |
| POST   | `/whatsapp/send-bulk` | `{ "recipients": [{"to":"...", "patient_name":"..."}], "message": "..." }` |
| GET    | `/whatsapp/templates` | List template pesan                                                        |

Jika `WHATSAPP_API_URL` tidak diset, endpoint ini hanya simulasi (tidak benar-benar kirim).

---

## 3. Database Schema

### Tabel Utama

```sql
users                -- akun login (id, email, password, role, full_name, avatar_url, created_at, updated_at)
organizations        -- unit tenant/bisnis SaaS (id, name, slug, description, logo_url, is_active,
                     --   created_by, updated_by, deleted_at, created_at, updated_at)
organization_members -- relasi user <-> org (id, org_id, user_id, role, is_active, joined_at,
                     --   created_by, updated_by, deleted_at, created_at, updated_at)
permissions          -- daftar permission granular (id, resource, action, description)
role_permissions     -- mapping role default → permission (id, role, permission_id)
user_permissions     -- extra grant per user per org (id, user_id, org_id, permission_id,
                     --   granted_by, granted_at)

service_categories   -- (id, name, description, is_active, organization_id,
                     --   created_by, updated_by, deleted_at, created_at, updated_at)
services             -- (id, name, category_id, description, duration_minutes, base_price,
                     --   doctor_commission_type, doctor_commission_value,
                     --   therapist_commission_type, therapist_commission_value, requires_doctor,
                     --   is_active, organization_id, created_by, updated_by, deleted_at,
                     --   created_at, updated_at)
product_categories   -- (id, name, description, is_active, organization_id,
                     --   created_by, updated_by, deleted_at, created_at, updated_at)
products             -- (id, name, category, sku, supplier, purchase_price, selling_price,
                     --   current_stock, minimum_stock, unit, expiry_date, is_active,
                     --   organization_id, created_by, updated_by, deleted_at, created_at, updated_at)
staff                -- (id, user_id, full_name, role, phone, email, specialization,
                     --   is_active, organization_id, created_by, updated_by, deleted_at,
                     --   created_at, updated_at)
patients             -- (id, patient_code, full_name, photo_url, date_of_birth, gender,
                     --   phone, whatsapp, email, address, allergy_history, medical_conditions,
                     --   skin_type, notes, tags[], is_active, reminder_opt_in, organization_id,
                     --   created_by, updated_by, deleted_at, created_at, updated_at)
appointments         -- (id, patient_id, service_id, doctor_id, therapist_id, scheduled_at,
                     --   duration_minutes, status, notes, organization_id, created_by, updated_by,
                     --   deleted_at, created_at, updated_at)
transactions         -- (id, transaction_code, appointment_id, patient_id, subtotal,
                     --   discount_amount, discount_type, total_amount, tax_amount,
                     --   payment_method, payment_status, notes, paid_at, organization_id,
                     --   created_by, updated_by, deleted_at, created_at, updated_at)
transaction_items    -- (id, transaction_id, item_type, service_id, product_id, quantity,
                     --   unit_price, discount_amount, total_price, doctor_id, therapist_id,
                     --   organization_id, created_by, updated_by, deleted_at, created_at)
commissions          -- (id, staff_id, staff_role, transaction_id, transaction_item_id,
                     --   base_amount, commission_type, commission_value, commission_amount,
                     --   status, organization_id, created_by, updated_by, deleted_at,
                     --   created_at, updated_at)
clinic_settings      -- (id, clinic_name, address, phone, email, tax_rate, tax_inclusive,
                     --   low_stock_alerts, appointment_reminders, expiry_warnings,
                     --   reminder_hours_before, whatsapp_reminder_enabled, email_reminder_enabled,
                     --   whatsapp_business_phone_id, logo_url, invoice_header_title,
                     --   invoice_header_description, invoice_footer_text, organization_id,
                     --   created_by, updated_by, deleted_at, created_at, updated_at)
cms_pages            -- (id, page_id, data JSONB, organization_id, created_by, updated_by,
                     --   deleted_at, created_at, updated_at)
stock_movements      -- (id, product_id, movement_type, quantity, reason, reference_id,
                     --   reference_type, notes, organization_id, created_by, created_at)
service_consumables  -- (id, service_id, product_id, quantity_used, organization_id, created_by,
                     --   updated_by, deleted_at, created_at, updated_at)
                     --   UNIQUE(service_id, product_id)
```

### Notes Penting DB

- `patients.tags` → tipe `TEXT[]` PostgreSQL, di Go gunakan `pq.Array(&patient.Tags)`
- `cms_pages.data` → tipe `JSONB`
- `appointments.status` → `scheduled | confirmed | completed | cancelled | no_show`
- `transactions.payment_status` → `pending | paid | cancelled | refunded`
- `commissions.status` → `pending | paid | cancelled`
- `stock_movements.movement_type` → `in | out | adjustment`
- **Semua tabel bisnis** memiliki kolom audit: `created_by`, `updated_by`, `deleted_at`.
  - `deleted_at IS NULL` berarti record masih aktif.
  - `deleted_at IS NOT NULL` berarti record sudah di-soft-delete.
  - `stock_movements` sengaja tidak punya `updated_by`/`deleted_at` karena record stok bersifat immutable.
- **Semua tabel bisnis** memiliki `organization_id` FK ke `organizations(id)` untuk multi-tenant.
- `users.id` dan semua FK user/audit adalah `VARCHAR(36)` (bukan UUID), supaya konsisten dengan Go UUID string.
- `permissions.id` memakai format `resource:action` (contoh: `patients:read`).
- Field tanggal opsional (`patients.date_of_birth`, `products.expiry_date`) di Go menggunakan `models.NullableTime`.
  - Menerima JSON: `null`, `""`, `YYYY-MM-DD`, atau `RFC3339`.
  - Jika kosong, disimpan sebagai `NULL` di PostgreSQL.
- Migration **tidak menggunakan file terpisah** — semua dalam `migrations.go` sebagai SQL string constants.
- Schema saat ini adalah **fresh consolidated schema** (4 migration steps: create schema, indexes, seed permissions, seed role permissions). Setelah refactor ini, direkomendasikan membuat database baru dari nol.

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
const data = await apiClient.get<{ data: Patient[] }>(
  API_ENDPOINTS.PATIENTS.LIST,
);

// GET dengan params
const data = await apiClient.get<{ data: Patient[] }>(
  API_ENDPOINTS.PATIENTS.LIST,
  { search: "budi" },
);

// POST
const result = await apiClient.post<{ data: Patient }>(
  API_ENDPOINTS.PATIENTS.CREATE,
  payload,
);

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

| Path            | Page              | Role yang boleh akses    |
| --------------- | ----------------- | ------------------------ |
| `/`             | LandingPage       | Public                   |
| `/admin/login`  | Auth              | Public                   |
| `/dashboard`    | Dashboard         | Semua (authenticated)    |
| `/patients`     | Patients          | admin, doctor, therapist |
| `/patients/:id` | PatientDetail     | admin, doctor, therapist |
| `/appointments` | Appointments      | Semua                    |
| `/services`     | Services          | admin                    |
| `/products`     | Products          | admin                    |
| `/categories`   | Categories        | admin ← BARU             |
| `/pos`          | POS               | Semua                    |
| `/transactions` | Transactions      | admin, cashier           |
| `/commissions`  | Commissions       | admin, doctor, therapist |
| `/staff`        | Staff             | admin                    |
| `/settings`     | Settings          | admin                    |
| `/whatsapp`     | WhatsAppMessaging | admin, cashier           |
| `/cms`          | CmsManagement     | admin                    |

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
- [ ] `appointment/handler.go` → `AvailableSlots()` — perlu cek jadwal staff
- [ ] Pagination — semua endpoint LIST belum ada pagination (`page`, `limit` query params)

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

### Bug yang sudah diperbaiki (untuk referensi)

- **`pq: unexpected Parse response 'C'`** saat mark transaction as paid → `MarkPaidEffects()` di `transaction/repository.go` memanggil query baru di dalam loop `rows.Next()` saat cursor masih terbuka. Fix: collect semua rows ke slice, `rows.Close()` eksplisit, baru lakukan DML.
- **Dashboard stats = 0 saat filter hari ini** → `parseDateRange` menggunakan UTC midnight (`time.Parse`), bukan WIB. Fix: `time.ParseInLocation("Asia/Jakarta")`. Query no-filter juga diperbaiki dari `CURRENT_DATE` PostgreSQL ke batas waktu WIB yang dihitung di Go.
- **Backend binary lama tidak di-restart** → routes baru tidak aktif setelah deploy. Selalu `pkill -f "go run main.go" && go run main.go` atau `make kill && make run` setelah perubahan Go.
- **`pq: foreign key constraint patients_updated_by_fkey cannot be implemented`** setelah nambah audit trail → audit columns dideklarasikan sebagai `UUID` padahal `users.id` adalah `VARCHAR(36)`. Fix: semua FK user/audit dijadikan `VARCHAR(36)`, sekaligus migrasi di-consolidate jadi schema bersih dari awal.
- **JWT dari database lama masih diterima setelah reset DB** → `AuthMiddleware` sekarang cek `user_id` dari JWT masih ada di tabel `users`.
- **Banyak endpoint mengembalikan `permission check failed` untuk user/org baru** → query `checkPermission` memfilter `user_permissions.deleted_at IS NULL`, padahal tabel `user_permissions` tidak punya kolom `deleted_at` (grants di-revoke via hard DELETE). Fix: hapus filter `deleted_at` dari query tersebut.
- **`parsing time ""` / `parsing time "YYYY-MM-DD"` saat create/update Patient/Product** → `*time.Time` tidak menerima string kosong atau date-only. Fix: buat `models.NullableTime` yang menerima `null`, `""`, `RFC3339`, dan `YYYY-MM-DD`, lalu apply ke `Patient.DateOfBirth` dan `Product.ExpiryDate`.

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
6dd3a06 - feat: commissions on paid transaction creation, patient history staff names, transaction detail + print receipt
          Backend: Create paid transaction otomatis generate commission & kurangi stock.
                   Patient visits/transactions sertakan doctor_name + therapist_name.
          Frontend: TransactionDetailDialog dengan Print Receipt. Receipt header/footer
                   pakai clinic_settings.invoice_header_* / invoice_footer_text.

36fea2a - fix(frontend): show gender in patient list even when date of birth is empty
          Cell Age/Gender di PatientList tadinya tidak render apa-apa kalau age null.
          Sekarang gender tetap tampil meskipun DOB kosong.

68af740 - fix(models): handle empty string dates for optional date fields
          Buat models.NullableTime. Apply ke Patient.DateOfBirth & Product.ExpiryDate.
          Menerima null, "", date-only (YYYY-MM-DD), dan RFC3339.

a357a69 - fix(rbac): remove deleted_at filter from user_permissions permission check
          Query checkPermission salah filter user_permissions.deleted_at IS NULL,
          padahal tabel tidak punya kolom deleted_at. Fix: hapus filter.

6f2b237 - fix(auth): reject JWTs when the user no longer exists
          AuthMiddleware sekarang verifikasi user_id dari JWT masih ada di tabel users.

fafa73c - refactor: clean consolidated database schema from scratch
          Ganti 27-step migration tumpuk jadi 4 migration step bersih.
          Semua tabel bisnis langsung punya organization_id + created_by/updated_by/deleted_at.
          Fix FK type mismatch: audit/user FK pakai VARCHAR(36) konsisten dengan users.id.

8a5bd48 - feat: full audit trail (created_by, updated_by, deleted_at) across all business tables
          Semua repository soft-delete pattern: deleted_at IS NULL, create set created_by,
          update set updated_by + updated_at. stock_movements tetap immutable.

2ed7388 - feat: multi-tenant SaaS + granular RBAC
          Organizations, org_members, permissions, role_permissions, user_permissions.
          OrgMiddleware, RequirePermission, Onboarding, RBACManagement page, OrgSwitcher.

7b3933a - docs(AGENTS.md): update context — new routes, schema, bugs, git history

0706431 - chore: add Makefile kill target + update frontend dist build

72587c3 - fix: close rows cursor before DML in MarkPaidEffects
          Root cause: pq error "unexpected Parse response 'C'" karena QueryRow
          dipanggil di dalam loop rows.Next() di MarkPaidEffects().
          Fix: collect rows ke slice → rows.Close() → lalu DML.

109edca - fix(timezone) + feat(categories)
          Backend: parseDateRange pakai ParseInLocation(Asia/Jakarta).
                   Dashboard no-filter hitung batas hari ini di Go (WIB), bukan CURRENT_DATE.
          Frontend: Transactions filter & display pakai paid_at bukan created_at.
                    Halaman /categories baru (CRUD service & product categories).
                    Sidebar: tambah menu Categories.
                    useServiceCategories diperluas dengan create/update/delete mutations.

5bb4583 - feat: patient history, product/service category CRUD, dashboard filter, POS search
          Backend:  GET /patients/:id/visits, /patients/:id/transactions
                    Tabel product_categories + full CRUD /product-categories
                    PUT/DELETE /service-categories/:id
                    Dashboard endpoints terima ?from=&to= date range filter
          Frontend: PatientDetail tab Visit History & Transactions (data real dari backend)
                    ProductFormDialog fetch categories dari API
                    useDashboard hooks terima DateRangeParams
                    POSInterface patient dropdown → searchable Popover+Command combobox
                    PatientFormDialog tambah field Tags (chip input)

149bb81 - Fix end-to-end bugs: auth redirect, transaction, dashboard

a07cf80 - Fix router conflict: rename service-consumables route path

ca2cdde - Add AGENTS.md

29fc79d - Migrate backend integrations from Supabase to self-managed service
```

---

_Terakhir diupdate: commit 6dd3a06 — transaction commission on creation, patient history staff names, transaction detail dialog + print receipt_

---

## 11. Multi-Tenant & RBAC Architecture (Fitur Baru)

### 11.1 Overview

Sistem telah diupgrade ke arsitektur **multi-organization SaaS** dengan **RBAC granular**:

- Satu user bisa menjadi anggota lebih dari satu organisasi/klinik dengan role berbeda
- Setiap data (pasien, produk, dll.) diisolasi per `organization_id`
- Permission diperiksa di middleware backend — bukan hanya role
- Frontend menyimpan `active_org_id` di localStorage dan mengirimnya via header

### 11.2 Tabel Database Baru

```sql
organizations       -- (id, name, slug UNIQUE, description, logo_url, created_by FK→users,
                   --   is_active, deleted_at, created_at, updated_at)
organization_members-- (id, org_id FK, user_id FK, role, is_active, joined_at,
                   --   created_by, updated_by, deleted_at, created_at, updated_at)
                   --   UNIQUE(org_id, user_id)
permissions         -- (id, resource, action, description) — tabel master permission
                   -- contoh: { resource: "patients", action: "read", description: "..." }
role_permissions    -- (id, role, permission_id FK) — default permission per role
                   -- di-seed saat migration; admin punya semua permission
user_permissions    -- (id, user_id FK, permission_id FK, org_id FK, granted_by FK, granted_at)
                   -- extra permission per-user di luar default role-nya
                   -- kosong by default; baru terisi kalau admin grant extra permission
```

Setiap tabel bisnis (patients, services, products, staff, appointments, transactions, commissions,
clinic_settings, cms_pages, stock_movements, service_consumables) mendapat kolom:

```sql
organization_id VARCHAR(36) REFERENCES organizations(id)  -- nullable, NULL = data lama/global
```

### 11.3 Backend: Middleware Baru

```go
// middleware/auth.go

// OrgMiddleware — dipasang setelah AuthMiddleware di semua protected routes
// Membaca header X-Organization-ID, verifikasi keanggotaan user, set ke context:
//   c.Set("org_id", orgID)
//   c.Set("org_role", role)   // role user di org tersebut (override JWT role)
middleware.OrgMiddleware()

// RequirePermission — cek permission spesifik (gabungan role_permissions + user_permissions)
// Contoh: middleware.RequirePermission("patients:read")
// Urutan cek: 1) ambil default perms dari role_permissions, 2) merge user_permissions,
//             3) jika permission ada → lanjut, jika tidak → 403
// Catatan: user_permissions di-revoke via hard DELETE (tidak ada soft delete), jadi query
// tidak memfilter deleted_at di sini.
middleware.RequirePermission("resource:action")

// RequireRole — legacy, masih digunakan untuk beberapa route (misal: admin-only)
middleware.RequireRole("admin")
middleware.RequireRole("admin", "doctor", "therapist")
```

**Context keys yang tersedia di handler setelah middleware:**

- `user_id` — dari JWT
- `email` — dari JWT
- `role` — dari JWT (atau dioverride oleh org_role)
- `org_id` — dari X-Organization-ID header (setelah diverifikasi)
- `org_role` — role user di organisasi aktif

### 11.4 Backend: Pola Repository Org-Aware

Semua repository method sekarang menerima `orgID string` sebagai parameter. Pattern SQL:

```sql
-- Filter di WHERE: jika orgID kosong (""), kembalikan semua; jika ada, filter ketat
AND (organization_id = $N OR ($N::text = '' AND organization_id IS NULL))

-- CREATE: simpan orgID, NULL jika kosong
-- Di Go: var orgVal interface{}; if orgID != "" { orgVal = orgID }
-- INSERT: organization_id = $N → orgVal
```

Setiap handler mengekstrak `orgID` dari context:

```go
orgID := c.GetString("org_id")
```

### 11.5 Backend: Route Baru

#### Organizations

| Method | Path                                 | Permission                                    |
| ------ | ------------------------------------ | --------------------------------------------- |
| GET    | `/organizations/my`                  | authenticated                                 |
| POST   | `/organizations`                     | authenticated (creates + sets owner as admin) |
| GET    | `/organizations/:id`                 | `organization:read`                           |
| PUT    | `/organizations/:id`                 | `organization:write`                          |
| DELETE | `/organizations/:id`                 | `organization:write`                          |
| GET    | `/organizations/:id/members`         | `organization:read`                           |
| POST   | `/organizations/:id/members`         | `organization:write`                          |
| PUT    | `/organizations/:id/members/:userId` | `organization:write`                          |
| DELETE | `/organizations/:id/members/:userId` | `organization:write`                          |

#### RBAC

| Method | Path                                     | Permission                                             |
| ------ | ---------------------------------------- | ------------------------------------------------------ |
| GET    | `/rbac/permissions`                      | authenticated                                          |
| GET    | `/rbac/my-permissions`                   | authenticated (returns effective perms for active org) |
| GET    | `/rbac/role-permissions`                 | authenticated                                          |
| GET    | `/rbac/role-permissions/:role`           | authenticated                                          |
| PUT    | `/rbac/role-permissions/:role`           | `rbac:write`                                           |
| GET    | `/rbac/user-permissions/:userId`         | `rbac:read`                                            |
| POST   | `/rbac/user-permissions/:userId`         | `rbac:write`                                           |
| DELETE | `/rbac/user-permissions/:userId/:permId` | `rbac:write`                                           |

#### Auth (updated)

- `POST /auth/register` — sekarang menerima `full_name` + `organization_name` (opsional).
  Jika `organization_name` diisi, auto-create org dan return `organizations[]` dalam response.
- `POST /auth/login` — response sekarang include `organizations: []OrgInfo`
- `GET /auth/me` — response include `org_id`, `org_role`, `permissions[]` jika ada `X-Organization-ID`

### 11.6 Frontend: Perubahan Kunci

#### AuthContext (`contexts/AuthContext.tsx`)

State baru:

```ts
activeOrg: OrgInfo | null          // org yang sedang aktif
organizations: OrgInfo[]           // semua org user
permissions: string[]              // effective perms di activeOrg
needsOnboarding: boolean           // true jika user tapi belum punya org
```

Method baru:

```ts
signIn(user, orgs); // set user + set org pertama sebagai aktif
switchOrg(org); // ganti activeOrg, reload permissions
hasPermission("patients:read"); // cek permission
hasRole("admin", "doctor"); // cek role
```

#### ApiClient (`integrations/api/client.ts`)

- Setiap request otomatis menyertakan `X-Organization-ID: <active_org_id>`
- Method baru: `setActiveOrgId(id)`, `getActiveOrgId()`, `clearActiveOrg()`
- `clearTokens()` sekarang juga clear `active_org_id` dari localStorage

#### Komponen & Halaman Baru

| Path          | Komponen                            | Deskripsi                                        |
| ------------- | ----------------------------------- | ------------------------------------------------ |
| `/onboarding` | `pages/Onboarding.tsx`              | Buat organisasi pertama setelah register         |
| `/rbac`       | `pages/RBACManagement.tsx`          | Kelola role permissions + user extra permissions |
| -             | `components/layout/OrgSwitcher.tsx` | Dropdown ganti organisasi aktif                  |

#### ProtectedRoute (`components/auth/ProtectedRoute.tsx`)

Prop baru:

```tsx
<ProtectedRoute requirePermission="patients:read">  // permission-based guard
<ProtectedRoute allowedRoles={["admin"]}>            // legacy role guard (masih didukung)
```

Juga otomatis redirect ke `/onboarding` jika `needsOnboarding === true`.

#### Sidebar

- Menampilkan nama org aktif di header (menggantikan hardcoded "Shasi Beauty Care")
- OrgSwitcher muncul di atas nav menu
- Menu item disembunyikan jika user tidak punya permission yang diperlukan
- Menu baru: **Roles & Permissions** (`/rbac`, icon Shield, permission: `rbac:read`)

### 11.7 Permission List (Seeds Default)

Resource x Action pairs yang ada di tabel `permissions`:

| Resource       | Actions                   |
| -------------- | ------------------------- |
| `patients`     | `read`, `write`, `delete` |
| `appointments` | `read`, `write`, `delete` |
| `services`     | `read`, `write`, `delete` |
| `products`     | `read`, `write`, `delete` |
| `categories`   | `read`, `write`, `delete` |
| `transactions` | `read`, `write`, `delete` |
| `commissions`  | `read`, `write`           |
| `staff`        | `read`, `write`, `delete` |
| `reports`      | `read`                    |
| `settings`     | `read`, `write`           |
| `cms`          | `read`, `write`           |
| `rbac`         | `read`, `write`           |
| `organization` | `read`, `write`           |

Default role assignments (role_permissions):

- `admin` → semua permission
- `doctor` → patients:read/write, appointments:read/write, services:read, commissions:read
- `therapist` → patients:read, appointments:read/write, services:read, commissions:read
- `cashier` → patients:read, transactions:read/write, products:read, services:read

### 11.8 Flow Register Baru

```
1. User isi: email, password, full_name (opsional), organization_name (wajib di form)
2. POST /auth/register { email, password, full_name, organization_name }
3. Backend: AuthMiddleware verifikasi user_id JWT masih ada di DB → create user → create org → add user sebagai org.role = "admin" → return tokens + orgs[]
4. Frontend: simpan token → signIn(user, orgs) → navigate("/dashboard")
5. Jika org_name kosong (misal: API langsung): register berhasil, orgs[] = [] → redirect ke /onboarding
```

### 11.9 Flow Login Baru

```
1. POST /auth/login { email, password }
2. Response: { access_token, user, organizations: [{id, name, slug, role}, ...] }
3. Frontend: simpan token → signIn(user, orgs) → set org pertama sebagai active
4. ApiClient mulai kirim X-Organization-ID di setiap request
5. Backend OrgMiddleware verifikasi keanggotaan → set org_id + org_role di context
6. Repository memfilter data by org_id
```

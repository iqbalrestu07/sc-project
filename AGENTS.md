# SC Project — Panduan Konteks untuk AI Agent

> File ini adalah **quick reference** untuk AI agent. Detail lengkap ada di `docs/`.
> Baca hanya doc yang relevan dengan task — jangan baca semua docs sekaligus (hemat token).

---

## ⚠️ Aturan Dokumentasi untuk AI Agent

### Kapan WAJIB update dokumentasi

| Jenis Perubahan                              | File yang Harus Diupdate                                   |
| -------------------------------------------- | ---------------------------------------------------------- |
| Tambah/hapus **endpoint API**                | `AGENTS.md` (route table) + `docs/API_REFERENCE.md`        |
| Tambah/hapus **tabel/kolom DB**              | `AGENTS.md` (schema section) + `docs/DATABASE_SCHEMA.md`   |
| Tambah/hapus **module backend**              | `AGENTS.md` (module list) + `docs/BACKEND_STRUCTURE.md`    |
| Tambah/hapus **page/komponen/hook frontend** | `AGENTS.md` (frontend list) + `docs/FRONTEND_STRUCTURE.md` |
| Ubah **business workflow**                   | `docs/FEATURES_AND_PROCESSES.md`                           |
| Ubah **auth/middleware/RBAC**                | `AGENTS.md` + `docs/INTEGRATION_GUIDE.md`                  |
| Migrasi **tipe data**                        | `AGENTS.md` + `docs/DATABASE_SCHEMA.md`                    |
| Tambah **index DB**                          | `docs/DATABASE_SCHEMA.md`                                  |

### Kapan TIDAK perlu update

Bug fix kecil, refactor internal tanpa ubah interface, styling/CSS, konfigurasi lokal, komentar kode.

### Cara update

Update bagian relevan saja (jangan rewrite file). Ubah `_Last updated_` ke hari ini. Jika ragu vital atau tidak → update saja.

---

## 📚 Dokumen Referensi (baca hanya yang relevan)

| Dokumen                          | Kapan Dibaca                                                |
| -------------------------------- | ----------------------------------------------------------- |
| `docs/BACKEND_STRUCTURE.md`      | Edit kode backend                                           |
| `docs/FRONTEND_STRUCTURE.md`     | Edit kode frontend                                          |
| `docs/INTEGRATION_GUIDE.md`      | Debug auth, org context, RBAC                               |
| `docs/CREATING_NEW_FEATURE.md`   | Buat fitur baru (step-by-step)                              |
| `docs/DATABASE_SCHEMA.md`        | Referensi tabel, kolom, index                               |
| `docs/API_REFERENCE.md`          | Referensi endpoint + request/response                       |
| `docs/FEATURES_AND_PROCESSES.md` | Pahami business workflow (walk-in, queue, POS, cancel, dll) |
| `docs/3D_LANDING_PAGE.md`        | Edit 3D scene / visual landing page                         |

---

## 1. Project Overview

**SC Project** — sistem manajemen klinik kecantikan, **multi-tenant SaaS** + **RBAC granular**.

| Sub-project | Lokasi       | Stack                                         | Port |
| ----------- | ------------ | --------------------------------------------- | ---- |
| `sc-pos-be` | `sc-pos-be/` | Go + Gin + PostgreSQL (raw SQL, no ORM)       | 8080 |
| `shasi`     | `shasi/`     | React 18 + TypeScript + Vite + TanStack Query | 5173 |

**Root:** `/Users/macbookpro/pjc/personal/sc-project/`

---

## 2. Backend Quick Reference

### Tech Stack

Go (module: `github.com/sc-pos/backend`), Gin, PostgreSQL (`lib/pq`, raw `database/sql`), JWT (`golang-jwt/v5`), UUIDv7 (`utils.NewUUID()`), godotenv.

### Module List (`internal/modules/`)

Setiap module: `handler.go` → `service.go` → `repository.go` → `routes.go`. Constructor: `NewModule()`.

| Module          | Fungsi                                                        |
| --------------- | ------------------------------------------------------------- |
| auth            | Login, register, refresh, me, logout                          |
| patient         | CRUD pasien + riwayat kunjungan & transaksi                   |
| service         | CRUD layanan + kategori                                       |
| product         | CRUD produk + kategori                                        |
| staff           | CRUD staff                                                    |
| appointment     | CRUD jadwal + calendar + today queue + cancel + cron reminder |
| transaction     | CRUD transaksi + items + by-appointment + add-item            |
| commission      | Komisi staff per transaksi                                    |
| dashboard       | Stats, revenue, top services/products/customers               |
| settings        | Pengaturan klinik + logo + favicon                            |
| cms             | CMS pages + upload image                                      |
| whatsapp        | WhatsApp multi-device (whatsmeow) + templates                 |
| omnichannel     | Chat omnichannel via WebSocket                                |
| organization    | Org CRUD + member management                                  |
| rbac            | Permission management                                         |
| stock           | Stock movements                                               |
| consumable      | Legacy service_consumables                                    |
| service_package | Consumable groups + alternatif produk                         |
| consumable_item | Produk habis pakai + usage logs                               |
| visit_note      | Rekam medis per kunjungan                                     |
| migration       | Import Excel bulk data                                        |

### Utils (`internal/utils/`)

| File          | Fungsi                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `response.go` | `SuccessResponse`, `ErrorResponse`, `SuccessResponseWithMessage`, `ListSuccessResponse`, `ParseIntQuery` |
| `uuid.go`     | `NewUUID()` — UUIDv7 (time-sortable), fallback UUIDv4                                                    |
| `time.go`     | `JakartaLocation`, `ToJakarta(t)`, `JakartaWallClock(t)`                                                 |

### Middleware (`internal/middleware/auth.go`)

| Middleware                  | Fungsi                                                                    |
| --------------------------- | ------------------------------------------------------------------------- |
| `CORSMiddleware()`          | CORS headers (global)                                                     |
| `AuthMiddleware()`          | Validate JWT + cek user di DB → set `user_id`, `email`, `role`            |
| `OrgMiddleware()`           | Baca `X-Organization-ID` → validasi membership → set `org_id`, `org_role` |
| `RequirePermission("x:y")`  | Cek effective permission (role_permissions + user_permissions)            |
| `RequireRole("admin", ...)` | Legacy role check                                                         |

### Context keys di handler: `user_id`, `email`, `role`, `org_id`, `org_role`

### Env Vars

```env
SERVER_HOST=0.0.0.0  SERVER_PORT=8080
DB_HOST=localhost  DB_PORT=5432  DB_USER=postgres  DB_PASSWORD=  DB_NAME=sc_pos  DB_SSLMODE=disable
JWT_SECRET_KEY=  JWT_EXPIRY_HOURS=24  JWT_REFRESH_EXPIRY_HOURS=168
UPLOAD_DIR=uploads/cms  BASE_URL=http://localhost:8080
DEFAULT_PUBLIC_ORG_SLUG=  WHATSAPP_API_URL=  WHATSAPP_API_TOKEN=
```

### Run

```bash
cd sc-pos-be && cp .env.example .env && go run main.go
# Migrations otomatis saat startup (idempotent: CREATE TABLE/INDEX IF NOT EXISTS)
```

---

## 3. API Route Summary

**Base:** `http://localhost:8080/api` | **Auth:** `Authorization: Bearer <token>` | **Org:** `X-Organization-ID: <uuid>`

Detail request/response → `docs/API_REFERENCE.md`

| Method              | Path                                                                                       | Notes                                             |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| POST                | `/auth/login`                                                                              | Public. Return JWT + organizations[]              |
| POST                | `/auth/register`                                                                           | Public. Auto-create org jika org_name diisi       |
| POST                | `/auth/refresh`                                                                            | Public                                            |
| GET                 | `/auth/me`                                                                                 | Include org_id, permissions jika X-Org header ada |
| POST                | `/auth/admin/register`                                                                     | Admin. Buat user + auto-add ke org                |
| GET                 | `/auth/users?email=`                                                                       | Admin. Search user for invite                     |
| GET/POST/PUT/DELETE | `/patients` + `/patients/:id`                                                              | Standard CRUD                                     |
| GET                 | `/patients/:id/visits`                                                                     | Riwayat kunjungan + all_services                  |
| GET                 | `/patients/:id/transactions`                                                               | Riwayat transaksi                                 |
| GET/POST            | `/patients/:id/visit-notes`                                                                | Rekam medis                                       |
| GET/PUT/DELETE      | `/visit-notes/:id`                                                                         | Rekam medis detail                                |
| GET/POST/PUT/DELETE | `/services` + `/services/:id`                                                              | Standard CRUD                                     |
| GET/POST/PUT/DELETE | `/service-categories` + `/:id`                                                             | Standard CRUD                                     |
| GET/POST/PUT/DELETE | `/products` + `/products/:id`                                                              | Standard CRUD                                     |
| GET/POST/PUT/DELETE | `/product-categories` + `/:id`                                                             | Standard CRUD                                     |
| GET/POST/PUT/DELETE | `/staff` + `/staff/:id`                                                                    | Standard CRUD                                     |
| GET                 | `/appointments`                                                                            | Kalender only (excludes walk-in)                  |
| POST                | `/appointments`                                                                            | `source`: appointment (default) / walk_in         |
| GET                 | `/appointments/calendar`                                                                   | Kalender — excludes walk-in                       |
| GET                 | `/appointments/today`                                                                      | Queue — ALL sources, grouped by status            |
| PATCH               | `/appointments/:id/status`                                                                 | Update status (queue flow)                        |
| POST                | `/appointments/:id/cancel`                                                                 | Cancel + linked draft tx (409 if paid)            |
| GET/PUT/DELETE      | `/appointments/:id`                                                                        | Standard CRUD (DELETE: admin only)                |
| GET                 | `/transactions`                                                                            | Paginated list                                    |
| POST                | `/transactions`                                                                            | If paid → auto commission + stock                 |
| GET                 | `/transactions/by-appointment?ids=`                                                        | Lightweight payment status lookup                 |
| POST                | `/transactions/:id/items`                                                                  | Add item to existing tx                           |
| GET                 | `/transactions/:id` + `/transactions/:id/items`                                            | Detail + items                                    |
| PUT/DELETE          | `/transactions/:id`                                                                        | Update / soft delete                              |
| GET                 | `/commissions` + `/commissions/staff/:staffId`                                             | List                                              |
| POST                | `/commissions/update-status`                                                               | Bulk update: `{ ids, status }`                    |
| GET                 | `/dashboard/stats\|revenue\|top-services\|top-products\|top-customers\|appointments-today` | `?from=&to=` (Jakarta TZ)                         |
| GET/PUT             | `/settings/clinic`                                                                         | Clinic settings                                   |
| POST                | `/settings/clinic/logo` + `/favicon`                                                       | Upload                                            |
| GET                 | `/cms/pages` + `/cms/pages/:pageId`                                                        | Public (`?org=<slug>`)                            |
| POST/PUT            | `/cms/pages` + `/:pageId`                                                                  | Admin. Create/update CMS page                     |
| POST                | `/cms/upload-image`                                                                        | Multipart upload                                  |
| GET/POST            | `/stock-movements`                                                                         | POST: admin only                                  |
| GET/POST/PUT/DELETE | `/services/:id/consumable-groups` + `/consumable-groups/:groupId/items`                    | Consumable groups                                 |
| GET/POST            | `/consumable-items` + `/usage`                                                             | Consumable items + usage logs                     |
| PUT                 | `/products/:id/mark-consumable`                                                            | Mark/unmark consumable                            |
| GET/POST/PUT/DELETE | `/organizations` + `/organizations/:id/members`                                            | Org + member management                           |
| GET                 | `/rbac/permissions` + `/my-permissions` + `/role-permissions` + `/user-permissions`        | RBAC                                              |
| POST                | `/migration/import`                                                                        | Admin. Import Excel                               |
| GET                 | `/omni/conversations` + `/messages`                                                        | Omnichannel chat                                  |
| GET                 | `/whatsapp/devices` + `/templates`                                                         | WhatsApp management                               |

---

## 4. Database Quick Reference

Detail schema → `docs/DATABASE_SCHEMA.md`

### Tabel (28 total)

`users`, `organizations`, `organization_members`, `permissions`, `role_permissions`, `user_permissions`, `service_categories`, `services`, `product_categories`, `products`, `staff`, `patients`, `appointments`, `transactions`, `transaction_items`, `commissions`, `clinic_settings`, `cms_pages`, `stock_movements`, `service_consumables` (legacy), `service_consumable_groups`, `service_consumable_group_items`, `consumable_usage_logs`, `visit_notes`, `clinic_whatsapp_devices`, `whatsapp_templates`, `omni_conversations`, `omni_messages`

### Key Conventions

- **ID type:** Native PostgreSQL `UUID`. PK: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`. App generates UUIDv7 via `utils.NewUUID()`.
- **Multi-tenant:** Semua tabel bisnis punya `organization_id UUID REFERENCES organizations(id)`. Filter: `WHERE (organization_id = $N OR ($N::text = '' AND organization_id IS NULL))`
- **Soft delete:** `deleted_at TIMESTAMP`. Aktif: `WHERE deleted_at IS NULL`. Exception: `stock_movements` immutable (no deleted_at).
- **Audit trail:** `created_by UUID`, `updated_by UUID` → dari `user_id` context.
- **Timezone:** Semua date/time diinterpretasikan sebagai `Asia/Jakarta (UTC+7)`.
- **`appointments.source`:** `appointment` (kalender) atau `walk_in` (queue). Default: `appointment`.
- **`appointments.status`:** scheduled | confirmed | in_progress | completed | cancelled | no_show
- **`transactions.payment_status`:** pending | paid | cancelled | refunded
- **`patients.tags`:** `TEXT[]` → Go: `pq.Array(&tags)`
- **`cms_pages.data`:** `JSONB`
- **Nullable dates:** `models.NullableTime` (menerima null, "", YYYY-MM-DD, RFC3339)

### Index Penting (seleksi)

- `idx_transactions_appointment` — transactions(appointment_id) WHERE NOT NULL AND deleted_at IS NULL
- `idx_visit_notes_patient/org/date/doctor/appt` — visit_notes indexes
- `idx_*_name_lower` — LOWER(name) untuk search di patients, services, products, staff
- Full list → `docs/DATABASE_SCHEMA.md`

---

## 5. Frontend Quick Reference

Detail struktur → `docs/FRONTEND_STRUCTURE.md`

### Tech Stack

React 18 + TypeScript, Vite, shadcn/ui (Radix), Tailwind CSS, TanStack Query v5, React Router v7, Axios, React Hook Form + Zod, Recharts, Sonner.

### Pages

| Path                        | Page                     | Permission         |
| --------------------------- | ------------------------ | ------------------ |
| `/` `/:orgSlug`             | LandingPage              | Public             |
| `/admin/login`              | Auth                     | Public             |
| `/onboarding`               | Onboarding               | Auth (no org)      |
| `/dashboard`                | Dashboard                | reports:read       |
| `/patients` `/patients/:id` | Patients, PatientDetail  | patients:read      |
| `/appointments`             | Appointments (calendar)  | appointments:read  |
| `/queue`                    | Queue (antrian hari ini) | appointments:read  |
| `/services`                 | Services                 | services:read      |
| `/products` `/categories`   | Products, Categories     | products:read      |
| `/pos`                      | POS                      | transactions:write |
| `/transactions`             | Transactions             | transactions:read  |
| `/commissions`              | Commissions              | commissions:read   |
| `/staff`                    | Staff                    | staff:read         |
| `/members`                  | Members                  | organization:write |
| `/messaging`                | Messaging                | authenticated      |
| `/rbac`                     | RBACManagement           | rbac:read          |
| `/cms`                      | CmsManagement            | cms:read           |
| `/settings`                 | Settings                 | settings:read      |
| `/stock-opname`             | StockOpname              | products:write     |
| `/consumable-items`         | ConsumableItems          | consumables:read   |
| `/import-excel`             | ImportExcel              | products:write     |
| `/reports`                  | Reports                  | reports:read       |

### Key Components

- `patients/ServePatientDialog` — walk-in flow (create appointment + draft tx + optional visit note)
- `appointments/AppointmentCalendar` + `AppointmentFormDialog` — calendar + cancel button
- `pos/POSInterface` — POS checkout (new tx or add to existing draft)
- `visit_notes/VisitNoteFormDialog` — rekam medis form
- `layout/MainLayout` + `Sidebar` + `OrgSwitcher` — layout + org switch

### Key Hooks

- `useAppointments` — CRUD + cancelAppointment + updateStatus
- `useVisitNotes` — CRUD visit notes + useTodayQueue + useUpdateAppointmentStatus
- `useTransactions` — CRUD + todayTransactions + todayRevenue
- `usePatients` — CRUD + visits + transactions
- `useDashboard` — stats, revenue, top-services/products/customers, appointments-today

### API Client (`integrations/api/client.ts`)

- Auto-attach `Authorization: Bearer` + `X-Organization-ID` headers
- Auto-refresh on 401 → retry, or redirect to `/admin/login`
- Token di localStorage: `access_token`, `refresh_token`, `active_org_id`
- Methods: `get()`, `post()`, `put()`, `patch()`, `delete()`, `postForm()`

### State Management

- **TanStack Query** — query keys: `["appointments", start, end]`, `["patients", search, page]`, `["today-queue"]`, `["transactions", page, limit]`, dll
- **AuthContext** — auth state, activeOrg, permissions, hasPermission()
- **Local state** — useState untuk UI (dialogs, forms, filters)

### Run

```bash
cd shasi && npm install && npm run dev
```

### Env

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_API_TIMEOUT=30000
```

---

## 6. RBAC Roles & Permissions

### Roles: `admin`, `doctor`, `therapist`, `cashier`

### Default permissions per role

| Role      | Permissions                                                                   |
| --------- | ----------------------------------------------------------------------------- |
| admin     | ALL                                                                           |
| doctor    | patients:read/write, appointments:read/write, services:read, commissions:read |
| therapist | patients:read, appointments:read/write, services:read, commissions:read       |
| cashier   | patients:read, transactions:read/write, products:read, services:read          |

### Permission format: `resource:action`

Resources: patients, appointments, services, products, categories, transactions, commissions, staff, reports, settings, cms, rbac, organization, consumables

Effective permission = UNION(role_permissions by org_role + user_permissions per user+org)

---

## 7. Business Workflows (Summary)

Detail → `docs/FEATURES_AND_PROCESSES.md`

| Workflow        | Singkat                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **Walk-in**     | ServePatientDialog → create appointment(source=walk_in) + draft tx → navigate to /queue              |
| **Calendar**    | List() excludes walk-in; AppointmentFormDialog has cancel button                                     |
| **Queue**       | TodayQueue = ListAll() (all sources) → grouped by status → cancel/checkout buttons                   |
| **Cancel**      | POST /appointments/:id/cancel → cancel draft tx (if pending) + set status=cancelled. 409 if tx paid. |
| **POS**         | New tx: POST /transactions. Existing draft: add items via POST /:id/items, pay via PUT /:id          |
| **Visit Notes** | Independent of appointments. Pre/post treatment + follow-up. View in PatientDetail timeline.         |
| **Commission**  | Auto on paid: handling (PIC) or offering (upsell). Offering replaces handling if eligible.           |
| **Stock**       | Auto on paid: validate → reduce → stock_movements. Atomic (DB transaction).                          |

---

## 8. Cara Menambah Module Baru

**Backend:** Buat `internal/modules/<name>/` (handler+service+repository+routes) → daftar di `routes/routes.go` → tambah migration jika perlu tabel baru.

**Frontend:** Tambah endpoint di `endpoints.ts` → buat hook → buat page → tambah route di `App.tsx` + link di `Sidebar.tsx`.

Detail step-by-step → `docs/CREATING_NEW_FEATURE.md`

---

## 9. Commands

```bash
# Backend
cd sc-pos-be
go build ./...                    # compile check
go run main.go                    # start dev (migrations auto)
go test ./...                     # tests

# Frontend
cd shasi
npm run dev                       # dev server
npm run build                     # production build
npx tsc -p tsconfig.app.json --noEmit   # typecheck (WAJIB setelah refactor)
npm run lint                      # lint
```

---

## 10. Hal yang Belum Diimplementasi

- `appointment/AvailableSlots()` — stub, perlu cek jadwal staff
- Filter lanjutan transactions (`from`, `to`, `status`)
- Selection consumable per group (saat ini hanya 1 selected product per transaction item)
- Export PDF/Excel untuk laporan
- Notifikasi real-time (saat ini manual refresh)

---

## 11. Known Issues

- Supabase client (`shasi/src/integrations/supabase/`) masih ada tapi tidak dipakai — `types.ts` masih dipakai untuk generated types
- `useTransactionStats` hook fetch semua transaksi lalu filter client-side (belum optimal)

---

_Terakhir diupdate: 2026-08-01_

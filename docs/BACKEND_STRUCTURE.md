# Backend Structure — `sc-pos-be`

> **Stack:** Go + Gin + PostgreSQL (raw `database/sql`, tanpa ORM)  
> **Module:** `github.com/sc-pos/backend`  
> **Port:** `8080`

---

## Struktur Direktori Lengkap

```
sc-pos-be/
├── main.go                          # Entry point
├── config/
│   └── config.go                    # Load env vars ke struct Config
├── internal/
│   ├── auth/
│   │   └── jwt.go                   # JWT sign/verify + bcrypt password hashing
│   ├── database/
│   │   ├── connection.go            # DB connect, pool setup (DB global variable)
│   │   └── migrations.go            # DDL idempotent — CREATE TABLE IF NOT EXISTS
│   ├── middleware/
│   │   └── auth.go                  # AuthMiddleware, OrgMiddleware, RequireRole, RequirePermission, CORSMiddleware
│   ├── models/                      # Plain Go structs (tidak ada ORM tag)
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
│   ├── modules/                     # Feature modules (setiap module: handler + service + repository + routes)
│   │   ├── auth/                    # Login, register, refresh, me, logout
│   │   ├── patient/                 # CRUD pasien + riwayat kunjungan & transaksi
│   │   ├── service/                 # CRUD layanan + kategori
│   │   ├── product/                 # CRUD produk + kategori
│   │   ├── staff/                   # CRUD staff
│   │   ├── appointment/             # CRUD jadwal + cron reminder job
│   │   ├── transaction/             # CRUD transaksi + items
│   │   ├── commission/              # Komisi staff per transaksi
│   │   ├── dashboard/               # Stats, revenue, top services/products
│   │   ├── settings/                # Pengaturan klinik + logo
│   │   ├── cms/                     # CMS pages + upload image
│   │   ├── whatsapp/               # WhatsApp multi-device (whatsmeow)
│   │   ├── omnichannel/             # Chat omnichannel via WebSocket
│   │   ├── organization/            # Org CRUD + member management
│   │   ├── rbac/                    # RBAC permissions management
│   │   ├── stock/                   # Stock movements
│   │   ├── consumable/              # Mapping consumable legacy (service_consumables)
│   │   ├── service_package/         # Consumable groups + alternatif produk untuk service
│   │   ├── consumable_item/         # Produk habis pakai + usage logs
│   │   └── migration/               # Import Excel bulk data
│   ├── routes/
│   │   └── routes.go                # Central router: register semua module routes
│   └── utils/
│       └── response.go              # SuccessResponse, ErrorResponse, SuccessResponseWithMessage
├── Makefile                         # Build, run, test shortcuts
├── Dockerfile                       # Multi-stage build Go image
├── go.mod                           # Go module dependencies
└── .env                             # Konfigurasi environment
```

---

## Anatomi Sebuah Module (Pola 4-File)

Setiap module di `internal/modules/<name>/` mengikuti pola **4-file layered**:

```
handler.go    → HTTP layer: binding request, validasi, call service, return response
service.go    → Business logic: validasi data, orchestration, domain errors
repository.go → Database layer: raw SQL queries
routes.go     → Daftarkan route ke Gin router + inject middleware
```

### Contoh: Module `patient`

#### `handler.go`

```go
package patient

type Handler struct { service Service }

func NewModule() *Handler {
    return NewHandler(NewService(NewRepository()))
}

func (h *Handler) List(c *gin.Context) {
    orgID := c.GetString("org_id")           // dari OrgMiddleware
    patients, err := h.service.List(orgID)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }
    utils.SuccessResponse(c, http.StatusOK, patients)
}
```

#### `service.go`

```go
package patient

type Service interface {
    List(orgID string) ([]models.Patient, error)
    Get(id, orgID string) (*models.Patient, error)
    Create(req models.Patient, userID, orgID string) (*models.Patient, error)
    Update(id string, req models.Patient, userID, orgID string) (*models.Patient, error)
    Delete(id, orgID, userID string) error
}

var ErrNotFound = errors.New("patient not found")

func (s *service) Create(req models.Patient, userID, orgID string) (*models.Patient, error) {
    req.ID = uuid.New().String()
    req.CreatedBy = &userID
    // business logic...
    return s.repo.Create(&req, orgID)
}
```

#### `repository.go`

```go
package patient

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) GetAll(orgID string) ([]models.Patient, error) {
    rows, err := database.DB.Query(`
        SELECT id, full_name, phone, ... FROM patients
        WHERE organization_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC`, orgID)
    // scan rows...
}
```

#### `routes.go`

```go
package patient

func RegisterRoutes(router gin.IRouter, canRead, canWrite, canDelete gin.HandlerFunc) {
    handler := NewModule()
    router.GET("/patients", canRead, handler.List)
    router.POST("/patients", canWrite, handler.Create)
    router.GET("/patients/:id", canRead, handler.Get)
    router.PUT("/patients/:id", canWrite, handler.Update)
    router.DELETE("/patients/:id", canDelete, handler.Delete)
}
```

---

## Service Consumable Groups

Module `internal/modules/service_package/` adalah sistem konsumabel baru untuk service. Module ini mengikuti pola lengkap `handler → service → repository`; module `consumable/` dan tabel `service_consumables` tetap tersedia hanya untuk kompatibilitas data lama.

### Struktur dan route

```text
service_package/
├── handler.go     # HTTP binding dan response
├── service.go     # Service interface + delegasi business operation
├── repository.go  # Query group, alternatif produk, dan validasi stok
└── routes.go      # Route registration
```

| Method | Path                                | Permission       | Fungsi                                                 |
| ------ | ----------------------------------- | ---------------- | ------------------------------------------------------ |
| GET    | `/services/:id/consumable-groups`   | `services:read`  | Ambil group dan alternatif produk untuk sebuah service |
| POST   | `/services/:id/consumable-groups`   | `services:write` | Buat group kebutuhan konsumabel                        |
| PUT    | `/consumable-groups/:groupId`       | `services:write` | Ubah nama/qty group                                    |
| DELETE | `/consumable-groups/:groupId`       | `services:write` | Soft-delete group                                      |
| POST   | `/consumable-groups/:groupId/items` | `services:write` | Tambah produk alternatif                               |
| DELETE | `/consumable-group-items/:itemId`   | `services:write` | Soft-delete alternatif                                 |

> **Gin route constraint:** gunakan wildcard `:id` pada route yang berada di bawah `/services/`, karena `/services/:id` telah terdaftar oleh module service. Gin akan panic saat wildcard berbeda seperti `:serviceId` dipasang pada prefix yang sama.

### Flow pembayaran dan stok

Saat transaksi dibayar, `transaction.Repository.MarkPaidEffects` menjalankan semua side effect dalam satu database transaction:

1. Muat seluruh `transaction_items`.
2. Validasi stok setiap konsumabel service yang dipilih sebelum mutasi apa pun dilakukan.
3. Kurangi stok retail (`reason = usage`) dan konsumabel service (`reason = service_consumable`).
4. Simpan `stock_movements`, buat alert stok rendah bila diperlukan, lalu generate komisi.
5. Jika stok konsumabel pilihan tidak cukup, proses di-return error dan database transaction di-rollback.

**Batasan implementasi saat ini:** `transaction_items` hanya memiliki satu kolom `selected_consumable_product_id`. Frontend memperbolehkan dialog memilih alternatif per group, tetapi payload dan backend saat ini hanya menyimpan serta mengurangi stok **pilihan group pertama**. Service dengan lebih dari satu consumable group belum didukung end-to-end; ini harus diperbaiki dengan data model selection per group sebelum dianggap siap produksi.

---

## Middleware Stack

```
Request
   │
   ▼
CORSMiddleware()          ← Global, semua route
   │
   ▼
AuthMiddleware()          ← Validate JWT, cek user di DB, set: user_id, email, role
   │
   ▼
OrgMiddleware()           ← Baca X-Organization-ID header, validasi membership, set: org_id, org_role
   │
   ▼
RequirePermission("x:y") ← Cek effective permission (role_permissions + user_permissions)
   │
   ▼
Handler
```

### Context Keys yang Tersedia di Handler

| Key        | Type     | Source        | Keterangan                             |
| ---------- | -------- | ------------- | -------------------------------------- |
| `user_id`  | `string` | JWT           | UUID user yang login                   |
| `email`    | `string` | JWT           | Email user                             |
| `role`     | `string` | JWT           | Global role (admin, doctor, dst)       |
| `org_id`   | `string` | OrgMiddleware | ID org aktif dari header               |
| `org_role` | `string` | OrgMiddleware | Role user di org ini (override `role`) |

```go
// Cara akses di handler:
userID := c.GetString("user_id")
orgID  := c.GetString("org_id")
orgRole := c.GetString("org_role")
```

---

## API Response Format Standard

Semua response menggunakan `utils` helpers:

```go
// Success dengan data
utils.SuccessResponse(c, http.StatusOK, data)
// → {"success": true, "data": <payload>}

// Success dengan message
utils.SuccessResponseWithMessage(c, http.StatusCreated, "Created successfully", data)
// → {"success": true, "message": "...", "data": <payload>}

// Error
utils.ErrorResponse(c, http.StatusBadRequest, "validation failed")
// → {"success": false, "error": "validation failed"}

// List dengan cursor-free pagination
// → {"success": true, "data": [...], "has_next": true, "page": 1, "limit": 20}
// Catatan: backend tidak mengirim total record. Untuk halaman berikutnya gunakan has_next.

// Auth
// → {"success": true, "access_token": "...", "user": {...}}
```

---

## Database Conventions

### Multi-Tenant

Setiap tabel bisnis punya kolom `organization_id` → **selalu** filter dengan `WHERE organization_id = $n`.

### Soft Delete

Setiap tabel bisnis punya `deleted_at TIMESTAMP` → **selalu** filter `WHERE deleted_at IS NULL` untuk data aktif.  
Soft delete dilakukan dengan: `UPDATE ... SET deleted_at = NOW() WHERE id = $1`

### Audit Trail

Setiap tabel bisnis punya `created_by VARCHAR(36)` dan `updated_by VARCHAR(36)` → isi dari `user_id` context.  
`stock_movements` sengaja **tidak** punya `updated_by`/`deleted_at` karena bersifat immutable.

### Tipe Khusus

| Field                      | Tipe PostgreSQL | Tipe Go               | Catatan                      |
| -------------------------- | --------------- | --------------------- | ---------------------------- |
| `patients.tags`            | `TEXT[]`        | `[]string`            | Gunakan `pq.Array(&p.Tags)`  |
| `cms_pages.data`           | `JSONB`         | `json.RawMessage`     |                              |
| `*.date_of_birth`          | `DATE`          | `models.NullableTime` | Handle null, "", YYYY-MM-DD  |
| `products.expiry_date`     | `DATE`          | `models.NullableTime` | Handle null, "", YYYY-MM-DD  |
| `users.id`, semua FK users | `VARCHAR(36)`   | `string`              | UUID disimpan sebagai string |

---

## RBAC — Role-Based Access Control

### Roles Tersedia

| Role        | Deskripsi                   |
| ----------- | --------------------------- |
| `admin`     | Akses penuh ke semua fitur  |
| `doctor`    | Akses medis + transaksi     |
| `therapist` | Akses treatment + transaksi |
| `cashier`   | Akses kasir + transaksi     |

### Permission Format: `resource:action`

| Resource       | Actions                   |
| -------------- | ------------------------- |
| `patients`     | `read`, `write`, `delete` |
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
| `organization` | `write`                   |
| `consumables`  | `read`, `write`           |
| `appointments` | `read`, `write`           |

### Cara Kerja Permission

Permission efektif = UNION dari `role_permissions` (berdasarkan `org_role`) + `user_permissions` (grant individual per user+org).

---

## Environment Variables

```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sc_pos
DB_SSLMODE=disable
JWT_SECRET_KEY=your-secret-key
UPLOAD_DIR=uploads/cms
BASE_URL=http://localhost:8080
WHATSAPP_API_URL=               # opsional
WHATSAPP_API_TOKEN=             # opsional
```

---

## Cara Menjalankan Backend

```bash
cd sc-pos-be

# 1. Setup env
cp .env.example .env
# edit .env dengan kredensial DB

# 2. Install dependencies
go mod download

# 3. Buat database (jika belum ada)
psql -U postgres -c "CREATE DATABASE sc_pos;"

# 4. Jalankan (migrations otomatis dijalankan saat startup)
go run main.go
# atau
make dev

# Health check
curl http://localhost:8080/health
# → {"status":"ok"}
```

---

## Key Libraries

| Library               | Kegunaan                         |
| --------------------- | -------------------------------- |
| `gin-gonic/gin`       | HTTP framework                   |
| `golang-jwt/jwt/v5`   | JWT token sign/verify            |
| `google/uuid`         | UUID generation                  |
| `lib/pq`              | PostgreSQL driver (pq.Array etc) |
| `joho/godotenv`       | Load `.env` file                 |
| `robfig/cron/v3`      | Cron job (appointment reminders) |
| `go.mau.fi/whatsmeow` | WhatsApp multi-device client     |
| `xuri/excelize/v2`    | Import/Export Excel              |
| `coder/websocket`     | WebSocket untuk omnichannel chat |
| `golang.org/x/crypto` | bcrypt password hashing          |

---

_Last updated: 2026-07-09_

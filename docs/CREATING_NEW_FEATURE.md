# Panduan Membuat Fitur Baru

> Panduan step-by-step untuk menambahkan fitur baru di backend (Go) dan frontend (React/TypeScript).  
> Contoh kasus: menambahkan module **"Loyalty Points"** sebagai fitur baru.

---

## BAGIAN 1 — Fitur Baru di Backend (Go)

### Step 1: Buat Model

Tambahkan file `internal/models/loyalty.go`:

```go
package models

import "time"

type LoyaltyPoint struct {
    ID             string    `json:"id"`
    PatientID      string    `json:"patient_id"`
    Points         int       `json:"points"`
    Reason         string    `json:"reason"`
    OrganizationID string    `json:"organization_id"`
    CreatedBy      *string   `json:"created_by,omitempty"`
    UpdatedBy      *string   `json:"updated_by,omitempty"`
    DeletedAt      *time.Time `json:"deleted_at,omitempty"`
    CreatedAt      time.Time  `json:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at"`
}
```

> **Rules:**
> - Selalu sertakan `OrganizationID`, `CreatedBy`, `UpdatedBy`, `DeletedAt` untuk multi-tenant + audit trail
> - Gunakan `models.NullableTime` untuk field tanggal yang bisa null

---

### Step 2: Tambahkan Tabel di Migrations

Edit `internal/database/migrations.go`, tambahkan konstanta SQL baru di bagian bawah:

```go
const addLoyaltyPointsTable = `
CREATE TABLE IF NOT EXISTS loyalty_points (
    id              VARCHAR(36)   PRIMARY KEY,
    patient_id      VARCHAR(36)   NOT NULL REFERENCES patients(id),
    points          INTEGER       NOT NULL DEFAULT 0,
    reason          TEXT,
    organization_id VARCHAR(36)   NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_patient ON loyalty_points(patient_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_org     ON loyalty_points(organization_id);
`
```

Lalu daftarkan di slice `migrations` di fungsi `RunMigrations()`:

```go
func RunMigrations() error {
    migrations := []string{
        createSchema,
        createIndexes,
        // ... existing migrations ...
        addLoyaltyPointsTable,   // ← tambahkan di sini
    }
    // ...
}
```

> **⚠️ PENTING:** Gunakan `CREATE TABLE IF NOT EXISTS` agar idempotent (aman dijalankan berulang).

---

### Step 3: Buat Module Directory

Buat folder: `internal/modules/loyalty/`

Isi dengan 4 file:

---

#### `internal/modules/loyalty/repository.go`

```go
package loyalty

import (
    "github.com/sc-pos/backend/internal/database"
    "github.com/sc-pos/backend/internal/models"
)

type Repository struct{}

func NewRepository() *Repository { return &Repository{} }

func (r *Repository) GetAll(orgID string) ([]models.LoyaltyPoint, error) {
    rows, err := database.DB.Query(`
        SELECT id, patient_id, points, reason, organization_id, created_at, updated_at
        FROM loyalty_points
        WHERE organization_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC`,
        orgID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var result []models.LoyaltyPoint
    for rows.Next() {
        var lp models.LoyaltyPoint
        if err := rows.Scan(
            &lp.ID, &lp.PatientID, &lp.Points, &lp.Reason,
            &lp.OrganizationID, &lp.CreatedAt, &lp.UpdatedAt,
        ); err != nil {
            return nil, err
        }
        result = append(result, lp)
    }
    return result, nil
}

func (r *Repository) Create(lp *models.LoyaltyPoint, orgID string) error {
    _, err := database.DB.Exec(`
        INSERT INTO loyalty_points
        (id, patient_id, points, reason, organization_id, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        lp.ID, lp.PatientID, lp.Points, lp.Reason,
        orgID, lp.CreatedBy, lp.CreatedAt, lp.UpdatedAt,
    )
    return err
}
```

---

#### `internal/modules/loyalty/service.go`

```go
package loyalty

import (
    "errors"
    "time"

    "github.com/google/uuid"
    "github.com/sc-pos/backend/internal/models"
)

var ErrNotFound = errors.New("loyalty point not found")

type Service interface {
    List(orgID string) ([]models.LoyaltyPoint, error)
    Create(req models.LoyaltyPoint, userID, orgID string) (*models.LoyaltyPoint, error)
}

type service struct {
    repo *Repository
}

func NewService(repo *Repository) Service {
    return &service{repo: repo}
}

func (s *service) List(orgID string) ([]models.LoyaltyPoint, error) {
    return s.repo.GetAll(orgID)
}

func (s *service) Create(req models.LoyaltyPoint, userID, orgID string) (*models.LoyaltyPoint, error) {
    now := time.Now()
    req.ID = uuid.New().String()
    req.CreatedBy = &userID
    req.CreatedAt = now
    req.UpdatedAt = now

    if err := s.repo.Create(&req, orgID); err != nil {
        return nil, err
    }
    return &req, nil
}
```

---

#### `internal/modules/loyalty/handler.go`

```go
package loyalty

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/sc-pos/backend/internal/models"
    "github.com/sc-pos/backend/internal/utils"
)

type Handler struct {
    service Service
}

func NewHandler(service Service) *Handler { return &Handler{service: service} }
func NewModule() *Handler                 { return NewHandler(NewService(NewRepository())) }

func (h *Handler) List(c *gin.Context) {
    orgID := c.GetString("org_id")
    data, err := h.service.List(orgID)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }
    utils.SuccessResponse(c, http.StatusOK, data)
}

func (h *Handler) Create(c *gin.Context) {
    var req models.LoyaltyPoint
    if err := c.ShouldBindJSON(&req); err != nil {
        utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
        return
    }
    orgID  := c.GetString("org_id")
    userID := c.GetString("user_id")

    result, err := h.service.Create(req, userID, orgID)
    if err != nil {
        utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
        return
    }
    utils.SuccessResponseWithMessage(c, http.StatusCreated, "Loyalty point created", result)
}
```

---

#### `internal/modules/loyalty/routes.go`

```go
package loyalty

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, canRead, canWrite gin.HandlerFunc) {
    handler := NewModule()
    router.GET("/loyalty-points", canRead, handler.List)
    router.POST("/loyalty-points", canWrite, handler.Create)
}
```

---

### Step 4: Daftarkan Permission di Migrations

Di `migrations.go`, cari konstanta `seedDefaultPermissions` dan tambahkan permission baru:

```sql
-- Di dalam INSERT permissions ...
INSERT INTO permissions (id, resource, action, description) VALUES
    -- ... existing permissions ...
    ('loyalty:read',  'loyalty',  'read',  'Lihat loyalty points') ON CONFLICT DO NOTHING,
    ('loyalty:write', 'loyalty',  'write', 'Tambah loyalty points') ON CONFLICT DO NOTHING;
```

Lalu tambahkan ke `seedRolePermissions` sesuai role yang boleh mengakses:

```sql
-- admin bisa read + write
INSERT INTO role_permissions (id, role, permission_id) VALUES
    (gen_random_uuid(), 'admin', 'loyalty:read')  ON CONFLICT DO NOTHING,
    (gen_random_uuid(), 'admin', 'loyalty:write') ON CONFLICT DO NOTHING;
```

---

### Step 5: Daftarkan Route di Central Router

Edit `internal/routes/routes.go`:

```go
import "github.com/sc-pos/backend/internal/modules/loyalty"

func SetupRoutes(router *gin.Engine) {
    // ...
    protectedAPI.Use(middleware.AuthMiddleware())
    protectedAPI.Use(middleware.OrgMiddleware())
    {
        // ... existing routes ...

        // ── Loyalty Points ────────────────────────────────────────────
        canReadLoyalty  := middleware.RequirePermission("loyalty:read")
        canWriteLoyalty := middleware.RequirePermission("loyalty:write")
        loyalty.RegisterRoutes(protectedAPI, canReadLoyalty, canWriteLoyalty)
    }
}
```

---

### Step 6: Test Backend

```bash
# Start backend
cd sc-pos-be && go run main.go

# Test endpoint
curl -X GET http://localhost:8080/api/loyalty-points \
  -H "Authorization: Bearer <token>" \
  -H "X-Organization-ID: <org_id>"
```

---

## BAGIAN 2 — Fitur Baru di Frontend (React)

### Step 1: Tambahkan Type

Buat file `shasi/src/types/loyalty.ts`:

```typescript
export interface LoyaltyPoint {
  id: string;
  patient_id: string;
  points: number;
  reason?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyPointFormData {
  patient_id: string;
  points: number;
  reason?: string;
}
```

---

### Step 2: Tambahkan Endpoint Constants

Edit `shasi/src/integrations/api/endpoints.ts`:

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints ...

  // Loyalty Points
  LOYALTY: {
    LIST:   "/loyalty-points",
    CREATE: "/loyalty-points",
    DETAIL: (id: string) => `/loyalty-points/${id}`,
    UPDATE: (id: string) => `/loyalty-points/${id}`,
    DELETE: (id: string) => `/loyalty-points/${id}`,
  },
};
```

---

### Step 3: Buat Custom Hook

Buat file `shasi/src/hooks/useLoyaltyPoints.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { LoyaltyPoint, LoyaltyPointFormData } from "@/types/loyalty";
import { toast } from "sonner";

export function useLoyaltyPoints() {
  return useQuery({
    queryKey: ["loyalty-points"],
    queryFn: async () => {
      const data = await apiClient.get<{ data: LoyaltyPoint[] }>(
        API_ENDPOINTS.LOYALTY.LIST
      );
      return data.data ?? [];
    },
  });
}

export function useCreateLoyaltyPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: LoyaltyPointFormData) => {
      const data = await apiClient.post<{ data: LoyaltyPoint }>(
        API_ENDPOINTS.LOYALTY.CREATE,
        formData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-points"] });
      toast.success("Loyalty point berhasil ditambahkan");
    },
    onError: (error) => {
      toast.error(`Gagal: ${(error as Error).message}`);
    },
  });
}
```

---

### Step 4: Buat Page Component

Buat file `shasi/src/pages/LoyaltyPoints.tsx`:

```typescript
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";

export default function LoyaltyPoints() {
  const { data: points, isLoading } = useLoyaltyPoints();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Loyalty Points</h1>
      <ul>
        {points?.map((p) => (
          <li key={p.id}>
            Patient: {p.patient_id} — Points: {p.points}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Step 5: Daftarkan Route di App.tsx

Edit `shasi/src/App.tsx`:

```typescript
// 1. Import halaman
import LoyaltyPoints from "./pages/LoyaltyPoints";

// 2. Tambahkan route di AppRoutes()
<Route path="/loyalty-points" element={
  <ProtectedRoute requirePermission="loyalty:read">
    <MainLayout onSignOut={signOut}><LoyaltyPoints /></MainLayout>
  </ProtectedRoute>
} />
```

---

### Step 6: Tambahkan ke Sidebar (Navigasi)

Edit `shasi/src/components/layout/Sidebar.tsx`:

```typescript
const navItems = [
  // ... existing items ...
  {
    label: "Loyalty Points",
    path:  "/loyalty-points",
    icon:  Star,
    permission: "loyalty:read",
  },
];
```

---

## Checklist Lengkap — Fitur Baru

### Backend Checklist
- [ ] Buat model di `internal/models/<name>.go`
- [ ] Tambahkan DDL SQL di `internal/database/migrations.go`
- [ ] Daftarkan SQL di slice `migrations` di `RunMigrations()`
- [ ] Buat `internal/modules/<name>/repository.go`
- [ ] Buat `internal/modules/<name>/service.go` (dengan interface `Service`)
- [ ] Buat `internal/modules/<name>/handler.go` (dengan `NewModule()`)
- [ ] Buat `internal/modules/<name>/routes.go` (dengan `RegisterRoutes()`)
- [ ] Tambahkan permission baru ke `seedDefaultPermissions` dan `seedRolePermissions` di migrations
- [ ] Import dan daftarkan module di `internal/routes/routes.go`
- [ ] Test endpoint dengan curl atau Postman

### Frontend Checklist
- [ ] Buat TypeScript interface di `src/types/<name>.ts`
- [ ] Tambahkan endpoint constants di `src/integrations/api/endpoints.ts`
- [ ] Buat custom hook di `src/hooks/use<Name>.ts`
- [ ] Buat page component di `src/pages/<Name>.tsx`
- [ ] Daftarkan route di `src/App.tsx` dengan `ProtectedRoute` + permission yang tepat
- [ ] Tambahkan navigasi di `src/components/layout/Sidebar.tsx`
- [ ] Test di browser: cek Network tab untuk API calls

---

## Tips & Gotchas

### Backend
- **Selalu filter `organization_id`** di setiap query — data tidak boleh bocor antar org
- **Selalu filter `deleted_at IS NULL`** untuk data aktif
- **Gunakan `pq.Array()`** untuk field `TEXT[]` PostgreSQL
- **Error sentinel** (`ErrNotFound`, `ErrDuplicate`) → mapping ke HTTP status di `handleError()`
- **`NewModule()`** adalah constructor shortcut — wires semua layers sekaligus
- **Hindari ORM** — semua query pakai raw SQL dengan `database.DB.Query/QueryRow/Exec`

### Frontend
- **Query key** harus konsisten: `["entity-name", optionalId]` agar invalidation bekerja
- **`invalidateQueries`** di `onSuccess` mutation untuk refresh data otomatis
- **`enabled: !!id`** pada query yang butuh param opsional
- **Semua HTTP error** sudah di-handle oleh `ApiClient` interceptor — tidak perlu handle manual 401
- **`hasPermission("x:y")`** dari `useAuth()` untuk conditional rendering di UI
- **Jangan akses `apiClient` langsung dari komponen** — selalu via custom hook

---

*Last updated: 2026-07-09*

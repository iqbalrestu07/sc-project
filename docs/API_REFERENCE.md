# API Reference — SC-POS Backend

> **Base URL:** `http://localhost:8080/api`  
> **Auth:** `Authorization: Bearer <access_token>`  
> **Org Context:** `X-Organization-ID: <org_uuid>` (wajib untuk semua protected routes)

---

## Autentikasi

### POST `/auth/login`
Login dengan email dan password.

**Body:**
```json
{ "email": "admin@example.com", "password": "password123" }
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "uuid", "email": "...", "role": "admin", "full_name": "..." },
  "organizations": [{ "id": "uuid", "name": "Klinik ABC", "slug": "klinik-abc", "role": "admin" }]
}
```

---

### POST `/auth/register`
Daftar user baru (default role: cashier).

**Body:**
```json
{ "email": "...", "password": "...", "full_name": "..." }
```

---

### POST `/auth/refresh`
Refresh access token.

**Body:** `{ "refresh_token": "eyJ..." }`

---

### GET `/auth/me` 🔒
Data user yang sedang login (termasuk permissions jika ada org aktif).

---

### POST `/auth/logout` 🔒
Logout (invalidasi refresh token).

---

### POST `/auth/admin/register` 🔒 Admin
Buat user baru dan otomatis tambahkan ke org aktif.

**Body:** `{ "email": "...", "password": "...", "full_name": "...", "role": "cashier" }`

---

### GET `/auth/users?email=...` 🔒 Admin
Cari user by email (untuk invite member ke org).

---

## Organizations

### GET `/organizations/my` 🔒
Daftar org yang diikuti user yang login.

### POST `/organizations` 🔒
Buat organisasi baru.

**Body:**
```json
{ "name": "Klinik Baru", "slug": "klinik-baru", "description": "..." }
```

### GET `/organizations/:id` 🔒
Detail org.

### PUT `/organizations/:id` 🔒 org:write
Update org.

### DELETE `/organizations/:id` 🔒 org:write
Soft delete org.

### GET `/organizations/:id/members` 🔒
Daftar member org.

### POST `/organizations/:id/members` 🔒 org:write
Tambah member ke org.

**Body:** `{ "user_id": "uuid", "role": "cashier" }`

### PUT `/organizations/:id/members/:userId` 🔒 org:write
Update role member.

### DELETE `/organizations/:id/members/:userId` 🔒 org:write
Hapus member dari org.

---

## RBAC

### GET `/rbac/permissions` 🔒
Daftar semua permission yang tersedia.

### GET `/rbac/my-permissions` 🔒
Effective permissions user di org aktif.

**Response:**
```json
{ "success": true, "data": { "permissions": ["patients:read", "transactions:read", ...] } }
```

### GET `/rbac/role-permissions` 🔒
Semua mapping role → permission.

### GET `/rbac/role-permissions/:role` 🔒
Permission untuk role tertentu.

### GET `/rbac/user-permissions/:userId` 🔒
Custom permissions untuk user tertentu di org ini.

### POST `/rbac/user-permissions/:userId` 🔒 rbac:write
Grant permission kepada user.

**Body:** `{ "permission_id": "patients:write" }`

### DELETE `/rbac/user-permissions/:userId/:permId` 🔒 rbac:write
Revoke permission dari user.

---

## Patients

### GET `/patients` 🔒 patients:read
Daftar pasien. Filter: `?search=nama`

### GET `/patients/search?search=keyword` 🔒 patients:read
Search pasien by nama/phone.

### POST `/patients` 🔒 patients:write
Buat pasien baru.

**Body:**
```json
{
  "full_name": "Budi Santoso",
  "phone": "081234567890",
  "whatsapp": "081234567890",
  "email": "budi@example.com",
  "gender": "male",
  "date_of_birth": "1990-01-15",
  "address": "Jakarta",
  "allergy_history": "Penisilin",
  "skin_type": "normal",
  "tags": ["VIP", "Reguler"],
  "reminder_opt_in": true
}
```

### GET `/patients/:id` 🔒 patients:read
Detail pasien.

### PUT `/patients/:id` 🔒 patients:write
Update pasien.

### DELETE `/patients/:id` 🔒 patients:delete
Soft delete pasien.

### GET `/patients/:id/visits` 🔒 patients:read
Riwayat kunjungan (appointments) pasien.

### GET `/patients/:id/transactions` 🔒 patients:read
Riwayat transaksi pasien.

---

## Services

### GET `/services` 🔒 services:read
Daftar layanan.

### POST `/services` 🔒 services:write
Buat layanan baru.

**Body:**
```json
{
  "name": "Facial Treatment",
  "category_id": "uuid",
  "description": "...",
  "duration_minutes": 90,
  "base_price": 250000,
  "doctor_commission_type": "percentage",
  "doctor_commission_value": 20,
  "therapist_commission_type": "fixed",
  "therapist_commission_value": 50000,
  "requires_doctor": true
}
```

### GET `/services/:id` 🔒 services:read
### PUT `/services/:id` 🔒 services:write
### DELETE `/services/:id` 🔒 services:delete

### GET `/service-categories` 🔒 categories:read
### POST `/service-categories` 🔒 categories:write
### PUT `/service-categories/:id` 🔒 categories:write
### DELETE `/service-categories/:id` 🔒 categories:delete

---

## Products

### GET `/products` 🔒 products:read
Daftar produk. Filter: `?search=nama`

### POST `/products` 🔒 products:write
Buat produk baru.

**Body:**
```json
{
  "name": "Serum Vit C",
  "category": "Skincare",
  "sku": "SKU-001",
  "supplier": "PT Derma",
  "purchase_price": 50000,
  "selling_price": 150000,
  "current_stock": 100,
  "minimum_stock": 10,
  "unit": "pcs",
  "expiry_date": "2026-12-31"
}
```

### GET `/products/:id` 🔒 products:read
### PUT `/products/:id` 🔒 products:write
### DELETE `/products/:id` 🔒 products:delete

### GET `/product-categories` 🔒 categories:read
### POST `/product-categories` 🔒 categories:write
### PUT `/product-categories/:id` 🔒 categories:write
### DELETE `/product-categories/:id` 🔒 categories:delete

---

## Staff

### GET `/staff` 🔒 staff:read
Daftar staff.

### POST `/staff` 🔒 staff:write
**Body:**
```json
{
  "full_name": "dr. Siti",
  "role": "doctor",
  "phone": "08123...",
  "specialization": "Dermatologi"
}
```

### GET `/staff/:id` 🔒 staff:read
### PUT `/staff/:id` 🔒 staff:write
### DELETE `/staff/:id` 🔒 staff:delete

---

## Appointments

### GET `/appointments` 🔒
Filter: `?date=YYYY-MM-DD&view=day|week`

### POST `/appointments` 🔒
**Body:**
```json
{
  "patient_id": "uuid",
  "service_id": "uuid",
  "doctor_id": "uuid",
  "therapist_id": "uuid",
  "scheduled_at": "2026-07-10T10:00:00Z",
  "duration_minutes": 90,
  "notes": "..."
}
```

### GET `/appointments/:id` 🔒
### PUT `/appointments/:id` 🔒
Body sama dengan POST, ditambah `"status": "confirmed|completed|cancelled|no_show"`
### DELETE `/appointments/:id` 🔒
### GET `/appointments/calendar` 🔒
### GET `/appointments/available-slots` 🔒

---

## Transactions

### GET `/transactions` 🔒 transactions:read
Filter: `?from=YYYY-MM-DD&to=YYYY-MM-DD&status=paid`

### POST `/transactions` 🔒 transactions:write
**Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "items": [
    {
      "item_type": "service",
      "service_id": "uuid",
      "quantity": 1,
      "unit_price": 250000,
      "doctor_id": "uuid",
      "therapist_id": "uuid"
    },
    {
      "item_type": "product",
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 150000
    }
  ],
  "discount_amount": 50000,
  "discount_type": "fixed",
  "payment_method": "cash",
  "payment_status": "paid",
  "notes": "..."
}
```

> **⚠️ Note:** Jika `payment_status = "paid"`, backend otomatis:
> 1. Generate komisi untuk doctor/therapist
> 2. Kurangi stok produk yang terjual
> 3. Catat stock movement

### GET `/transactions/:id` 🔒 transactions:read
### GET `/transactions/:id/items` 🔒 transactions:read
### PUT `/transactions/:id` 🔒 transactions:write
### DELETE `/transactions/:id` 🔒 transactions:delete

---

## Commissions

### GET `/commissions` 🔒 commissions:read
Filter: `?staff_id=uuid&status=pending&from=YYYY-MM-DD&to=YYYY-MM-DD`

### GET `/commissions/staff/:staffId` 🔒
Komisi untuk staff tertentu.

### POST `/commissions/update-status` 🔒 commissions:write
**Body:** `{ "ids": ["uuid1", "uuid2"], "status": "paid" }`

---

## Dashboard

### GET `/dashboard/stats` 🔒 reports:read
Filter: `?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_revenue": 5000000,
    "total_transactions": 25,
    "total_patients": 150,
    "appointments_today": 8
  }
}
```

### GET `/dashboard/revenue` 🔒 reports:read
Revenue chart data. Filter: `?from=&to=` (default 30 hari).

### GET `/dashboard/top-services` 🔒 reports:read
Top services by revenue.

### GET `/dashboard/top-products` 🔒 reports:read
Top products by revenue.

### GET `/dashboard/appointments-today` 🔒 reports:read
Appointment hari ini.

> **Timezone Note:** Semua filter date range diinterpretasikan sebagai `Asia/Jakarta (UTC+7)`.

---

## Settings

### GET `/settings/clinic` 🔒 settings:read
Pengaturan klinik.

### PUT `/settings/clinic` 🔒 settings:write
Update pengaturan.

**Body:**
```json
{
  "clinic_name": "Klinik Cantik",
  "address": "Jl. Sudirman No. 1",
  "phone": "021-1234567",
  "tax_rate": 11,
  "invoice_header_title": "KLINIK CANTIK",
  "invoice_footer_text": "Terima kasih atas kepercayaan Anda"
}
```

### POST `/settings/clinic/logo` 🔒 settings:write
Upload logo. `multipart/form-data` field: `file`

### GET `/public/clinic-info`
Info klinik publik (tanpa auth) — untuk landing page.

---

## CMS (Content Management)

### GET `/cms/pages` — Public
Daftar semua CMS pages.

### GET `/cms/pages/:pageId` — Public
Konten halaman tertentu.

### POST `/cms/pages` 🔒 cms:write
Buat halaman baru. **Body:** `{ "page_id": "home", "data": { ...konten } }`

### PUT `/cms/pages/:pageId` 🔒 cms:write
Update halaman.

### POST `/cms/upload-image` 🔒 cms:write
Upload gambar. `multipart/form-data`:
- Field `file`: file gambar
- Field `folder`: subfolder (opsional)

**Response:** `{ "success": true, "data": { "url": "http://...uploads/cms/.../filename.jpg" } }`

---

## Stock Movements

### GET `/stock-movements` 🔒
Filter: `?product_id=uuid`

### POST `/stock-movements` 🔒 Admin
**Body:**
```json
{
  "product_id": "uuid",
  "movement_type": "in",
  "quantity": 50,
  "reason": "Restock dari supplier",
  "notes": "Batch Juli 2026"
}
```
`movement_type`: `in` | `out` | `adjustment`

---

## Service Consumables

### GET `/service-consumables?service_id=uuid` 🔒
Daftar bahan/produk yang dipakai untuk service tertentu.

### POST `/service-consumables` 🔒 Admin
**Body:** `{ "service_id": "uuid", "product_id": "uuid", "quantity_used": 5 }`

### DELETE `/service-consumables/:id` 🔒 Admin

---

## WhatsApp

### GET `/whatsapp/devices` 🔒
Daftar device WhatsApp yang terhubung ke org.

### POST `/whatsapp/send` 🔒
**Body:** `{ "to": "+6281234567890", "message": "Halo, ini reminder..." }`

### POST `/whatsapp/send-bulk` 🔒
**Body:**
```json
{
  "recipients": [{ "to": "+628...", "patient_name": "Budi" }],
  "message": "Halo {patient_name}, reminder appointment Anda..."
}
```

### GET `/whatsapp/templates` 🔒
Daftar template pesan.

---

## Omnichannel

### GET `/omni/conversations` 🔒
Daftar semua conversation.

### GET `/omni/conversations/:id/messages` 🔒
Pesan dalam conversation.

### POST `/omni/conversations/:id/messages` 🔒
Kirim pesan. **Body:** `{ "content": "..." }`

### PUT `/omni/conversations/:id/read` 🔒
Mark conversation sebagai read.

### WebSocket: `/omni/ws?org_id=<orgId>` 🔒
Real-time updates untuk new messages dan conversation changes.

---

## Migration / Import

### POST `/migration/import` 🔒 Admin
Import data dari Excel. `multipart/form-data` field: `file`

---

## Health Check

### GET `/health` — Public
`{"status": "ok"}`

---

*Last updated: 2026-07-09*

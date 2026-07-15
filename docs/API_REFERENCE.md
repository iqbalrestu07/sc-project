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
  "organizations": [
    {
      "id": "uuid",
      "name": "Klinik ABC",
      "slug": "klinik-abc",
      "role": "admin"
    }
  ]
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

Daftar pasien terpaginated. Query: `?search=nama&page=1&limit=50&has_whatsapp=true`.

Response memakai `{ data, has_next, page, limit }`. Saat `has_whatsapp=true`, response juga menyertakan `total`, yaitu jumlah seluruh pasien aktif dengan nomor WhatsApp yang cocok dengan search.

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

Daftar layanan terpaginated. Query: `?search=nama&page=1&limit=50`. Response memakai `{ data, has_next, page, limit }`; tidak ada field `total`.

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
  "doctor_offering_commission_type": "percentage",
  "doctor_offering_commission_value": 10,
  "therapist_offering_commission_type": "percentage",
  "therapist_offering_commission_value": 5,
  "requires_doctor": true
}
```

`*_commission_*` adalah rate **handling** (PIC yang mengerjakan). Field `*_offering_commission_*` opsional; saat `commission_eligible = true` pada item transaksi dan rate offering tersedia, komisi offering menggantikan handling untuk staff tersebut.

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

Daftar produk terpaginated. Query: `?search=nama&page=1&limit=50`. Response memakai `{ data, has_next, page, limit }`; tidak ada field `total`.

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
  "expiry_date": "2026-12-31",
  "is_consumable": true,
  "consumable_category": "Masker",
  "doctor_commission_type": "percentage",
  "doctor_commission_value": 10,
  "therapist_commission_type": "percentage",
  "therapist_commission_value": 5,
  "doctor_offering_commission_type": "percentage",
  "doctor_offering_commission_value": 5,
  "therapist_offering_commission_type": "percentage",
  "therapist_offering_commission_value": 3
}
```

Produk dapat memakai skema komisi handling/offering yang sama dengan service. `is_consumable: true` membuat produk tersedia untuk dipilih pada kebutuhan konsumabel service.

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

Daftar staff terpaginated. Query: `?search=nama&page=1&limit=50`. Response memakai `{ data, has_next, page, limit }`; tidak ada field `total`.

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

Daftar transaksi terpaginated. Query yang didukung saat ini: `?page=1&limit=50`. Response memakai `{ data, has_next, page, limit }`; filter `from`, `to`, dan `status` belum diproses oleh handler list saat ini.

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
      "therapist_id": "uuid",
      "commission_eligible": true,
      "commission_notes": "Ditawarkan saat konsultasi",
      "selected_consumable_product_id": "uuid"
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

> **⚠️ Note:** Jika `payment_status = "paid"`, backend menjalankan side effect dalam satu database transaction:
>
> 1. Validasi stok `selected_consumable_product_id` untuk item service bila ada.
> 2. Generate komisi handling atau offering untuk doctor/therapist yang di-assign.
> 3. Kurangi stok produk retail dan produk konsumabel yang dipilih.
> 4. Catat `stock_movements` (`usage` untuk retail, `service_consumable` untuk konsumabel).
>
> Jika stok konsumabel pilihan tidak mencukupi, transaksi gagal dan seluruh side effect di-rollback.

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
    "patients": 150,
    "appointments_today": 8,
    "paid_transactions_today": 25,
    "revenue_today": 5000000,
    "low_stock_products": 3
  }
}
```

### GET `/dashboard/revenue` 🔒 reports:read

Revenue chart data. Filter: `?from=&to=` (default 30 hari).

### GET `/dashboard/top-services` 🔒 reports:read

Top services by revenue. Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=10`. Response memakai `{ data, has_next, page, limit }`.

### GET `/dashboard/top-products` 🔒 reports:read

Top products by revenue. Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=10`. Response memakai `{ data, has_next, page, limit }`.

### GET `/dashboard/top-customers` 🔒 reports:read

Lima pasien dengan total pembelian tertinggi. Mendukung filter date range `?from=YYYY-MM-DD&to=YYYY-MM-DD`.

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

Info klinik publik (tanpa auth) — untuk landing page. Query opsional: `?org=<organization-slug>`. Jika `org` tidak dikirim, backend memakai `DEFAULT_PUBLIC_ORG_SLUG`; bila variabel tersebut kosong, backend memilih organisasi aktif pertama.

---

## Public CMS Tenant Resolution

Endpoint CMS publik menerima query opsional `?org=<organization-slug>`:

```text
GET /cms/pages/promotions?org=klinik-cantik
GET /cms/pages/hero?org=klinik-cantik
```

Slug selalu di-resolve backend ke organisasi aktif sebelum query `cms_pages`; UUID organisasi tidak perlu dan tidak dipublikasikan. Jika slug tidak ditemukan atau organisasi nonaktif, response adalah `404`.

Pada frontend, root `/` memakai organisasi default. Landing tenant spesifik menggunakan `/<organization-slug>`, misalnya `/klinik-cantik`, dan semua hook CMS/clinic info meneruskan slug tersebut sebagai query `org`.

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

> **Legacy:** endpoint ini memakai tabel `service_consumables`. Untuk konfigurasi baru gunakan Service Consumable Groups di bawah.

---

## Service Consumable Groups

Sistem baru untuk kebutuhan produk habis pakai service. Satu group merepresentasikan satu kebutuhan dan memiliki alternatif produk yang diurutkan dengan `priority` (`0` adalah prioritas tertinggi).

### GET `/services/:id/consumable-groups` 🔒 services:read

Mengembalikan seluruh group service beserta `items` dan informasi produk terdenormalisasi (`product_name`, `product_unit`, `current_stock`, `selling_price`).

### POST `/services/:id/consumable-groups` 🔒 services:write

Buat group kebutuhan konsumabel.

```json
{ "name": "Masker wajah", "quantity_used": 1 }
```

### PUT `/consumable-groups/:groupId` 🔒 services:write

```json
{ "name": "Masker wajah", "quantity_used": 1 }
```

### DELETE `/consumable-groups/:groupId` 🔒 services:write

Soft-delete group. Group item yang terkait tidak lagi dikembalikan karena group telah dihapus.

### POST `/consumable-groups/:groupId/items` 🔒 services:write

Tambahkan produk alternatif ke group.

```json
{ "product_id": "uuid", "priority": 0 }
```

### DELETE `/consumable-group-items/:itemId` 🔒 services:write

Soft-delete produk alternatif dari group.

### Integrasi transaksi

Untuk service dengan consumable group, POS mengirim `selected_consumable_product_id` pada object item transaksi. Ketika dibayar, backend memvalidasi stok lalu mengurangi stok produk tersebut. Saat ini hanya **satu** pilihan konsumabel dapat disimpan per `transaction_item`; service dengan beberapa group belum didukung sepenuhnya oleh payload transaksi.

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

_Last updated: 2026-07-09_

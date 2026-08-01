# Features & Business Processes — SC Project

> Dokumen ini menjelaskan **business workflow** end-to-end untuk fitur-fitur utama.
> Gunakan sebagai referensi cepat untuk memahami alur data tanpa harus trace kode.
>
> **Last updated: 2026-08-01**

---

## Daftar Isi

1. [Walk-in Patient Flow (Serve Patient)](#1-walk-in-patient-flow-serve-patient)
2. [Appointment Calendar Flow](#2-appointment-calendar-flow)
3. [Queue — Antrian Hari Ini](#3-queue--antrian-hari-ini)
4. [Cancel Appointment / Walk-in](#4-cancel-appointment--walk-in)
5. [POS Checkout Flow](#5-pos-checkout-flow)
6. [Add Items to Existing Transaction](#6-add-items-to-existing-transaction)
7. [Visit Notes (Rekam Medis)](#7-visit-notes-rekam-medis)
8. [Commission Generation](#8-commission-generation)
9. [Stock Movement on Payment](#9-stock-movement-on-payment)
10. [Patient History (Visits + Transactions)](#10-patient-history-visits--transactions)
11. [Multi-Tenant Data Isolation](#11-multi-tenant-data-isolation)
12. [UUID Generation Strategy](#12-uuid-generation-strategy)

---

## 1. Walk-in Patient Flow (Serve Patient)

**Frontend:** `ServePatientDialog.tsx` → dipanggil dari Patient List atau Queue page.

```
User klik "Serve Patient" di Patient List
  → ServePatientDialog terbuka
  → User pilih layanan (bisa multiple), doctor, therapist
  → Step 1: Create appointment (source='walk_in', scheduled_at=now)
    POST /appointments { patient_id, service_id, doctor_id, therapist_id, source: 'walk_in', ... }
  → Step 2: Create transaction draft (pending) linked to appointment
    POST /transactions { patient_id, appointment_id, items: [...], payment_status: 'pending' }
  → Step 3 (optional): Isi rekam medis via VisitNoteFormDialog
    POST /patients/:id/visit-notes { appointment_id, ... }
  → Navigate ke /queue
```

**Key points:**
- Appointment `source='walk_in'` → **tidak muncul di kalender**, hanya di queue
- Transaction dibuat sebagai draft (`payment_status='pending'`) → bisa di-edit di POS
- Multiple services dalam satu walk-in → semua disimpan sebagai transaction_items

---

## 2. Appointment Calendar Flow

**Frontend:** `AppointmentCalendar.tsx` + `AppointmentFormDialog.tsx`

```
User buka /appointments
  → Calendar fetch: GET /appointments/calendar?start_date=&end_date=
  → Backend: appointment.Repository.List() — filter (source='appointment' OR source IS NULL)
  → Walk-in TIDAK muncul di kalender
  → User klik slot → AppointmentFormDialog (create)
  → User klik event → AppointmentFormDialog (edit) — ada tombol "Batalkan Appointment"
```

**Key points:**
- Kalender hanya menampilkan `source='appointment'` atau `source IS NULL` (data lama)
- Edit dialog punya tombol "Batalkan Appointment" (variant destructive) dengan konfirmasi
- Create appointment default `source='appointment'`

---

## 3. Queue — Antrian Hari Ini

**Frontend:** `Queue.tsx` → fetch `GET /appointments/today`

```
Backend: appointment.Handler.TodayQueue()
  → service.ListAll(orgID, startOfDay, endOfDay)  — ALL sources (walk-in + appointment)
  → For each appointment, fetch all_services via GetServicesByAppointment()
    → Query transaction_items JOIN services WHERE t.appointment_id = a.id
    → Fallback: appointment.service.name if no transaction
  → Group by status:
    - waiting:     scheduled + confirmed
    - in_progress: in_progress
    - completed:   completed
    - other:       everything else
```

**Frontend Queue page:**
- 3 kolom: Dalam Antrian / Sedang Dilayani / Selesai
- Setiap card menampilkan: nama pasien, semua layanan, doctor, therapist, waktu
- Tombol per card:
  - **Waiting:** Mulai Layani (→in_progress), Lihat Detail, Batalkan
  - **In Progress:** Selesai (→completed), Lihat Detail, Batalkan
  - **Completed:** Buat Transaksi (→POS), Lihat Detail, Batalkan (jika belum paid)
- "Buat Transaksi" di-disabled + tooltip "Transaksi Selesai" jika sudah paid
- Payment status di-fetch via `GET /transactions/by-appointment?ids=...` (lightweight)

**Key points:**
- Queue menampilkan SEMUA appointment hari ini (walk-in + regular)
- Auto-refresh setiap 30 detik
- Tombol "Buat Transaksi" navigasi ke `/pos` dengan `state: { transactionId, patientId }`

---

## 4. Cancel Appointment / Walk-in

**Endpoint:** `POST /appointments/:id/cancel` (semua role)

```
Backend: appointment.Service.Cancel(id, orgID, userID)
  1. Verify appointment exists + belongs to org
  2. If already cancelled → idempotent return
  3. Find linked transaction via transactions.appointment_id
  4. If transaction payment_status = 'pending' → soft-delete + set 'cancelled'
  5. If transaction payment_status = 'paid'|'partial'|'refunded' → REJECT (HTTP 409)
  6. Soft-delete appointment + set status='cancelled'
```

**Frontend:**
- Queue page: tombol "Batalkan" → AlertDialog konfirmasi → `cancelAppointment.mutate(id)`
- Appointment form dialog (edit mode): tombol "Batalkan Appointment" → AlertDialog → cancel
- Error "transaksi sudah dibayar" ditampilkan via toast

**Key points:**
- Transaksi yang sudah dibayar TIDAK bisa dibatalkan (preserve audit trail)
- Cancel appointment + cancel draft transaction dilakukan bersamaan
- Endpoint ini tersedia untuk semua role (bukan admin-only seperti DELETE)

---

## 5. POS Checkout Flow

**Frontend:** `POSInterface.tsx`

```
Scenario A: Transaksi baru (tanpa transactionId)
  → User pilih patient, tambah items ke cart
  → Klik "Bayar" → POST /transactions { items, payment_status, ... }
  → If paid: backend auto-generate commissions + reduce stock
  → AlertDialog: "Cetak struk?" → print receipt

Scenario B: Walk-in dengan draft transaction (dengan transactionId)
  → POS dibuka dengan state: { transactionId, patientId }
  → Loading overlay ditampilkan saat fetch draft transaction
  → User bisa tambah items baru → POST /transactions/:id/items
  → User klik "Bayar" → PUT /transactions/:id { payment_status: 'paid', ... }
  → Backend: MarkPaidEffects() → commissions + stock
```

**Key points:**
- Loading overlay mencegah user klik item sebelum draft transaction selesai di-load
- Jika `transactionId` ada, POS menambah items ke transaksi existing (bukan buat baru)
- Receipt header/footer dari `clinic_settings.invoice_header_*` / `invoice_footer_text`
- Transaction code: 16 char dari UUID (tanpa dash) untuk uniqueness

---

## 6. Add Items to Existing Transaction

**Endpoint:** `POST /transactions/:id/items`

```
Backend: transaction.Service.AddItem(transactionID, item, userID, orgID)
  1. Verify transaction exists
  2. INSERT new transaction_item
  3. Recalculate subtotal, total_amount
  4. UPDATE transaction totals
  5. If transaction already paid:
     → Generate commission for new item
     → Reduce stock for new item (if product/consumable)
```

**Key points:**
- Memungkinkan tambah layanan/produk tambahan saat pembayaran berlangsung
- Jika transaksi sudah paid, side effects (commission + stock) tetap di-generate untuk item baru
- Frontend: `useAddTransactionItem` hook

---

## 7. Visit Notes (Rekam Medis)

**Module:** `visit_note` (backend) + `VisitNoteFormDialog.tsx` (frontend)

```
Create flow:
  POST /patients/:id/visit-notes { visit_date, diagnosis, ... }
  → visit_note.Repository.Create()
  → Linked to patient (required) + appointment (optional)

View flow:
  PatientDetail.tsx → tab "Medical Records"
  → GET /patients/:id/visit-notes
  → Timeline menampilkan visit notes + appointments secara terintegrasi
```

**Fields:**
- `diagnosis` — diagnosis kunjungan
- `patient_condition_before` — kondisi pasien sebelum treatment
- `treatment_performed` — treatment yang dilakukan
- `treatment_outcome` — hasil treatment
- `follow_up_notes` — catatan follow-up
- `next_visit_recommended` — tanggal rekomendasi kunjungan berikutnya
- `doctor_id` — doctor yang menangani
- `appointment_id` — link ke appointment (opsional, bisa independent)

**Key points:**
- Visit notes independen dari appointments — bisa dibuat tanpa appointment
- Bisa diakses dari: PatientDetail (Medical Records tab), ServePatientDialog (step 3)
- Timeline di PatientDetail menggabungkan visit notes + appointments

---

## 8. Commission Generation

**Trigger:** Transaction `payment_status` berubah ke `paid`

```
Backend: transaction.Repository.MarkPaidEffects()
  1. Load all transaction_items
  2. For each item with commission_eligible=true:
     a. Determine commission_reason: 'handling' (default) atau 'offering'
     b. If offering commission rate exists on item → use offering (replaces handling)
     c. Calculate commission_amount = base_amount * commission_value (percentage)
        atau commission_value (fixed)
     d. INSERT into commissions table
  3. Reduce stock for products/consumables
  4. Create stock_movements records
```

**Commission types:**
- **Handling** (`*_commission_*`): komisi untuk PIC (doctor/therapist yang menangani)
- **Offering** (`*_offering_commission_*`): komisi untuk upsell, opsional
- Jika offering rate tersedia dan `commission_eligible=true`, offering menggantikan handling (no double commission)

**Status flow:** `pending` → `paid` (via `POST /commissions/update-status`)

---

## 9. Stock Movement on Payment

**Trigger:** Transaction dibayar (`payment_status = 'paid'`)

```
Backend: transaction.Repository.MarkPaidEffects() (dalam DB transaction)
  1. Load all transaction_items
  2. Validate stock untuk setiap consumable service yang dipilih
  3. For each item:
     - If product: reduce products.current_stock, INSERT stock_movement (reason='usage')
     - If service with consumable: reduce consumable product stock, INSERT stock_movement (reason='service_consumable')
  4. If stock tidak cukup → return error, rollback entire transaction
  5. Generate commissions
```

**Key points:**
- Semua stock changes dalam satu DB transaction (atomic)
- `stock_movements` bersifat immutable (tidak ada updated_by/deleted_at)
- `selected_consumable_product_id` di transaction_items menyimpan pilihan consumable per item

---

## 10. Patient History (Visits + Transactions)

**Endpoints:**
- `GET /patients/:id/visits` — riwayat kunjungan (appointments)
- `GET /patients/:id/transactions` — riwayat transaksi

**Visit summary includes:**
- `service_name` — service dari appointment (single)
- `all_services` — semua service names dari linked transaction (walk-in multi-service)
- `doctor_name`, `therapist_name` — staff yang menangani
- Frontend timeline: title = `all_services.join(", ")` jika ada, fallback `service_name`

**Transaction summary includes:**
- `doctor_names`, `therapist_names` — agregasi dari semua transaction_items (string_agg)
- `payment_status`, `total_amount`, `payment_method`

---

## 11. Multi-Tenant Data Isolation

```
Request → AuthMiddleware (JWT) → OrgMiddleware (X-Organization-ID header)
  → Verify user membership in org
  → Set org_id + org_role in context
  → Repository filters: WHERE organization_id = $N
```

**Pattern SQL:**
```sql
-- Jika orgID kosong (""), return semua; jika ada, filter ketat
AND (organization_id = $N OR ($N::text = '' AND organization_id IS NULL))
```

**Frontend:**
- `AuthContext` menyimpan `activeOrg`
- `ApiClient` auto-attach `X-Organization-ID` header
- `OrgSwitcher` di sidebar untuk ganti org aktif
- `ProtectedRoute` cek permission per route

---

## 12. UUID Generation Strategy

```
utils.NewUUID() → UUIDv7 (time-sortable)
  → Prefix timestamp → better index locality untuk INSERT
  → Fallback ke UUIDv4 jika UUIDv7 gagal

Database: DEFAULT gen_random_uuid()
  → Safety net untuk INSERT yang tidak set ID explicitly
  → Menghasilkan UUIDv4 (random)
  → App code selalu generate UUIDv7 via utils.NewUUID()
```

**Key points:**
- Semua ID di app code menggunakan `utils.NewUUID()` (UUIDv7)
- Database `DEFAULT gen_random_uuid()` hanya fallback, tidak digunakan normalnya
- UUIDv7 memberi time-sortable property → INSERT lebih efisien (less page splits)
- Transaction code: `strings.ReplaceAll(utils.NewUUID(), "-", "")[:16]` untuk uniqueness

---

## Quick Reference: Endpoint-to-Feature Mapping

| Feature | Endpoints | Frontend Page |
|---------|-----------|---------------|
| Walk-in serve | `POST /appointments`, `POST /transactions` | ServePatientDialog → Queue |
| Calendar | `GET /appointments/calendar` | Appointments.tsx |
| Queue | `GET /appointments/today`, `GET /transactions/by-appointment` | Queue.tsx |
| Cancel | `POST /appointments/:id/cancel` | Queue.tsx, AppointmentFormDialog |
| POS checkout | `POST /transactions`, `PUT /transactions/:id` | POSInterface.tsx |
| Add items | `POST /transactions/:id/items` | POSInterface.tsx |
| Visit notes | `GET/POST /patients/:id/visit-notes`, `PUT/DELETE /visit-notes/:id` | PatientDetail, ServePatientDialog |
| Commissions | Auto on paid, `POST /commissions/update-status` | Commissions.tsx |
| Patient history | `GET /patients/:id/visits`, `GET /patients/:id/transactions` | PatientDetail.tsx |

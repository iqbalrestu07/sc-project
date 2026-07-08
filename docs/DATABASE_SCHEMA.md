# Database Schema Reference

> Referensi lengkap semua tabel di database PostgreSQL untuk project SC-POS.  
> Database: `sc_pos` | Driver: `lib/pq` | Raw SQL (tanpa ORM)

---

## Konvensi Global

| Konvensi | Penjelasan |
|----------|------------|
| `organization_id` | Ada di setiap tabel bisnis. Multi-tenant: selalu filter `WHERE organization_id = $n` |
| `deleted_at` | Soft delete. Data aktif: `WHERE deleted_at IS NULL` |
| `created_by` / `updated_by` | Audit trail. Isi dari `user_id` context (VARCHAR 36) |
| `id` | UUID sebagai string VARCHAR(36), bukan UUID native PostgreSQL |
| `is_active` | Beberapa tabel punya flag ini untuk disable tanpa delete |

---

## Tabel: `users`

```sql
CREATE TABLE users (
    id          VARCHAR(36)  PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,           -- bcrypt hash
    role        VARCHAR(50)  NOT NULL DEFAULT 'cashier',  -- global role (legacy)
    full_name   VARCHAR(255),
    avatar_url  TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

**Notes:**
- Role global di JWT: `admin`, `doctor`, `therapist`, `cashier`
- Role efektif per org ada di `organization_members.role`
- Password: bcrypt hash via `golang.org/x/crypto`

---

## Tabel: `organizations`

```sql
CREATE TABLE organizations (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url    TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by  VARCHAR(36),
    updated_by  VARCHAR(36),
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `organization_members`

```sql
CREATE TABLE organization_members (
    id          VARCHAR(36) PRIMARY KEY,
    org_id      VARCHAR(36) NOT NULL REFERENCES organizations(id),
    user_id     VARCHAR(36) NOT NULL REFERENCES users(id),
    role        VARCHAR(50) NOT NULL DEFAULT 'cashier',  -- org-level role
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    joined_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_by  VARCHAR(36),
    updated_by  VARCHAR(36),
    deleted_at  TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);
```

---

## Tabel: `permissions`

```sql
CREATE TABLE permissions (
    id          VARCHAR(100) PRIMARY KEY,  -- format: "resource:action"
    resource    VARCHAR(100) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(resource, action)
);
```

**Contoh data:**
```
id               | resource     | action
patients:read    | patients     | read
patients:write   | patients     | write
patients:delete  | patients     | delete
transactions:read| transactions | read
reports:read     | reports      | read
```

---

## Tabel: `role_permissions`

```sql
CREATE TABLE role_permissions (
    id            VARCHAR(36)  PRIMARY KEY,
    role          VARCHAR(50)  NOT NULL,
    permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id),
    UNIQUE(role, permission_id)
);
```

Default mapping: Admin dapat semua permission, cashier dapat transaksi + pasien + services/products (read).

---

## Tabel: `user_permissions`

```sql
CREATE TABLE user_permissions (
    id            VARCHAR(36)  PRIMARY KEY,
    user_id       VARCHAR(36)  NOT NULL REFERENCES users(id),
    org_id        VARCHAR(36)  NOT NULL REFERENCES organizations(id),
    permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id),
    granted_by    VARCHAR(36),
    granted_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, org_id, permission_id)
);
```

**Notes:** Hard DELETE (bukan soft delete) ketika revoke permission.

---

## Tabel: `patients`

```sql
CREATE TABLE patients (
    id                 VARCHAR(36)  PRIMARY KEY,
    patient_code       VARCHAR(50)  UNIQUE NOT NULL,  -- format: "PAT-XXXXXXXX"
    full_name          VARCHAR(255) NOT NULL,
    photo_url          TEXT,
    date_of_birth      DATE,                           -- nullable
    gender             VARCHAR(20),
    phone              VARCHAR(50),
    whatsapp           VARCHAR(50),
    email              VARCHAR(255),
    address            TEXT,
    allergy_history    TEXT,
    medical_conditions TEXT,
    skin_type          VARCHAR(100),
    notes              TEXT,
    tags               TEXT[],                         -- pq.Array di Go
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    reminder_opt_in    BOOLEAN      NOT NULL DEFAULT TRUE,
    organization_id    VARCHAR(36)  NOT NULL REFERENCES organizations(id),
    created_by         VARCHAR(36),
    updated_by         VARCHAR(36),
    deleted_at         TIMESTAMP,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `service_categories`

```sql
CREATE TABLE service_categories (
    id              VARCHAR(36)  PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    organization_id VARCHAR(36)  NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `services`

```sql
CREATE TABLE services (
    id                         VARCHAR(36)    PRIMARY KEY,
    name                       VARCHAR(255)   NOT NULL,
    category_id                VARCHAR(36)    REFERENCES service_categories(id),
    description                TEXT,
    duration_minutes           INTEGER        NOT NULL DEFAULT 60,
    base_price                 DECIMAL(15,2)  NOT NULL DEFAULT 0,
    doctor_commission_type     VARCHAR(20),   -- "percentage" | "fixed"
    doctor_commission_value    DECIMAL(15,2),
    therapist_commission_type  VARCHAR(20),   -- "percentage" | "fixed"
    therapist_commission_value DECIMAL(15,2),
    requires_doctor            BOOLEAN        NOT NULL DEFAULT FALSE,
    is_active                  BOOLEAN        NOT NULL DEFAULT TRUE,
    organization_id            VARCHAR(36)    NOT NULL REFERENCES organizations(id),
    created_by                 VARCHAR(36),
    updated_by                 VARCHAR(36),
    deleted_at                 TIMESTAMP,
    created_at                 TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMP      NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `product_categories`

```sql
CREATE TABLE product_categories (
    id              VARCHAR(36)  PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    organization_id VARCHAR(36)  NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `products`

```sql
CREATE TABLE products (
    id              VARCHAR(36)    PRIMARY KEY,
    name            VARCHAR(255)   NOT NULL,
    category        VARCHAR(100),
    sku             VARCHAR(100),
    supplier        VARCHAR(255),
    purchase_price  DECIMAL(15,2)  NOT NULL DEFAULT 0,
    selling_price   DECIMAL(15,2)  NOT NULL DEFAULT 0,
    current_stock   INTEGER        NOT NULL DEFAULT 0,
    minimum_stock   INTEGER        NOT NULL DEFAULT 0,
    unit            VARCHAR(50),
    expiry_date     DATE,           -- nullable: models.NullableTime
    is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
    is_consumable   BOOLEAN        NOT NULL DEFAULT FALSE,  -- produk habis pakai
    organization_id VARCHAR(36)    NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `staff`

```sql
CREATE TABLE staff (
    id              VARCHAR(36)  PRIMARY KEY,
    user_id         VARCHAR(36)  REFERENCES users(id),  -- nullable: staff tanpa akun login
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL,   -- "doctor" | "therapist" | "cashier"
    phone           VARCHAR(50),
    email           VARCHAR(255),
    specialization  VARCHAR(255),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    organization_id VARCHAR(36)  NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `appointments`

```sql
CREATE TABLE appointments (
    id               VARCHAR(36) PRIMARY KEY,
    patient_id       VARCHAR(36) NOT NULL REFERENCES patients(id),
    service_id       VARCHAR(36) REFERENCES services(id),
    doctor_id        VARCHAR(36) REFERENCES staff(id),
    therapist_id     VARCHAR(36) REFERENCES staff(id),
    scheduled_at     TIMESTAMP   NOT NULL,
    duration_minutes INTEGER     NOT NULL DEFAULT 60,
    status           VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    -- status: scheduled | confirmed | completed | cancelled | no_show
    notes            TEXT,
    reminder_sent_at TIMESTAMP,  -- tracking pengiriman reminder WA
    organization_id  VARCHAR(36) NOT NULL REFERENCES organizations(id),
    created_by       VARCHAR(36),
    updated_by       VARCHAR(36),
    deleted_at       TIMESTAMP,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `transactions`

```sql
CREATE TABLE transactions (
    id               VARCHAR(36)    PRIMARY KEY,
    transaction_code VARCHAR(50)    UNIQUE NOT NULL,
    appointment_id   VARCHAR(36)    REFERENCES appointments(id),
    patient_id       VARCHAR(36)    NOT NULL REFERENCES patients(id),
    subtotal         DECIMAL(15,2)  NOT NULL DEFAULT 0,
    discount_amount  DECIMAL(15,2)  NOT NULL DEFAULT 0,
    discount_type    VARCHAR(20),   -- "percentage" | "fixed"
    total_amount     DECIMAL(15,2)  NOT NULL DEFAULT 0,
    tax_amount       DECIMAL(15,2)  NOT NULL DEFAULT 0,
    payment_method   VARCHAR(50),
    payment_status   VARCHAR(50)    NOT NULL DEFAULT 'pending',
    -- payment_status: pending | paid | cancelled | refunded
    notes            TEXT,
    paid_at          TIMESTAMP,
    organization_id  VARCHAR(36)    NOT NULL REFERENCES organizations(id),
    created_by       VARCHAR(36),
    updated_by       VARCHAR(36),
    deleted_at       TIMESTAMP,
    created_at       TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP      NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `transaction_items`

```sql
CREATE TABLE transaction_items (
    id                  VARCHAR(36)    PRIMARY KEY,
    transaction_id      VARCHAR(36)    NOT NULL REFERENCES transactions(id),
    item_type           VARCHAR(20)    NOT NULL,  -- "service" | "product"
    service_id          VARCHAR(36)    REFERENCES services(id),
    product_id          VARCHAR(36)    REFERENCES products(id),
    quantity            INTEGER        NOT NULL DEFAULT 1,
    unit_price          DECIMAL(15,2)  NOT NULL DEFAULT 0,
    discount_amount     DECIMAL(15,2)  NOT NULL DEFAULT 0,
    total_price         DECIMAL(15,2)  NOT NULL DEFAULT 0,
    doctor_id           VARCHAR(36)    REFERENCES staff(id),
    therapist_id        VARCHAR(36)    REFERENCES staff(id),
    commission_eligible BOOLEAN        NOT NULL DEFAULT TRUE,
    commission_notes    TEXT,
    organization_id     VARCHAR(36)    NOT NULL REFERENCES organizations(id),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    deleted_at          TIMESTAMP,
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `commissions`

```sql
CREATE TABLE commissions (
    id                  VARCHAR(36)    PRIMARY KEY,
    staff_id            VARCHAR(36)    NOT NULL REFERENCES staff(id),
    staff_role          VARCHAR(50)    NOT NULL,
    transaction_id      VARCHAR(36)    NOT NULL REFERENCES transactions(id),
    transaction_item_id VARCHAR(36)    NOT NULL REFERENCES transaction_items(id),
    base_amount         DECIMAL(15,2)  NOT NULL,
    commission_type     VARCHAR(20)    NOT NULL,   -- "percentage" | "fixed"
    commission_value    DECIMAL(15,2)  NOT NULL,
    commission_amount   DECIMAL(15,2)  NOT NULL,
    status              VARCHAR(50)    NOT NULL DEFAULT 'pending',
    -- status: pending | paid | cancelled
    organization_id     VARCHAR(36)    NOT NULL REFERENCES organizations(id),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    deleted_at          TIMESTAMP,
    created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);
```

**Notes:** Komisi di-generate otomatis saat `payment_status = paid` di transaksi.

---

## Tabel: `clinic_settings`

```sql
CREATE TABLE clinic_settings (
    id                           VARCHAR(36)    PRIMARY KEY,
    clinic_name                  VARCHAR(255),
    address                      TEXT,
    phone                        VARCHAR(50),
    email                        VARCHAR(255),
    tax_rate                     DECIMAL(5,2)   NOT NULL DEFAULT 0,
    tax_inclusive                BOOLEAN        NOT NULL DEFAULT FALSE,
    low_stock_alerts             BOOLEAN        NOT NULL DEFAULT TRUE,
    appointment_reminders        BOOLEAN        NOT NULL DEFAULT TRUE,
    expiry_warnings              BOOLEAN        NOT NULL DEFAULT TRUE,
    reminder_hours_before        INTEGER        NOT NULL DEFAULT 24,
    whatsapp_reminder_enabled    BOOLEAN        NOT NULL DEFAULT FALSE,
    email_reminder_enabled       BOOLEAN        NOT NULL DEFAULT FALSE,
    whatsapp_business_phone_id   VARCHAR(100),
    logo_url                     TEXT,
    invoice_header_title         VARCHAR(255),
    invoice_header_description   TEXT,
    invoice_footer_text          TEXT,
    wa_invoice_header_title      VARCHAR(255),  -- WA-specific invoice header
    wa_invoice_header_description TEXT,
    wa_invoice_footer_text       TEXT,
    organization_id              VARCHAR(36)    NOT NULL REFERENCES organizations(id),
    created_by                   VARCHAR(36),
    updated_by                   VARCHAR(36),
    deleted_at                   TIMESTAMP,
    created_at                   TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMP      NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `stock_movements`

```sql
CREATE TABLE stock_movements (
    id              VARCHAR(36) PRIMARY KEY,
    product_id      VARCHAR(36) NOT NULL REFERENCES products(id),
    movement_type   VARCHAR(20) NOT NULL,  -- "in" | "out" | "adjustment"
    quantity        INTEGER     NOT NULL,
    reason          VARCHAR(255),
    reference_id    VARCHAR(36),           -- optional: link ke transaction
    reference_type  VARCHAR(50),           -- optional: "transaction"
    notes           TEXT,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
    -- TIDAK ada updated_by / deleted_at karena bersifat immutable
);
```

---

## Tabel: `service_consumables`

```sql
CREATE TABLE service_consumables (
    id              VARCHAR(36)    PRIMARY KEY,
    service_id      VARCHAR(36)    NOT NULL REFERENCES services(id),
    product_id      VARCHAR(36)    NOT NULL REFERENCES products(id),
    quantity_used   DECIMAL(10,3)  NOT NULL DEFAULT 1,
    organization_id VARCHAR(36)    NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    UNIQUE(service_id, product_id)
);
```

---

## Tabel: `cms_pages`

```sql
CREATE TABLE cms_pages (
    id              VARCHAR(36) PRIMARY KEY,
    page_id         VARCHAR(100) NOT NULL,    -- slug/identifier halaman (e.g. "home", "about")
    data            JSONB,                     -- konten halaman (schema bebas)
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
    created_by      VARCHAR(36),
    updated_by      VARCHAR(36),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);
```

---

## Tabel: `whatsapp_devices` & Related

Tabel untuk WhatsApp multi-device (whatsmeow):

```sql
-- Device sessions
CREATE TABLE whatsapp_devices (
    jid             VARCHAR(100) PRIMARY KEY,  -- WhatsApp JID
    org_id          VARCHAR(36)  NOT NULL,
    label           VARCHAR(255),
    is_connected    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Message storage (untuk history)
CREATE TABLE whatsapp_messages (
    id          BIGSERIAL    PRIMARY KEY,
    jid         VARCHAR(100) NOT NULL,
    message_id  VARCHAR(100) NOT NULL,
    sender      VARCHAR(100),
    content     TEXT,
    timestamp   TIMESTAMP,
    UNIQUE(jid, message_id)
);
```

---

## Tabel: Omnichannel

```sql
CREATE TABLE omni_conversations (
    id              VARCHAR(36)  PRIMARY KEY,
    org_id          VARCHAR(36)  NOT NULL,
    patient_id      VARCHAR(36),
    channel         VARCHAR(50)  NOT NULL,   -- "whatsapp" | "email" | etc.
    external_id     VARCHAR(255),            -- ID dari channel eksternal
    status          VARCHAR(50)  NOT NULL DEFAULT 'open',
    assigned_to     VARCHAR(36),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE omni_messages (
    id               VARCHAR(36) PRIMARY KEY,
    conversation_id  VARCHAR(36) NOT NULL REFERENCES omni_conversations(id),
    direction        VARCHAR(20) NOT NULL,   -- "inbound" | "outbound"
    content          TEXT,
    sender_id        VARCHAR(36),
    is_read          BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);
```

---

## Index Penting

```sql
-- Multi-tenant indexes (semua tabel bisnis)
CREATE INDEX IF NOT EXISTS idx_<table>_org ON <table>(organization_id);

-- Soft delete index
CREATE INDEX IF NOT EXISTS idx_<table>_deleted ON <table>(deleted_at);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_patients_code      ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_phone     ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_transactions_code  ON transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_stock_product      ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_service_consumable ON service_consumables(service_id, product_id);
```

---

## Migrations Notes

- Semua DDL di `internal/database/migrations.go` sebagai SQL string constants
- **Idempotent**: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
- Migrasi dijalankan **otomatis** saat startup (`database.RunMigrations()`)
- Untuk schema baru, **buat database fresh** agar schema koheren
- Urutan migrasi: createSchema → createIndexes → seed permissions → seed role_permissions → alterations

---

*Last updated: 2026-07-09*

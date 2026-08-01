package database

import (
	"fmt"
)

// RunMigrations executes the full schema setup from a clean slate.
// The SQL is idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS)
// so it is safe to run on an empty database or on a database that already has
// some of the tables. The intended use after the audit-trail refactor is to drop
// the database and recreate it from scratch so the schema is coherent.
func RunMigrations() error {
	migrations := []string{
		createSchema,
		createIndexes,
		backfillCommissionOrgID,
		addItemDiscountType,
		addClinicSettingsMapsEmbed,
		addClinicSettingsFavicon,
		seedDefaultPermissions,
		seedRolePermissions,
		addConsumableFlag,
		addConsumableUsageLogs,
		addConsumablePermissions,
		addWhatsappTables,
		addOmnichannelTables,
		addServiceConsumableGroups,
		migrateCmsPagesTenantUnique,
	}

	for i, migration := range migrations {
		fmt.Printf("Running migration %d...\n", i+1)
		if _, err := DB.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}
	// ---------------------------------------------------------------------------
	// 5) NEW ALTER TABLES FOR APPOINTMENT REMINDERS
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;`); err != nil {
		return fmt.Errorf("failed to add reminder_sent_at to appointments: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 7) commission_eligible & commission_notes on transaction_items
	// Tracks whether a service item earns an OFFERING commission for the staff.
	// Default TRUE preserves backward compatibility for existing rows.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS commission_eligible BOOLEAN NOT NULL DEFAULT TRUE;
		ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS commission_notes TEXT;
	`); err != nil {
		return fmt.Errorf("failed to add commission_eligible to transaction_items: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 6) NEW ALTER TABLES FOR WA INVOICE SETTINGS
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS wa_invoice_header_title VARCHAR(255);
		ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS wa_invoice_header_description TEXT;
		ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS wa_invoice_footer_text TEXT;
	`); err != nil {
		return fmt.Errorf("failed to add wa invoice settings: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 8) Offering commission rate columns on services table.
	//    Separates "handling" (doing the work) from "offering" (upselling).
	//    doctor_commission_type/value and therapist_commission_type/value already
	//    exist and will be repurposed as the HANDLING rate.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		ALTER TABLE services ADD COLUMN IF NOT EXISTS doctor_offering_commission_type   VARCHAR(20);
		ALTER TABLE services ADD COLUMN IF NOT EXISTS doctor_offering_commission_value  DECIMAL(10, 2);
		ALTER TABLE services ADD COLUMN IF NOT EXISTS therapist_offering_commission_type  VARCHAR(20);
		ALTER TABLE services ADD COLUMN IF NOT EXISTS therapist_offering_commission_value DECIMAL(10, 2);
		-- offering_price: harga situasional saat pasien menerima penawaran offering dari terapis.
		-- Jika NULL, harga offering = base_price (tidak ada harga khusus offering).
		ALTER TABLE services ADD COLUMN IF NOT EXISTS offering_price DECIMAL(10, 2);
	`); err != nil {
		return fmt.Errorf("failed to add offering commission columns to services: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 9) commission_reason on commissions table.
	//    'handling' = PIC / mengerjakan tindakan (always generated when staff assigned).
	//    'offering' = terapis menawarkan dan pasien setuju (generated only when eligible).
	//    Data lama tidak perlu dimigrasikan — reason dibiarkan NULL.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_reason VARCHAR(20);
	`); err != nil {
		return fmt.Errorf("failed to add commission_reason to commissions: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 10) Commission rate columns on products table.
	//     Same structure as services: handling (existing PIC) + offering (upsell).
	//     doctor_commission_type/value   = handling rate for doctor
	//     therapist_commission_type/value = handling rate for therapist
	//     *_offering_*                   = offering rate (nullable = no offering commission)
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		ALTER TABLE products ADD COLUMN IF NOT EXISTS doctor_commission_type    VARCHAR(20);
		ALTER TABLE products ADD COLUMN IF NOT EXISTS doctor_commission_value   DECIMAL(10, 2);
		ALTER TABLE products ADD COLUMN IF NOT EXISTS therapist_commission_type   VARCHAR(20);
		ALTER TABLE products ADD COLUMN IF NOT EXISTS therapist_commission_value  DECIMAL(10, 2);
		ALTER TABLE products ADD COLUMN IF NOT EXISTS doctor_offering_commission_type    VARCHAR(20);
		ALTER TABLE products ADD COLUMN IF NOT EXISTS doctor_offering_commission_value   DECIMAL(10, 2);
		ALTER TABLE products ADD COLUMN IF NOT EXISTS therapist_offering_commission_type   VARCHAR(20);
		ALTER TABLE products ADD COLUMN IF NOT EXISTS therapist_offering_commission_value  DECIMAL(10, 2);
	`); err != nil {
		return fmt.Errorf("failed to add commission columns to products: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 11) Performance indexes for hot query paths.
	//     These cover the most frequent queries that were doing sequential scans:
	//       - GetByName / GetByNames (import, duplicate check) → LOWER(name) index
	//       - Patient search by name/phone → trigram or plain ILIKE support
	//       - Commission lookup by transaction_item_id → join during payment
	//       - Transaction items by service_id / product_id → reporting queries
	//     All use IF NOT EXISTS so they are safe to run repeatedly.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		-- Name lookup indexes (used by import + duplicate detection)
		-- Functional index on LOWER(name) speeds up WHERE LOWER(name) = LOWER($1) and IN (...)
		CREATE INDEX IF NOT EXISTS idx_products_name_lower
			ON products (LOWER(name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true;

		CREATE INDEX IF NOT EXISTS idx_services_name_lower
			ON services (LOWER(name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true;

		-- Patient search: full_name + phone are the most common search fields.
		-- trigram (pg_trgm) would be ideal for ILIKE '%query%', but it requires
		-- the extension. We add plain indexes for exact/phone lookups instead,
		-- which cover the import duplicate-check path and phone-based search.
		CREATE INDEX IF NOT EXISTS idx_patients_name_lower
			ON patients (LOWER(full_name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true;

		CREATE INDEX IF NOT EXISTS idx_patients_phone
			ON patients (phone)
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true AND phone IS NOT NULL;

		CREATE INDEX IF NOT EXISTS idx_patients_whatsapp
			ON patients (whatsapp)
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true AND whatsapp IS NOT NULL;

		-- Staff search by name/email/phone
		CREATE INDEX IF NOT EXISTS idx_staff_name_lower
			ON staff (LOWER(full_name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true;

		CREATE INDEX IF NOT EXISTS idx_staff_email
			ON staff (LOWER(email))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true AND email IS NOT NULL;

		-- Commission lookup during payment processing
		-- WHERE staff_id = $1 AND transaction_item_id = $2 AND commission_reason = $3
		CREATE INDEX IF NOT EXISTS idx_commissions_item_reason
			ON commissions (transaction_item_id, commission_reason)
			WHERE deleted_at IS NULL;

		CREATE INDEX IF NOT EXISTS idx_commissions_staff_status
			ON commissions (staff_id, status)
			WHERE deleted_at IS NULL;

		-- Transaction items: filter by service_id / product_id (reporting, consumable lookup)
		CREATE INDEX IF NOT EXISTS idx_transaction_items_service
			ON transaction_items (service_id)
			WHERE service_id IS NOT NULL AND deleted_at IS NULL;

		CREATE INDEX IF NOT EXISTS idx_transaction_items_product
			ON transaction_items (product_id)
			WHERE product_id IS NOT NULL AND deleted_at IS NULL;

		-- Transaction items: filter by doctor_id / therapist_id (commission assignment)
		CREATE INDEX IF NOT EXISTS idx_transaction_items_doctor
			ON transaction_items (doctor_id)
			WHERE doctor_id IS NOT NULL AND deleted_at IS NULL;

		CREATE INDEX IF NOT EXISTS idx_transaction_items_therapist
			ON transaction_items (therapist_id)
			WHERE therapist_id IS NOT NULL AND deleted_at IS NULL;

		-- Products SKU lookup (used in product search + POS)
		CREATE INDEX IF NOT EXISTS idx_products_sku
			ON products (sku)
			WHERE deleted_at IS NULL AND sku IS NOT NULL;

		-- Transactions by date range (dashboard revenue reports)
		-- created_at is used as the transaction date in most dashboard queries
		CREATE INDEX IF NOT EXISTS idx_transactions_created_at
			ON transactions (created_at)
			WHERE deleted_at IS NULL;

		-- Commissions by transaction_id (cascade lookup when fetching transaction items)
		CREATE INDEX IF NOT EXISTS idx_commissions_transaction
			ON commissions (transaction_id)
			WHERE deleted_at IS NULL;
	`); err != nil {
		return fmt.Errorf("failed to add performance indexes: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 12) UNIQUE indexes for ON CONFLICT upsert (import fast path).
	//     These enable INSERT ... ON CONFLICT DO UPDATE so we don't need a
	//     separate SELECT before every INSERT during bulk import.
	//     Match key: (organization_id, LOWER(name)) for products/services,
	//                (organization_id, LOWER(full_name), COALESCE(phone,'')) for patients.
	//     Partial: only active, non-deleted rows participate in uniqueness.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_name
			ON products (organization_id, LOWER(name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true;

		CREATE UNIQUE INDEX IF NOT EXISTS uq_services_org_name
			ON services (organization_id, LOWER(name))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true;

		CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_org_name_phone
			ON patients (organization_id, LOWER(full_name), COALESCE(phone, ''))
			WHERE deleted_at IS NULL AND COALESCE(is_active, true) = true;
	`); err != nil {
		return fmt.Errorf("failed to add unique indexes for upsert: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 13) Migrate VARCHAR(36) ID columns to native UUID type.
	//     Older schemas used VARCHAR(36) for all UUID columns. The native UUID
	//     type is 16 bytes (vs 37 bytes for VARCHAR), gives better index
	//     performance, and enables gen_random_uuid() defaults.
	//
	//     This migration is idempotent: it only converts columns that are still
	//     VARCHAR(36). If the column is already UUID, the USING clause is skipped.
	//
	//     Strategy:
	//       1. Save all FK constraint definitions to a temp table
	//       2. Drop all FK constraints (so we can alter column types)
	//       3. Convert all VARCHAR(36) columns to UUID
	//       4. Recreate FK constraints from the saved definitions
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(migrateVarcharToUUID); err != nil {
		return fmt.Errorf("failed to migrate VARCHAR(36) to UUID: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 14) Add DEFAULT gen_random_uuid() to all primary key UUID columns.
	//     This is a safety net: if an INSERT omits the id field, PostgreSQL
	//     generates a UUIDv4 automatically instead of failing with NOT NULL.
	//     Normal application code always passes an explicit UUIDv7 from
	//     utils.NewUUID(), so this default is only used as a fallback.
	//     Idempotent: only sets default if the column doesn't already have one.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(addUuidDefaults); err != nil {
		return fmt.Errorf("failed to add UUID defaults: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 15) Visit notes table (medical records per visit).
	//     Captures pre-treatment diagnosis, post-treatment outcome, and
	//     follow-up recommendations. Independent of appointments — walk-in
	//     patients can have visit notes too.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(createVisitNotesTable); err != nil {
		return fmt.Errorf("failed to create visit_notes table: %w", err)
	}

	// ---------------------------------------------------------------------------
	// 16) Add source column to appointments.
	//     "appointment" = booked via calendar (e.g. patient calls/WA, admin
	//                    schedules them for a future date/time)
	//     "walk_in"     = walk-in patient served immediately via "Layani Pasien"
	//     Walk-ins are excluded from the calendar view but appear in the queue.
	//     Idempotent — only adds the column if it doesn't exist.
	// ---------------------------------------------------------------------------
	if _, err := DB.Exec(`
		ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'appointment';
		-- Backfill: any existing appointment with notes starting 'Walk-in' is a walk-in
		UPDATE appointments SET source = 'walk_in' WHERE source = 'appointment' AND notes LIKE 'Walk-in%';
	`); err != nil {
		return fmt.Errorf("failed to add source column to appointments: %w", err)
	}

	return nil
}

// createVisitNotesTable creates the visit_notes table for medical records.
// Idempotent (CREATE TABLE IF NOT EXISTS).
const createVisitNotesTable = `
CREATE TABLE IF NOT EXISTS visit_notes (
	id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	patient_id               UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
	appointment_id           UUID REFERENCES appointments(id) ON DELETE SET NULL,
	visit_date               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	diagnosis                TEXT,
	patient_condition_before TEXT,
	treatment_performed      TEXT,
	treatment_outcome        TEXT,
	follow_up_notes          TEXT,
	next_visit_recommended   TIMESTAMP,
	doctor_id                UUID REFERENCES staff(id),
	organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	created_by               UUID REFERENCES users(id),
	updated_by               UUID REFERENCES users(id),
	deleted_at               TIMESTAMP,
	created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visit_notes_patient ON visit_notes(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visit_notes_org     ON visit_notes(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visit_notes_date    ON visit_notes(visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visit_notes_doctor  ON visit_notes(doctor_id) WHERE deleted_at IS NULL AND doctor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visit_notes_appt    ON visit_notes(appointment_id) WHERE appointment_id IS NOT NULL;
`

// addUuidDefaults adds DEFAULT gen_random_uuid() to all UUID primary key
// columns that don't already have a default. This is a safety net so INSERTs
// that omit the id field get a valid UUID instead of a NOT NULL violation.
const addUuidDefaults = `
DO $$
DECLARE
    pk_col RECORD;
BEGIN
    FOR pk_col IN
        SELECT
            cl.relname AS table_name,
            att.attname AS column_name
        FROM pg_index idx
        JOIN pg_class cl ON cl.oid = idx.indrelid
        JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(idx.indkey)
        JOIN pg_namespace ns ON ns.oid = cl.relnamespace
        WHERE idx.indisprimary = true
          AND ns.nspname = 'public'
          AND format_type(att.atttypid, att.atttypmod) = 'uuid'
          AND att.atthasdef = false  -- only if no default exists yet
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT gen_random_uuid()',
            pk_col.table_name, pk_col.column_name
        );
    END LOOP;
END $$;
`

// migrateVarcharToUUID converts all VARCHAR(36) columns to native UUID type.
//
// This is a dynamic migration that:
//  1. Saves all foreign key constraints to a temp table
//  2. Drops all FK constraints (so columns can be altered)
//  3. Finds all VARCHAR(36) columns and converts them to UUID
//  4. Recreates all FK constraints from the saved definitions
//
// It is idempotent — if columns are already UUID, nothing happens.
const migrateVarcharToUUID = `
DO $$
DECLARE
    col_record RECORD;
    fk_record RECORD;
    fk_count INTEGER;
BEGIN
    -- Step 0: Check if there are any VARCHAR(36) columns left to convert.
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.columns
    WHERE data_type = 'character varying' AND character_maximum_length = 36
      AND table_schema = 'public';

    IF fk_count = 0 THEN
        -- Already migrated, nothing to do.
        RETURN;
    END IF;

    -- Step 1: Save all FK constraint definitions to a temp table.
    -- We store the constraint name, source table, and the full ALTER TABLE
    -- statement needed to recreate it.
    CREATE TEMP TABLE IF NOT EXISTS _saved_fks AS
    SELECT
        con.conname AS constraint_name,
        cl.relname AS table_name,
        pg_get_constraintdef(con.oid) AS constraint_def
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    WHERE con.contype = 'f'
      AND cl.relnamespace = 'public'::regnamespace;

    -- Step 2: Drop all FK constraints.
    FOR fk_record IN SELECT * FROM _saved_fks LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                        fk_record.table_name, fk_record.constraint_name);
    END LOOP;

    -- Step 3: Convert all VARCHAR(36) columns to UUID.
    -- We use USING column::uuid to cast the existing string data.
    -- This works because all existing IDs are valid UUID strings.
    FOR col_record IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE data_type = 'character varying'
          AND character_maximum_length = 36
          AND table_schema = 'public'
        ORDER BY table_name, column_name
    LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING %I::uuid',
                        col_record.table_name,
                        col_record.column_name,
                        col_record.column_name);
    END LOOP;

    -- Step 4: Recreate all FK constraints.
    FOR fk_record IN SELECT * FROM _saved_fks LOOP
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s',
                        fk_record.table_name,
                        fk_record.constraint_name,
                        fk_record.constraint_def);
    END LOOP;

    -- Cleanup temp table.
    DROP TABLE IF EXISTS _saved_fks;
END $$;
`

const createSchema = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Auth / identity ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	email VARCHAR(255) UNIQUE NOT NULL,
	password VARCHAR(255) NOT NULL,
	role VARCHAR(50) NOT NULL,
	full_name VARCHAR(255) NOT NULL DEFAULT '',
	avatar_url TEXT,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── SaaS multi-tenant / RBAC ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(255) NOT NULL,
	slug VARCHAR(100) UNIQUE NOT NULL,
	description TEXT,
	logo_url TEXT,
	is_active BOOLEAN DEFAULT true,
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role VARCHAR(50) NOT NULL DEFAULT 'cashier',
	is_active BOOLEAN DEFAULT true,
	joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS permissions (
	id VARCHAR(100) PRIMARY KEY,
	resource VARCHAR(50) NOT NULL,
	action VARCHAR(50) NOT NULL,
	description TEXT,
	UNIQUE(resource, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	role VARCHAR(50) NOT NULL,
	permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
	UNIQUE(role, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
	granted_by UUID REFERENCES users(id),
	granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(user_id, org_id, permission_id)
);

-- ── Service catalog ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_categories (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(255) NOT NULL,
	description TEXT,
	is_active BOOLEAN DEFAULT true,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(255) NOT NULL,
	category_id UUID REFERENCES service_categories(id),
	description TEXT,
	duration_minutes INTEGER DEFAULT 30,
	base_price DECIMAL(10, 2) NOT NULL,
	doctor_commission_type VARCHAR(20),
	doctor_commission_value DECIMAL(10, 2),
	therapist_commission_type VARCHAR(20),
	therapist_commission_value DECIMAL(10, 2),
	requires_doctor BOOLEAN DEFAULT false,
	is_active BOOLEAN DEFAULT true,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Product catalog ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(100) NOT NULL,
	description TEXT,
	is_active BOOLEAN DEFAULT true,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(255) NOT NULL,
	category VARCHAR(100),
	sku VARCHAR(100) UNIQUE,
	supplier VARCHAR(255),
	purchase_price DECIMAL(10, 2),
	selling_price DECIMAL(10, 2),
	current_stock INTEGER DEFAULT 0,
	minimum_stock INTEGER DEFAULT 5,
	unit VARCHAR(50),
	expiry_date DATE,
	is_active BOOLEAN DEFAULT true,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Staff and patients ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID UNIQUE REFERENCES users(id),
	full_name VARCHAR(255) NOT NULL,
	role VARCHAR(50) NOT NULL,
	phone VARCHAR(20),
	email VARCHAR(255),
	specialization VARCHAR(255),
	is_active BOOLEAN DEFAULT true,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	patient_code VARCHAR(50) UNIQUE NOT NULL,
	full_name VARCHAR(255) NOT NULL,
	photo_url TEXT,
	date_of_birth DATE,
	gender VARCHAR(20),
	phone VARCHAR(20),
	whatsapp VARCHAR(20),
	email VARCHAR(255),
	address TEXT,
	allergy_history TEXT,
	medical_conditions TEXT,
	skin_type VARCHAR(50),
	notes TEXT,
	tags TEXT[],
	is_active BOOLEAN DEFAULT true,
	reminder_opt_in BOOLEAN DEFAULT true,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Appointments and transactions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	patient_id UUID NOT NULL REFERENCES patients(id),
	service_id UUID NOT NULL REFERENCES services(id),
	doctor_id UUID REFERENCES staff(id),
	therapist_id UUID REFERENCES staff(id),
	scheduled_at TIMESTAMP NOT NULL,
	duration_minutes INTEGER,
	status VARCHAR(50) DEFAULT 'scheduled',
	source VARCHAR(20) DEFAULT 'appointment',
	notes TEXT,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	transaction_code VARCHAR(50) UNIQUE NOT NULL,
	appointment_id UUID REFERENCES appointments(id),
	patient_id UUID REFERENCES patients(id),
	subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
	discount_amount DECIMAL(10, 2),
	discount_type VARCHAR(50),
	total_amount DECIMAL(10, 2) NOT NULL,
	tax_amount DECIMAL(10, 2) DEFAULT 0,
	payment_method VARCHAR(50),
	payment_status VARCHAR(50) DEFAULT 'pending',
	notes TEXT,
	paid_at TIMESTAMP,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	transaction_id UUID NOT NULL REFERENCES transactions(id),
	item_type VARCHAR(50) NOT NULL DEFAULT 'service',
	service_id UUID REFERENCES services(id),
	product_id UUID REFERENCES products(id),
	quantity INTEGER DEFAULT 1,
	unit_price DECIMAL(10, 2) NOT NULL,
	discount_amount DECIMAL(10, 2),
	discount_type VARCHAR(50),
	total_price DECIMAL(10, 2) NOT NULL,
	doctor_id UUID REFERENCES staff(id),
	therapist_id UUID REFERENCES staff(id),
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commissions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	staff_id UUID NOT NULL REFERENCES staff(id),
	staff_role VARCHAR(50) NOT NULL,
	transaction_id UUID NOT NULL REFERENCES transactions(id),
	transaction_item_id UUID NOT NULL REFERENCES transaction_items(id),
	base_amount DECIMAL(10, 2) NOT NULL,
	commission_type VARCHAR(20) NOT NULL,
	commission_value DECIMAL(10, 2) NOT NULL,
	commission_amount DECIMAL(10, 2) NOT NULL,
	status VARCHAR(50) DEFAULT 'pending',
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Settings and CMS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_settings (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	clinic_name VARCHAR(255),
	address TEXT,
	phone VARCHAR(20),
	email VARCHAR(255),
	tax_rate DECIMAL(5, 2),
	tax_inclusive BOOLEAN,
	low_stock_alerts BOOLEAN,
	appointment_reminders BOOLEAN,
	expiry_warnings BOOLEAN,
	reminder_hours_before INTEGER,
	whatsapp_reminder_enabled BOOLEAN,
	email_reminder_enabled BOOLEAN,
	whatsapp_business_phone_id VARCHAR(255),
	logo_url TEXT,
	invoice_header_title VARCHAR(255),
	invoice_header_description TEXT,
	invoice_footer_text TEXT,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(organization_id)
);

CREATE TABLE IF NOT EXISTS cms_pages (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	page_id VARCHAR(100) NOT NULL,
	data JSONB NOT NULL DEFAULT '{}'::jsonb,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(page_id, organization_id)
);

-- ── Inventory and service consumables ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_movements (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	product_id UUID NOT NULL REFERENCES products(id),
	movement_type VARCHAR(20) NOT NULL,
	quantity INTEGER NOT NULL,
	reason VARCHAR(255),
	reference_id UUID,
	reference_type VARCHAR(50),
	notes TEXT,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_consumables (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	service_id UUID NOT NULL REFERENCES services(id),
	product_id UUID NOT NULL REFERENCES products(id),
	quantity_used DECIMAL(10, 3) NOT NULL DEFAULT 1,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	updated_by UUID REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(service_id, product_id)
);
`

const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_active ON organization_members(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_org ON user_permissions(org_id);

CREATE INDEX IF NOT EXISTS idx_service_categories_org ON service_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON service_categories(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_org ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_org ON staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_patients_org ON patients(organization_id);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_active ON appointments(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_code ON transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_transactions_active ON transactions(payment_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON transactions(appointment_id) WHERE appointment_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_org ON transaction_items(organization_id);

CREATE INDEX IF NOT EXISTS idx_commissions_staff ON commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_commissions_org ON commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_commissions_active ON commissions(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_settings_org ON clinic_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_org ON cms_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_page_id ON cms_pages(page_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);

CREATE INDEX IF NOT EXISTS idx_service_consumables_service ON service_consumables(service_id);
CREATE INDEX IF NOT EXISTS idx_service_consumables_org ON service_consumables(organization_id);
`

// addItemDiscountType adds discount_type column to transaction_items if it does not already exist.
const addItemDiscountType = `
ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50);
`

// addClinicSettingsMapsEmbed adds maps_embed_url column to clinic_settings for the Google Maps
// embed iframe src URL that is displayed on the landing page contact section.
const addClinicSettingsMapsEmbed = `
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS maps_embed_url TEXT;
`

// addClinicSettingsFavicon adds favicon_url column to clinic_settings so each
// organization can override the browser tab icon. logo_url already exists in
// the base schema but is included here for safety on legacy databases.
const addClinicSettingsFavicon = `
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT;
`

// addConsumableFlag marks products as consumable items and tracks their usage category.
const addConsumableFlag = `
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS consumable_category VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_products_consumable ON products(is_consumable) WHERE deleted_at IS NULL;
`

// addConsumableUsageLogs creates the consumable_usage_logs table which stores detailed
// records of when and why consumable products were used / dispensed.
const addConsumableUsageLogs = `
CREATE TABLE IF NOT EXISTS consumable_usage_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	product_id UUID NOT NULL REFERENCES products(id),
	quantity DECIMAL(10,3) NOT NULL,
	usage_purpose VARCHAR(100) NOT NULL,
	reference_id UUID,
	reference_type VARCHAR(50),
	patient_name VARCHAR(255),
	service_name VARCHAR(255),
	notes TEXT,
	organization_id UUID REFERENCES organizations(id),
	created_by UUID REFERENCES users(id),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_product ON consumable_usage_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_org ON consumable_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_purpose ON consumable_usage_logs(usage_purpose);
`

// addConsumablePermissions seeds the consumables:read and consumables:write permissions
// and assigns them to the appropriate roles.
const addConsumablePermissions = `
INSERT INTO permissions (id, resource, action, description) VALUES
	('consumables:read',  'consumables', 'read',  'View consumable products and usage history'),
	('consumables:write', 'consumables', 'write', 'Record consumable product usage')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (id, role, permission_id) VALUES
	(gen_random_uuid(), 'admin',     'consumables:read'),
	(gen_random_uuid(), 'admin',     'consumables:write'),
	(gen_random_uuid(), 'doctor',    'consumables:read'),
	(gen_random_uuid(), 'doctor',    'consumables:write'),
	(gen_random_uuid(), 'therapist', 'consumables:read'),
	(gen_random_uuid(), 'therapist', 'consumables:write'),
	(gen_random_uuid(), 'cashier',   'consumables:read')
ON CONFLICT (role, permission_id) DO NOTHING;
`

const backfillCommissionOrgID = `
-- Backfill commissions created before organization_id was set on insert
UPDATE commissions
SET organization_id = t.organization_id
FROM transactions t
WHERE commissions.transaction_id = t.id
  AND commissions.organization_id IS NULL;
`

const seedDefaultPermissions = `
INSERT INTO permissions (id, resource, action, description) VALUES
	('patients:read',       'patients',     'read',   'View patients'),
	('patients:write',      'patients',     'write',  'Create and edit patients'),
	('patients:delete',     'patients',     'delete', 'Delete patients'),
	('appointments:read',   'appointments', 'read',   'View appointments'),
	('appointments:write',  'appointments', 'write',  'Create and edit appointments'),
	('appointments:delete', 'appointments', 'delete', 'Delete appointments'),
	('services:read',       'services',     'read',   'View services'),
	('services:write',      'services',     'write',  'Create and edit services'),
	('services:delete',     'services',     'delete', 'Delete services'),
	('products:read',       'products',     'read',   'View products'),
	('products:write',      'products',     'write',  'Create and edit products'),
	('products:delete',     'products',     'delete', 'Delete products'),
	('categories:read',     'categories',   'read',   'View categories'),
	('categories:write',    'categories',   'write',  'Create and edit categories'),
	('categories:delete',   'categories',   'delete', 'Delete categories'),
	('transactions:read',   'transactions', 'read',   'View transactions'),
	('transactions:write',  'transactions', 'write',  'Create and process transactions'),
	('transactions:delete', 'transactions', 'delete', 'Delete transactions'),
	('commissions:read',    'commissions',  'read',   'View commissions'),
	('commissions:write',   'commissions',  'write',  'Update commission status'),
	('staff:read',          'staff',        'read',   'View staff'),
	('staff:write',         'staff',        'write',  'Create and edit staff'),
	('staff:delete',        'staff',        'delete', 'Delete staff'),
	('reports:read',        'reports',      'read',   'View reports and dashboard'),
	('settings:read',       'settings',     'read',   'View clinic settings'),
	('settings:write',      'settings',     'write',  'Update clinic settings'),
	('cms:read',            'cms',          'read',   'View CMS content'),
	('cms:write',           'cms',          'write',  'Edit CMS content'),
	('rbac:read',           'rbac',         'read',   'View RBAC settings'),
	('rbac:write',          'rbac',         'write',  'Manage roles and permissions'),
	('organization:read',   'organization', 'read',   'View organization info'),
	('organization:write',  'organization', 'write',  'Edit organization info'),
	('organization:delete', 'organization', 'delete', 'Delete organization')
ON CONFLICT (id) DO NOTHING;
`

const seedRolePermissions = `
INSERT INTO role_permissions (id, role, permission_id) VALUES
	-- admin: all permissions
	(gen_random_uuid(), 'admin', 'patients:read'),
	(gen_random_uuid(), 'admin', 'patients:write'),
	(gen_random_uuid(), 'admin', 'patients:delete'),
	(gen_random_uuid(), 'admin', 'appointments:read'),
	(gen_random_uuid(), 'admin', 'appointments:write'),
	(gen_random_uuid(), 'admin', 'appointments:delete'),
	(gen_random_uuid(), 'admin', 'services:read'),
	(gen_random_uuid(), 'admin', 'services:write'),
	(gen_random_uuid(), 'admin', 'services:delete'),
	(gen_random_uuid(), 'admin', 'products:read'),
	(gen_random_uuid(), 'admin', 'products:write'),
	(gen_random_uuid(), 'admin', 'products:delete'),
	(gen_random_uuid(), 'admin', 'categories:read'),
	(gen_random_uuid(), 'admin', 'categories:write'),
	(gen_random_uuid(), 'admin', 'categories:delete'),
	(gen_random_uuid(), 'admin', 'transactions:read'),
	(gen_random_uuid(), 'admin', 'transactions:write'),
	(gen_random_uuid(), 'admin', 'transactions:delete'),
	(gen_random_uuid(), 'admin', 'commissions:read'),
	(gen_random_uuid(), 'admin', 'commissions:write'),
	(gen_random_uuid(), 'admin', 'staff:read'),
	(gen_random_uuid(), 'admin', 'staff:write'),
	(gen_random_uuid(), 'admin', 'staff:delete'),
	(gen_random_uuid(), 'admin', 'reports:read'),
	(gen_random_uuid(), 'admin', 'settings:read'),
	(gen_random_uuid(), 'admin', 'settings:write'),
	(gen_random_uuid(), 'admin', 'cms:read'),
	(gen_random_uuid(), 'admin', 'cms:write'),
	(gen_random_uuid(), 'admin', 'rbac:read'),
	(gen_random_uuid(), 'admin', 'rbac:write'),
	(gen_random_uuid(), 'admin', 'organization:read'),
	(gen_random_uuid(), 'admin', 'organization:write'),
	(gen_random_uuid(), 'admin', 'organization:delete'),
	-- doctor
	(gen_random_uuid(), 'doctor', 'patients:read'),
	(gen_random_uuid(), 'doctor', 'patients:write'),
	(gen_random_uuid(), 'doctor', 'appointments:read'),
	(gen_random_uuid(), 'doctor', 'appointments:write'),
	(gen_random_uuid(), 'doctor', 'services:read'),
	(gen_random_uuid(), 'doctor', 'products:read'),
	(gen_random_uuid(), 'doctor', 'transactions:read'),
	(gen_random_uuid(), 'doctor', 'commissions:read'),
	(gen_random_uuid(), 'doctor', 'reports:read'),
	-- therapist
	(gen_random_uuid(), 'therapist', 'patients:read'),
	(gen_random_uuid(), 'therapist', 'appointments:read'),
	(gen_random_uuid(), 'therapist', 'services:read'),
	(gen_random_uuid(), 'therapist', 'products:read'),
	(gen_random_uuid(), 'therapist', 'transactions:read'),
	(gen_random_uuid(), 'therapist', 'commissions:read'),
	-- cashier
	(gen_random_uuid(), 'cashier', 'patients:read'),
	(gen_random_uuid(), 'cashier', 'patients:write'),
	(gen_random_uuid(), 'cashier', 'appointments:read'),
	(gen_random_uuid(), 'cashier', 'appointments:write'),
	(gen_random_uuid(), 'cashier', 'transactions:read'),
	(gen_random_uuid(), 'cashier', 'transactions:write'),
	(gen_random_uuid(), 'cashier', 'services:read'),
	(gen_random_uuid(), 'cashier', 'products:read'),
	(gen_random_uuid(), 'cashier', 'categories:read'),
	(gen_random_uuid(), 'cashier', 'reports:read')
ON CONFLICT (role, permission_id) DO NOTHING;
`

const addWhatsappTables = `
CREATE TABLE IF NOT EXISTS clinic_whatsapp_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    jid VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, jid)
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_org ON whatsapp_templates(organization_id);
`

// addServiceConsumableGroups introduces the "alternative consumable" system.
//
// service_consumable_groups   — defines a consumable *requirement* for a service
//
//	(e.g. "Masker wajah, qty 1 per session")
//
// service_consumable_group_items — lists the alternative products that can fulfil
//
//	a requirement, in priority order (0 = most preferred).
//	When the transaction is paid the cashier selects one alternative; if its stock
//	is 0 the transaction is blocked.
//
// transaction_items gains selected_consumable_product_id so we know which exact
// product was consumed for a service item.
const addServiceConsumableGroups = `
CREATE TABLE IF NOT EXISTS service_consumable_groups (
    id              UUID PRIMARY KEY,
    service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    quantity_used   DECIMAL(10,3) NOT NULL DEFAULT 1,
    organization_id UUID REFERENCES organizations(id),
    created_by      UUID REFERENCES users(id),
    updated_by      UUID REFERENCES users(id),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scg_service    ON service_consumable_groups(service_id);
CREATE INDEX IF NOT EXISTS idx_scg_org        ON service_consumable_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_scg_active     ON service_consumable_groups(service_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS service_consumable_group_items (
    id              UUID PRIMARY KEY,
    group_id        UUID NOT NULL REFERENCES service_consumable_groups(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    priority        INT NOT NULL DEFAULT 0,
    organization_id UUID REFERENCES organizations(id),
    created_by      UUID REFERENCES users(id),
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_scgi_group     ON service_consumable_group_items(group_id);
CREATE INDEX IF NOT EXISTS idx_scgi_product   ON service_consumable_group_items(product_id);
CREATE INDEX IF NOT EXISTS idx_scgi_active    ON service_consumable_group_items(group_id) WHERE deleted_at IS NULL;

-- Track which specific consumable product was used for a service item
ALTER TABLE transaction_items
    ADD COLUMN IF NOT EXISTS selected_consumable_product_id UUID REFERENCES products(id);
`

const migrateCmsPagesTenantUnique = `
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'cms_pages'::regclass
          AND conname = 'cms_pages_page_id_key'
    ) THEN
        ALTER TABLE cms_pages DROP CONSTRAINT cms_pages_page_id_key;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'cms_pages'::regclass
          AND conname = 'cms_pages_page_id_organization_id_key'
    ) THEN
        ALTER TABLE cms_pages
            ADD CONSTRAINT cms_pages_page_id_organization_id_key
            UNIQUE (page_id, organization_id);
    END IF;
END $$;
`

const addOmnichannelTables = `
CREATE TABLE IF NOT EXISTS omni_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    platform VARCHAR(50) NOT NULL,
    device_id VARCHAR(100),
    customer_identifier VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) DEFAULT '',
    last_message_content TEXT,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, platform, customer_identifier)
);
CREATE INDEX IF NOT EXISTS idx_omni_conversations_org ON omni_conversations(organization_id);

CREATE TABLE IF NOT EXISTS omni_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES omni_conversations(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    content_type VARCHAR(50) DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    sender_user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_omni_messages_conv ON omni_messages(conversation_id);
`

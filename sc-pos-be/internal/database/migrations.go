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
		seedDefaultPermissions,
		seedRolePermissions,
		addConsumableFlag,
		addConsumableUsageLogs,
		addConsumablePermissions,
		addWhatsappTables,
		addOmnichannelTables,
	}

	for i, migration := range migrations {
		fmt.Printf("Running migration %d...\n", i+1)
		if _, err := DB.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	return nil
}

const createSchema = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Auth / identity ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
	id VARCHAR(36) PRIMARY KEY,
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
	id VARCHAR(36) PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	slug VARCHAR(100) UNIQUE NOT NULL,
	description TEXT,
	logo_url TEXT,
	is_active BOOLEAN DEFAULT true,
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
	id VARCHAR(36) PRIMARY KEY,
	org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role VARCHAR(50) NOT NULL DEFAULT 'cashier',
	is_active BOOLEAN DEFAULT true,
	joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
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
	id VARCHAR(36) PRIMARY KEY,
	role VARCHAR(50) NOT NULL,
	permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
	UNIQUE(role, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
	id VARCHAR(36) PRIMARY KEY,
	user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
	granted_by VARCHAR(36) REFERENCES users(id),
	granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(user_id, org_id, permission_id)
);

-- ── Service catalog ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_categories (
	id VARCHAR(36) PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	description TEXT,
	is_active BOOLEAN DEFAULT true,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
	id VARCHAR(36) PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	category_id VARCHAR(36) REFERENCES service_categories(id),
	description TEXT,
	duration_minutes INTEGER DEFAULT 30,
	base_price DECIMAL(10, 2) NOT NULL,
	doctor_commission_type VARCHAR(20),
	doctor_commission_value DECIMAL(10, 2),
	therapist_commission_type VARCHAR(20),
	therapist_commission_value DECIMAL(10, 2),
	requires_doctor BOOLEAN DEFAULT false,
	is_active BOOLEAN DEFAULT true,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Product catalog ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
	id VARCHAR(36) PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	is_active BOOLEAN DEFAULT true,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
	id VARCHAR(36) PRIMARY KEY,
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
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Staff and patients ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
	id VARCHAR(36) PRIMARY KEY,
	user_id VARCHAR(36) UNIQUE REFERENCES users(id),
	full_name VARCHAR(255) NOT NULL,
	role VARCHAR(50) NOT NULL,
	phone VARCHAR(20),
	email VARCHAR(255),
	specialization VARCHAR(255),
	is_active BOOLEAN DEFAULT true,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
	id VARCHAR(36) PRIMARY KEY,
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
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Appointments and transactions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
	id VARCHAR(36) PRIMARY KEY,
	patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
	service_id VARCHAR(36) NOT NULL REFERENCES services(id),
	doctor_id VARCHAR(36) REFERENCES staff(id),
	therapist_id VARCHAR(36) REFERENCES staff(id),
	scheduled_at TIMESTAMP NOT NULL,
	duration_minutes INTEGER,
	status VARCHAR(50) DEFAULT 'scheduled',
	notes TEXT,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
	id VARCHAR(36) PRIMARY KEY,
	transaction_code VARCHAR(50) UNIQUE NOT NULL,
	appointment_id VARCHAR(36) REFERENCES appointments(id),
	patient_id VARCHAR(36) REFERENCES patients(id),
	subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
	discount_amount DECIMAL(10, 2),
	discount_type VARCHAR(50),
	total_amount DECIMAL(10, 2) NOT NULL,
	tax_amount DECIMAL(10, 2) DEFAULT 0,
	payment_method VARCHAR(50),
	payment_status VARCHAR(50) DEFAULT 'pending',
	notes TEXT,
	paid_at TIMESTAMP,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_items (
	id VARCHAR(36) PRIMARY KEY,
	transaction_id VARCHAR(36) NOT NULL REFERENCES transactions(id),
	item_type VARCHAR(50) NOT NULL DEFAULT 'service',
	service_id VARCHAR(36) REFERENCES services(id),
	product_id VARCHAR(36) REFERENCES products(id),
	quantity INTEGER DEFAULT 1,
	unit_price DECIMAL(10, 2) NOT NULL,
	discount_amount DECIMAL(10, 2),
	discount_type VARCHAR(50),
	total_price DECIMAL(10, 2) NOT NULL,
	doctor_id VARCHAR(36) REFERENCES staff(id),
	therapist_id VARCHAR(36) REFERENCES staff(id),
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS commissions (
	id VARCHAR(36) PRIMARY KEY,
	staff_id VARCHAR(36) NOT NULL REFERENCES staff(id),
	staff_role VARCHAR(50) NOT NULL,
	transaction_id VARCHAR(36) NOT NULL REFERENCES transactions(id),
	transaction_item_id VARCHAR(36) NOT NULL REFERENCES transaction_items(id),
	base_amount DECIMAL(10, 2) NOT NULL,
	commission_type VARCHAR(20) NOT NULL,
	commission_value DECIMAL(10, 2) NOT NULL,
	commission_amount DECIMAL(10, 2) NOT NULL,
	status VARCHAR(50) DEFAULT 'pending',
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Settings and CMS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_settings (
	id VARCHAR(36) PRIMARY KEY,
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
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(organization_id)
);

CREATE TABLE IF NOT EXISTS cms_pages (
	id VARCHAR(36) PRIMARY KEY,
	page_id VARCHAR(100) NOT NULL,
	data JSONB NOT NULL DEFAULT '{}'::jsonb,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(page_id)
);

-- ── Inventory and service consumables ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_movements (
	id VARCHAR(36) PRIMARY KEY,
	product_id VARCHAR(36) NOT NULL REFERENCES products(id),
	movement_type VARCHAR(20) NOT NULL,
	quantity INTEGER NOT NULL,
	reason VARCHAR(255),
	reference_id VARCHAR(36),
	reference_type VARCHAR(50),
	notes TEXT,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_consumables (
	id VARCHAR(36) PRIMARY KEY,
	service_id VARCHAR(36) NOT NULL REFERENCES services(id),
	product_id VARCHAR(36) NOT NULL REFERENCES products(id),
	quantity_used DECIMAL(10, 3) NOT NULL DEFAULT 1,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
	updated_by VARCHAR(36) REFERENCES users(id),
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
	id VARCHAR(36) PRIMARY KEY,
	product_id VARCHAR(36) NOT NULL REFERENCES products(id),
	quantity DECIMAL(10,3) NOT NULL,
	usage_purpose VARCHAR(100) NOT NULL,
	reference_id VARCHAR(36),
	reference_type VARCHAR(50),
	patient_name VARCHAR(255),
	service_name VARCHAR(255),
	notes TEXT,
	organization_id VARCHAR(36) REFERENCES organizations(id),
	created_by VARCHAR(36) REFERENCES users(id),
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
	(gen_random_uuid()::varchar, 'admin',     'consumables:read'),
	(gen_random_uuid()::varchar, 'admin',     'consumables:write'),
	(gen_random_uuid()::varchar, 'doctor',    'consumables:read'),
	(gen_random_uuid()::varchar, 'doctor',    'consumables:write'),
	(gen_random_uuid()::varchar, 'therapist', 'consumables:read'),
	(gen_random_uuid()::varchar, 'therapist', 'consumables:write'),
	(gen_random_uuid()::varchar, 'cashier',   'consumables:read')
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
	(gen_random_uuid()::varchar, 'admin', 'patients:read'),
	(gen_random_uuid()::varchar, 'admin', 'patients:write'),
	(gen_random_uuid()::varchar, 'admin', 'patients:delete'),
	(gen_random_uuid()::varchar, 'admin', 'appointments:read'),
	(gen_random_uuid()::varchar, 'admin', 'appointments:write'),
	(gen_random_uuid()::varchar, 'admin', 'appointments:delete'),
	(gen_random_uuid()::varchar, 'admin', 'services:read'),
	(gen_random_uuid()::varchar, 'admin', 'services:write'),
	(gen_random_uuid()::varchar, 'admin', 'services:delete'),
	(gen_random_uuid()::varchar, 'admin', 'products:read'),
	(gen_random_uuid()::varchar, 'admin', 'products:write'),
	(gen_random_uuid()::varchar, 'admin', 'products:delete'),
	(gen_random_uuid()::varchar, 'admin', 'categories:read'),
	(gen_random_uuid()::varchar, 'admin', 'categories:write'),
	(gen_random_uuid()::varchar, 'admin', 'categories:delete'),
	(gen_random_uuid()::varchar, 'admin', 'transactions:read'),
	(gen_random_uuid()::varchar, 'admin', 'transactions:write'),
	(gen_random_uuid()::varchar, 'admin', 'transactions:delete'),
	(gen_random_uuid()::varchar, 'admin', 'commissions:read'),
	(gen_random_uuid()::varchar, 'admin', 'commissions:write'),
	(gen_random_uuid()::varchar, 'admin', 'staff:read'),
	(gen_random_uuid()::varchar, 'admin', 'staff:write'),
	(gen_random_uuid()::varchar, 'admin', 'staff:delete'),
	(gen_random_uuid()::varchar, 'admin', 'reports:read'),
	(gen_random_uuid()::varchar, 'admin', 'settings:read'),
	(gen_random_uuid()::varchar, 'admin', 'settings:write'),
	(gen_random_uuid()::varchar, 'admin', 'cms:read'),
	(gen_random_uuid()::varchar, 'admin', 'cms:write'),
	(gen_random_uuid()::varchar, 'admin', 'rbac:read'),
	(gen_random_uuid()::varchar, 'admin', 'rbac:write'),
	(gen_random_uuid()::varchar, 'admin', 'organization:read'),
	(gen_random_uuid()::varchar, 'admin', 'organization:write'),
	(gen_random_uuid()::varchar, 'admin', 'organization:delete'),
	-- doctor
	(gen_random_uuid()::varchar, 'doctor', 'patients:read'),
	(gen_random_uuid()::varchar, 'doctor', 'patients:write'),
	(gen_random_uuid()::varchar, 'doctor', 'appointments:read'),
	(gen_random_uuid()::varchar, 'doctor', 'appointments:write'),
	(gen_random_uuid()::varchar, 'doctor', 'services:read'),
	(gen_random_uuid()::varchar, 'doctor', 'products:read'),
	(gen_random_uuid()::varchar, 'doctor', 'transactions:read'),
	(gen_random_uuid()::varchar, 'doctor', 'commissions:read'),
	(gen_random_uuid()::varchar, 'doctor', 'reports:read'),
	-- therapist
	(gen_random_uuid()::varchar, 'therapist', 'patients:read'),
	(gen_random_uuid()::varchar, 'therapist', 'appointments:read'),
	(gen_random_uuid()::varchar, 'therapist', 'services:read'),
	(gen_random_uuid()::varchar, 'therapist', 'products:read'),
	(gen_random_uuid()::varchar, 'therapist', 'transactions:read'),
	(gen_random_uuid()::varchar, 'therapist', 'commissions:read'),
	-- cashier
	(gen_random_uuid()::varchar, 'cashier', 'patients:read'),
	(gen_random_uuid()::varchar, 'cashier', 'patients:write'),
	(gen_random_uuid()::varchar, 'cashier', 'appointments:read'),
	(gen_random_uuid()::varchar, 'cashier', 'appointments:write'),
	(gen_random_uuid()::varchar, 'cashier', 'transactions:read'),
	(gen_random_uuid()::varchar, 'cashier', 'transactions:write'),
	(gen_random_uuid()::varchar, 'cashier', 'services:read'),
	(gen_random_uuid()::varchar, 'cashier', 'products:read'),
	(gen_random_uuid()::varchar, 'cashier', 'categories:read'),
	(gen_random_uuid()::varchar, 'cashier', 'reports:read')
ON CONFLICT (role, permission_id) DO NOTHING;
`

const addWhatsappTables = `
CREATE TABLE IF NOT EXISTS clinic_whatsapp_devices (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    jid VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, jid)
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_org ON whatsapp_templates(organization_id);
`

const addOmnichannelTables = `
CREATE TABLE IF NOT EXISTS omni_conversations (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
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
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES omni_conversations(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    content_type VARCHAR(50) DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    sender_user_id VARCHAR(36) REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_omni_messages_conv ON omni_messages(conversation_id);
`

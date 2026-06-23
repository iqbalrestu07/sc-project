package database

import (
	"fmt"
)

func RunMigrations() error {
	migrations := []string{
		createUsersTable,
		createPatientsTable,
		createServiceCategoriesTable,
		createServicesTable,
		createProductsTable,
		createStaffTable,
		createAppointmentsTable,
		createTransactionsTable,
		createTransactionItemsTable,
		createCommissionsTable,
		createClinicSettingsTable,
		createCMSPagesTable,
		alterExistingTables,
		createStockMovementsTable,
		createServiceConsumablesTable,
		alterPatientsAddReminderOptIn,
		createProductCategoriesTable,
		// SaaS multi-org + RBAC
		alterUsersAddProfile,
		createOrganizationsTable,
		createOrganizationMembersTable,
		createPermissionsTable,
		createRolePermissionsTable,
		createUserPermissionsTable,
		seedDefaultPermissions,
		seedRolePermissions,
		alterTablesAddOrgID,
	}

	for i, migration := range migrations {
		fmt.Printf("Running migration %d...\n", i+1)
		if _, err := DB.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	return nil
}

const (
	createUsersTable = `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(36) PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	createPatientsTable = `
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
		created_by VARCHAR(36),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	createServiceCategoriesTable = `
	CREATE TABLE IF NOT EXISTS service_categories (
		id VARCHAR(36) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		description TEXT,
		is_active BOOLEAN DEFAULT true,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	createServicesTable = `
	CREATE TABLE IF NOT EXISTS services (
		id VARCHAR(36) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		category_id VARCHAR(36),
		description TEXT,
		duration_minutes INTEGER DEFAULT 30,
		base_price DECIMAL(10, 2) NOT NULL,
		doctor_commission_type VARCHAR(20),
		doctor_commission_value DECIMAL(10, 2),
		therapist_commission_type VARCHAR(20),
		therapist_commission_value DECIMAL(10, 2),
		requires_doctor BOOLEAN DEFAULT false,
		is_active BOOLEAN DEFAULT true,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (category_id) REFERENCES service_categories(id)
	);`

	createProductsTable = `
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
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	createStaffTable = `
	CREATE TABLE IF NOT EXISTS staff (
		id VARCHAR(36) PRIMARY KEY,
		user_id VARCHAR(36) UNIQUE,
		full_name VARCHAR(255) NOT NULL,
		role VARCHAR(50) NOT NULL,
		phone VARCHAR(20),
		email VARCHAR(255),
		specialization VARCHAR(255),
		is_active BOOLEAN DEFAULT true,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);`

	createAppointmentsTable = `
	CREATE TABLE IF NOT EXISTS appointments (
		id VARCHAR(36) PRIMARY KEY,
		patient_id VARCHAR(36) NOT NULL,
		service_id VARCHAR(36) NOT NULL,
		doctor_id VARCHAR(36),
		therapist_id VARCHAR(36),
		scheduled_at TIMESTAMP NOT NULL,
		duration_minutes INTEGER,
		status VARCHAR(50) DEFAULT 'scheduled',
		notes TEXT,
		created_by VARCHAR(36),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (patient_id) REFERENCES patients(id),
		FOREIGN KEY (service_id) REFERENCES services(id),
		FOREIGN KEY (doctor_id) REFERENCES staff(id),
		FOREIGN KEY (therapist_id) REFERENCES staff(id)
	);`

	createTransactionsTable = `
	CREATE TABLE IF NOT EXISTS transactions (
		id VARCHAR(36) PRIMARY KEY,
		transaction_code VARCHAR(50) UNIQUE NOT NULL,
		appointment_id VARCHAR(36),
		patient_id VARCHAR(36),
		subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
		discount_amount DECIMAL(10, 2),
		discount_type VARCHAR(50),
		total_amount DECIMAL(10, 2) NOT NULL,
		tax_amount DECIMAL(10, 2) DEFAULT 0,
		payment_method VARCHAR(50),
		payment_status VARCHAR(50) DEFAULT 'pending',
		notes TEXT,
		created_by VARCHAR(36),
		paid_at TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (appointment_id) REFERENCES appointments(id),
		FOREIGN KEY (patient_id) REFERENCES patients(id)
	);`

	createTransactionItemsTable = `
	CREATE TABLE IF NOT EXISTS transaction_items (
		id VARCHAR(36) PRIMARY KEY,
		transaction_id VARCHAR(36) NOT NULL,
		item_type VARCHAR(50) NOT NULL DEFAULT 'service',
		service_id VARCHAR(36),
		product_id VARCHAR(36),
		quantity INTEGER DEFAULT 1,
		unit_price DECIMAL(10, 2) NOT NULL,
		discount_amount DECIMAL(10, 2),
		total_price DECIMAL(10, 2) NOT NULL,
		doctor_id VARCHAR(36),
		therapist_id VARCHAR(36),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (transaction_id) REFERENCES transactions(id),
		FOREIGN KEY (service_id) REFERENCES services(id),
		FOREIGN KEY (product_id) REFERENCES products(id),
		FOREIGN KEY (doctor_id) REFERENCES staff(id),
		FOREIGN KEY (therapist_id) REFERENCES staff(id)
	);`

	createCommissionsTable = `
	CREATE TABLE IF NOT EXISTS commissions (
		id VARCHAR(36) PRIMARY KEY,
		staff_id VARCHAR(36) NOT NULL,
		staff_role VARCHAR(50) NOT NULL,
		transaction_id VARCHAR(36) NOT NULL,
		transaction_item_id VARCHAR(36) NOT NULL,
		base_amount DECIMAL(10, 2) NOT NULL,
		commission_type VARCHAR(20) NOT NULL,
		commission_value DECIMAL(10, 2) NOT NULL,
		commission_amount DECIMAL(10, 2) NOT NULL,
		status VARCHAR(50) DEFAULT 'pending',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (staff_id) REFERENCES staff(id),
		FOREIGN KEY (transaction_id) REFERENCES transactions(id),
		FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
	);`

	createClinicSettingsTable = `
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
		invoice_header_title VARCHAR(255),
		invoice_header_description TEXT,
		invoice_footer_text TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	createCMSPagesTable = `
	CREATE TABLE IF NOT EXISTS cms_pages (
		id VARCHAR(36) PRIMARY KEY,
		page_id VARCHAR(100) UNIQUE NOT NULL,
		data JSONB NOT NULL DEFAULT '{}'::jsonb,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	alterExistingTables = `
	ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS description TEXT;
	ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
	ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
	ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);
	ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2);
	ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
	ALTER TABLE staff ALTER COLUMN user_id DROP NOT NULL;
	ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
	ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
	ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);
	ALTER TABLE transactions ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(36);
	ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;
	ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2);
	ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_type VARCHAR(50);
	ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
	ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);
	ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) NOT NULL DEFAULT 'service';
	ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2);
	ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10, 2);
	UPDATE transaction_items SET total_price = COALESCE(total_price, unit_price * quantity) WHERE total_price IS NULL;
	ALTER TABLE transaction_items ALTER COLUMN total_price SET NOT NULL;
	ALTER TABLE commissions ADD COLUMN IF NOT EXISTS staff_role VARCHAR(50) NOT NULL DEFAULT 'staff';
	ALTER TABLE commissions ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
	ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) NOT NULL DEFAULT 'fixed';
	ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10, 2) NOT NULL DEFAULT 0;
	`

	createStockMovementsTable = `
	CREATE TABLE IF NOT EXISTS stock_movements (
		id VARCHAR(36) PRIMARY KEY,
		product_id VARCHAR(36) NOT NULL,
		movement_type VARCHAR(20) NOT NULL,
		quantity INTEGER NOT NULL,
		reason VARCHAR(255),
		reference_id VARCHAR(36),
		reference_type VARCHAR(50),
		notes TEXT,
		created_by VARCHAR(36),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (product_id) REFERENCES products(id)
	);`

	createServiceConsumablesTable = `
	CREATE TABLE IF NOT EXISTS service_consumables (
		id VARCHAR(36) PRIMARY KEY,
		service_id VARCHAR(36) NOT NULL,
		product_id VARCHAR(36) NOT NULL,
		quantity_used DECIMAL(10, 3) NOT NULL DEFAULT 1,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (service_id) REFERENCES services(id),
		FOREIGN KEY (product_id) REFERENCES products(id),
		UNIQUE (service_id, product_id)
	);`

	alterPatientsAddReminderOptIn = `
	ALTER TABLE patients ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT true;
	`

	createProductCategoriesTable = `
	CREATE TABLE IF NOT EXISTS product_categories (
		id VARCHAR(36) PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		description TEXT,
		is_active BOOLEAN DEFAULT true,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	// ── SaaS Multi-Org + RBAC migrations ────────────────────────────────────

	alterUsersAddProfile = `
	ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
	ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
	`

	createOrganizationsTable = `
	CREATE TABLE IF NOT EXISTS organizations (
		id VARCHAR(36) PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		slug VARCHAR(100) UNIQUE NOT NULL,
		description TEXT,
		logo_url TEXT,
		is_active BOOLEAN DEFAULT true,
		created_by VARCHAR(36) REFERENCES users(id),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	createOrganizationMembersTable = `
	CREATE TABLE IF NOT EXISTS organization_members (
		id VARCHAR(36) PRIMARY KEY,
		org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
		user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		role VARCHAR(50) NOT NULL DEFAULT 'cashier',
		is_active BOOLEAN DEFAULT true,
		joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(org_id, user_id)
	);`

	createPermissionsTable = `
	CREATE TABLE IF NOT EXISTS permissions (
		id VARCHAR(100) PRIMARY KEY,
		resource VARCHAR(50) NOT NULL,
		action VARCHAR(50) NOT NULL,
		description TEXT,
		UNIQUE(resource, action)
	);`

	createRolePermissionsTable = `
	CREATE TABLE IF NOT EXISTS role_permissions (
		id VARCHAR(36) PRIMARY KEY,
		role VARCHAR(50) NOT NULL,
		permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
		UNIQUE(role, permission_id)
	);`

	createUserPermissionsTable = `
	CREATE TABLE IF NOT EXISTS user_permissions (
		id VARCHAR(36) PRIMARY KEY,
		user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
		permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
		granted_by VARCHAR(36) REFERENCES users(id),
		granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, org_id, permission_id)
	);`

	seedDefaultPermissions = `
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

	seedRolePermissions = `
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

	alterTablesAddOrgID = `
	ALTER TABLE patients           ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE services           ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE products           ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE staff              ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE appointments       ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE transactions       ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE transaction_items  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE commissions        ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE clinic_settings    ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE cms_pages          ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE stock_movements    ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	ALTER TABLE service_consumables ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES organizations(id);
	`
)

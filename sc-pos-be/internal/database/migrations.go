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
)

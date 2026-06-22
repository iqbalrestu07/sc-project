# SC-POS Backend

Professional Golang backend service untuk SC-POS clinic management system.

## Features

- ✅ Clean Architecture (Handler → Service → Repository → Database)
- ✅ JWT Authentication dengan Token Refresh
- ✅ Role-based Access Control (RBAC)
- ✅ PostgreSQL Database
- ✅ RESTful API dengan Gin framework
- ✅ Comprehensive Error Handling
- ✅ CORS Support
- ✅ Database Migrations

## Project Structure

```
sc-pos-be/
├── config/              # Configuration management
├── internal/
│   ├── auth/           # Authentication & JWT
│   ├── database/       # Database connection & migrations
│   ├── handler/        # HTTP handlers
│   ├── middleware/     # Auth & CORS middleware
│   ├── models/         # Domain models
│   ├── repository/     # Data access layer
│   ├── routes/         # Route definitions
│   └── utils/          # Utility functions
├── main.go             # Application entry point
├── go.mod             # Go module definition
├── Makefile           # Build & run commands
├── .env.example       # Environment variables template
└── README.md          # This file
```

## Prerequisites

- Go 1.21+
- PostgreSQL 12+
- GNU Make (optional)

## Setup

### 1. Clone Repository & Setup Environment

```bash
cd sc-pos-be
cp .env.example .env
```

### 2. Install Dependencies

```bash
make install-deps
# or
go mod download && go mod tidy
```

### 3. Configure Database

Update `.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sc_pos
```

### 4. Run Application

```bash
make dev
# or
go run main.go
```

The server will start on `http://localhost:8080`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `GET /api/patients/search` - Search patients

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:id` - Get service by ID
- `POST /api/services` - Create service (admin)
- `PUT /api/services/:id` - Update service (admin)
- `DELETE /api/services/:id` - Delete service (admin)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Staff
- `GET /api/staff` - Get all staff
- `GET /api/staff/:id` - Get staff by ID
- `POST /api/staff` - Create staff (admin)
- `PUT /api/staff/:id` - Update staff (admin)
- `DELETE /api/staff/:id` - Delete staff (admin)

### Appointments
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment
- `GET /api/appointments/calendar` - Get calendar view

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Commissions
- `GET /api/commissions` - Get all commissions (admin)
- `GET /api/commissions/staff/:staffId` - Get staff commissions

### Settings
- `GET /api/settings/clinic` - Get clinic settings
- `PUT /api/settings/clinic` - Update clinic settings (admin)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard stats
- `GET /api/dashboard/revenue` - Get revenue data
- `GET /api/dashboard/top-services` - Get top services
- `GET /api/dashboard/top-products` - Get top products
- `GET /api/dashboard/appointments-today` - Get today's appointments

## Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## Development

### Build

```bash
make build
```

### Run Tests

```bash
make test
```

### Clean Build

```bash
make clean
```

## Database

Database migrations run automatically on startup. To manually create tables:

```sql
-- Migrations will run automatically
```

## Error Handling

Standard error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

Success responses:

```json
{
  "success": true,
  "data": { ... }
}
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

MIT License

## Support

For issues and questions, please create an issue in the repository.

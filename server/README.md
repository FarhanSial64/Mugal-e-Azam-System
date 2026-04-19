# Mugal e Azam - Server

Backend API for the Restaurant Workforce & Payroll Management System.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from example:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Start MongoDB locally or update `MONGODB_URI`

5. Seed the database (optional):
```bash
npm run seed
```

6. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Employees (Manager Only)
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee

### Shifts
- `GET /api/shifts` - List all shifts (Manager)
- `GET /api/shifts/my` - Get my shifts (Employee)
- `GET /api/shifts/week` - Get weekly shifts
- `POST /api/shifts` - Create shift (Manager)
- `POST /api/shifts/:id/checkin` - Check in
- `POST /api/shifts/:id/checkout` - Check out

### Payroll
- `GET /api/payroll` - List payrolls (Manager)
- `GET /api/payroll/my` - Get my payroll (Employee)
- `POST /api/payroll/calculate` - Calculate payroll
- `PUT /api/payroll/:id/pay` - Mark as paid

### Dashboard
- `GET /api/dashboard/manager` - Manager dashboard
- `GET /api/dashboard/employee` - Employee dashboard

## Default Login Credentials

**Manager:**
- Email: admin@mugaleazam.com
- Password: admin123

**Employee:**
- Email: ahmed@mugaleazam.com
- Password: employee123

# Restaurant Workforce & Payroll Management System

A full-stack MERN (MongoDB, Express.js, React.js, Node.js) application for managing restaurant workforce, shift scheduling, attendance tracking, and payroll calculations.

## 🚀 Features

### Manager Dashboard
- **Employee Management**: Full CRUD operations for employees (add, view, edit, deactivate, reactivate)
- **Shift Scheduling**: Weekly calendar view, assign shifts with time and type selection
- **Attendance Tracking**: Monitor check-ins/check-outs, track worked hours
- **Payroll Management**: Calculate weekly salaries, mark payments, bulk pay operations
- **Dashboard Overview**: Real-time statistics, today's shifts, pending payrolls

### Employee Portal
- **Personal Dashboard**: View upcoming shifts, pending payments, work summary
- **Shift Calendar**: Weekly view of assigned shifts
- **Check In/Out**: Clock in and out for shifts directly from the dashboard
- **Payroll History**: View detailed payment history with breakdowns
- **Profile Management**: Update personal info, change password, notification preferences

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs
- **Validation**: Zod schema validation
- **Email**: Nodemailer with SMTP
- **SMS**: Twilio (optional)

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **UI Components**: Headless UI, Heroicons
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **Date Utils**: date-fns

## 📁 Project Structure

```
Mugal e Azam System/
├── server/                    # Backend application
│   ├── config/               # Configuration files
│   │   ├── db.js            # MongoDB connection
│   │   └── env.js           # Environment variables
│   ├── controllers/          # Route controllers
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── shiftController.js
│   │   ├── payrollController.js
│   │   ├── notificationController.js
│   │   └── dashboardController.js
│   ├── middlewares/          # Express middlewares
│   │   ├── auth.js          # JWT & role verification
│   │   ├── errorHandler.js  # Global error handling
│   │   └── validate.js      # Zod validation
│   ├── models/              # Mongoose schemas
│   │   ├── User.js
│   │   ├── Shift.js
│   │   ├── Payroll.js
│   │   └── Notification.js
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── shiftRoutes.js
│   │   ├── payrollRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/               # Utility functions
│   │   ├── jwt.js
│   │   ├── email.js
│   │   ├── sms.js
│   │   ├── notifications.js
│   │   ├── validators.js
│   │   ├── helpers.js
│   │   └── seeder.js
│   ├── server.js            # Entry point
│   └── package.json
│
├── client/                   # Frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── common/      # Button, Input, Card, Modal, etc.
│   │   │   └── layout/      # DashboardLayout
│   │   ├── context/         # React Context
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── auth/        # LoginPage
│   │   │   ├── manager/     # Manager dashboard pages
│   │   │   └── employee/    # Employee dashboard pages
│   │   ├── services/        # API services
│   │   │   └── api.js
│   │   ├── App.jsx          # Main app with routes
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18+ installed
- MongoDB (local or Atlas cluster)
- Git

### 1. Clone & Install Dependencies

```bash
# Navigate to the project folder
cd "Mugal e Azam System"

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `server` directory:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/restaurant-workforce

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# SMTP (Optional - for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Restaurant System <no-reply@restaurant.com>

# Twilio SMS (Optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

### 3. Seed the Database (Optional)

To populate the database with sample data:

```bash
cd server
npm run seed
```

This creates:
- 1 Manager account: `manager@restaurant.com` / `manager123`
- 10 Employee accounts
- Sample shifts for the current week

### 4. Run the Application

**Development Mode (with hot reload):**

```bash
# Terminal 1 - Start backend server
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

**Production Mode:**

```bash
# Build frontend
cd client
npm run build

# Start server (serves frontend build)
cd server
npm start
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api

## 🔐 Default Credentials

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Manager  | manager@restaurant.com   | manager123  |
| Employee | employee1@restaurant.com | password123 |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (manager only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Employees (Manager only)
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee
- `PUT /api/employees/:id/reactivate` - Reactivate employee
- `PUT /api/employees/:id/reset-password` - Reset employee password

### Shifts
- `GET /api/shifts` - Get all shifts
- `GET /api/shifts/weekly` - Get weekly shifts
- `GET /api/shifts/my-shifts` - Get logged-in user's shifts
- `POST /api/shifts` - Create shift (manager)
- `POST /api/shifts/bulk` - Create multiple shifts (manager)
- `PUT /api/shifts/:id` - Update shift (manager)
- `PUT /api/shifts/:id/cancel` - Cancel shift (manager)
- `PUT /api/shifts/:id/check-in` - Check in (employee)
- `PUT /api/shifts/:id/check-out` - Check out (employee)

### Payroll
- `GET /api/payroll` - Get all payrolls (manager)
- `GET /api/payroll/my-payrolls` - Get logged-in user's payrolls
- `POST /api/payroll/calculate` - Calculate payroll (manager)
- `PUT /api/payroll/:id/pay` - Mark as paid (manager)
- `POST /api/payroll/bulk-pay` - Bulk mark as paid (manager)
- `GET /api/payroll/summary` - Get payroll summary (manager)

### Dashboard
- `GET /api/dashboard/manager` - Manager dashboard stats
- `GET /api/dashboard/employee` - Employee dashboard stats

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

## 🎨 UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark-Friendly Color Scheme**: Primary blue (#3b82f6) with clean whites
- **Animations**: Subtle fade-in animations on page loads
- **Toast Notifications**: Success, error, and info messages
- **Loading States**: Spinners and skeleton loaders
- **Empty States**: Helpful messages when data is empty

## 📦 Key Packages

### Server
```json
{
  "express": "^4.18.x",
  "mongoose": "^8.x",
  "jsonwebtoken": "^9.x",
  "bcryptjs": "^2.4.x",
  "zod": "^3.x",
  "cors": "^2.8.x",
  "nodemailer": "^6.x",
  "twilio": "^4.x"
}
```

### Client
```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "axios": "^1.x",
  "@headlessui/react": "^2.x",
  "@heroicons/react": "^2.x",
  "tailwindcss": "^3.x",
  "date-fns": "^3.x",
  "recharts": "^2.x",
  "react-hot-toast": "^2.x"
}
```

## 🔒 Security Features

- JWT-based authentication with HTTP-only considerations
- Password hashing with bcryptjs
- Role-based access control (RBAC)
- Input validation with Zod
- Protected API routes
- CORS configuration
- Environment variable protection

## 📋 Business Logic

### Shift Types
- Morning: 5am - 12pm
- Afternoon: 12pm - 5pm
- Evening: 5pm - 9pm
- Night: 9pm - 5am

### Payroll Calculation
- Based on completed shift hours
- Regular hours: Standard rate
- Overtime: 1.5x rate (over 40 hours/week)
- Week runs Monday to Sunday

### Attendance
- Employees check in/out via dashboard
- Hours calculated from actual check-in/out times
- Missed shifts tracked automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is created for educational purposes at the University of Northampton.

---

**Developed with ❤️ for Mughal-e-Azam Restaurant**

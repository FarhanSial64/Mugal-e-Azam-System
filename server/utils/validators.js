import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['manager', 'employee']).optional(),
  jobRole: z.enum(['waiter', 'food-picker', 'bar', 'cleaner', 'chef', 'dish-washer']),
  hourlyWage: z.number().min(0, 'Hourly wage cannot be negative'),
});

// Employee self-signup schema
export const employeeSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  jobRole: z.enum(['waiter', 'food-picker', 'bar', 'cleaner', 'chef', 'dish-washer']),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Employee validation schemas
export const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  jobRole: z.enum(['waiter', 'food-picker', 'bar', 'cleaner', 'chef', 'dish-washer']),
  hourlyWage: z.number().min(0, 'Hourly wage cannot be negative'),
  address: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: z.string().min(10).optional(),
  jobRole: z.enum(['waiter', 'food-picker', 'bar', 'cleaner', 'chef', 'dish-washer']).optional(),
  hourlyWage: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  address: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
});

// Shift validation schemas
export const createShiftSchema = z.object({
  employee: z.string().min(1, 'Employee ID is required'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  shiftType: z.enum(['morning', 'afternoon', 'night', 'breakfast', 'fullday', 'midshift', 'lunch', 'evening', 'dinner']).optional(),
  notes: z.string().max(500).optional(),
  breakDuration: z.number().min(0).optional(),
  skipAvailabilityCheck: z.boolean().optional(),
});

export const updateShiftSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }).optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional(),
  shiftType: z.enum(['morning', 'afternoon', 'night', 'breakfast', 'fullday', 'midshift', 'lunch', 'evening', 'dinner']).optional(),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'missed', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
  breakDuration: z.number().min(0).optional(),
});

const availabilityDaySchema = z.object({
  isAvailable: z.boolean().optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)').optional(),
  notes: z.string().max(200).optional(),
});

export const setAvailabilitySchema = z.object({
  weekStart: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  monday: availabilityDaySchema.optional(),
  tuesday: availabilityDaySchema.optional(),
  wednesday: availabilityDaySchema.optional(),
  thursday: availabilityDaySchema.optional(),
  friday: availabilityDaySchema.optional(),
  saturday: availabilityDaySchema.optional(),
  sunday: availabilityDaySchema.optional(),
});

// Attendance validation
export const checkInSchema = z.object({
  shiftId: z.string().min(1, 'Shift ID is required'),
});

export const checkOutSchema = z.object({
  shiftId: z.string().min(1, 'Shift ID is required'),
  breakDuration: z.number().min(0).optional(),
});

// Payroll validation schemas
export const calculatePayrollSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required').optional(),
  weekStartDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
});

export const markPayrollPaidSchema = z.object({
  paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'other']),
  paymentReference: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const updatePayrollSchema = z.object({
  deductions: z.number().min(0).optional(),
  bonuses: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['pending', 'approved', 'paid', 'disputed']).optional(),
});

// Password change validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export default {
  loginSchema,
  registerSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  createShiftSchema,
  updateShiftSchema,
  setAvailabilitySchema,
  checkInSchema,
  checkOutSchema,
  calculatePayrollSchema,
  markPayrollPaidSchema,
  updatePayrollSchema,
  changePasswordSchema,
};

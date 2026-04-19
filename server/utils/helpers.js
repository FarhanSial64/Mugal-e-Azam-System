/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to catch async errors
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Helper to format week dates
 */
export const getWeekBoundaries = (date) => {
  const inputDate = new Date(date);
  const dayOfWeek = inputDate.getDay();

  // Get Monday of the week
  const monday = new Date(inputDate);
  monday.setDate(inputDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  // Get Sunday of the week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd: sunday };
};

/**
 * Format date to readable string
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return new Date(date).toLocaleDateString('en-GB', { ...defaultOptions, ...options });
};

/**
 * Generate random password
 */
export const generatePassword = (length = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Calculate current shift status based on time
 * Returns the computed status without modifying the database
 */
export const calculateShiftStatus = (shift, now = new Date()) => {
  // If already completed or missed, don't change
  if (shift.status === 'completed' || shift.status === 'missed' || shift.status === 'cancelled') {
    return shift.status;
  }

  // Create date objects for comparison
  const shiftDate = new Date(shift.date);
  shiftDate.setHours(0, 0, 0, 0);
  
  const nowDate = new Date(now);
  nowDate.setHours(0, 0, 0, 0);

  // If shift date is in the past and not marked as completed/missed, it's missed
  if (shiftDate < nowDate && shift.status === 'scheduled') {
    return 'missed';
  }

  // Parse shift time
  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);

  // Create full datetime for shift times
  const shiftStart = new Date(shift.date);
  shiftStart.setHours(startH, startM, 0, 0);

  const shiftEnd = new Date(shift.date);
  shiftEnd.setHours(endH, endM, 0, 0);

  // Handle overnight shifts
  if (shiftEnd < shiftStart) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }

  // Current time comparison
  if (now < shiftStart) {
    return 'scheduled';
  } else if (now >= shiftStart && now < shiftEnd) {
    return 'in-progress';
  } else {
    // Shift time has passed
    return 'completed';
  }
};

/**
 * Calculate hours between two times
 */
export const calculateHours = (startTime, endTime) => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
};

/**
 * Determine shift type from start and end time
 */
export const getShiftType = (startTime, endTime = null) => {
  const [hour, minute] = startTime.split(':').map(Number);
  const timeInMinutes = hour * 60 + minute;

  // Check for specific templates based on start time
  // Full Day: 8:45 AM (525 minutes) - 7:00 PM
  if (timeInMinutes >= 525 && timeInMinutes <= 530) {
    if (endTime) {
      const [endHour] = endTime.split(':').map(Number);
      if (endHour >= 18 && endHour <= 20) return 'fullday';
    }
    return 'breakfast';
  }
  
  // Mid Shift: 11:45 AM (705 minutes) - 11:00 PM
  if (timeInMinutes >= 705 && timeInMinutes <= 720) {
    return 'midshift';
  }

  // Breakfast: starts before 12:00
  if (timeInMinutes < 12 * 60) return 'breakfast';
  // Lunch: 12:00 PM - 5:00 PM
  if (timeInMinutes < 17 * 60) return 'lunch';
  // Evening: 5:00 PM - 6:30 PM
  if (timeInMinutes < 18 * 60 + 30) return 'evening';
  // Dinner: 6:30 PM onwards
  return 'dinner';
};

export default {
  ApiError,
  asyncHandler,
  getWeekBoundaries,
  formatDate,
  generatePassword,
  calculateHours,
  getShiftType,
};

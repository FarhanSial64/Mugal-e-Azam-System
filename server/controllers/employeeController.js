import { User } from '../models/index.js';
import { ApiError, asyncHandler, generatePassword } from '../utils/helpers.js';
import { notifyAccountCreated, notifyPasswordReset } from '../utils/notifications.js';

/**
 * @desc    Get all employees
 * @route   GET /api/employees
 * @access  Private/Manager
 */
export const getEmployees = asyncHandler(async (req, res) => {
  const { isActive, jobRole, search, page = 1, limit = 20 } = req.query;

  // Build query
  const query = { role: 'employee' };

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (jobRole) {
    query.jobRole = jobRole;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [employees, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: employees.length,
    total,
    pages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: employees,
  });
});

/**
 * @desc    Get single employee
 * @route   GET /api/employees/:id
 * @access  Private/Manager
 */
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id).select('-password');

  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  res.status(200).json({
    success: true,
    data: employee,
  });
});

/**
 * @desc    Create new employee
 * @route   POST /api/employees
 * @access  Private/Manager
 */
export const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    jobRole,
    hourlyWage,
    address,
    emergencyContact,
    notificationPreferences,
  } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError('User already exists with this email', 400);
  }

  // Generate random password if not provided
  const tempPassword = password || generatePassword(8);

  // Create employee
  const employee = await User.create({
    name,
    email,
    phone,
    password: tempPassword,
    role: 'employee',
    jobRole,
    hourlyWage,
    address,
    emergencyContact,
    notificationPreferences,
  });

  // Send welcome email with credentials
  try {
    await notifyAccountCreated(employee, tempPassword);
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
  }

  res.status(201).json({
    success: true,
    data: {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      jobRole: employee.jobRole,
      hourlyWage: employee.hourlyWage,
      isActive: employee.isActive,
    },
    message: 'Employee created successfully. Login credentials sent via email.',
  });
});

/**
 * @desc    Update employee
 * @route   PUT /api/employees/:id
 * @access  Private/Manager
 */
export const updateEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    jobRole,
    hourlyWage,
    isActive,
    address,
    emergencyContact,
    notificationPreferences,
  } = req.body;

  let employee = await User.findById(req.params.id);

  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  // Prevent updating manager role
  if (employee.role === 'manager' && req.user._id.toString() !== employee._id.toString()) {
    throw new ApiError('Cannot modify another manager account', 403);
  }

  employee = await User.findByIdAndUpdate(
    req.params.id,
    {
      name,
      phone,
      jobRole,
      hourlyWage,
      isActive,
      address,
      emergencyContact,
      notificationPreferences,
    },
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: employee,
  });
});

/**
 * @desc    Delete employee (soft delete - deactivate)
 * @route   DELETE /api/employees/:id
 * @access  Private/Manager
 */
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id);

  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  if (employee.role === 'manager') {
    throw new ApiError('Cannot delete a manager account', 403);
  }

  // Soft delete - just deactivate
  employee.isActive = false;
  await employee.save();

  res.status(200).json({
    success: true,
    message: 'Employee deactivated successfully',
  });
});

/**
 * @desc    Reactivate employee
 * @route   PUT /api/employees/:id/reactivate
 * @access  Private/Manager
 */
export const reactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id);

  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  employee.isActive = true;
  await employee.save();

  res.status(200).json({
    success: true,
    message: 'Employee reactivated successfully',
    data: employee,
  });
});

/**
 * @desc    Reset employee password
 * @route   PUT /api/employees/:id/reset-password
 * @access  Private/Manager
 */
export const resetEmployeePassword = asyncHandler(async (req, res) => {
  const employee = await User.findById(req.params.id);

  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  // Generate new password
  const newPassword = generatePassword(8);
  employee.password = newPassword;
  await employee.save();

  // Send new credentials via email
  try {
    await notifyPasswordReset(employee, newPassword);
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
  }

  res.status(200).json({
    success: true,
    message: 'Password reset successfully. New credentials sent via email.',
  });
});

/**
 * @desc    Get employee statistics
 * @route   GET /api/employees/stats
 * @access  Private/Manager
 */
export const getEmployeeStats = asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    { $match: { role: 'employee' } },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        activeEmployees: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
        },
        inactiveEmployees: {
          $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] },
        },
        avgHourlyWage: { $avg: '$hourlyWage' },
      },
    },
  ]);

  const byRole = await User.aggregate([
    { $match: { role: 'employee', isActive: true } },
    {
      $group: {
        _id: '$jobRole',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...(stats[0] || {
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        avgHourlyWage: 0,
      }),
      byJobRole: byRole,
    },
  });
});

export default {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  reactivateEmployee,
  resetEmployeePassword,
  getEmployeeStats,
};

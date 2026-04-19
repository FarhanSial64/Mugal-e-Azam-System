import { Payroll, Shift, User } from '../models/index.js';
import { ApiError, asyncHandler, getWeekBoundaries } from '../utils/helpers.js';
import { notifyPayrollGenerated, notifyPaymentCompleted } from '../utils/notifications.js';

/**
 * @desc    Get all payrolls
 * @route   GET /api/payroll
 * @access  Private/Manager
 */
export const getPayrolls = asyncHandler(async (req, res) => {
  const { employee, status, startDate, endDate, page = 1, limit = 20 } = req.query;

  const query = {};

  if (employee) {
    query.employee = employee;
  }

  if (status) {
    query.status = status;
  }

  if (startDate && endDate) {
    query.weekStartDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [payrolls, total] = await Promise.all([
    Payroll.find(query)
      .populate('employee', 'name email phone jobRole')
      .populate('paidBy', 'name')
      .populate('generatedBy', 'name')
      .sort({ weekStartDate: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Payroll.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: payrolls.length,
    total,
    pages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: payrolls,
  });
});

/**
 * @desc    Get my payrolls (for employees)
 * @route   GET /api/payroll/my
 * @access  Private/Employee
 */
export const getMyPayrolls = asyncHandler(async (req, res) => {
  const { status, limit = 10 } = req.query;

  const query = { employee: req.user._id };

  if (status) {
    query.status = status;
  }

  const payrolls = await Payroll.find(query)
    .populate('paidBy', 'name')
    .sort({ weekStartDate: -1 })
    .limit(parseInt(limit));

  // Calculate totals
  const totals = payrolls.reduce(
    (acc, p) => {
      acc.totalHours += p.totalHours;
      acc.totalEarned += p.grossPay;
      acc.totalPaid += p.status === 'paid' ? p.netPay : 0;
      acc.totalPending += p.status !== 'paid' ? p.netPay : 0;
      return acc;
    },
    { totalHours: 0, totalEarned: 0, totalPaid: 0, totalPending: 0 }
  );

  res.status(200).json({
    success: true,
    count: payrolls.length,
    summary: {
      totalHours: parseFloat(totals.totalHours.toFixed(2)),
      totalEarned: parseFloat(totals.totalEarned.toFixed(2)),
      totalPaid: parseFloat(totals.totalPaid.toFixed(2)),
      totalPending: parseFloat(totals.totalPending.toFixed(2)),
    },
    data: payrolls,
  });
});

/**
 * @desc    Get single payroll
 * @route   GET /api/payroll/:id
 * @access  Private
 */
export const getPayroll = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate('employee', 'name email phone jobRole hourlyWage')
    .populate('paidBy', 'name')
    .populate('generatedBy', 'name')
    .populate('shifts');

  if (!payroll) {
    throw new ApiError('Payroll record not found', 404);
  }

  // Employees can only view their own payroll
  if (
    req.user.role === 'employee' &&
    payroll.employee._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError('Not authorized to view this payroll', 403);
  }

  res.status(200).json({
    success: true,
    data: payroll,
  });
});

/**
 * @desc    Calculate weekly payroll for employee(s)
 * @route   POST /api/payroll/calculate
 * @access  Private/Manager
 */
export const calculatePayroll = asyncHandler(async (req, res) => {
  const { employeeId, weekStartDate } = req.body;

  const { weekStart, weekEnd } = getWeekBoundaries(weekStartDate || new Date());

  // Get employees to process
  let employees;
  if (employeeId) {
    const employee = await User.findOne({
      _id: employeeId,
      role: 'employee',
      isActive: true,
    });
    if (!employee) {
      throw new ApiError('Employee not found or inactive', 404);
    }
    employees = [employee];
  } else {
    // Process all active employees
    employees = await User.find({ role: 'employee', isActive: true });
  }

  const results = {
    created: [],
    updated: [],
    skipped: [],
  };

  for (const employee of employees) {
    try {
      // Check if payroll already exists for this week
      let existingPayroll = await Payroll.findOne({
        employee: employee._id,
        weekStartDate: weekStart,
      });

      // Get completed shifts for the week
      const shifts = await Shift.find({
        employee: employee._id,
        date: { $gte: weekStart, $lte: weekEnd },
        status: 'completed',
      });

      if (shifts.length === 0 && !existingPayroll) {
        results.skipped.push({
          employee: employee.name,
          reason: 'No completed shifts this week',
        });
        continue;
      }

      // Calculate hours
      const regularHours = shifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
      const overtimeHours = shifts.reduce((sum, s) => sum + (s.overtimeHours || 0), 0);

      // Ensure we have a valid hourly rate
      const hourlyRate = employee.hourlyWage || employee.hourlyRate || 10;

      const payrollData = {
        employee: employee._id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        regularHours: parseFloat(regularHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        totalHours: parseFloat((regularHours + overtimeHours).toFixed(2)),
        hourlyRate: hourlyRate,
        shifts: shifts.map((s) => s._id),
        generatedBy: req.user._id,
      };

      if (existingPayroll) {
        // Update existing payroll if not yet paid
        if (existingPayroll.status === 'paid') {
          results.skipped.push({
            employee: employee.name,
            reason: 'Already paid for this week',
          });
          continue;
        }

        existingPayroll = await Payroll.findByIdAndUpdate(
          existingPayroll._id,
          payrollData,
          { new: true, runValidators: true }
        ).populate('employee', 'name email');

        results.updated.push(existingPayroll);
      } else {
        // Create new payroll
        const payroll = await Payroll.create(payrollData);
        const populatedPayroll = await Payroll.findById(payroll._id).populate(
          'employee',
          'name email notificationPreferences'
        );

        // Send notification
        try {
          await notifyPayrollGenerated(populatedPayroll.employee, populatedPayroll);
        } catch (e) {
          console.error('Payroll notification failed:', e.message);
        }

        results.created.push(populatedPayroll);
      }
    } catch (error) {
      results.skipped.push({
        employee: employee.name,
        reason: error.message,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `Created: ${results.created.length}, Updated: ${results.updated.length}, Skipped: ${results.skipped.length}`,
    weekRange: { start: weekStart, end: weekEnd },
    data: results,
  });
});

/**
 * @desc    Mark payroll as paid
 * @route   PUT /api/payroll/:id/pay
 * @access  Private/Manager
 */
export const markAsPaid = asyncHandler(async (req, res) => {
  const { paymentMethod, paymentReference, notes } = req.body;

  let payroll = await Payroll.findById(req.params.id).populate(
    'employee',
    'name email phone notificationPreferences'
  );

  if (!payroll) {
    throw new ApiError('Payroll record not found', 404);
  }

  if (payroll.status === 'paid') {
    throw new ApiError('Payroll is already marked as paid', 400);
  }

  payroll.status = 'paid';
  payroll.paidAt = new Date();
  payroll.paidBy = req.user._id;
  payroll.paymentMethod = paymentMethod;
  payroll.paymentReference = paymentReference;
  if (notes) payroll.notes = notes;

  await payroll.save();

  // Send payment notification
  try {
    await notifyPaymentCompleted(payroll.employee, payroll);
  } catch (error) {
    console.error('Payment notification failed:', error.message);
  }

  // Re-populate for response
  payroll = await Payroll.findById(payroll._id)
    .populate('employee', 'name email phone')
    .populate('paidBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Payment recorded successfully',
    data: payroll,
  });
});

/**
 * @desc    Bulk mark payrolls as paid
 * @route   PUT /api/payroll/bulk-pay
 * @access  Private/Manager
 */
export const bulkMarkAsPaid = asyncHandler(async (req, res) => {
  const { payrollIds, paymentMethod, paymentReference } = req.body;

  if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
    throw new ApiError('Please provide payroll IDs', 400);
  }

  const results = {
    paid: [],
    failed: [],
  };

  for (const id of payrollIds) {
    try {
      const payroll = await Payroll.findById(id).populate(
        'employee',
        'name email notificationPreferences'
      );

      if (!payroll) {
        results.failed.push({ id, error: 'Not found' });
        continue;
      }

      if (payroll.status === 'paid') {
        results.failed.push({ id, error: 'Already paid' });
        continue;
      }

      payroll.status = 'paid';
      payroll.paidAt = new Date();
      payroll.paidBy = req.user._id;
      payroll.paymentMethod = paymentMethod;
      payroll.paymentReference = paymentReference;
      await payroll.save();

      // Send notification
      try {
        await notifyPaymentCompleted(payroll.employee, payroll);
      } catch (e) {
        console.error('Notification failed:', e.message);
      }

      results.paid.push({
        id: payroll._id,
        employee: payroll.employee.name,
        amount: payroll.netPay,
      });
    } catch (error) {
      results.failed.push({ id, error: error.message });
    }
  }

  res.status(200).json({
    success: true,
    message: `${results.paid.length} payments recorded, ${results.failed.length} failed`,
    data: results,
  });
});

/**
 * @desc    Update payroll (deductions, bonuses, notes)
 * @route   PUT /api/payroll/:id
 * @access  Private/Manager
 */
export const updatePayroll = asyncHandler(async (req, res) => {
  const { deductions, bonuses, notes, status } = req.body;

  let payroll = await Payroll.findById(req.params.id);

  if (!payroll) {
    throw new ApiError('Payroll record not found', 404);
  }

  if (payroll.status === 'paid') {
    throw new ApiError('Cannot modify a paid payroll record', 400);
  }

  // Update allowed fields
  if (deductions !== undefined) payroll.deductions = deductions;
  if (bonuses !== undefined) payroll.bonuses = bonuses;
  if (notes !== undefined) payroll.notes = notes;
  if (status && status !== 'paid') payroll.status = status;

  await payroll.save(); // This recalculates pay amounts

  payroll = await Payroll.findById(payroll._id)
    .populate('employee', 'name email phone')
    .populate('generatedBy', 'name');

  res.status(200).json({
    success: true,
    data: payroll,
  });
});

/**
 * @desc    Get payroll summary/statistics
 * @route   GET /api/payroll/summary
 * @access  Private/Manager
 */
export const getPayrollSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const query = {};
  if (startDate && endDate) {
    query.weekStartDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const summary = await Payroll.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
        totalGrossPay: { $sum: '$grossPay' },
        totalNetPay: { $sum: '$netPay' },
      },
    },
  ]);

  // Current week summary
  const { weekStart, weekEnd } = getWeekBoundaries(new Date());
  const currentWeek = await Payroll.aggregate([
    {
      $match: {
        weekStartDate: { $gte: weekStart, $lte: weekEnd },
      },
    },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
        totalGrossPay: { $sum: '$grossPay' },
        paid: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
        },
        pending: {
          $sum: { $cond: [{ $ne: ['$status', 'paid'] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      byStatus: summary,
      currentWeek: currentWeek[0] || {
        totalEmployees: 0,
        totalHours: 0,
        totalGrossPay: 0,
        paid: 0,
        pending: 0,
      },
      weekRange: { start: weekStart, end: weekEnd },
    },
  });
});

/**
 * @desc    Delete payroll record
 * @route   DELETE /api/payroll/:id
 * @access  Private/Manager
 */
export const deletePayroll = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id);

  if (!payroll) {
    throw new ApiError('Payroll record not found', 404);
  }

  if (payroll.status === 'paid') {
    throw new ApiError('Cannot delete a paid payroll record', 400);
  }

  await payroll.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Payroll record deleted',
  });
});

export default {
  getPayrolls,
  getMyPayrolls,
  getPayroll,
  calculatePayroll,
  markAsPaid,
  bulkMarkAsPaid,
  updatePayroll,
  getPayrollSummary,
  deletePayroll,
};

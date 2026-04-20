import { Shift, User, Payroll } from '../models/index.js';
import Availability from '../models/Availability.js';
import { ApiError, asyncHandler, getShiftType, getWeekBoundaries } from '../utils/helpers.js';
import { notifyShiftAssigned, notifyShiftCancelled, notifyShiftUpdated, notifyPayrollGenerated } from '../utils/notifications.js';

/**
 * @desc    Get all shifts (with filters)
 * @route   GET /api/shifts
 * @access  Private/Manager
 */
export const getShifts = asyncHandler(async (req, res) => {
  const { employee, date, startDate, endDate, status, page = 1, limit = 50 } = req.query;

  const query = {};

  if (employee) {
    query.employee = employee;
  }

  if (date) {
    const shiftDate = new Date(date);
    shiftDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(shiftDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = { $gte: shiftDate, $lt: nextDay };
  }

  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [shifts, total] = await Promise.all([
    Shift.find(query)
      .populate('employee', 'name email phone jobRole')
      .populate('assignedBy', 'name')
      .sort({ date: -1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Shift.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: shifts.length,
    total,
    pages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: shifts,
  });
});

/**
 * @desc    Get shifts for a week
 * @route   GET /api/shifts/week
 * @access  Private/Manager
 */
export const getWeeklyShifts = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const { weekStart, weekEnd } = getWeekBoundaries(date || new Date());

  const shifts = await Shift.find({
    date: { $gte: weekStart, $lte: weekEnd },
    status: { $ne: 'cancelled' },
  })
    .populate('employee', 'name email phone jobRole hourlyWage')
    .populate('assignedBy', 'name')
    .sort({ date: 1, startTime: 1 });

  // Group shifts by date
  const groupedByDate = {};
  shifts.forEach((shift) => {
    const dateKey = shift.date.toISOString().split('T')[0];
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(shift);
  });

  res.status(200).json({
    success: true,
    weekStart,
    weekEnd,
    totalShifts: shifts.length,
    data: shifts,
    groupedByDate,
  });
});

/**
 * @desc    Get my shifts (for employees)
 * @route   GET /api/shifts/my
 * @access  Private/Employee
 */
export const getMyShifts = asyncHandler(async (req, res) => {
  const { status, startDate, endDate, upcoming } = req.query;

  const query = { employee: req.user._id };

  if (status) {
    query.status = status;
  }

  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (upcoming === 'true') {
    query.date = { $gte: new Date() };
    query.status = { $in: ['scheduled', 'in-progress'] };
  }

  const shifts = await Shift.find(query)
    .populate('assignedBy', 'name')
    .sort({ date: -1, startTime: 1 });

  // Calculate weekly summary
  const { weekStart, weekEnd } = getWeekBoundaries(new Date());
  const thisWeekShifts = shifts.filter(
    (s) => s.date >= weekStart && s.date <= weekEnd
  );

  const weeklyHours = thisWeekShifts
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + (s.hoursWorked || 0), 0);

  res.status(200).json({
    success: true,
    count: shifts.length,
    thisWeekSummary: {
      totalShifts: thisWeekShifts.length,
      completedShifts: thisWeekShifts.filter((s) => s.status === 'completed').length,
      hoursWorked: parseFloat(weeklyHours.toFixed(2)),
    },
    data: shifts,
  });
});

/**
 * @desc    Get single shift
 * @route   GET /api/shifts/:id
 * @access  Private
 */
export const getShift = asyncHandler(async (req, res) => {
  const shift = await Shift.findById(req.params.id)
    .populate('employee', 'name email phone jobRole hourlyWage')
    .populate('assignedBy', 'name');

  if (!shift) {
    throw new ApiError('Shift not found', 404);
  }

  // Employees can only view their own shifts
  if (
    req.user.role === 'employee' &&
    shift.employee._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError('Not authorized to view this shift', 403);
  }

  res.status(200).json({
    success: true,
    data: shift,
  });
});

/**
 * @desc    Assign/Create shift
 * @route   POST /api/shifts
 * @access  Private/Manager
 */
export const createShift = asyncHandler(async (req, res) => {
  const { employee, date, startTime, endTime, shiftType, notes, breakDuration, skipAvailabilityCheck } = req.body;

  // Check if date is in the past
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shiftDate = new Date(date);
  shiftDate.setHours(0, 0, 0, 0);
  if (shiftDate < today) {
    throw new ApiError('Cannot create shift in the past', 400);
  }

  // Check if start time has already passed for today's date
  if (shiftDate.getTime() === today.getTime()) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const shiftStartDateTime = new Date(date);
    shiftStartDateTime.setHours(startHour, startMinute, 0, 0);
    if (shiftStartDateTime < now) {
      throw new ApiError('Cannot create shift with a start time that has already passed', 400);
    }
  }

  // Verify employee exists and is active
  const employeeUser = await User.findById(employee);
  if (!employeeUser) {
    throw new ApiError('Employee not found', 404);
  }
  if (!employeeUser.isActive) {
    throw new ApiError('Cannot assign shift to inactive employee', 400);
  }

  // Check for overlapping shifts
  const hasOverlap = await Shift.hasOverlap(employee, date, startTime, endTime);
  if (hasOverlap) {
    throw new ApiError('Employee already has an overlapping shift at this time', 400);
  }

  // Check employee availability (unless explicitly skipped by manager)
  if (!skipAvailabilityCheck) {
    const availabilityResult = await Availability.isEmployeeAvailable(employee, date, startTime, endTime);
    if (!availabilityResult.available) {
      throw new ApiError(`Cannot assign shift: ${availabilityResult.reason}`, 400);
    }
  }

  // Determine shift type if not provided
  const finalShiftType = shiftType || getShiftType(startTime, endTime);

  // Create shift
  const shift = await Shift.create({
    employee,
    date: new Date(date),
    startTime,
    endTime,
    shiftType: finalShiftType,
    assignedBy: req.user._id,
    notes,
    breakDuration: breakDuration || 0,
  });

  // Populate for response
  const populatedShift = await Shift.findById(shift._id)
    .populate('employee', 'name email phone jobRole notificationPreferences')
    .populate('assignedBy', 'name');

  // Send notification to employee
  try {
    await notifyShiftAssigned(populatedShift.employee, shift);
  } catch (error) {
    console.error('Failed to send shift notification:', error.message);
  }

  res.status(201).json({
    success: true,
    message: 'Shift assigned successfully',
    data: populatedShift,
  });
});

/**
 * @desc    Bulk assign shifts
 * @route   POST /api/shifts/bulk
 * @access  Private/Manager
 */
export const bulkCreateShifts = asyncHandler(async (req, res) => {
  const { shifts, skipAvailabilityCheck } = req.body;

  if (!Array.isArray(shifts) || shifts.length === 0) {
    throw new ApiError('Please provide an array of shifts', 400);
  }

  const results = {
    created: [],
    failed: [],
  };

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const shiftData of shifts) {
    try {
      const { employee, date, startTime, endTime, shiftType, notes, breakDuration } = shiftData;

      // Check if date is in the past
      const shiftDate = new Date(date);
      shiftDate.setHours(0, 0, 0, 0);
      if (shiftDate < today) {
        results.failed.push({
          ...shiftData,
          error: 'Cannot create shift in the past',
        });
        continue;
      }

      // Check if start time has already passed for today's date
      if (shiftDate.getTime() === today.getTime()) {
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const shiftStartDateTime = new Date(date);
        shiftStartDateTime.setHours(startHour, startMinute, 0, 0);
        if (shiftStartDateTime < now) {
          results.failed.push({
            ...shiftData,
            error: 'Start time has already passed for today',
          });
          continue;
        }
      }

      const employeeUser = await User.findById(employee);
      if (!employeeUser) {
        results.failed.push({
          ...shiftData,
          error: 'Employee not found',
        });
        continue;
      }

      if (!employeeUser.isActive) {
        results.failed.push({
          ...shiftData,
          error: 'Cannot assign shift to inactive employee',
        });
        continue;
      }

      // Check for overlap
      const hasOverlap = await Shift.hasOverlap(employee, date, startTime, endTime);
      if (hasOverlap) {
        results.failed.push({
          ...shiftData,
          error: 'Overlapping shift exists',
        });
        continue;
      }

      // Check employee availability (unless explicitly skipped)
      if (!skipAvailabilityCheck) {
        const availabilityResult = await Availability.isEmployeeAvailable(employee, date, startTime, endTime);
        if (!availabilityResult.available) {
          results.failed.push({
            ...shiftData,
            error: `Employee unavailable: ${availabilityResult.reason}`,
          });
          continue;
        }
      }

      const shift = await Shift.create({
        employee,
        date: new Date(date),
        startTime,
        endTime,
        shiftType: shiftType || getShiftType(startTime, endTime),
        assignedBy: req.user._id,
        notes,
        breakDuration: breakDuration || 0,
      });

      results.created.push(shift);

      // Send notification
      if (employeeUser) {
        try {
          await notifyShiftAssigned(employeeUser, shift);
        } catch (e) {
          console.error('Notification failed:', e.message);
        }
      }
    } catch (error) {
      results.failed.push({
        ...shiftData,
        error: error.message,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: `Created ${results.created.length} shifts, ${results.failed.length} failed`,
    data: results,
  });
});

/**
 * @desc    Update shift
 * @route   PUT /api/shifts/:id
 * @access  Private/Manager
 */
export const updateShift = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, shiftType, status, notes, breakDuration } = req.body;

  let shift = await Shift.findById(req.params.id).populate('employee', 'name email phone jobRole notificationPreferences');

  if (!shift) {
    throw new ApiError('Shift not found', 404);
  }

  // Store original values for notification
  const originalShift = {
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    shiftType: shift.shiftType,
    status: shift.status,
    breakDuration: shift.breakDuration,
  };

  const dateChanged = date && new Date(date).toDateString() !== new Date(originalShift.date).toDateString();
  const timeChanged = (startTime && startTime !== originalShift.startTime) || (endTime && endTime !== originalShift.endTime);
  const breakChanged = breakDuration !== undefined && breakDuration !== shift.breakDuration;
  const statusChanged = status && status !== originalShift.status;

  // Check for overlap if time is being changed
  if (dateChanged || timeChanged) {
    const hasOverlap = await Shift.hasOverlap(
      shift.employee._id || shift.employee,
      date || shift.date,
      startTime || shift.startTime,
      endTime || shift.endTime,
      shift._id
    );
    if (hasOverlap) {
      throw new ApiError('This change would create an overlapping shift', 400);
    }
  }

  shift.date = date ? new Date(date) : shift.date;
  shift.startTime = startTime || shift.startTime;
  shift.endTime = endTime || shift.endTime;
  shift.shiftType = shiftType || shift.shiftType;
  shift.status = status || shift.status;
  shift.notes = notes !== undefined ? notes : shift.notes;
  shift.breakDuration = breakDuration !== undefined ? breakDuration : shift.breakDuration;

  const updatedShift = await shift.save();
  await updatedShift.populate('employee', 'name email phone jobRole notificationPreferences');
  await updatedShift.populate('assignedBy', 'name');

  // If this is a completed shift and time/state changed, recalculate payroll
  const isCompleted = updatedShift.status === 'completed';
  const payrollNeedsRefresh = isCompleted && (dateChanged || timeChanged || breakChanged || statusChanged);

  if (payrollNeedsRefresh) {
    try {
      const payroll = await Payroll.calculateForShift(updatedShift, User);
      if (payroll) {
        console.log(`📊 Payroll recalculated after shift edit. New total: £${payroll.netPay}`);
      }
    } catch (payrollError) {
      console.error('Payroll recalculation failed:', payrollError.message);
    }
  }

  // Send notification if date or time changed
  const hasChanges = dateChanged || timeChanged || statusChanged;

  if (hasChanges && updatedShift.employee) {
    try {
      await notifyShiftUpdated(updatedShift.employee, originalShift, updatedShift);
    } catch (e) {
      console.error('Shift update notification failed:', e.message);
    }
  }

  res.status(200).json({
    success: true,
    message: payrollNeedsRefresh ? 'Shift updated and payroll recalculated' : 'Shift updated successfully',
    data: updatedShift,
  });
});

/**
 * @desc    Cancel shift
 * @route   DELETE /api/shifts/:id
 * @access  Private/Manager
 */
export const cancelShift = asyncHandler(async (req, res) => {
  const shift = await Shift.findById(req.params.id).populate('employee', 'name email phone notificationPreferences');

  if (!shift) {
    throw new ApiError('Shift not found', 404);
  }

  if (shift.status === 'completed') {
    throw new ApiError('Cannot cancel a completed shift', 400);
  }

  shift.status = 'cancelled';
  await shift.save();

  // Send cancellation notification
  if (shift.employee) {
    try {
      await notifyShiftCancelled(shift.employee, shift);
    } catch (e) {
      console.error('Shift cancellation notification failed:', e.message);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Shift cancelled successfully',
  });
});

/**
 * @desc    Check in to shift
 * @route   POST /api/shifts/:id/checkin
 * @access  Private/Employee
 */
export const checkIn = asyncHandler(async (req, res) => {
  const shift = await Shift.findById(req.params.id);

  if (!shift) {
    throw new ApiError('Shift not found', 404);
  }

  // Verify employee owns this shift
  if (shift.employee.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to check in to this shift', 403);
  }

  if (shift.status !== 'scheduled') {
    throw new ApiError(`Cannot check in - shift is ${shift.status}`, 400);
  }

  // Check if shift date is today
  const now = new Date();
  const shiftDate = new Date(shift.date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shiftDay = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());

  if (shiftDay.getTime() !== today.getTime()) {
    throw new ApiError('You can only check in on the day of your shift', 400);
  }

  // Parse shift start time and check if current time is within allowed window
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const shiftStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute);
  
  // Allow check-in 15 minutes before shift starts
  const earliestCheckIn = new Date(shiftStartTime.getTime() - 15 * 60 * 1000);
  
  if (now < earliestCheckIn) {
    const minutesUntilAllowed = Math.ceil((earliestCheckIn - now) / (60 * 1000));
    throw new ApiError(
      `Too early to check in. You can check in starting at ${shift.startTime} (15 min before shift). Please wait ${minutesUntilAllowed} more minutes.`,
      400
    );
  }

  shift.actualCheckIn = new Date();
  shift.status = 'in-progress';
  await shift.save();

  res.status(200).json({
    success: true,
    message: 'Checked in successfully',
    data: shift,
  });
});

/**
 * @desc    Check out from shift
 * @route   POST /api/shifts/:id/checkout
 * @access  Private/Employee
 */
export const checkOut = asyncHandler(async (req, res) => {
  const { breakDuration } = req.body;

  const shift = await Shift.findById(req.params.id);

  if (!shift) {
    throw new ApiError('Shift not found', 404);
  }

  // Verify employee owns this shift
  if (shift.employee.toString() !== req.user._id.toString()) {
    throw new ApiError('Not authorized to check out from this shift', 403);
  }

  if (shift.status !== 'in-progress') {
    throw new ApiError(`Cannot check out - shift is ${shift.status}`, 400);
  }

  if (!shift.actualCheckIn) {
    throw new ApiError('Cannot check out without checking in first', 400);
  }

  shift.actualCheckOut = new Date();
  if (breakDuration !== undefined) {
    shift.breakDuration = breakDuration;
  }
  shift.status = 'completed';
  await shift.save(); // This triggers hours calculation in pre-save

  // Auto-calculate payroll for this week
  try {
    const payroll = await Payroll.calculateForShift(shift, User);
    if (payroll) {
      console.log(`📊 Payroll auto-updated for employee ${shift.employee}, Week: ${payroll.weekStartDate.toDateString()}`);
      
      // Send payroll notification to employee
      const employee = await User.findById(shift.employee);
      if (employee) {
        await notifyPayrollGenerated(employee, payroll);
        console.log(`📧 Payroll notification sent to ${employee.email}`);
      }
    }
  } catch (payrollError) {
    console.error('Auto-payroll calculation failed:', payrollError.message);
    // Don't fail the checkout if payroll calculation fails
  }

  res.status(200).json({
    success: true,
    message: 'Checked out successfully',
    data: shift,
  });
});

/**
 * @desc    Get shift statistics
 * @route   GET /api/shifts/stats
 * @access  Private/Manager
 */
export const getShiftStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const { weekStart, weekEnd } = getWeekBoundaries(new Date());

  const dateRange = {
    $gte: startDate ? new Date(startDate) : weekStart,
    $lte: endDate ? new Date(endDate) : weekEnd,
  };

  const stats = await Shift.aggregate([
    { $match: { date: dateRange } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$hoursWorked' },
      },
    },
  ]);

  const byEmployee = await Shift.aggregate([
    { $match: { date: dateRange, status: 'completed' } },
    {
      $group: {
        _id: '$employee',
        shiftsCompleted: { $sum: 1 },
        totalHours: { $sum: '$hoursWorked' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: '$employee' },
    {
      $project: {
        employeeName: '$employee.name',
        shiftsCompleted: 1,
        totalHours: { $round: ['$totalHours', 2] },
      },
    },
    { $sort: { totalHours: -1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      byStatus: stats,
      byEmployee,
      dateRange: { start: dateRange.$gte, end: dateRange.$lte },
    },
  });
});

export default {
  getShifts,
  getWeeklyShifts,
  getMyShifts,
  getShift,
  createShift,
  bulkCreateShifts,
  updateShift,
  cancelShift,
  checkIn,
  checkOut,
  getShiftStats,
};

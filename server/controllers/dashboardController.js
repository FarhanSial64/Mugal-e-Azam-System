import { User, Shift, Payroll, Notification, Announcement } from '../models/index.js';
import { asyncHandler, getWeekBoundaries, calculateShiftStatus } from '../utils/helpers.js';

const getReportDateRange = (period, startDateInput, endDateInput) => {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  if (period === 'custom') {
    const parsedStart = startDateInput ? new Date(startDateInput) : null;
    const parsedEnd = endDateInput ? new Date(endDateInput) : null;

    if (parsedStart && !Number.isNaN(parsedStart.getTime())) {
      parsedStart.setHours(0, 0, 0, 0);
    }
    if (parsedEnd && !Number.isNaN(parsedEnd.getTime())) {
      parsedEnd.setHours(23, 59, 59, 999);
    }

    if (
      parsedStart &&
      parsedEnd &&
      !Number.isNaN(parsedStart.getTime()) &&
      !Number.isNaN(parsedEnd.getTime()) &&
      parsedStart <= parsedEnd
    ) {
      return { startDate: parsedStart, endDate: parsedEnd };
    }
  }

  const startDate = new Date(now);

  if (period === 'weekly') {
    startDate.setDate(now.getDate() - 55);
  } else {
    // Default monthly range: last 12 months
    startDate.setMonth(now.getMonth() - 11);
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
};

const toWeekKey = (date) => {
  const { weekStart } = getWeekBoundaries(date);
  return weekStart.toISOString().split('T')[0];
};

const toMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const calculateShiftEarning = (shift, hourlyRate) => {
  const shiftHours = shift.hoursWorked || 0;
  const overtimeHours = Math.max(0, shift.overtimeHours || 0);
  const regularHours = Math.max(0, shiftHours - overtimeHours);
  return (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);
};

/**
 * @desc    Get dashboard statistics for manager
 * @route   GET /api/dashboard/manager
 * @access  Private/Manager
 */
export const getManagerDashboard = asyncHandler(async (req, res) => {
  const { weekStart, weekEnd } = getWeekBoundaries(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const analyticsStart = new Date(weekStart);
  analyticsStart.setDate(analyticsStart.getDate() - 21);

  // Parallel queries for efficiency
  const [
    employeeStats,
    todayShifts,
    weeklyShifts,
    pendingPayrolls,
    recentPayrolls,
    recentNotifications,
    recentAnnouncements,
  ] = await Promise.all([
    // Employee statistics
    User.aggregate([
      { $match: { role: 'employee' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
    ]),

    // Today's shifts
    Shift.find({
      date: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' },
    })
      .populate('employee', 'name jobRole')
      .sort({ startTime: 1 }),

    // This week's shift stats
    Shift.aggregate([
      {
        $match: {
          date: { $gte: weekStart, $lte: weekEnd },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Pending payrolls count
    Payroll.countDocuments({ status: { $in: ['pending', 'approved'] } }),

    // Recent payrolls
    Payroll.find()
      .populate('employee', 'name')
      .sort({ createdAt: -1 })
      .limit(5),

    Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5),

    Announcement.find({
      audience: { $in: ['all', 'manager'] },
      isActive: true,
      startAt: { $lte: new Date() },
      $or: [{ endAt: null }, { endAt: { $gte: new Date() } }],
    })
      .populate('createdBy', 'name role')
      .sort({ isPinned: -1, priority: -1, createdAt: -1 })
      .limit(5),
  ]);

  // Auto-update shift statuses based on current time
  const now = new Date();
  const shiftStatusUpdatePromises = todayShifts.map(async (shift) => {
    const computedStatus = calculateShiftStatus(shift, now);
    if (computedStatus !== shift.status) {
      // Update in database if status changed
      await Shift.findByIdAndUpdate(shift._id, { status: computedStatus });
      shift.status = computedStatus;
    }
    return shift;
  });
  
  await Promise.all(shiftStatusUpdatePromises);

  // Calculate total pending payout
  const pendingPayout = await Payroll.aggregate([
    { $match: { status: { $ne: 'paid' } } },
    {
      $group: {
        _id: null,
        total: { $sum: '$netPay' },
      },
    },
  ]);

  const weeklyLabor = await Payroll.aggregate([
    {
      $match: {
        weekStartDate: { $gte: analyticsStart, $lte: weekEnd },
      },
    },
    {
      $group: {
        _id: '$weekStartDate',
        totalNetPay: { $sum: '$netPay' },
        totalHours: { $sum: '$totalHours' },
        overtimeHours: { $sum: '$overtimeHours' },
        employeeCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const shiftTimeline = await Shift.aggregate([
    {
      $match: {
        date: { $gte: weekStart, $lte: weekEnd },
        status: { $ne: 'cancelled' },
      },
    },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
        scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
        hoursWorked: { $sum: '$hoursWorked' },
      },
    },
    { $sort: { '_id.day': 1 } },
  ]);

  const totalWeeklyShifts = weeklyShifts.reduce((sum, item) => sum + item.count, 0);
  const completedCount = weeklyShifts.find((item) => item._id === 'completed')?.count || 0;
  const missedCount = weeklyShifts.find((item) => item._id === 'missed')?.count || 0;
  const inProgressCount = weeklyShifts.find((item) => item._id === 'in-progress')?.count || 0;
  const scheduledCount = weeklyShifts.find((item) => item._id === 'scheduled')?.count || 0;
  const attendanceRate = totalWeeklyShifts > 0
    ? parseFloat((((completedCount + inProgressCount) / totalWeeklyShifts) * 100).toFixed(1))
    : 0;
  const utilizationRate = totalWeeklyShifts > 0
    ? parseFloat(((completedCount / totalWeeklyShifts) * 100).toFixed(1))
    : 0;

  // Format weekly shift stats
  const weeklyStats = {
    scheduled: 0,
    'in-progress': 0,
    completed: 0,
    missed: 0,
  };
  weeklyShifts.forEach((s) => {
    weeklyStats[s._id] = s.count;
  });

  res.status(200).json({
    success: true,
    data: {
      employees: {
        total: employeeStats[0]?.total || 0,
        active: employeeStats[0]?.active || 0,
      },
      todayShifts: {
        count: todayShifts.length,
        shifts: todayShifts,
      },
      weeklyShifts: weeklyStats,
      payroll: {
        pendingCount: pendingPayrolls,
        pendingAmount: pendingPayout[0]?.total || 0,
        recent: recentPayrolls,
      },
      recentNotifications,
      recentAnnouncements,
      analytics: {
        attendanceRate,
        utilizationRate,
        totalWeeklyShifts,
        weeklyLabor,
        shiftTimeline,
        shiftBreakdown: {
          scheduled: scheduledCount,
          inProgress: inProgressCount,
          completed: completedCount,
          missed: missedCount,
        },
      },
      weekRange: { start: weekStart, end: weekEnd },
    },
  });
});

/**
 * @desc    Get dashboard for employee
 * @route   GET /api/dashboard/employee
 * @access  Private/Employee
 */
export const getEmployeeDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { weekStart, weekEnd } = getWeekBoundaries(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parallel queries
  const [upcomingShifts, weeklyShifts, recentPayrolls, allPayrolls, todayShift] = await Promise.all([
    // Upcoming shifts
    Shift.find({
      employee: userId,
      date: { $gte: today },
      status: { $in: ['scheduled', 'in-progress'] },
    })
      .sort({ date: 1, startTime: 1 })
      .limit(5),

    // This week's completed shifts
    Shift.find({
      employee: userId,
      date: { $gte: weekStart, $lte: weekEnd },
      status: 'completed',
    }),

    // Recent payrolls
    Payroll.find({ employee: userId })
      .sort({ weekStartDate: -1 })
      .limit(4),

    // All payrolls for accurate earnings and processed-shift tracking
    Payroll.find({ employee: userId }).select('status netPay shifts'),

    // Today's shift
    Shift.findOne({
      employee: userId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      status: { $in: ['scheduled', 'in-progress'] },
    }),
  ]);

  // Auto-update shift statuses for upcoming shifts based on current time
  const now = new Date();
  const upcomingStatusUpdatePromises = upcomingShifts.map(async (shift) => {
    const computedStatus = calculateShiftStatus(shift, now);
    if (computedStatus !== shift.status) {
      await Shift.findByIdAndUpdate(shift._id, { status: computedStatus });
      shift.status = computedStatus;
    }
    return shift;
  });

  // Auto-update today's shift status
  if (todayShift) {
    const computedStatus = calculateShiftStatus(todayShift, now);
    if (computedStatus !== todayShift.status) {
      await Shift.findByIdAndUpdate(todayShift._id, { status: computedStatus });
      todayShift.status = computedStatus;
    }
  }

  await Promise.all(upcomingStatusUpdatePromises);

  const recentNotifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(5);

  // Calculate weekly hours
  const weeklyHours = weeklyShifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);

  // Calculate earnings using full payroll history (not only recent records)
  const totalPaid = allPayrolls
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.netPay, 0);

  const pendingFromPayrolls = allPayrolls
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + p.netPay, 0);

  // Include completed shifts that are not yet attached to any payroll record.
  // This prevents "pending pay = 0" when payroll generation has not run yet.
  const processedShiftIds = allPayrolls.flatMap((payroll) =>
    (payroll.shifts || []).map((shiftId) => shiftId.toString())
  );

  const unprocessedCompletedShifts = await Shift.find({
    employee: userId,
    status: 'completed',
    ...(processedShiftIds.length > 0 ? { _id: { $nin: processedShiftIds } } : {}),
  }).select('hoursWorked');

  const hourlyRate = req.user.hourlyWage || req.user.hourlyRate || 0;
  const pendingFromUnprocessedShifts = unprocessedCompletedShifts.reduce(
    (sum, shift) => sum + ((shift.hoursWorked || 0) * hourlyRate),
    0
  );

  const totalPending = pendingFromPayrolls + pendingFromUnprocessedShifts;

  // Get next shift
  const nextShift = upcomingShifts.length > 0 ? upcomingShifts[0] : null;

  // Count this week's scheduled shifts
  const thisWeekShiftsCount = await Shift.countDocuments({
    employee: userId,
    date: { $gte: weekStart, $lte: weekEnd },
    status: { $ne: 'cancelled' },
  });

  res.status(200).json({
    success: true,
    data: {
      employee: req.user,
      todayShift,
      nextShift,
      upcomingShifts,
      thisWeekShifts: thisWeekShiftsCount,
      hoursThisWeek: parseFloat(weeklyHours.toFixed(2)),
      pendingPay: parseFloat(totalPending.toFixed(2)),
      thisWeek: {
        shiftsCompleted: weeklyShifts.length,
        hoursWorked: parseFloat(weeklyHours.toFixed(2)),
        estimatedPay: parseFloat((weeklyHours * req.user.hourlyWage).toFixed(2)),
      },
      earnings: {
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        pending: parseFloat(totalPending.toFixed(2)),
      },
      pendingBreakdown: {
        fromPayrolls: parseFloat(pendingFromPayrolls.toFixed(2)),
        estimatedFromCompletedShifts: parseFloat(pendingFromUnprocessedShifts.toFixed(2)),
      },
      recentPayrolls,
      recentNotifications,
      weekRange: { start: weekStart, end: weekEnd },
    },
  });
});

/**
 * @desc    Get employee reporting analytics
 * @route   GET /api/dashboard/employee/reports
 * @access  Private/Employee
 */
export const getEmployeeReports = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const period = req.query.period || 'monthly';
  const { startDate, endDate } = getReportDateRange(
    period,
    req.query.startDate,
    req.query.endDate
  );

  const hourlyRate = req.user.hourlyWage || req.user.hourlyRate || 0;

  const [shifts, payrolls] = await Promise.all([
    Shift.find({
      employee: userId,
      date: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    }).select('date startTime status hoursWorked overtimeHours shiftType'),
    Payroll.find({
      employee: userId,
      weekStartDate: { $gte: startDate, $lte: endDate },
    })
      .sort({ weekStartDate: -1 })
      .select('weekStartDate weekEndDate totalHours overtimeHours netPay status shifts'),
  ]);

  const completedShifts = shifts.filter((shift) => shift.status === 'completed');
  const missedShifts = shifts.filter((shift) => shift.status === 'missed');
  const attendancePool = shifts.filter((shift) => ['completed', 'missed'].includes(shift.status));

  const processedShiftIds = new Set(
    payrolls.flatMap((payroll) => (payroll.shifts || []).map((id) => id.toString()))
  );

  const estimatedUnprocessedEarnings = completedShifts
    .filter((shift) => !processedShiftIds.has(shift._id.toString()))
    .reduce((sum, shift) => sum + calculateShiftEarning(shift, hourlyRate), 0);

  const totalHoursWorked = completedShifts.reduce((sum, shift) => sum + (shift.hoursWorked || 0), 0);
  const totalOvertimeHours = completedShifts.reduce((sum, shift) => sum + (shift.overtimeHours || 0), 0);

  const paidEarnings = payrolls
    .filter((payroll) => payroll.status === 'paid')
    .reduce((sum, payroll) => sum + (payroll.netPay || 0), 0);

  const pendingPayrollEarnings = payrolls
    .filter((payroll) => payroll.status !== 'paid')
    .reduce((sum, payroll) => sum + (payroll.netPay || 0), 0);

  const totalTrackedEarnings = paidEarnings + pendingPayrollEarnings + estimatedUnprocessedEarnings;

  const attendanceRate = attendancePool.length > 0
    ? ((completedShifts.length / attendancePool.length) * 100)
    : 0;

  const weeklyBuckets = {};
  const monthlyBuckets = {};
  const hourlyBuckets = {};

  completedShifts.forEach((shift) => {
    const weekKey = toWeekKey(shift.date);
    const monthKey = toMonthKey(shift.date);
    const startHour = Number((shift.startTime || '0:00').split(':')[0]);
    const safeHour = Number.isNaN(startHour) ? 0 : startHour;
    const shiftHours = shift.hoursWorked || 0;
    const shiftEarning = calculateShiftEarning(shift, hourlyRate);

    if (!weeklyBuckets[weekKey]) {
      weeklyBuckets[weekKey] = {
        period: weekKey,
        hours: 0,
        earnings: 0,
        completedShifts: 0,
        missedShifts: 0,
      };
    }

    if (!monthlyBuckets[monthKey]) {
      monthlyBuckets[monthKey] = {
        period: monthKey,
        hours: 0,
        earnings: 0,
        completedShifts: 0,
      };
    }

    if (!hourlyBuckets[safeHour]) {
      hourlyBuckets[safeHour] = {
        hour: safeHour,
        label: `${String(safeHour).padStart(2, '0')}:00`,
        hours: 0,
        earnings: 0,
        shifts: 0,
      };
    }

    weeklyBuckets[weekKey].hours += shiftHours;
    weeklyBuckets[weekKey].earnings += shiftEarning;
    weeklyBuckets[weekKey].completedShifts += 1;

    monthlyBuckets[monthKey].hours += shiftHours;
    monthlyBuckets[monthKey].earnings += shiftEarning;
    monthlyBuckets[monthKey].completedShifts += 1;

    hourlyBuckets[safeHour].hours += shiftHours;
    hourlyBuckets[safeHour].earnings += shiftEarning;
    hourlyBuckets[safeHour].shifts += 1;
  });

  missedShifts.forEach((shift) => {
    const weekKey = toWeekKey(shift.date);
    if (!weeklyBuckets[weekKey]) {
      weeklyBuckets[weekKey] = {
        period: weekKey,
        hours: 0,
        earnings: 0,
        completedShifts: 0,
        missedShifts: 0,
      };
    }
    weeklyBuckets[weekKey].missedShifts += 1;
  });

  const weeklyTrend = Object.values(weeklyBuckets)
    .sort((a, b) => new Date(a.period) - new Date(b.period))
    .map((entry) => ({
      ...entry,
      hours: parseFloat(entry.hours.toFixed(2)),
      earnings: parseFloat(entry.earnings.toFixed(2)),
    }));

  const monthlyTrend = Object.values(monthlyBuckets)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((entry) => ({
      ...entry,
      hours: parseFloat(entry.hours.toFixed(2)),
      earnings: parseFloat(entry.earnings.toFixed(2)),
    }));

  const hourlyBreakdown = Object.values(hourlyBuckets)
    .sort((a, b) => a.hour - b.hour)
    .map((entry) => ({
      ...entry,
      hours: parseFloat(entry.hours.toFixed(2)),
      earnings: parseFloat(entry.earnings.toFixed(2)),
    }));

  const payrollStatusTotals = payrolls.reduce((acc, payroll) => {
    const status = payroll.status || 'pending';
    if (!acc[status]) {
      acc[status] = { status, count: 0, amount: 0 };
    }
    acc[status].count += 1;
    acc[status].amount += payroll.netPay || 0;
    return acc;
  }, {});

  const payrollStatusBreakdown = Object.values(payrollStatusTotals).map((entry) => ({
    ...entry,
    amount: parseFloat(entry.amount.toFixed(2)),
  }));

  res.status(200).json({
    success: true,
    data: {
      filters: {
        period,
        startDate,
        endDate,
      },
      summary: {
        totalShifts: shifts.length,
        completedShifts: completedShifts.length,
        missedShifts: missedShifts.length,
        totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
        totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        attendanceRate: parseFloat(attendanceRate.toFixed(1)),
        averageHoursPerShift: completedShifts.length > 0
          ? parseFloat((totalHoursWorked / completedShifts.length).toFixed(2))
          : 0,
        averageEarningsPerHour: totalHoursWorked > 0
          ? parseFloat((totalTrackedEarnings / totalHoursWorked).toFixed(2))
          : 0,
      },
      earnings: {
        paid: parseFloat(paidEarnings.toFixed(2)),
        pendingPayroll: parseFloat(pendingPayrollEarnings.toFixed(2)),
        estimatedFromCompletedShifts: parseFloat(estimatedUnprocessedEarnings.toFixed(2)),
        totalTracked: parseFloat(totalTrackedEarnings.toFixed(2)),
      },
      weeklyTrend,
      monthlyTrend,
      hourlyBreakdown,
      payrollStatusBreakdown,
      recentPayrolls: payrolls.slice(0, 8),
    },
  });
});

export default {
  getManagerDashboard,
  getEmployeeDashboard,
  getEmployeeReports,
};

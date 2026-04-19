import Availability from '../models/Availability.js';
import { asyncHandler, ApiError } from '../utils/helpers.js';

/**
 * @desc    Get my availability for a week
 * @route   GET /api/availability/my
 * @access  Private/Employee
 */
export const getMyAvailability = asyncHandler(async (req, res) => {
  const { weekStart } = req.query;
  
  let weekStartDate;
  if (weekStart) {
    weekStartDate = new Date(weekStart);
  } else {
    weekStartDate = Availability.getWeekStart(new Date());
  }
  weekStartDate.setHours(0, 0, 0, 0);

  let availability = await Availability.findOne({
    employee: req.user._id,
    weekStartDate,
  });

  // If no availability exists, return default (all available)
  if (!availability) {
    availability = {
      weekStartDate,
      monday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      tuesday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      wednesday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      thursday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      friday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      saturday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      sunday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    };
  }

  res.status(200).json({
    success: true,
    data: availability,
  });
});

/**
 * @desc    Set/Update my availability for a week
 * @route   PUT /api/availability/my
 * @access  Private/Employee
 */
export const setMyAvailability = asyncHandler(async (req, res) => {
  const { weekStart, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;

  if (!weekStart) {
    throw new ApiError('Week start date is required', 400);
  }

  const weekStartDate = new Date(weekStart);
  weekStartDate.setHours(0, 0, 0, 0);

  // Validate that weekStart is a Monday
  if (weekStartDate.getDay() !== 1) {
    throw new ApiError('Week start must be a Monday', 400);
  }

  const availabilityData = {
    employee: req.user._id,
    weekStartDate,
    monday: monday || { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    tuesday: tuesday || { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    wednesday: wednesday || { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    thursday: thursday || { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    friday: friday || { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    saturday: saturday || { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    sunday: sunday || { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
  };

  const availability = await Availability.findOneAndUpdate(
    { employee: req.user._id, weekStartDate },
    availabilityData,
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Availability updated successfully',
    data: availability,
  });
});

/**
 * @desc    Get all employees availability for a week (Manager view)
 * @route   GET /api/availability
 * @access  Private/Manager
 */
export const getAllAvailability = asyncHandler(async (req, res) => {
  const { weekStart } = req.query;

  let weekStartDate;
  if (weekStart) {
    weekStartDate = new Date(weekStart);
  } else {
    weekStartDate = Availability.getWeekStart(new Date());
  }
  weekStartDate.setHours(0, 0, 0, 0);

  const availabilities = await Availability.find({ weekStartDate })
    .populate('employee', 'name email jobRole phone')
    .sort({ 'employee.name': 1 });

  res.status(200).json({
    success: true,
    data: availabilities,
    weekStartDate,
  });
});

/**
 * @desc    Get specific employee's availability
 * @route   GET /api/availability/employee/:employeeId
 * @access  Private/Manager
 */
export const getEmployeeAvailability = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { weekStart } = req.query;

  let weekStartDate;
  if (weekStart) {
    weekStartDate = new Date(weekStart);
  } else {
    weekStartDate = Availability.getWeekStart(new Date());
  }
  weekStartDate.setHours(0, 0, 0, 0);

  const availability = await Availability.findOne({
    employee: employeeId,
    weekStartDate,
  }).populate('employee', 'name email jobRole');

  res.status(200).json({
    success: true,
    data: availability,
  });
});

/**
 * @desc    Check if employee is available for a specific shift
 * @route   POST /api/availability/check
 * @access  Private/Manager
 */
export const checkAvailability = asyncHandler(async (req, res) => {
  const { employeeId, date, startTime, endTime } = req.body;

  if (!employeeId || !date || !startTime || !endTime) {
    throw new ApiError('Employee ID, date, start time, and end time are required', 400);
  }

  const result = await Availability.isEmployeeAvailable(employeeId, date, startTime, endTime);

  res.status(200).json({
    success: true,
    data: result,
  });
});

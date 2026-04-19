import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
    },
    date: {
      type: Date,
      required: [true, 'Shift date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      // Format: "HH:mm" (24-hour)
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      // Format: "HH:mm" (24-hour)
    },
    shiftType: {
      type: String,
      enum: ['morning', 'afternoon', 'night', 'breakfast', 'fullday', 'midshift', 'lunch', 'evening', 'dinner'],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'missed', 'cancelled'],
      default: 'scheduled',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigner is required'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    // Attendance tracking
    actualCheckIn: {
      type: Date,
      default: null,
    },
    actualCheckOut: {
      type: Date,
      default: null,
    },
    // Calculated hours worked (in decimal hours, e.g., 8.5)
    hoursWorked: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Break time in minutes
    breakDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    // For overtime calculations
    isOvertime: {
      type: Boolean,
      default: false,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to prevent duplicate shifts for same employee at same time
shiftSchema.index({ employee: 1, date: 1, startTime: 1 }, { unique: true });
shiftSchema.index({ date: 1 });
shiftSchema.index({ status: 1 });
shiftSchema.index({ employee: 1, date: 1 });

// Pre-save middleware to calculate hours worked based on SCHEDULED times
// Manager can edit startTime/endTime to adjust for late arrivals or early departures
// NOTE: Employees are scheduled 15 minutes early to ensure on-time arrival
// Pay calculation adds 15 minutes to start time (e.g., scheduled 8:45 = pay from 9:00)
shiftSchema.pre('save', function (next) {
  // Calculate hours based on scheduled shift times (not actual check-in/out)
  if (this.startTime && this.endTime) {
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    
    // First, detect overnight shifts using ACTUAL times (without buffer)
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Check if overnight BEFORE adding buffer
    const isOvernight = endMinutes < startMinutes;
    if (isOvernight) {
      endMinutes += 24 * 60;
    }
    
    // Now apply the 15-minute buffer for PAY calculation
    // Employees arrive 15 minutes early but payment starts at the actual shift time
    startMinutes = startMinutes + 15;
    
    const totalMinutes = endMinutes - startMinutes;
    const totalHours = totalMinutes / 60;
    
    // Subtract break duration if shift is long enough (more than 4 hours)
    let breakHours = 0;
    if (totalHours > 4) {
      breakHours = (this.breakDuration || 0) / 60;
    }
    
    // Store hours worked (with 15-min buffer applied for pay)
    this.hoursWorked = Math.max(0, parseFloat((totalHours - breakHours).toFixed(2)));
  }
  next();
});

// Virtual for scheduled duration
shiftSchema.virtual('scheduledDuration').get(function () {
  const [startH, startM] = this.startTime.split(':').map(Number);
  const [endH, endM] = this.endTime.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
});

// Static method to check for overlapping shifts
shiftSchema.statics.hasOverlap = async function (employeeId, date, startTime, endTime, excludeShiftId = null) {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const query = {
    employee: employeeId,
    date: { $gte: dateStart, $lte: dateEnd },
    status: { $nin: ['cancelled'] },
  };

  if (excludeShiftId) {
    query._id = { $ne: excludeShiftId };
  }

  const existingShifts = await this.find(query);

  const [newStartH, newStartM] = startTime.split(':').map(Number);
  const [newEndH, newEndM] = endTime.split(':').map(Number);
  const newStart = newStartH * 60 + newStartM;
  let newEnd = newEndH * 60 + newEndM;
  if (newEnd < newStart) newEnd += 24 * 60;

  for (const shift of existingShifts) {
    const [existStartH, existStartM] = shift.startTime.split(':').map(Number);
    const [existEndH, existEndM] = shift.endTime.split(':').map(Number);
    const existStart = existStartH * 60 + existStartM;
    let existEnd = existEndH * 60 + existEndM;
    if (existEnd < existStart) existEnd += 24 * 60;

    // Check for overlap
    if (newStart < existEnd && newEnd > existStart) {
      return true;
    }
  }

  return false;
};

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;

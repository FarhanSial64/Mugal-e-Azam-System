import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
    },
    // Week start date (always Monday)
    weekStartDate: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    // Availability for each day of the week
    monday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' }, // Available from
      endTime: { type: String, default: '23:00' },   // Available until
      notes: { type: String, default: '' },
    },
    tuesday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '23:00' },
      notes: { type: String, default: '' },
    },
    wednesday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '23:00' },
      notes: { type: String, default: '' },
    },
    thursday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '23:00' },
      notes: { type: String, default: '' },
    },
    friday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '23:00' },
      notes: { type: String, default: '' },
    },
    saturday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '23:00' },
      notes: { type: String, default: '' },
    },
    sunday: {
      isAvailable: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '23:00' },
      notes: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one availability record per employee per week
availabilitySchema.index({ employee: 1, weekStartDate: 1 }, { unique: true });

// Static method to get day name from date
availabilitySchema.statics.getDayName = function (date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date(date).getDay()];
};

// Static method to get Monday of a given week
availabilitySchema.statics.getWeekStart = function (date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Static method to check if employee is available for a shift
availabilitySchema.statics.isEmployeeAvailable = async function (employeeId, shiftDate, shiftStartTime, shiftEndTime) {
  const weekStart = this.getWeekStart(shiftDate);
  const dayName = this.getDayName(shiftDate);

  const availability = await this.findOne({
    employee: employeeId,
    weekStartDate: weekStart,
  });

  // If no availability set, assume available (default behavior)
  if (!availability) {
    return { available: true, reason: null };
  }

  const dayAvailability = availability[dayName];

  // Check if available on that day
  if (!dayAvailability.isAvailable) {
    return { 
      available: false, 
      reason: `Employee is not available on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}` 
    };
  }

  // Check if shift time fits within available hours
  const [availStartH, availStartM] = dayAvailability.startTime.split(':').map(Number);
  const [availEndH, availEndM] = dayAvailability.endTime.split(':').map(Number);
  const [shiftStartH, shiftStartM] = shiftStartTime.split(':').map(Number);
  const [shiftEndH, shiftEndM] = shiftEndTime.split(':').map(Number);

  const availStartMinutes = availStartH * 60 + availStartM;
  const availEndMinutes = availEndH * 60 + availEndM;
  const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
  const shiftEndMinutes = shiftEndH * 60 + shiftEndM;

  if (shiftStartMinutes < availStartMinutes) {
    return { 
      available: false, 
      reason: `Shift starts at ${shiftStartTime} but employee is only available from ${dayAvailability.startTime}` 
    };
  }

  if (shiftEndMinutes > availEndMinutes) {
    return { 
      available: false, 
      reason: `Shift ends at ${shiftEndTime} but employee is only available until ${dayAvailability.endTime}` 
    };
  }

  return { available: true, reason: null };
};

const Availability = mongoose.model('Availability', availabilitySchema);
export default Availability;

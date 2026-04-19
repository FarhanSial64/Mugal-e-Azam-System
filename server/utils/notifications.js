import { sendEmail, emailTemplates } from './email.js';
import { sendSMS, smsTemplates } from './sms.js';
import { Notification } from '../models/index.js';

/**
 * Send notification through multiple channels
 * @param {object} options - Notification options
 */
export const sendNotification = async ({
  userId,
  user, // User object with email, phone, notificationPreferences
  type,
  title,
  message,
  emailOptions = null,
  smsMessage = null,
  relatedModel = null,
  relatedId = null,
  metadata = {},
}) => {
  try {
    const resolvedUser = user?.toObject ? user.toObject() : user;

    // Create notification record
    const notification = await Notification.create({
      recipient: userId,
      type,
      title,
      message,
      relatedModel,
      relatedId,
      metadata,
    });

    // Send email if enabled
    if (resolvedUser?.notificationPreferences?.email && emailOptions && resolvedUser?.email) {
      const emailResult = await sendEmail({
        to: resolvedUser.email,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
      });

      notification.channels.email.sent = emailResult.success;
      notification.channels.email.sentAt = emailResult.success ? new Date() : null;
      notification.channels.email.error = emailResult.error || null;
    }

    // Send SMS if enabled
    if (resolvedUser?.notificationPreferences?.sms && smsMessage && resolvedUser?.phone) {
      const smsResult = await sendSMS(resolvedUser.phone, smsMessage);

      notification.channels.sms.sent = smsResult.success;
      notification.channels.sms.sentAt = smsResult.success ? new Date() : null;
      notification.channels.sms.error = smsResult.error || null;
    }

    await notification.save();

    return notification;
  } catch (error) {
    console.error('❌ Notification error:', error.message);
    throw error;
  }
};

/**
 * Notify employee about shift assignment
 */
export const notifyShiftAssigned = async (user, shift) => {
  const shiftDate = new Date(shift.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const emailContent = emailTemplates.shiftAssigned(
    user.name,
    shiftDate,
    shift.startTime,
    shift.endTime
  );

  const smsMessage = smsTemplates.shiftAssigned(
    new Date(shift.date).toLocaleDateString('en-GB'),
    shift.startTime,
    shift.endTime
  );

  return sendNotification({
    userId: user._id,
    user,
    type: 'shift_assigned',
    title: 'New Shift Assigned',
    message: `You have been assigned a shift on ${shiftDate} from ${shift.startTime} to ${shift.endTime}`,
    emailOptions: emailContent,
    smsMessage,
    relatedModel: 'Shift',
    relatedId: shift._id,
  });
};

/**
 * Notify employee about payroll generation
 */
export const notifyPayrollGenerated = async (user, payroll) => {
  const weekStart = new Date(payroll.weekStartDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const weekEnd = new Date(payroll.weekEndDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const emailContent = emailTemplates.payrollGenerated(
    user.name,
    weekStart,
    weekEnd,
    payroll.totalHours,
    payroll.netPay,
    {
      hourlyRate: payroll.hourlyRate,
      grossPay: payroll.grossPay,
      deductions: payroll.deductions,
      bonuses: payroll.bonuses,
      overtimeHours: payroll.overtimeHours,
      status: payroll.status,
    }
  );

  const smsMessage = `Mugal e Azam: Your payroll is ready! Week ${weekStart}-${weekEnd}, Net Pay: £${payroll.netPay}. Check your email for details.`;

  return sendNotification({
    userId: user._id,
    user,
    type: 'payroll_generated',
    title: 'Payroll Generated',
    message: `Your payroll for ${weekStart} - ${weekEnd} is ready. Net Pay: £${payroll.netPay}`,
    emailOptions: emailContent,
    smsMessage,
    relatedModel: 'Payroll',
    relatedId: payroll._id,
  });
};

/**
 * Notify employee about payment completion
 */
export const notifyPaymentCompleted = async (user, payroll) => {
  const weekStart = new Date(payroll.weekStartDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const weekEnd = new Date(payroll.weekEndDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  const emailContent = emailTemplates.paymentCompleted(
    user.name,
    payroll.netPay,
    payroll.paymentMethod,
    {
      reference: payroll.paymentReference,
      paidAt: new Date(payroll.paidAt).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      weekPeriod: `${weekStart} - ${weekEnd}`,
    }
  );

  const smsMessage = smsTemplates.paymentCompleted(payroll.netPay);

  return sendNotification({
    userId: user._id,
    user,
    type: 'payment_completed',
    title: 'Payment Completed',
    message: `Your salary of £${payroll.netPay} has been paid via ${payroll.paymentMethod}`,
    emailOptions: emailContent,
    smsMessage,
    relatedModel: 'Payroll',
    relatedId: payroll._id,
  });
};

/**
 * Notify new employee about account creation
 */
export const notifyAccountCreated = async (user, tempPassword) => {
  const normalizedUser = user?.toObject ? user.toObject() : user;

  const emailContent = emailTemplates.accountCreated(
    normalizedUser.name,
    normalizedUser.email,
    tempPassword
  );

  return sendNotification({
    userId: normalizedUser._id,
    user: {
      _id: normalizedUser._id,
      name: normalizedUser.name,
      email: normalizedUser.email,
      phone: normalizedUser.phone,
      notificationPreferences: { email: true, sms: false },
    },
    type: 'account_created',
    title: 'Welcome to Mugal e Azam',
    message: 'Your employee account has been created. Check your email for login details.',
    emailOptions: emailContent,
    relatedModel: 'User',
    relatedId: normalizedUser._id,
  });
};

/**
 * Notify employee about shift cancellation
 */
export const notifyShiftCancelled = async (user, shift, reason = '') => {
  const shiftDate = new Date(shift.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const emailContent = emailTemplates.shiftCancelled(
    user.name,
    shiftDate,
    shift.startTime,
    shift.endTime,
    reason
  );

  const smsMessage = `Mugal e Azam: Your shift on ${new Date(shift.date).toLocaleDateString('en-GB')} (${shift.startTime}-${shift.endTime}) has been CANCELLED. Contact management for details.`;

  return sendNotification({
    userId: user._id,
    user,
    type: 'shift_cancelled',
    title: 'Shift Cancelled',
    message: `Your shift on ${shiftDate} from ${shift.startTime} to ${shift.endTime} has been cancelled`,
    emailOptions: emailContent,
    smsMessage,
    relatedModel: 'Shift',
    relatedId: shift._id,
  });
};

/**
 * Notify employee about shift update
 */
export const notifyShiftUpdated = async (user, originalShift, updatedShift) => {
  const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const originalDate = formatDate(originalShift.date);
  const newDate = formatDate(updatedShift.date);
  const originalTime = `${originalShift.startTime} - ${originalShift.endTime}`;
  const newTime = `${updatedShift.startTime} - ${updatedShift.endTime}`;

  // Build changes description
  const changes = [];
  if (originalShift.date.toString() !== updatedShift.date.toString()) {
    changes.push('Date changed');
  }
  if (originalShift.startTime !== updatedShift.startTime || originalShift.endTime !== updatedShift.endTime) {
    changes.push('Time changed');
  }
  if (originalShift.shiftType !== updatedShift.shiftType) {
    changes.push(`Shift type: ${updatedShift.shiftType}`);
  }

  const emailContent = emailTemplates.shiftUpdated(
    user.name,
    originalDate,
    originalTime,
    newDate,
    newTime,
    changes.join(', ')
  );

  const smsMessage = `Mugal e Azam: Your shift has been updated. New: ${new Date(updatedShift.date).toLocaleDateString('en-GB')} (${updatedShift.startTime}-${updatedShift.endTime}). Check email for details.`;

  return sendNotification({
    userId: user._id,
    user,
    type: 'shift_updated',
    title: 'Shift Updated',
    message: `Your shift has been updated. New schedule: ${newDate} from ${updatedShift.startTime} to ${updatedShift.endTime}`,
    emailOptions: emailContent,
    smsMessage,
    relatedModel: 'Shift',
    relatedId: updatedShift._id,
  });
};

export default sendNotification;

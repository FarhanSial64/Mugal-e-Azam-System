import twilio from 'twilio';
import config from '../config/env.js';

let twilioClient = null;

// Initialize Twilio client only if enabled
const getClient = () => {
  if (!config.twilio.enabled) {
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  return twilioClient;
};

/**
 * Send SMS
 * @param {string} to - Recipient phone number
 * @param {string} message - SMS message
 */
export const sendSMS = async (to, message) => {
  if (!config.twilio.enabled) {
    console.log('📵 SMS disabled - would have sent:', message);
    return { success: false, error: 'SMS is disabled' };
  }

  try {
    const client = getClient();
    if (!client) {
      throw new Error('Twilio client not initialized');
    }

    const result = await client.messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to: to,
    });

    console.log(`📱 SMS sent: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('❌ SMS error:', error.message);
    return { success: false, error: error.message };
  }
};

// SMS templates
export const smsTemplates = {
  shiftAssigned: (date, startTime, endTime) =>
    `Mugal e Azam: New shift assigned - ${date}, ${startTime}-${endTime}. Check your dashboard for details.`,

  shiftReminder: (date, startTime) =>
    `Mugal e Azam Reminder: Your shift starts today at ${startTime}. Don't be late!`,

  paymentCompleted: (amount) =>
    `Mugal e Azam: Your salary of £${amount} has been paid. Thank you!`,
};

export default sendSMS;

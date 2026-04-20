import nodemailer from 'nodemailer';
import config from '../config/env.js';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.password,
    },
  });
};

/**
 * Send email
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return { success: false, error: error.message };
  }
};

// Email templates
export const emailTemplates = {
  shiftAssigned: (employeeName, shiftDate, startTime, endTime) => ({
    subject: 'New Shift Assigned - Mugal e Azam',
    text: `Hi ${employeeName},\n\nYou have been assigned a new shift:\nDate: ${shiftDate}\nTime: ${startTime} - ${endTime}\n\nPlease make sure to arrive on time.\n\nBest regards,\nMugal e Azam Management`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Mugal e Azam</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">New Shift Assigned</h2>
          <p>Hi <strong>${employeeName}</strong>,</p>
          <p>You have been assigned a new shift:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${shiftDate}</p>
            <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${startTime} - ${endTime}</p>
          </div>
          <p>Please make sure to arrive on time.</p>
          <p style="color: #666; margin-top: 30px;">Best regards,<br/>Mugal e Azam Management</p>
        </div>
      </div>
    `,
  }),

  payrollGenerated: (employeeName, weekStart, weekEnd, totalHours, netPay, details = {}) => ({
    subject: '💼 Weekly Payroll Summary - Mugal e Azam',
    text: `Hi ${employeeName},\n\nYour payroll for the week ${weekStart} - ${weekEnd} has been calculated.\n\nSummary:\n- Total Hours: ${totalHours}h\n- Hourly Rate: £${details.hourlyRate || 'N/A'}/hr\n- Gross Pay: £${details.grossPay || netPay}\n- Deductions: £${details.deductions || 0}\n- Net Pay: £${netPay}\n- Status: ${details.status || 'Pending'}\n\nPayment will be processed according to the regular pay schedule.\n\nBest regards,\nMugal e Azam Management`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ Mugal e Azam</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Weekly Payroll Summary</p>
        </div>
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #333;">Hi <strong>${employeeName}</strong>,</p>
          <p style="color: #666;">Your payroll for the week has been calculated and is ready for review.</p>
          
          <!-- Pay Period -->
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #666; font-size: 14px;">Pay Period</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600; color: #333;">📅 ${weekStart} - ${weekEnd}</p>
          </div>

          <!-- Pay Details Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f8f9fa;">
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">⏱️ Total Hours Worked</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${totalHours} hours</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">💷 Hourly Rate</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">£${details.hourlyRate || 'N/A'}/hr</td>
            </tr>
            ${details.overtimeHours > 0 ? `
            <tr style="background: #fff3cd;">
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">⚡ Overtime Hours</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">${details.overtimeHours}h @ 1.5x</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">📊 Gross Pay</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">£${details.grossPay || netPay}</td>
            </tr>
            ${details.deductions > 0 ? `
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #dc3545;">➖ Deductions</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right; color: #dc3545;">-£${details.deductions}</td>
            </tr>
            ` : ''}
            ${details.bonuses > 0 ? `
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #28a745;">➕ Bonuses</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right; color: #28a745;">+£${details.bonuses}</td>
            </tr>
            ` : ''}
          </table>

          <!-- Net Pay Highlight -->
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">NET PAY</p>
            <p style="margin: 5px 0 0 0; color: white; font-size: 36px; font-weight: 700;">£${netPay}</p>
          </div>

          <!-- Status Badge -->
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; padding: 8px 20px; background: ${details.status === 'paid' ? '#28a745' : '#ffc107'}; color: ${details.status === 'paid' ? 'white' : '#333'}; border-radius: 20px; font-weight: 600; text-transform: uppercase; font-size: 12px;">
              ${details.status === 'paid' ? '✅ PAID' : '⏳ PENDING PAYMENT'}
            </span>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 25px;">Payment will be processed according to the regular pay schedule. If you have any questions about your payroll, please contact management.</p>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">Best regards,<br/><strong>Mugal e Azam Management</strong></p>
          </div>
        </div>
        <div style="background: #333; padding: 15px; text-align: center;">
          <p style="color: #999; font-size: 11px; margin: 0;">This is an automated payroll notification. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  }),

  paymentCompleted: (employeeName, amount, paymentMethod, details = {}) => ({
    subject: '✅ Payment Processed - Mugal e Azam',
    text: `Hi ${employeeName},\n\nGreat news! Your payment of £${amount} has been processed via ${paymentMethod}.\n\nPayment Details:\n- Amount: £${amount}\n- Method: ${paymentMethod}\n- Reference: ${details.reference || 'N/A'}\n- Date: ${details.paidAt || new Date().toLocaleDateString()}\n\nThank you for your hard work!\n\nBest regards,\nMugal e Azam Management`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f4f4;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ Mugal e Azam</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Payment Confirmation</p>
        </div>
        <div style="padding: 30px; background: white;">
          <div style="text-align: center; margin-bottom: 25px;">
            <div style="width: 80px; height: 80px; background: #d4edda; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 40px;">✅</span>
            </div>
            <h2 style="color: #28a745; margin: 0;">Payment Successful!</h2>
          </div>
          
          <p style="font-size: 16px; color: #333; text-align: center;">Hi <strong>${employeeName}</strong>, your payment has been processed.</p>
          
          <!-- Amount Highlight -->
          <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; text-align: center; margin: 25px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">Amount Paid</p>
            <p style="margin: 5px 0 0 0; color: #28a745; font-size: 42px; font-weight: 700;">£${amount}</p>
          </div>

          <!-- Payment Details -->
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #666;">Payment Method</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; text-transform: capitalize;">${paymentMethod.replace('_', ' ')}</td>
            </tr>
            ${details.reference ? `
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #666;">Reference</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right; font-family: monospace;">${details.reference}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #666;">Payment Date</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">${details.paidAt || new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            ${details.weekPeriod ? `
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; color: #666;">Pay Period</td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">${details.weekPeriod}</td>
            </tr>
            ` : ''}
          </table>

          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 25px;">Thank you for your hard work and dedication! 🙏</p>
          
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">Best regards,<br/><strong>Mugal e Azam Management</strong></p>
          </div>
        </div>
        <div style="background: #333; padding: 15px; text-align: center;">
          <p style="color: #999; font-size: 11px; margin: 0;">This is an automated payment confirmation. Please keep this for your records.</p>
        </div>
      </div>
    `,
  }),

  accountCreated: (employeeName, email, tempPassword) => ({
    subject: 'Welcome to Mugal e Azam - Account Created',
    text: `Hi ${employeeName},\n\nYour account has been created.\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.\n\nBest regards,\nMugal e Azam Management`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Mugal e Azam</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Your Account is Ready!</h2>
          <p>Hi <strong>${employeeName}</strong>,</p>
          <p>Your employee account has been created. Here are your login credentials:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>🔑 Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #e74c3c;"><strong>Important:</strong> Please log in and change your password immediately.</p>
          <p style="color: #666; margin-top: 30px;">Best regards,<br/>Mugal e Azam Management</p>
        </div>
      </div>
    `,
  }),

  passwordReset: (employeeName, email, tempPassword, loginUrl) => ({
    subject: 'Password Reset - Mugal e Azam Account',
    text: `Hi ${employeeName},\n\nYour password has been reset by management.\n\nUpdated login details:\nEmail: ${email}\nTemporary Password: ${tempPassword}\nLogin: ${loginUrl}\n\nPlease log in and change your password immediately.\n\nBest regards,\nMugal e Azam Management`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Mugal e Azam</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Password Reset Successful</h2>
          <p>Hi <strong>${employeeName}</strong>,</p>
          <p>Your password has been reset by management. Please use the credentials below to sign in:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
            <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>🔑 Temporary Password:</strong> ${tempPassword}</p>
            <p style="margin: 10px 0 0 0;"><strong>🔗 Login:</strong> <a href="${loginUrl}" target="_blank" rel="noopener noreferrer">${loginUrl}</a></p>
          </div>
          <p style="color: #e74c3c;"><strong>Important:</strong> Please log in and change your password immediately for security.</p>
          <p style="color: #666; margin-top: 30px;">Best regards,<br/>Mugal e Azam Management</p>
        </div>
      </div>
    `,
  }),

  shiftCancelled: (employeeName, shiftDate, startTime, endTime, reason = '') => ({
    subject: '⚠️ Shift Cancelled - Mugal e Azam',
    text: `Hi ${employeeName},\n\nYour shift on ${shiftDate} from ${startTime} - ${endTime} has been cancelled.${reason ? `\n\nReason: ${reason}` : ''}\n\nPlease contact management if you have any questions.\n\nBest regards,\nMugal e Azam Management`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Mugal e Azam</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #e74c3c;">⚠️ Shift Cancelled</h2>
          <p>Hi <strong>${employeeName}</strong>,</p>
          <p>Your shift has been cancelled:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${shiftDate}</p>
            <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${startTime} - ${endTime}</p>
            ${reason ? `<p style="margin: 5px 0;"><strong>📝 Reason:</strong> ${reason}</p>` : ''}
          </div>
          <p>Please contact management if you have any questions.</p>
          <p style="color: #666; margin-top: 30px;">Best regards,<br/>Mugal e Azam Management</p>
        </div>
      </div>
    `,
  }),

  shiftUpdated: (employeeName, originalDate, originalTime, newDate, newTime, changes = '') => ({
    subject: '📝 Shift Updated - Mugal e Azam',
    text: `Hi ${employeeName},\n\nYour shift has been updated.\n\nOriginal: ${originalDate} (${originalTime})\nNew: ${newDate} (${newTime})${changes ? `\n\nChanges: ${changes}` : ''}\n\nPlease take note of the new schedule.\n\nBest regards,\nMugal e Azam Management`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Mugal e Azam</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #f39c12;">📝 Shift Updated</h2>
          <p>Hi <strong>${employeeName}</strong>,</p>
          <p>Your shift has been updated:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between;">
              <div style="flex: 1; padding: 10px; border-right: 1px solid #eee;">
                <p style="color: #999; margin: 0 0 10px 0; font-size: 0.9em;">ORIGINAL</p>
                <p style="margin: 5px 0; text-decoration: line-through; color: #999;">📅 ${originalDate}</p>
                <p style="margin: 5px 0; text-decoration: line-through; color: #999;">⏰ ${originalTime}</p>
              </div>
              <div style="flex: 1; padding: 10px;">
                <p style="color: #27ae60; margin: 0 0 10px 0; font-size: 0.9em;">NEW</p>
                <p style="margin: 5px 0;"><strong>📅 ${newDate}</strong></p>
                <p style="margin: 5px 0;"><strong>⏰ ${newTime}</strong></p>
              </div>
            </div>
            ${changes ? `<p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #eee;"><strong>Changes:</strong> ${changes}</p>` : ''}
          </div>
          <p>Please take note of the new schedule.</p>
          <p style="color: #666; margin-top: 30px;">Best regards,<br/>Mugal e Azam Management</p>
        </div>
      </div>
    `,
  }),
};

export default sendEmail;

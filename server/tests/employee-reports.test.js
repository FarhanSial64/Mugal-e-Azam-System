import request from 'supertest';
import app from '../app.js';
import { User, Shift, Payroll } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';

describe('Employee Reports API', () => {
  it('returns employee analytics with weekly, monthly, and hourly data', async () => {
    const manager = await User.create({
      name: 'Report Manager',
      email: 'report.manager@example.com',
      phone: '03006661111',
      password: 'password123',
      role: 'manager',
      jobRole: 'manager',
      hourlyWage: 25,
    });

    const employee = await User.create({
      name: 'Report Employee',
      email: 'report.employee@example.com',
      phone: '03116662222',
      password: 'password123',
      role: 'employee',
      jobRole: 'waiter',
      hourlyWage: 12,
    });

    const shiftDate = new Date();
    shiftDate.setDate(shiftDate.getDate() - 2);

    const shift = await Shift.create({
      employee: employee._id,
      date: shiftDate,
      startTime: '10:00',
      endTime: '18:00',
      shiftType: 'morning',
      status: 'completed',
      assignedBy: manager._id,
      breakDuration: 0,
    });

    await Payroll.create({
      employee: employee._id,
      weekStartDate: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate() - 1),
      weekEndDate: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate() + 5),
      regularHours: 7.75,
      overtimeHours: 0,
      totalHours: 7.75,
      hourlyRate: 12,
      overtimeRate: 1.5,
      regularPay: 93,
      overtimePay: 0,
      deductions: 0,
      bonuses: 0,
      grossPay: 93,
      netPay: 93,
      status: 'pending',
      shifts: [shift._id],
      generatedBy: manager._id,
    });

    const employeeToken = generateToken(employee._id);

    const response = await request(app)
      .get('/api/dashboard/employee/reports?period=monthly')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.summary.totalShifts).toBeGreaterThan(0);
    expect(response.body.data.summary.totalHoursWorked).toBeGreaterThan(0);
    expect(Array.isArray(response.body.data.weeklyTrend)).toBe(true);
    expect(Array.isArray(response.body.data.monthlyTrend)).toBe(true);
    expect(Array.isArray(response.body.data.hourlyBreakdown)).toBe(true);
    expect(response.body.data.earnings.totalTracked).toBeGreaterThan(0);
  });

  it('blocks managers from employee-only reports route', async () => {
    const manager = await User.create({
      name: 'Blocked Manager',
      email: 'blocked.manager@example.com',
      phone: '03007779999',
      password: 'password123',
      role: 'manager',
      jobRole: 'manager',
      hourlyWage: 25,
    });

    const token = generateToken(manager._id);

    const response = await request(app)
      .get('/api/dashboard/employee/reports')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

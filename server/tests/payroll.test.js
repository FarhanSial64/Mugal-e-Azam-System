import request from 'supertest';
import app from '../app.js';
import { User, Shift, Payroll } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';

const getManagerToken = async () => {
  const manager = await User.create({
    name: 'Payroll Manager',
    email: 'payroll.manager@example.com',
    phone: '03009999999',
    password: 'password123',
    role: 'manager',
    jobRole: 'manager',
    hourlyWage: 25,
  });

  return { manager, token: generateToken(manager._id) };
};

describe('Payroll API', () => {
  it('calculates payroll from completed shifts', async () => {
    const { manager, token } = await getManagerToken();
    const employee = await User.create({
      name: 'Payroll Employee',
      email: 'payroll.employee@example.com',
      phone: '03112223333',
      password: 'password123',
      role: 'employee',
      jobRole: 'waiter',
      hourlyWage: 12,
      notificationPreferences: { email: false, sms: false },
    });

    const shiftDate = new Date();
    shiftDate.setDate(shiftDate.getDate() - 1);

    await Shift.create({
      employee: employee._id,
      date: shiftDate,
      startTime: '09:00',
      endTime: '17:00',
      shiftType: 'morning',
      status: 'completed',
      assignedBy: manager._id,
      hoursWorked: 7.5,
    });

    const response = await request(app)
      .post('/api/payroll/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId: employee._id.toString(),
        weekStartDate: new Date().toISOString(),
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const payroll = await Payroll.findOne({ employee: employee._id });
    expect(payroll).toBeTruthy();
    expect(payroll.totalHours).toBeGreaterThan(0);
    expect(payroll.netPay).toBeGreaterThan(0);
  });

  it('refreshes payroll when a completed shift break duration changes', async () => {
    const { manager, token } = await getManagerToken();
    const employee = await User.create({
      name: 'Payroll Update Employee',
      email: 'payroll.update.employee@example.com',
      phone: '03112224444',
      password: 'password123',
      role: 'employee',
      jobRole: 'waiter',
      hourlyWage: 12,
      notificationPreferences: { email: false, sms: false },
    });

    const shiftDate = new Date();
    shiftDate.setDate(shiftDate.getDate() - 1);

    const shift = await Shift.create({
      employee: employee._id,
      date: shiftDate,
      startTime: '09:00',
      endTime: '17:00',
      shiftType: 'morning',
      status: 'completed',
      assignedBy: manager._id,
      breakDuration: 0,
    });

    await Payroll.calculateForShift(shift, User);

    const beforeUpdate = await Payroll.findOne({ employee: employee._id });
    expect(beforeUpdate).toBeTruthy();

    const response = await request(app)
      .put(`/api/shifts/${shift._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ breakDuration: 60 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const afterUpdate = await Payroll.findOne({ employee: employee._id });
    expect(afterUpdate).toBeTruthy();
    expect(afterUpdate.netPay).toBeLessThan(beforeUpdate.netPay);
  });

  it('rejects payroll calculation for inactive employees', async () => {
    const { token } = await getManagerToken();
    const inactiveEmployee = await User.create({
      name: 'Inactive Employee',
      email: 'inactive.employee@example.com',
      phone: '03112225555',
      password: 'password123',
      role: 'employee',
      jobRole: 'waiter',
      hourlyWage: 12,
      isActive: false,
    });

    const response = await request(app)
      .post('/api/payroll/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employeeId: inactiveEmployee._id.toString(),
        weekStartDate: new Date().toISOString(),
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/inactive/i);
  });
});
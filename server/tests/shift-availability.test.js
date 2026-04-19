import request from 'supertest';
import app from '../app.js';
import { User, Shift } from '../models/index.js';
import Availability from '../models/Availability.js';
import { generateToken } from '../utils/jwt.js';

const setupUsers = async () => {
  const manager = await User.create({
    name: 'Shift Manager',
    email: 'shift.manager@example.com',
    phone: '03007778888',
    password: 'password123',
    role: 'manager',
    jobRole: 'manager',
    hourlyWage: 25,
  });

  const employee = await User.create({
    name: 'Shift Employee',
    email: 'shift.employee@example.com',
    phone: '03113334444',
    password: 'password123',
    role: 'employee',
    jobRole: 'waiter',
    hourlyWage: 10,
  });

  return {
    manager,
    employee,
    token: generateToken(manager._id),
  };
};

describe('Shift overlap and availability', () => {
  it('rejects overlapping shifts for same employee', async () => {
    const { manager, employee, token } = await setupUsers();

    const future = new Date();
    future.setDate(future.getDate() + 2);

    await Shift.create({
      employee: employee._id,
      date: future,
      startTime: '09:00',
      endTime: '12:00',
      shiftType: 'morning',
      status: 'scheduled',
      assignedBy: manager._id,
    });

    const response = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        employee: employee._id.toString(),
        date: future.toISOString(),
        startTime: '11:00',
        endTime: '14:00',
        shiftType: 'morning',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/overlapping/i);
  });

  it('fails availability check when employee marks day unavailable', async () => {
    const { employee } = await setupUsers();
    const monday = Availability.getWeekStart(new Date());

    await Availability.create({
      employee: employee._id,
      weekStartDate: monday,
      monday: { isAvailable: false, startTime: '09:00', endTime: '23:00', notes: '' },
      tuesday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      wednesday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      thursday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      friday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      saturday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
      sunday: { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '' },
    });

    const result = await Availability.isEmployeeAvailable(employee._id, monday, '10:00', '12:00');

    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/not available/i);
  });
});
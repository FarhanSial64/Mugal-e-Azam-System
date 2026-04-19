import request from 'supertest';
import app from '../app.js';
import { User } from '../models/index.js';

describe('Auth API', () => {
  it('registers a new employee via signup and returns token', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Ali Tester',
        email: 'ali@example.com',
        phone: '03001234567',
        password: 'password123',
        confirmPassword: 'password123',
        jobRole: 'waiter',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeTruthy();
    expect(response.body.data.role).toBe('employee');

    const saved = await User.findOne({ email: 'ali@example.com' });
    expect(saved).toBeTruthy();
  });

  it('logs in an existing user with valid credentials', async () => {
    await User.create({
      name: 'Manager User',
      email: 'manager@example.com',
      phone: '03005555555',
      password: 'password123',
      role: 'manager',
      jobRole: 'manager',
      hourlyWage: 20,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'manager@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeTruthy();
    expect(response.body.data.role).toBe('manager');
  });
});
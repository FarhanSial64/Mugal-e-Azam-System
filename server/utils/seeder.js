import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Shift, Payroll, Notification } from '../models/index.js';
import connectDB from '../config/db.js';

dotenv.config();

// Sample data
const employees = [
  {
    name: 'Admin Manager',
    email: 'admin@mugaleazam.com',
    phone: '07700900001',
    password: 'admin123',
    role: 'manager',
    jobRole: 'manager',
    hourlyWage: 15,
  },
  {
    name: 'Ahmed Khan',
    email: 'ahmed@mugaleazam.com',
    phone: '07700900002',
    password: 'employee123',
    role: 'employee',
    jobRole: 'chef',
    hourlyWage: 12,
  },
  {
    name: 'Fatima Ali',
    email: 'fatima@mugaleazam.com',
    phone: '07700900003',
    password: 'employee123',
    role: 'employee',
    jobRole: 'waiter',
    hourlyWage: 10,
  },
  {
    name: 'Usman Shah',
    email: 'usman@mugaleazam.com',
    phone: '07700900004',
    password: 'employee123',
    role: 'employee',
    jobRole: 'waiter',
    hourlyWage: 10,
  },
  {
    name: 'Ayesha Begum',
    email: 'ayesha@mugaleazam.com',
    phone: '07700900005',
    password: 'employee123',
    role: 'employee',
    jobRole: 'cashier',
    hourlyWage: 11,
  },
  {
    name: 'Mohammed Iqbal',
    email: 'mohammed@mugaleazam.com',
    phone: '07700900006',
    password: 'employee123',
    role: 'employee',
    jobRole: 'chef',
    hourlyWage: 13,
  },
  {
    name: 'Zainab Hassan',
    email: 'zainab@mugaleazam.com',
    phone: '07700900007',
    password: 'employee123',
    role: 'employee',
    jobRole: 'waiter',
    hourlyWage: 10,
  },
  {
    name: 'Bilal Ahmed',
    email: 'bilal@mugaleazam.com',
    phone: '07700900008',
    password: 'employee123',
    role: 'employee',
    jobRole: 'delivery',
    hourlyWage: 9,
  },
  {
    name: 'Amina Yusuf',
    email: 'amina@mugaleazam.com',
    phone: '07700900009',
    password: 'employee123',
    role: 'employee',
    jobRole: 'cleaner',
    hourlyWage: 9,
  },
  {
    name: 'Rashid Malik',
    email: 'rashid@mugaleazam.com',
    phone: '07700900010',
    password: 'employee123',
    role: 'employee',
    jobRole: 'helper',
    hourlyWage: 8.5,
  },
];

// Generate sample shifts for the current week
const generateShifts = (employees, managerId) => {
  const shifts = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const shiftTimes = [
    { start: '09:00', end: '15:00', type: 'morning' },
    { start: '16:00', end: '22:00', type: 'evening' },
    { start: '18:00', end: '23:00', type: 'evening' },
    { start: '19:00', end: '00:00', type: 'night' },
  ];

  // Skip manager (index 0)
  for (let i = 1; i < employees.length; i++) {
    const employee = employees[i];
    
    // Create 3-5 shifts per employee for the week
    const numShifts = Math.floor(Math.random() * 3) + 3;
    const usedDays = new Set();

    for (let j = 0; j < numShifts; j++) {
      let day;
      do {
        day = Math.floor(Math.random() * 7);
      } while (usedDays.has(day));
      usedDays.add(day);

      const shiftDate = new Date(monday);
      shiftDate.setDate(monday.getDate() + day);

      const shiftTime = shiftTimes[Math.floor(Math.random() * shiftTimes.length)];
      
      // Determine status based on date
      let status = 'scheduled';
      let hoursWorked = 0;
      let actualCheckIn = null;
      let actualCheckOut = null;

      if (shiftDate < today) {
        status = 'completed';
        // Calculate scheduled hours
        const [startH, startM] = shiftTime.start.split(':').map(Number);
        const [endH, endM] = shiftTime.end.split(':').map(Number);
        let startMin = startH * 60 + startM;
        let endMin = endH * 60 + endM;
        if (endMin < startMin) endMin += 24 * 60;
        hoursWorked = (endMin - startMin) / 60;

        // Set actual check in/out
        actualCheckIn = new Date(shiftDate);
        actualCheckIn.setHours(startH, startM + Math.floor(Math.random() * 10) - 5);
        actualCheckOut = new Date(shiftDate);
        if (endH < startH) {
          actualCheckOut.setDate(actualCheckOut.getDate() + 1);
        }
        actualCheckOut.setHours(endH, endM + Math.floor(Math.random() * 15));
      }

      shifts.push({
        employee: employee._id,
        date: shiftDate,
        startTime: shiftTime.start,
        endTime: shiftTime.end,
        shiftType: shiftTime.type,
        status,
        hoursWorked,
        actualCheckIn,
        actualCheckOut,
        assignedBy: managerId,
      });
    }
  }

  return shifts;
};

// Seed database
const seedDB = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Shift.deleteMany({});
    await Payroll.deleteMany({});
    await Notification.deleteMany({});

    // Create employees
    console.log('👥 Creating employees...');
    const createdUsers = await User.create(employees);
    console.log(`   Created ${createdUsers.length} users`);

    // Get manager ID
    const manager = createdUsers.find((u) => u.role === 'manager');

    // Create shifts
    console.log('📅 Creating shifts...');
    const shifts = generateShifts(createdUsers, manager._id);
    const createdShifts = await Shift.create(shifts);
    console.log(`   Created ${createdShifts.length} shifts`);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    🌱 DATABASE SEEDED!                         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║   Manager Login:                                               ║
║   📧 Email: admin@mugaleazam.com                               ║
║   🔑 Password: admin123                                        ║
║                                                                ║
║   Employee Login (any):                                        ║
║   📧 Email: ahmed@mugaleazam.com                               ║
║   🔑 Password: employee123                                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDB();

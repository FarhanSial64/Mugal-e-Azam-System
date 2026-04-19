import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import { errorHandler } from './middlewares/index.js';
import {
  authRoutes,
  employeeRoutes,
  shiftRoutes,
  payrollRoutes,
  notificationRoutes,
  dashboardRoutes,
  availabilityRoutes,
  announcementRoutes,
} from './routes/index.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Mughal-e-Azam API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/announcements', announcementRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

export default app;
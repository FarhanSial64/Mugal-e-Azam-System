import express from 'express';
import {
  getManagerDashboard,
  getEmployeeDashboard,
  getEmployeeReports,
} from '../controllers/dashboardController.js';
import { protect, managerOnly, employeeOnly } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/manager', managerOnly, getManagerDashboard);
router.get('/employee', getEmployeeDashboard);
router.get('/employee/reports', employeeOnly, getEmployeeReports);

export default router;

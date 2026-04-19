import express from 'express';
import {
  getManagerDashboard,
  getEmployeeDashboard,
} from '../controllers/dashboardController.js';
import { protect, managerOnly } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/manager', managerOnly, getManagerDashboard);
router.get('/employee', getEmployeeDashboard);

export default router;

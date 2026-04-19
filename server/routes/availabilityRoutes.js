import express from 'express';
import {
  getMyAvailability,
  setMyAvailability,
  getAllAvailability,
  getEmployeeAvailability,
  checkAvailability,
} from '../controllers/availabilityController.js';
import { protect, managerOnly } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.route('/my')
  .get(getMyAvailability)
  .put(setMyAvailability);

// Manager routes
router.get('/', managerOnly, getAllAvailability);
router.get('/employee/:employeeId', managerOnly, getEmployeeAvailability);
router.post('/check', managerOnly, checkAvailability);

export default router;

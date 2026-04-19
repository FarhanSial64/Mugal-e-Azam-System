import express from 'express';
import {
  getShifts,
  getWeeklyShifts,
  getMyShifts,
  getShift,
  createShift,
  bulkCreateShifts,
  updateShift,
  cancelShift,
  checkIn,
  checkOut,
  getShiftStats,
} from '../controllers/shiftController.js';
import { protect, managerOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createShiftSchema, updateShiftSchema } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.get('/my', getMyShifts);
router.post('/:id/checkin', checkIn);
router.post('/:id/checkout', checkOut);

// Manager routes
router.get('/week', managerOnly, getWeeklyShifts);
router.get('/stats', managerOnly, getShiftStats);
router.post('/bulk', managerOnly, bulkCreateShifts);

router.route('/')
  .get(managerOnly, getShifts)
  .post(managerOnly, validate(createShiftSchema), createShift);

router.route('/:id')
  .get(getShift)
  .put(managerOnly, validate(updateShiftSchema), updateShift)
  .delete(managerOnly, cancelShift);

export default router;

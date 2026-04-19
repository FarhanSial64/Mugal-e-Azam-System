import express from 'express';
import {
  getPayrolls,
  getMyPayrolls,
  getPayroll,
  calculatePayroll,
  markAsPaid,
  bulkMarkAsPaid,
  updatePayroll,
  getPayrollSummary,
  deletePayroll,
} from '../controllers/payrollController.js';
import { protect, managerOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { calculatePayrollSchema, markPayrollPaidSchema, updatePayrollSchema } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.get('/my', getMyPayrolls);

// Manager routes
router.get('/summary', managerOnly, getPayrollSummary);
router.post('/calculate', managerOnly, validate(calculatePayrollSchema), calculatePayroll);
router.put('/bulk-pay', managerOnly, bulkMarkAsPaid);

router.route('/')
  .get(managerOnly, getPayrolls);

router.route('/:id')
  .get(getPayroll)
  .put(managerOnly, validate(updatePayrollSchema), updatePayroll)
  .delete(managerOnly, deletePayroll);

router.put('/:id/pay', managerOnly, validate(markPayrollPaidSchema), markAsPaid);

export default router;

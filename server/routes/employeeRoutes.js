import express from 'express';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  reactivateEmployee,
  resetEmployeePassword,
  getEmployeeStats,
} from '../controllers/employeeController.js';
import { protect, managerOnly } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication and manager role
router.use(protect);
router.use(managerOnly);

// Statistics route (before :id to avoid conflict)
router.get('/stats', getEmployeeStats);

// CRUD routes
router.route('/')
  .get(getEmployees)
  .post(validate(createEmployeeSchema), createEmployee);

router.route('/:id')
  .get(getEmployee)
  .put(validate(updateEmployeeSchema), updateEmployee)
  .delete(deleteEmployee);

// Special actions
router.put('/:id/reactivate', reactivateEmployee);
router.put('/:id/reset-password', resetEmployeePassword);

export default router;

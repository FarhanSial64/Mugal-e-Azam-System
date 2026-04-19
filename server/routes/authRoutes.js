import express from 'express';
import {
  register,
  login,
  signup,
  getMe,
  updateProfile,
  changePassword,
  logout,
  uploadPhoto,
  deletePhoto,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { uploadProfilePhoto } from '../middlewares/upload.js';
import { loginSchema, registerSchema, employeeSignupSchema, changePasswordSchema } from '../utils/validators.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/signup', validate(employeeSignupSchema), signup);
router.post('/login', validate(loginSchema), login);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/password', validate(changePasswordSchema), changePassword);
router.post('/logout', logout);
router.post('/profile-photo', uploadProfilePhoto, uploadPhoto);
router.delete('/profile-photo', deletePhoto);

export default router;

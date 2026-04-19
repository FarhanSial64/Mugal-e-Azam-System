import { User } from '../models/index.js';
import { generateToken } from '../utils/jwt.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';
import fs from 'fs';
import path from 'path';

/**
 * @desc    Register user / Create manager account
 * @route   POST /api/auth/register
 * @access  Public (for initial setup) / Manager only (for employee creation)
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, jobRole, hourlyWage } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError('User already exists with this email', 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: role || 'employee',
    jobRole,
    hourlyWage,
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      jobRole: user.jobRole,
      hourlyWage: user.hourlyWage,
    },
    token,
  });
});

/**
 * @desc    Employee self-signup
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password, jobRole, address } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError('An account with this email already exists', 400);
  }

  // Default hourly wage based on job role (can be adjusted by manager later)
  const defaultWages = {
    waiter: 10.00,
    'food-picker': 10.00,
    bar: 10.50,
    cleaner: 9.50,
    chef: 12.00,
    'dish-washer': 9.50,
  };

  // Create employee user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'employee', // Always employee for self-signup
    jobRole,
    hourlyWage: defaultWages[jobRole] || 10.00,
    address,
    isActive: true,
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully! You can now login.',
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      jobRole: user.jobRole,
      hourlyWage: user.hourlyWage,
    },
    token,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError('Your account has been deactivated. Please contact manager.', 401);
  }

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Generate token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      jobRole: user.jobRole,
      hourlyWage: user.hourlyWage,
      profilePhoto: user.profilePhoto,
    },
    token,
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, emergencyContact, notificationPreferences } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      name,
      phone,
      address,
      emergencyContact,
      notificationPreferences,
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    token,
  });
});

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @desc    Upload profile photo
 * @route   POST /api/auth/profile-photo
 * @access  Private
 */
export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('Please upload a file', 400);
  }

  const user = await User.findById(req.user._id);

  // Delete old profile photo if exists
  if (user.profilePhoto) {
    const oldPhotoPath = path.join(process.cwd(), 'uploads', 'profiles', path.basename(user.profilePhoto));
    if (fs.existsSync(oldPhotoPath)) {
      fs.unlinkSync(oldPhotoPath);
    }
  }

  // Save new photo path
  const photoUrl = `/uploads/profiles/${req.file.filename}`;
  user.profilePhoto = photoUrl;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile photo uploaded successfully',
    data: {
      profilePhoto: photoUrl,
    },
  });
});

/**
 * @desc    Delete profile photo
 * @route   DELETE /api/auth/profile-photo
 * @access  Private
 */
export const deletePhoto = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user.profilePhoto) {
    throw new ApiError('No profile photo to delete', 400);
  }

  // Delete photo file
  const photoPath = path.join(process.cwd(), 'uploads', 'profiles', path.basename(user.profilePhoto));
  if (fs.existsSync(photoPath)) {
    fs.unlinkSync(photoPath);
  }

  // Remove from database
  user.profilePhoto = null;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile photo deleted successfully',
  });
});

export default {
  register,
  signup,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  uploadPhoto,
  deletePhoto,
};

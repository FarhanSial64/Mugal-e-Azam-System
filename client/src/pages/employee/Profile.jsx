import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input, ProfilePhoto } from '../../components/common';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const EmployeeProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
      setNotifications({
        email: user.notificationPreferences?.email ?? true,
        sms: user.notificationPreferences?.sms ?? false,
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const response = await authAPI.updateProfile({
        ...profileData,
        notificationPreferences: notifications,
      });
      updateUser(response.data.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSavingPassword(true);
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePhotoUpload = async (file) => {
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('profilePhoto', file);
      const response = await authAPI.uploadPhoto(formData);
      updateUser({ ...user, profilePhoto: response.data.data.profilePhoto });
      toast.success('Profile photo updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    try {
      setUploadingPhoto(true);
      await authAPI.deletePhoto();
      updateUser({ ...user, profilePhoto: null });
      toast.success('Profile photo removed');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">View and update your personal information</p>
        </div>

        {/* Profile Card */}
        <Card title="Personal Information">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              <ProfilePhoto
                photoUrl={user?.profilePhoto}
                name={user?.name}
                size="xl"
                editable
                onUpload={handlePhotoUpload}
                onDelete={handlePhotoDelete}
                uploading={uploadingPhoto}
              />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{user?.name}</h3>
                <p className="text-gray-500 capitalize">{user?.jobRole?.replace('-', ' ')}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
                <p className="text-xs text-gray-400 mt-1">Click the camera to upload a photo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                leftIcon={<UserCircleIcon className="h-5 w-5" />}
              />
              <Input
                label="Email Address"
                value={user?.email}
                disabled
                leftIcon={<EnvelopeIcon className="h-5 w-5" />}
                helpText="Contact manager to update email"
              />
              <Input
                label="Phone Number"
                name="phone"
                value={profileData.phone}
                onChange={handleProfileChange}
                leftIcon={<PhoneIcon className="h-5 w-5" />}
              />
              <Input
                label="Job Role"
                value={user?.jobRole}
                disabled
                helpText="Assigned by manager"
              />
              <Input
                label="Hourly Wage"
                value={`£${user?.hourlyWage}/hr`}
                disabled
              />
              <Input
                label="Account Status"
                value={user?.isActive ? 'Active' : 'Inactive'}
                disabled
              />
            </div>

            <Input
              label="Address"
              name="address"
              value={profileData.address}
              onChange={handleProfileChange}
              placeholder="Your address"
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={savingProfile}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Notification Preferences */}
        <Card title="Notification Preferences">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-6 w-6 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Get shift assignments and payroll updates via email</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-6 w-6 text-gray-500" />
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-500">Get important alerts via text message</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.sms}
                  onChange={(e) => setNotifications(prev => ({ ...prev, sms: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card title="Change Password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              leftIcon={<KeyIcon className="h-5 w-5" />}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                leftIcon={<KeyIcon className="h-5 w-5" />}
                required
              />
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                leftIcon={<KeyIcon className="h-5 w-5" />}
                required
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" variant="warning" isLoading={savingPassword}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeProfilePage;

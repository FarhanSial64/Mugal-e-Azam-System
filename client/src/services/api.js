import axios from 'axios';

const LOCAL_API_URL = import.meta.env.VITE_API_URL || '/api';
const REMOTE_API_URL = import.meta.env.VITE_API_URL_FALLBACK || '';

const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const DEFAULT_API_URL = !isLocalHost && REMOTE_API_URL ? REMOTE_API_URL : LOCAL_API_URL;

let activeApiBaseURL = DEFAULT_API_URL;

export const getApiBaseUrl = () => activeApiBaseURL;
export const getApiOrigin = () => activeApiBaseURL.replace(/\/api\/?$/, '');

// Create axios instance
const api = axios.create({
  baseURL: activeApiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    if (response?.config?.baseURL) {
      activeApiBaseURL = response.config.baseURL;
    }
    return response;
  },
  (error) => {
    const originalRequest = error.config;

    // If local API is unavailable, retry once against remote fallback.
    if (
      originalRequest &&
      !error.response &&
      REMOTE_API_URL &&
      originalRequest.baseURL !== REMOTE_API_URL &&
      !originalRequest.__retryWithFallback
    ) {
      originalRequest.__retryWithFallback = true;
      originalRequest.baseURL = REMOTE_API_URL;
      activeApiBaseURL = REMOTE_API_URL;
      return api(originalRequest);
    }

    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  signup: (data) => api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  logout: () => api.post('/auth/logout'),
  uploadPhoto: (formData) => api.post('/auth/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deletePhoto: () => api.delete('/auth/profile-photo'),
};

// Employee API
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  reactivate: (id) => api.put(`/employees/${id}/reactivate`),
  resetPassword: (id) => api.put(`/employees/${id}/reset-password`),
  getStats: () => api.get('/employees/stats'),
};

// Shift API
export const shiftAPI = {
  getAll: (params) => api.get('/shifts', { params }),
  getWeekly: (params) => api.get('/shifts/week', { params }),
  getMy: (params) => api.get('/shifts/my', { params }),
  getOne: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', data),
  bulkCreate: (data) => api.post('/shifts/bulk', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  cancel: (id) => api.delete(`/shifts/${id}`),
  checkIn: (id) => api.post(`/shifts/${id}/checkin`),
  checkOut: (id, data) => api.post(`/shifts/${id}/checkout`, data),
  getStats: (params) => api.get('/shifts/stats', { params }),
};

// Payroll API
export const payrollAPI = {
  getAll: (params) => api.get('/payroll', { params }),
  getMy: (params) => api.get('/payroll/my', { params }),
  getOne: (id) => api.get(`/payroll/${id}`),
  calculate: (data) => api.post('/payroll/calculate', data),
  markPaid: (id, data) => api.put(`/payroll/${id}/pay`, data),
  bulkPay: (data) => api.put('/payroll/bulk-pay', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  delete: (id) => api.delete(`/payroll/${id}`),
  getSummary: (params) => api.get('/payroll/summary', { params }),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Announcements API
export const announcementAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  getAnalytics: (params) => api.get('/announcements/analytics', { params }),
  markSeen: (id) => api.post(`/announcements/${id}/seen`),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  archive: (id) => api.delete(`/announcements/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getManager: () => api.get('/dashboard/manager'),
  getEmployee: () => api.get('/dashboard/employee'),
  getEmployeeReports: (params) => api.get('/dashboard/employee/reports', { params }),
};

// Availability API
export const availabilityAPI = {
  getMy: (params) => api.get('/availability/my', { params }),
  setMy: (data) => api.put('/availability/my', data),
  getAll: (params) => api.get('/availability', { params }),
  getEmployee: (employeeId, params) => api.get(`/availability/employee/${employeeId}`, { params }),
  check: (data) => api.post('/availability/check', data),
};

export default api;

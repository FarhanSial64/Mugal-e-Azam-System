import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { addDebugLog } from '../utils/debug';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    addDebugLog('🔍 AuthProvider mount - checking stored auth', { hasToken: !!token, hasUser: !!savedUser });

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        addDebugLog('📝 Setting user from localStorage', { role: user.role, email: user.email });
        setUser(user);
        
        // Verify token is still valid
        addDebugLog('🔐 Verifying token with getMe()...');
        authAPI.getMe()
          .then((res) => {
            addDebugLog('✅ Token verified, user:', { role: res.data.data.role });
            setUser(res.data.data);
            localStorage.setItem('user', JSON.stringify(res.data.data));
          })
          .catch((err) => {
            addDebugLog('❌ getMe() failed - logging out', { 
              status: err.response?.status, 
              message: err.message 
            });
            logout();
          });
      } catch (err) {
        addDebugLog('❌ JSON parse error in auth check', { error: err.message });
        logout();
      }
    } else {
      addDebugLog('⏹️  No stored auth found');
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      addDebugLog('🔐 Login attempt', { email });
      const response = await authAPI.login({ email, password });
      addDebugLog('✅ Login API response received', { status: response.status });
      const { data, token } = response.data;

      if (!data || !token) {
        const err = 'Invalid response structure: missing data or token';
        addDebugLog('❌ ' + err);
        throw new Error(err);
      }

      addDebugLog('💾 Saving to localStorage', { role: data.role });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      addDebugLog('✅ User state set', { name: data.name, role: data.role });

      toast.success(`Welcome back, ${data.name}!`);

      // Redirect based on role
      const redirectPath = data.role === 'manager' ? '/manager/dashboard' : '/employee/dashboard';
      addDebugLog('🔀 Navigating to', { path: redirectPath });
      navigate(redirectPath);

      return { success: true };
    } catch (error) {
      addDebugLog('❌ Login error', { 
        message: error.message,
        status: error.response?.status,
        responseError: error.response?.data?.error 
      });
      const message = error.response?.data?.error || error.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    addDebugLog('🚪 Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    addDebugLog('✅ Logged out successfully');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isManager: user?.role === 'manager',
    isEmployee: user?.role === 'employee',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

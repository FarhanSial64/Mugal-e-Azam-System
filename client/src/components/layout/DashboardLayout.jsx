import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ProfilePhoto, Badge, EmptyState, Spinner, Button } from '../common';
import { announcementAPI, notificationAPI } from '../../services/api';
import {
  HomeIcon,
  UsersIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  BellIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ClockIcon,
  RectangleStackIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  const managerNavItems = [
    { name: 'Dashboard', href: '/manager/dashboard', icon: HomeIcon },
    { name: 'Employees', href: '/manager/employees', icon: UsersIcon },
    { name: 'Shifts', href: '/manager/shifts', icon: CalendarDaysIcon },
    { name: 'Bulk Assign', href: '/manager/bulk-shifts', icon: RectangleStackIcon },
    { name: 'Availability', href: '/manager/availability', icon: ClockIcon },
    { name: 'Payroll', href: '/manager/payroll', icon: BanknotesIcon },
    { name: 'Announcements', href: '/manager/announcements', icon: MegaphoneIcon },
  ];

  const employeeNavItems = [
    { name: 'Dashboard', href: '/employee/dashboard', icon: HomeIcon },
    { name: 'My Shifts', href: '/employee/shifts', icon: CalendarDaysIcon },
    { name: 'My Availability', href: '/employee/availability', icon: ClockIcon },
    { name: 'My Payroll', href: '/employee/payroll', icon: BanknotesIcon },
  ];

  const navItems = isManager ? managerNavItems : employeeNavItems;

  const isActive = (href) => location.pathname === href;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:z-auto lg:h-screen lg:sticky
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🍽️</span>
            <span className="font-bold text-lg">Mughal-e-Azam</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-800 rounded">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <ProfilePhoto
              photoUrl={user?.profilePhoto}
              name={user?.name}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors
                ${isActive(item.href)
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-800 space-y-1">
          <Link
            to={isManager ? '/manager/profile' : '/employee/profile'}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <UserCircleIcon className="h-5 w-5" />
            <span className="font-medium">Profile</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const NotificationDrawer = ({
  open,
  onClose,
  notifications,
  announcements,
  loading,
  unreadCount,
  announcementUnseenCount,
  onMarkRead,
  onMarkAllRead,
  onMarkAnnouncementSeen,
}) => {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />
      <aside className="fixed right-4 top-20 z-50 w-[92vw] max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
            <p className="text-xs text-slate-500">{unreadCount} unread items</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onMarkAllRead}>
              Mark all read
            </Button>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
              <XMarkIcon className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">System Alerts</h4>
              <Badge variant="info">{notifications.length}</Badge>
            </div>
            {loading ? (
              <div className="py-8 text-center">
                <Spinner size="md" className="mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                title="No notifications"
                description="Shift and payroll updates will appear here."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => onMarkRead(item._id)}
                    className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      </div>
                      <Badge variant={item.isRead ? 'gray' : 'info'}>
                        {item.isRead ? 'Read' : 'New'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">Announcements</h4>
              <Badge variant="primary">{announcementUnseenCount} unseen</Badge>
            </div>
            {announcements.length === 0 ? (
              <EmptyState
                title="No announcements"
                description="Management notices will show here."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => onMarkAnnouncementSeen(item)}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      {item.isPinned && <Badge variant="warning">Pinned</Badge>}
                      <Badge variant={item.priority === 'high' ? 'danger' : 'gray'}>{item.priority}</Badge>
                      <Badge variant={item.isSeen ? 'gray' : 'info'}>{item.isSeen ? 'Seen' : 'Unseen'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
};

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementUnseenCount, setAnnouncementUnseenCount] = useState(0);

  const fetchDrawerData = async () => {
    try {
      setLoading(true);
      const [notificationResponse, announcementResponse] = await Promise.all([
        notificationAPI.getAll({ limit: 10 }),
        announcementAPI.getAll({ activeOnly: true, limit: 10 }),
      ]);

      setNotifications(notificationResponse.data.data || []);
      setUnreadCount(notificationResponse.data.unreadCount || 0);
      setAnnouncements(announcementResponse.data.data || []);
      setAnnouncementUnseenCount(announcementResponse.data.unseenCount || 0);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawerData();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark notification read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to update notifications');
    }
  };

  const handleMarkAnnouncementSeen = async (announcement) => {
    if (announcement.isSeen) {
      return;
    }

    try {
      await announcementAPI.markSeen(announcement._id);
      setAnnouncements((prev) => prev.map((item) => (
        item._id === announcement._id
          ? { ...item, isSeen: true, seenAt: new Date().toISOString() }
          : item
      )));
      setAnnouncementUnseenCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark announcement as seen');
    }
  };

  const totalBadge = unreadCount + announcementUnseenCount;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (!drawerOpen) {
                fetchDrawerData();
              }
              setDrawerOpen((prev) => !prev);
            }}
            className="relative p-2 hover:bg-gray-100 rounded-lg"
          >
            <BellIcon className="h-6 w-6 text-gray-600" />
            {totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <NotificationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        announcements={announcements}
        loading={loading}
        unreadCount={unreadCount}
        announcementUnseenCount={announcementUnseenCount}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onMarkAnnouncementSeen={handleMarkAnnouncementSeen}
      />
    </>
  );
};

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
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
  ChartBarIcon,
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
    { name: 'My Reports', href: '/employee/reports', icon: ChartBarIcon },
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
          fixed top-0 left-0 z-50 h-full w-[86vw] max-w-xs bg-gray-900 text-white
          transform transition-transform duration-300 ease-in-out
          lg:w-64 lg:translate-x-0 lg:z-auto lg:h-screen lg:sticky
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4 sm:px-6">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🍽️</span>
            <span className="text-base font-bold sm:text-lg">Mughal-e-Azam</span>
          </Link>
          <button onClick={onClose} className="rounded p-2 hover:bg-gray-800 lg:hidden">
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
                flex min-h-[44px] items-center space-x-3 rounded-lg px-4 py-2.5 transition-colors
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
            className="flex min-h-[44px] w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-gray-300 transition-colors hover:bg-red-600/20 hover:text-red-400"
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
      <aside className="fixed inset-x-2 top-16 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-4 sm:left-auto sm:top-20 sm:w-[92vw] sm:max-w-md">
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 sm:px-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
            <p className="text-xs text-slate-500">{unreadCount} unread items</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button size="sm" variant="secondary" onClick={onMarkAllRead}>
              Mark all read
            </Button>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
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
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-4 lg:px-8">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="hidden text-base font-semibold text-gray-800 sm:block lg:text-xl">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => {
              if (!drawerOpen) {
                fetchDrawerData();
              }
              setDrawerOpen((prev) => !prev);
            }}
            className="relative rounded-lg p-2 hover:bg-gray-100"
            aria-label="Toggle notifications"
          >
            <BellIcon className="h-6 w-6 text-gray-600" />
            {totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3">
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
  const { isManager } = useAuth();
  const location = useLocation();

  const quickLinks = isManager
    ? [
        { name: 'Home', href: '/manager/dashboard', icon: HomeIcon },
        { name: 'Shifts', href: '/manager/shifts', icon: CalendarDaysIcon },
        { name: 'Team', href: '/manager/employees', icon: UsersIcon },
        { name: 'Pay', href: '/manager/payroll', icon: BanknotesIcon },
      ]
    : [
        { name: 'Home', href: '/employee/dashboard', icon: HomeIcon },
        { name: 'Shifts', href: '/employee/shifts', icon: CalendarDaysIcon },
        { name: 'Pay', href: '/employee/payroll', icon: BanknotesIcon },
        { name: 'Reports', href: '/employee/reports', icon: ChartBarIcon },
      ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto p-3 pb-24 sm:p-4 lg:p-8 lg:pb-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="grid grid-cols-4">
            {quickLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 text-xs font-medium ${
                    isActive ? 'text-primary-700' : 'text-slate-500'
                  }`}
                >
                  <link.icon className="h-5 w-5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default DashboardLayout;
import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';
import { dashboardAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import {
  Card,
  StatCard,
  Badge,
  EmptyState,
  Skeleton,
  Button,
} from '../../components/common';
import {
  UsersIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BellIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusMeta = {
  scheduled: { label: 'Scheduled', variant: 'info' },
  'in-progress': { label: 'In progress', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  missed: { label: 'Missed', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'gray' },
};

const quickActions = [
  {
    title: 'Assign Shift',
    description: 'Build the rota and notify staff.',
    href: '/manager/shifts',
    icon: CalendarDaysIcon,
    tone: 'bg-sky-50 text-sky-700 ring-sky-100',
  },
  {
    title: 'Approve Availability',
    description: 'Review weekly availability before scheduling.',
    href: '/manager/availability',
    icon: ClipboardDocumentCheckIcon,
    tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  {
    title: 'Generate Payroll',
    description: 'Calculate weekly earnings in one step.',
    href: '/manager/payroll',
    icon: BanknotesIcon,
    tone: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  {
    title: 'Record Payment',
    description: 'Mark completed payrolls as paid.',
    href: '/manager/payroll',
    icon: CreditCardIcon,
    tone: 'bg-rose-50 text-rose-700 ring-rose-100',
  },
];

const DashboardMetric = ({ label, value, hint, icon: Icon, tone = 'bg-slate-50 text-slate-700' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${tone}`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
      <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
        <Icon className="h-6 w-6 text-slate-700" />
      </div>
    </div>
  </div>
);

const ManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getManager();
      setData(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const shiftChartData = useMemo(() => {
    return (data?.analytics?.shiftTimeline || []).map((entry) => ({
      day: format(new Date(entry._id.day), 'EEE'),
      scheduled: entry.scheduled,
      completed: entry.completed,
      missed: entry.missed,
    }));
  }, [data]);

  const laborChartData = useMemo(() => {
    return (data?.analytics?.weeklyLabor || []).map((entry) => ({
      week: format(new Date(entry._id), 'MMM d'),
      pay: entry.totalNetPay,
      hours: entry.totalHours,
      overtime: entry.overtimeHours,
    }));
  }, [data]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status) => {
    const meta = statusMeta[status] || statusMeta.cancelled;
    return <Badge variant={meta.variant}>{meta.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-lg shadow-slate-900/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                <SparklesIcon className="h-4 w-4" />
                Operations hub
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Manager Dashboard
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                Monitor staffing, approve availability, generate payroll, and keep the restaurant running on time.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/manager/shifts">
                  <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold">
                    Manage schedule
                  </Button>
                </Link>
                <Link to="/manager/payroll">
                  <Button variant="ghost" className="border border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold">
                    Open payroll
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[42rem]">
              <Link to="/manager/shifts" className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/15">
                <p className="text-xs text-slate-300">Today</p>
                <p className="mt-1 text-2xl font-bold">{data?.todayShifts?.count || 0}</p>
                <p className="mt-1 text-xs text-slate-300">shifts scheduled</p>
              </Link>
              <Link to="/manager/availability" className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/15">
                <p className="text-xs text-slate-300">Coverage</p>
                <p className="mt-1 text-2xl font-bold">{data?.analytics?.attendanceRate || 0}%</p>
                <p className="mt-1 text-xs text-slate-300">attendance rate</p>
              </Link>
              <Link to="/manager/payroll" className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/15">
                <p className="text-xs text-slate-300">Pending</p>
                <p className="mt-1 text-2xl font-bold">£{(data?.payroll?.pendingAmount || 0).toFixed(0)}</p>
                <p className="mt-1 text-xs text-slate-300">payroll to clear</p>
              </Link>
              <Link to="/manager/employees" className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/15">
                <p className="text-xs text-slate-300">Team</p>
                <p className="mt-1 text-2xl font-bold">{data?.employees?.active || 0}</p>
                <p className="mt-1 text-xs text-slate-300">active staff</p>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={data?.employees?.total || 0}
            subtitle={`${data?.employees?.active || 0} active staff`}
            icon={UsersIcon}
          />
          <StatCard
            title="Today's Shifts"
            value={data?.todayShifts?.count || 0}
            subtitle="Scheduled for today"
            icon={CalendarDaysIcon}
          />
          <StatCard
            title="Attendance Rate"
            value={`${data?.analytics?.attendanceRate || 0}%`}
            subtitle={`${data?.analytics?.utilizationRate || 0}% utilization`}
            icon={CheckCircleIcon}
          />
          <StatCard
            title="Pending Payroll"
            value={`£${(data?.payroll?.pendingAmount || 0).toFixed(2)}`}
            subtitle={`${data?.payroll?.pendingCount || 0} unpaid`}
            icon={BanknotesIcon}
          />
        </section>

        <section>
          <Card title="Quick Actions" subtitle="Primary tasks for the shift manager">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.href}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <div className={`mb-4 inline-flex rounded-2xl p-3 ring-1 ${action.tone}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{action.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{action.description}</p>
                  <div className="mt-4 inline-flex items-center text-sm font-medium text-primary-700">
                    Open task
                    <ArrowRightIcon className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="Shift Coverage" subtitle="Weekly status breakdown">
            {shiftChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={shiftChartData}>
                    <defs>
                      <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis allowDecimals={false} stroke="#64748b" />
                    <Tooltip />
                    <Area type="monotone" dataKey="scheduled" stroke="#0ea5e9" fill="url(#coverageGradient)" />
                    <Area type="monotone" dataKey="completed" stroke="#10b981" fillOpacity={0} />
                    <Area type="monotone" dataKey="missed" stroke="#ef4444" fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No shift history yet"
                description="Once shifts are scheduled, this chart will show coverage trends."
                icon={CalendarDaysIcon}
              />
            )}
          </Card>

          <Card title="Labor Cost Trend" subtitle="Recent payroll and overtime pattern">
            {laborChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={laborChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="week" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="pay" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="hours" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No payroll history yet"
                description="Payroll trends will appear once weekly payroll records are generated."
                icon={BanknotesIcon}
              />
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card
            title="Today's Shifts"
            subtitle="The schedule that matters right now"
            action={
              <Link to="/manager/shifts" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800">
                View all
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            }
          >
            {data?.todayShifts?.shifts?.length > 0 ? (
              <div className="space-y-3">
                {data.todayShifts.shifts.slice(0, 5).map((shift) => (
                  <div key={shift._id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                        {shift.employee?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{shift.employee?.name}</p>
                        <p className="text-sm text-slate-500 capitalize">{shift.employee?.jobRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:text-right">
                      <div>
                        <p className="font-medium text-slate-900">{shift.startTime} - {shift.endTime}</p>
                        <p className="text-xs text-slate-500">{format(new Date(shift.date), 'EEE, MMM d')}</p>
                      </div>
                      {getStatusBadge(shift.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No shifts scheduled for today"
                description="Use quick actions to assign coverage or adjust the schedule."
                icon={CalendarDaysIcon}
                actionLabel="Assign shift"
                action={() => window.location.assign('/manager/shifts')}
              />
            )}
          </Card>

          <Card title="Operational Summary" subtitle="Weekly performance at a glance">
            <div className="grid grid-cols-2 gap-4">
              <DashboardMetric
                label="Scheduled"
                value={data?.analytics?.shiftBreakdown?.scheduled || 0}
                hint="shifts planned"
                icon={CalendarDaysIcon}
                tone="bg-sky-50"
              />
              <DashboardMetric
                label="In progress"
                value={data?.analytics?.shiftBreakdown?.inProgress || 0}
                hint="currently active"
                icon={ClockIcon}
                tone="bg-amber-50"
              />
              <DashboardMetric
                label="Completed"
                value={data?.analytics?.shiftBreakdown?.completed || 0}
                hint="finished this week"
                icon={CheckCircleIcon}
                tone="bg-emerald-50"
              />
              <DashboardMetric
                label="Missed"
                value={data?.analytics?.shiftBreakdown?.missed || 0}
                hint="needs review"
                icon={ExclamationCircleIcon}
                tone="bg-rose-50"
              />
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              Week: {data?.weekRange?.start && format(new Date(data.weekRange.start), 'MMM d')} - {data?.weekRange?.end && format(new Date(data.weekRange.end), 'MMM d, yyyy')}
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card
            title="Recent Payroll"
            subtitle="Latest salary records and payment status"
            action={
              <Link to="/manager/payroll" className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800">
                View all
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            }
          >
            {data?.payroll?.recent?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.payroll.recent.map((payroll) => (
                      <tr key={payroll._id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{payroll.employee?.name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{payroll.totalHours}h</td>
                        <td className="px-4 py-3 font-medium text-slate-900">£{payroll.netPay?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={payroll.status === 'paid' ? 'success' : 'warning'}>
                            {payroll.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No recent payroll records"
                description="Payroll will appear here after weekly calculations are generated."
                icon={BanknotesIcon}
                actionLabel="Generate payroll"
                action={() => window.location.assign('/manager/payroll')}
              />
            )}
          </Card>

          <Card title="Internal Notices" subtitle="Recent notifications and important updates">
            {data?.recentNotifications?.length > 0 ? (
              <div className="space-y-3">
                {data.recentNotifications.map((notice) => (
                  <div key={notice._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BellIcon className="h-4 w-4 text-primary-600" />
                          <p className="font-semibold text-slate-900">{notice.title}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{notice.message}</p>
                      </div>
                      <Badge variant={notice.isRead ? 'gray' : 'info'}>
                        {notice.isRead ? 'Read' : 'New'}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {format(new Date(notice.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No notices yet"
                description="Notifications from shift assignments, payroll, and account events will appear here."
                icon={BellIcon}
              />
            )}
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ManagerDashboard;
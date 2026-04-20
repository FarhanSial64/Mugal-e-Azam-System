import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { dashboardAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Badge, EmptyState, Skeleton, StatCard, Button } from '../../components/common';
import {
  CalendarDaysIcon,
  ClockIcon,
  CurrencyPoundIcon,
  BanknotesIcon,
  BellIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const formatCurrency = (value) => `£${Number(value || 0).toFixed(2)}`;
const formatHours = (value) => `${Number(value || 0).toFixed(2)}h`;

const getShiftStatusVariant = (status) => {
  const variants = {
    scheduled: 'info',
    'in-progress': 'success',
    completed: 'success',
    missed: 'danger',
    cancelled: 'gray',
  };

  return variants[status] || 'gray';
};

const EmployeeDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getEmployee();
      setData(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
          <Skeleton className="h-80" />
        </div>
      </DashboardLayout>
    );
  }

  const employeeFirstName = data?.employee?.name?.split(' ')[0] || 'Team Member';
  const pendingFromPayrolls = data?.pendingBreakdown?.fromPayrolls || 0;
  const pendingFromCompletedShifts = data?.pendingBreakdown?.estimatedFromCompletedShifts || 0;
  const pendingPay = data?.pendingPay || 0;
  const hasPendingBreakdown = pendingFromPayrolls > 0 || pendingFromCompletedShifts > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary-700 via-primary-600 to-slate-900 p-6 text-white shadow-lg shadow-primary-900/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                <SparklesIcon className="h-4 w-4" />
                Your workday
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back, {employeeFirstName}!
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-200 sm:text-base">
                Check today’s shift, view upcoming work, and keep availability up to date from any device.
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-300">
                {format(new Date(), 'EEEE, dd MMMM yyyy')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/employee/shifts">
                <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold">
                  View schedule
                </Button>
              </Link>
              <Link to="/employee/availability">
                <Button variant="ghost" className="border border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold">
                  Update availability
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="This Week's Shifts"
            value={data?.thisWeekShifts || 0}
            subtitle="Scheduled shifts"
            icon={CalendarDaysIcon}
          />
          <StatCard
            title="Hours Worked"
            value={formatHours(data?.hoursThisWeek)}
            subtitle="This week"
            icon={ClockIcon}
          />
          <StatCard
            title="Pending Pay"
            value={formatCurrency(pendingPay)}
            subtitle={
              pendingFromCompletedShifts > 0
                ? 'Includes completed shifts awaiting payroll run'
                : 'Unpaid wages'
            }
            icon={CurrencyPoundIcon}
          />
          <StatCard
            title="Next Shift"
            value={data?.nextShift ? format(new Date(data.nextShift.date), 'EEE, MMM d') : 'None'}
            subtitle={data?.nextShift ? `${data.nextShift.startTime} (${data.nextShift.shiftType})` : 'No upcoming shifts'}
            icon={ClockIcon}
          />
        </section>

        <section>
          <Card title="Pay Visibility" subtitle="Clear breakdown of your pending amount">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">From payroll records</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(pendingFromPayrolls)}</p>
                <p className="mt-1 text-sm text-slate-500">Already generated but not paid yet.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">From completed shifts</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(pendingFromCompletedShifts)}</p>
                <p className="mt-1 text-sm text-slate-500">Estimated for completed shifts not yet processed in payroll.</p>
              </div>
              <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Total pending</p>
                <p className="mt-2 text-2xl font-bold text-primary-800">{formatCurrency(pendingPay)}</p>
                <p className="mt-1 text-sm text-primary-700">This is the total you can expect to be paid.</p>
              </div>
            </div>
            {!hasPendingBreakdown && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircleIcon className="h-5 w-5" />
                No pending wages right now. You are fully up to date.
              </div>
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title="Today's Shift" subtitle="Your shift status at a glance">
            {data?.todayShift ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
                      <ClockIcon className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {data.todayShift.startTime} - {data.todayShift.endTime}
                      </h3>
                      <p className="text-sm text-slate-500 capitalize">{data.todayShift.shiftType} Shift</p>
                      {data.todayShift.actualCheckIn && (
                        <p className="text-xs text-slate-500 mt-1">
                          Checked in: {format(new Date(data.todayShift.actualCheckIn), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={getShiftStatusVariant(data.todayShift.status)}>
                    {data.todayShift.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No shift scheduled for today"
                description="Use availability and schedule pages to stay on top of your workweek."
                icon={CalendarDaysIcon}
                actionLabel="Check shifts"
                action={() => navigate('/employee/shifts')}
              />
            )}
          </Card>

          <Card title="Quick Actions" subtitle="The most common employee tasks">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link to="/employee/shifts" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
                <CalendarDaysIcon className="h-7 w-7 text-primary-600" />
                <p className="mt-3 font-semibold text-slate-900">Review shifts</p>
                <p className="mt-1 text-sm text-slate-500">See upcoming work and shift details.</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary-700">
                  Open <ArrowRightIcon className="ml-1 h-4 w-4" />
                </span>
              </Link>
              <Link to="/employee/availability" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md">
                <ClipboardDocumentCheckIcon className="h-7 w-7 text-emerald-600" />
                <p className="mt-3 font-semibold text-slate-900">Update availability</p>
                <p className="mt-1 text-sm text-slate-500">Keep your working hours accurate.</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary-700">
                  Open <ArrowRightIcon className="ml-1 h-4 w-4" />
                </span>
              </Link>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title="Upcoming Shifts" subtitle="Your next scheduled work">
            {data?.upcomingShifts?.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingShifts.map((shift) => (
                  <div
                    key={shift._id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">
                          {format(new Date(shift.date), 'd')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(shift.date), 'EEE')}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {shift.startTime} - {shift.endTime}
                        </p>
                        <p className="text-sm text-slate-500 capitalize">{shift.shiftType}</p>
                      </div>
                    </div>
                    <Badge variant={getShiftStatusVariant(shift.status)}>{shift.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No upcoming shifts"
                description="Your schedule will appear here when shifts are assigned."
                icon={CalendarDaysIcon}
              />
            )}
          </Card>

          <Card title="Internal Notices" subtitle="Shift reminders and payment updates">
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
                description="Shift assignments, reminders, and pay updates will appear here."
                icon={BellIcon}
              />
            )}
          </Card>
        </section>

        <section>
          <Card
            title="Recent Payments"
            subtitle="Your latest payroll activity"
            action={
              <Link to="/employee/payroll">
                <Button variant="ghost" size="sm" className="text-primary-700">
                  Open full payroll
                </Button>
              </Link>
            }
          >
            {data?.recentPayrolls?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Week</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentPayrolls.map((payroll) => (
                      <tr key={payroll._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {format(new Date(payroll.weekStartDate), 'MMM d')} - {format(new Date(payroll.weekEndDate), 'MMM d')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatHours(payroll.totalHours)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatCurrency(payroll.netPay)}</td>
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
                title="No payroll records yet"
                description="Salary history will appear once payroll is generated and paid."
                icon={CurrencyPoundIcon}
              />
            )}
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
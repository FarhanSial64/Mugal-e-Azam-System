import { useState, useEffect, useMemo } from 'react';
import { payrollAPI, employeeAPI, shiftAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Select, Badge, Spinner, EmptyState, StatCard, SearchBar } from '../../components/common';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BanknotesIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  UsersIcon,
  ClockIcon,
  CurrencyPoundIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const [view, setView] = useState('overview'); // overview, employee-detail, hourly-summary
  const [timeRange, setTimeRange] = useState('monthly'); // weekly, monthly, custom
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    return format(startOfMonth(threeMonthsAgo), 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shift, setShift] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [payrollRes, employeeRes, shiftRes] = await Promise.all([
        payrollAPI.getAll({ limit: 1000 }),
        employeeAPI.getAll({ isActive: true, limit: 1000 }),
        shiftAPI.getAll({ limit: 1000 }),
      ]);

      setPayrolls(payrollRes.data.data || []);
      setEmployees(employeeRes.data.data || []);
      setShift(shiftRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch report data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by date range
  const filteredPayrolls = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return payrolls.filter((p) => {
      const payrollDate = new Date(p.weekStartDate);
      return payrollDate >= start && payrollDate <= end;
    });
  }, [payrolls, startDate, endDate]);

  // Filter by employee if selected
  const finalPayrolls = useMemo(() => {
    if (selectedEmployee === 'all') return filteredPayrolls;
    return filteredPayrolls.filter((p) => p.employee._id === selectedEmployee);
  }, [filteredPayrolls, selectedEmployee]);

  // =========================
  // OVERVIEW METRICS
  // =========================
  const overviewMetrics = useMemo(() => {
    const totalSpent = finalPayrolls
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.netPay || 0), 0);

    const totalPending = finalPayrolls
      .filter((p) => p.status !== 'paid')
      .reduce((sum, p) => sum + (p.netPay || 0), 0);

    const totalHours = finalPayrolls.reduce((sum, p) => sum + (p.totalHours || 0), 0);
    const totalOvertimeHours = finalPayrolls.reduce((sum, p) => sum + (p.overtimeHours || 0), 0);
    const avgHourlyRate =
      finalPayrolls.length > 0
        ? (finalPayrolls.reduce((sum, p) => sum + (p.hourlyRate || 0), 0) / finalPayrolls.length).toFixed(2)
        : 0;

    const payrollRecords = finalPayrolls.length;

    return {
      totalSpent,
      totalPending,
      totalHours,
      totalOvertimeHours,
      avgHourlyRate,
      payrollRecords,
    };
  }, [finalPayrolls]);

  // =========================
  // EMPLOYEE BREAKDOWN
  // =========================
  const employeeBreakdown = useMemo(() => {
    const breakdown = {};

    finalPayrolls.forEach((payroll) => {
      const empId = payroll.employee._id;
      if (!breakdown[empId]) {
        breakdown[empId] = {
          id: empId,
          name: payroll.employee.name,
          jobRole: payroll.employee.jobRole,
          totalSpent: 0,
          totalHours: 0,
          totalOvertimeHours: 0,
          recordCount: 0,
          avgHourlyRate: 0,
          status: 'paid',
        };
      }

      breakdown[empId].totalSpent += payroll.netPay || 0;
      breakdown[empId].totalHours += payroll.totalHours || 0;
      breakdown[empId].totalOvertimeHours += payroll.overtimeHours || 0;
      breakdown[empId].recordCount += 1;
      breakdown[empId].avgHourlyRate = (breakdown[empId].avgHourlyRate * (breakdown[empId].recordCount - 1) + (payroll.hourlyRate || 0)) / breakdown[empId].recordCount;
    });

    return Object.values(breakdown).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [finalPayrolls]);

  // =========================
  // SPENDING TREND (by week/month)
  // =========================
  const spendingTrend = useMemo(() => {
    const trend = {};

    finalPayrolls.forEach((payroll) => {
      const date = new Date(payroll.weekStartDate);
      let key;

      if (timeRange === 'weekly') {
        key = format(date, 'MMM d');
      } else {
        key = format(date, 'MMM yyyy');
      }

      if (!trend[key]) {
        trend[key] = {
          period: key,
          spending: 0,
          hours: 0,
          recordCount: 0,
        };
      }

      trend[key].spending += payroll.netPay || 0;
      trend[key].hours += payroll.totalHours || 0;
      trend[key].recordCount += 1;
    });

    return Object.values(trend);
  }, [finalPayrolls, timeRange]);

  // =========================
  // HOURLY BREAKDOWN
  // =========================
  const hourlyBreakdown = useMemo(() => {
    const breakdown = {};

    finalPayrolls.forEach((payroll) => {
      const role = payroll.employee.jobRole || 'Unknown';
      if (!breakdown[role]) {
        breakdown[role] = {
          role,
          hours: 0,
          overtimeHours: 0,
          spending: 0,
          recordCount: 0,
        };
      }

      breakdown[role].hours += payroll.totalHours || 0;
      breakdown[role].overtimeHours += payroll.overtimeHours || 0;
      breakdown[role].spending += payroll.netPay || 0;
      breakdown[role].recordCount += 1;
    });

    return Object.values(breakdown).sort((a, b) => b.hours - a.hours);
  }, [finalPayrolls]);

  // =========================
  // STATUS BREAKDOWN
  // =========================
  const statusBreakdown = useMemo(() => {
    const breakdown = {
      paid: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      disputed: { count: 0, amount: 0 },
    };

    finalPayrolls.forEach((payroll) => {
      const status = payroll.status || 'pending';
      if (breakdown[status]) {
        breakdown[status].count += 1;
        breakdown[status].amount += payroll.netPay || 0;
      }
    });

    return Object.entries(breakdown).map(([status, data]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: data.count,
      amount: data.amount,
    }));
  }, [finalPayrolls]);

  // Export as CSV
  const exportAsCSV = () => {
    if (employeeBreakdown.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Employee Name', 'Job Role', 'Total Spent', 'Total Hours', 'Overtime Hours', 'Payroll Records', 'Avg Rate'];
    const rows = employeeBreakdown.map((emp) => [
      emp.name,
      emp.jobRole,
      `£${emp.totalSpent.toFixed(2)}`,
      emp.totalHours.toFixed(2),
      emp.totalOvertimeHours.toFixed(2),
      emp.recordCount,
      `£${emp.avgHourlyRate.toFixed(2)}`,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500 mt-1">Track spending, hours, and employee metrics</p>
          </div>
          <Button onClick={exportAsCSV} leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}>
            Export to CSV
          </Button>
        </div>

        {/* Report Controls */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* View Selector */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'overview', label: 'Overview' },
                    { value: 'employee-detail', label: 'Employee Details' },
                    { value: 'hourly-summary', label: 'Hours & Roles' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setView(option.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        view === option.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Grouping</label>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  options={[
                    { value: 'weekly', label: 'By Week' },
                    { value: 'monthly', label: 'By Month' },
                  ]}
                />
              </div>

              {/* Date Range */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* End Date */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Employee</label>
              <Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                options={[
                  { value: 'all', label: 'All Employees' },
                  ...employees.map((emp) => ({
                    value: emp._id,
                    label: `${emp.name} (${emp.jobRole})`,
                  })),
                ]}
              />
            </div>
          </div>
        </Card>

        {/* OVERVIEW VIEW */}
        {view === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <StatCard
                title="Total Paid"
                value={`£${overviewMetrics.totalSpent.toFixed(2)}`}
                subtitle={`${finalPayrolls.filter((p) => p.status === 'paid').length} records`}
                icon={CurrencyPoundIcon}
              />
              <StatCard
                title="Pending Payment"
                value={`£${overviewMetrics.totalPending.toFixed(2)}`}
                subtitle={`${finalPayrolls.filter((p) => p.status !== 'paid').length} records`}
                icon={BanknotesIcon}
              />
              <StatCard
                title="Total Hours"
                value={`${overviewMetrics.totalHours.toFixed(1)}h`}
                subtitle={`${overviewMetrics.totalOvertimeHours.toFixed(1)}h overtime`}
                icon={ClockIcon}
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending Trend */}
              <Card title="Spending Trend" subtitle={`${timeRange === 'weekly' ? 'Weekly' : 'Monthly'} breakdown`}>
                {spendingTrend.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={spendingTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="spending"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          dot={{ fill: '#0ea5e9', r: 4 }}
                          name="Spending (£)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No data available"
                    description="Select a different date range or filters"
                    icon={CalendarDaysIcon}
                  />
                )}
              </Card>

              {/* Status Distribution */}
              <Card title="Payment Status" subtitle="All payroll records">
                {statusBreakdown.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name} (${value})`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} records`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="No data" description="No payroll records found" icon={BanknotesIcon} />
                )}
              </Card>
            </div>

            {/* Hours Trend */}
            <Card title="Hours Worked Trend">
              {spendingTrend.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendingTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="period" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" fill="#10b981" radius={[8, 8, 0, 0]} name="Hours Worked" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="No data" description="No shifts found" icon={ClockIcon} />
              )}
            </Card>
          </>
        )}

        {/* EMPLOYEE DETAIL VIEW */}
        {view === 'employee-detail' && (
          <Card title="Employee Spending Details" subtitle="Detailed breakdown per employee">
            {employeeBreakdown.length === 0 ? (
              <EmptyState
                title="No employee data"
                description="Select a different date range or filters"
                icon={UsersIcon}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Role</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Overtime</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Avg Rate</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Records</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employeeBreakdown.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{emp.jobRole}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">£{emp.totalSpent.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{emp.totalHours.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{emp.totalOvertimeHours.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">£{emp.avgHourlyRate.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{emp.recordCount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-sm font-bold text-gray-900">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        £
                        {employeeBreakdown
                          .reduce((sum, emp) => sum + emp.totalSpent, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-center">
                        {employeeBreakdown
                          .reduce((sum, emp) => sum + emp.totalHours, 0)
                          .toFixed(1)}
                        h
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-center">
                        {employeeBreakdown
                          .reduce((sum, emp) => sum + emp.totalOvertimeHours, 0)
                          .toFixed(1)}
                        h
                      </td>
                      <td colSpan="2" className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* HOURLY & ROLE BREAKDOWN VIEW */}
        {view === 'hourly-summary' && (
          <>
            {/* Hours by Role */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Hours by Role" subtitle="Total hours worked per job role">
                {hourlyBreakdown.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={hourlyBreakdown}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" />
                        <YAxis dataKey="role" type="category" stroke="#64748b" width={110} />
                        <Tooltip />
                        <Bar dataKey="hours" fill="#0ea5e9" radius={[0, 8, 8, 0]} name="Hours" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="No data" description="No hourly records found" icon={ClockIcon} />
                )}
              </Card>

              <Card title="Spending by Role" subtitle="Total spent per job role">
                {hourlyBreakdown.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="role" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip formatter={(value) => `£${value.toFixed(2)}`} />
                        <Bar dataKey="spending" fill="#10b981" radius={[8, 8, 0, 0]} name="Spending (£)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="No data" description="No spending records found" icon={BanknotesIcon} />
                )}
              </Card>
            </div>

            {/* Role Summary Table */}
            <Card title="Role Summary" subtitle="Complete breakdown by job role">
              {hourlyBreakdown.length === 0 ? (
                <EmptyState title="No data" description="No role data available" icon={UsersIcon} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Role</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours Worked</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Overtime Hours</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spending</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Records</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {hourlyBreakdown.map((role) => (
                        <tr key={role.role} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{role.role}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{role.hours.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{role.overtimeHours.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">£{role.spending.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-center">{role.recordCount}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          {hourlyBreakdown.reduce((sum, role) => sum + role.hours, 0).toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          {hourlyBreakdown.reduce((sum, role) => sum + role.overtimeHours, 0).toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                          £{hourlyBreakdown.reduce((sum, role) => sum + role.spending, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;

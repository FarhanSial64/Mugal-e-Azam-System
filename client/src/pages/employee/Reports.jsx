import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { dashboardAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, StatCard, Button, EmptyState, Spinner, Select, Badge } from '../../components/common';
import {
  SparklesIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyPoundIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const getDefaultStartDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return format(d, 'yyyy-MM-dd');
};

const getDefaultEndDate = () => format(new Date(), 'yyyy-MM-dd');

const formatCurrency = (value) => `GBP ${Number(value || 0).toFixed(2)}`;
const formatHours = (value) => `${Number(value || 0).toFixed(2)}h`;

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const EmployeeReportsPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    period: 'monthly',
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
  });

  const fetchReport = async (nextFilters = filters) => {
    try {
      setLoading(true);
      const params = {
        period: nextFilters.period,
      };

      if (nextFilters.period === 'custom') {
        params.startDate = nextFilters.startDate;
        params.endDate = nextFilters.endDate;
      }

      const response = await dashboardAPI.getEmployeeReports(params);
      setReport(response.data.data);
    } catch (error) {
      toast.error('Failed to load employee reports');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const weeklyChartData = useMemo(() => {
    return (report?.weeklyTrend || []).map((entry) => ({
      ...entry,
      label: format(new Date(entry.period), 'dd MMM'),
    }));
  }, [report]);

  const monthlyChartData = useMemo(() => {
    return (report?.monthlyTrend || []).map((entry) => {
      const monthDate = new Date(`${entry.period}-01`);
      return {
        ...entry,
        label: format(monthDate, 'MMM yyyy'),
      };
    });
  }, [report]);

  const hourlyChartData = useMemo(() => {
    return (report?.hourlyBreakdown || []).map((entry) => ({
      ...entry,
      label: entry.label,
    }));
  }, [report]);

  const statusPieData = useMemo(() => {
    return (report?.payrollStatusBreakdown || []).map((entry) => ({
      name: entry.status,
      value: entry.count,
      amount: entry.amount,
    }));
  }, [report]);

  const applyFilters = () => {
    if (filters.period === 'custom') {
      if (!filters.startDate || !filters.endDate) {
        toast.error('Please provide start and end date for custom range');
        return;
      }
      if (new Date(filters.startDate) > new Date(filters.endDate)) {
        toast.error('Start date cannot be after end date');
        return;
      }
    }

    fetchReport(filters);
  };

  const exportCSV = () => {
    if (!report) {
      return;
    }

    const summaryRows = [
      ['Metric', 'Value'],
      ['Total shifts', report.summary.totalShifts],
      ['Completed shifts', report.summary.completedShifts],
      ['Missed shifts', report.summary.missedShifts],
      ['Hours worked', report.summary.totalHoursWorked],
      ['Overtime hours', report.summary.totalOvertimeHours],
      ['Attendance rate', `${report.summary.attendanceRate}%`],
      ['Average hours per shift', report.summary.averageHoursPerShift],
      ['Average earning per hour', report.summary.averageEarningsPerHour],
      ['Paid earnings', report.earnings.paid],
      ['Pending payroll earnings', report.earnings.pendingPayroll],
      ['Estimated from completed shifts', report.earnings.estimatedFromCompletedShifts],
      ['Total tracked earnings', report.earnings.totalTracked],
    ];

    const weeklyRows = [
      [],
      ['Weekly Trend'],
      ['Week Start', 'Hours', 'Earnings', 'Completed Shifts', 'Missed Shifts'],
      ...(report.weeklyTrend || []).map((row) => [
        row.period,
        row.hours,
        row.earnings,
        row.completedShifts,
        row.missedShifts,
      ]),
    ];

    const monthlyRows = [
      [],
      ['Monthly Trend'],
      ['Month', 'Hours', 'Earnings', 'Completed Shifts'],
      ...(report.monthlyTrend || []).map((row) => [
        row.period,
        row.hours,
        row.earnings,
        row.completedShifts,
      ]),
    ];

    const hourlyRows = [
      [],
      ['Hourly Breakdown'],
      ['Hour', 'Hours Worked', 'Earnings', 'Shifts'],
      ...(report.hourlyBreakdown || []).map((row) => [
        row.label,
        row.hours,
        row.earnings,
        row.shifts,
      ]),
    ];

    const rows = [...summaryRows, ...weeklyRows, ...monthlyRows, ...hourlyRows];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `employee_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    window.URL.revokeObjectURL(url);
    toast.success('CSV report downloaded');
  };

  const exportPDF = async () => {
    if (!report) {
      return;
    }

    try {
      setExporting(true);
      const [jsPDFModule, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const jsPDFConstructor = jsPDFModule.jsPDF || jsPDFModule.default;
      const autoTable = autoTableModule.default || autoTableModule;
      const doc = new jsPDFConstructor();

      doc.setFontSize(16);
      doc.text('Employee Performance Report', 14, 16);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 24);
      doc.text(`Range: ${filters.period}`, 14, 30);

      autoTable(doc, {
        startY: 36,
        head: [['Metric', 'Value']],
        body: [
          ['Total shifts', report.summary.totalShifts],
          ['Completed shifts', report.summary.completedShifts],
          ['Missed shifts', report.summary.missedShifts],
          ['Hours worked', report.summary.totalHoursWorked],
          ['Overtime hours', report.summary.totalOvertimeHours],
          ['Attendance rate', `${report.summary.attendanceRate}%`],
          ['Average hours/shift', report.summary.averageHoursPerShift],
          ['Average earning/hour', `GBP ${report.summary.averageEarningsPerHour}`],
          ['Paid earnings', `GBP ${report.earnings.paid}`],
          ['Pending payroll earnings', `GBP ${report.earnings.pendingPayroll}`],
          ['Estimated from completed shifts', `GBP ${report.earnings.estimatedFromCompletedShifts}`],
          ['Total tracked earnings', `GBP ${report.earnings.totalTracked}`],
        ],
        theme: 'striped',
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Week Start', 'Hours', 'Earnings', 'Completed', 'Missed']],
        body: (report.weeklyTrend || []).map((row) => [
          row.period,
          row.hours,
          `GBP ${row.earnings}`,
          row.completedShifts,
          row.missedShifts,
        ]),
        theme: 'grid',
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Month', 'Hours', 'Earnings', 'Completed']],
        body: (report.monthlyTrend || []).map((row) => [
          row.period,
          row.hours,
          `GBP ${row.earnings}`,
          row.completedShifts,
        ]),
        theme: 'grid',
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Hour', 'Hours', 'Earnings', 'Shifts']],
        body: (report.hourlyBreakdown || []).map((row) => [
          row.label,
          row.hours,
          `GBP ${row.earnings}`,
          row.shifts,
        ]),
        theme: 'grid',
      });

      doc.save(`employee_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF report downloaded');
    } catch (error) {
      toast.error('Failed to create PDF report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-80 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-700 p-6 text-white shadow-lg shadow-slate-900/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                <SparklesIcon className="h-4 w-4" />
                Performance analytics
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">My Reports</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">
                Track hours, earnings, attendance, and work patterns with weekly, monthly, and hourly analytics.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={exportCSV}
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
              >
                Download CSV
              </Button>
              <Button
                variant="ghost"
                className="border border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={exportPDF}
                isLoading={exporting}
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
              >
                Download PDF
              </Button>
            </div>
          </div>
        </section>

        <Card title="Report Filters" subtitle="Choose period and refresh analytics">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Select
              label="Period"
              value={filters.period}
              onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
              options={[
                { value: 'weekly', label: 'Weekly (last 8 weeks)' },
                { value: 'monthly', label: 'Monthly (last 12 months)' },
                { value: 'custom', label: 'Custom range' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={filters.period !== 'custom'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={filters.period !== 'custom'}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={applyFilters} className="w-full">Refresh report</Button>
            </div>
          </div>
        </Card>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Hours Worked"
            value={formatHours(report?.summary?.totalHoursWorked)}
            subtitle={`${report?.summary?.completedShifts || 0} completed shifts`}
            icon={ClockIcon}
          />
          <StatCard
            title="Total Earnings"
            value={formatCurrency(report?.earnings?.totalTracked)}
            subtitle={`Paid ${formatCurrency(report?.earnings?.paid)}`}
            icon={CurrencyPoundIcon}
          />
          <StatCard
            title="Attendance Rate"
            value={`${Number(report?.summary?.attendanceRate || 0).toFixed(1)}%`}
            subtitle={`${report?.summary?.missedShifts || 0} missed shifts`}
            icon={CheckCircleIcon}
          />
          <StatCard
            title="Avg Earnings/Hour"
            value={formatCurrency(report?.summary?.averageEarningsPerHour)}
            subtitle={`Avg shift ${formatHours(report?.summary?.averageHoursPerShift)}`}
            icon={ChartBarIcon}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Paid earnings</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{formatCurrency(report?.earnings?.paid)}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending payroll</p>
            <p className="mt-2 text-2xl font-bold text-amber-800">{formatCurrency(report?.earnings?.pendingPayroll)}</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Estimated from completed shifts</p>
            <p className="mt-2 text-2xl font-bold text-sky-800">{formatCurrency(report?.earnings?.estimatedFromCompletedShifts)}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title="Weekly Performance" subtitle="Hours and earnings by week">
            {weeklyChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" />
                    <YAxis yAxisId="left" stroke="#64748b" />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="hours" name="Hours" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="earnings" name="Earnings" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No weekly data"
                description="Complete shifts to populate weekly analytics."
                icon={CalendarDaysIcon}
              />
            )}
          </Card>

          <Card title="Monthly Earnings Trend" subtitle="Compare monthly totals over time">
            {monthlyChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      name="Earnings"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No monthly data"
                description="Monthly trend will appear once payroll and shift data are available."
                icon={CurrencyPoundIcon}
              />
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card title="Hourly Work Pattern" subtitle="How your shifts distribute by start hour">
            {hourlyChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No hourly pattern yet"
                description="Hourly analysis appears when completed shifts are available."
                icon={ClockIcon}
              />
            )}
          </Card>

          <Card title="Payroll Status Mix" subtitle="Distribution of your payroll records">
            {statusPieData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value} records`, `${props.payload.name}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No payroll status data"
                description="Generate payroll records to see status mix."
                icon={ExclamationCircleIcon}
              />
            )}
          </Card>
        </section>

        <Card title="Recent Payroll Records" subtitle="Most recent payroll entries in selected range">
          {(report?.recentPayrolls || []).length === 0 ? (
            <EmptyState
              title="No payroll records"
              description="No payroll records were found for the selected date range."
              icon={CurrencyPoundIcon}
            />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {(report?.recentPayrolls || []).map((payroll) => (
                  <div key={payroll._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-slate-700">
                        {format(new Date(payroll.weekStartDate), 'dd MMM yyyy')} - {format(new Date(payroll.weekEndDate), 'dd MMM yyyy')}
                      </p>
                      <Badge
                        variant={
                          payroll.status === 'paid'
                            ? 'success'
                            : payroll.status === 'disputed'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {payroll.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-600">{formatHours(payroll.totalHours)}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(payroll.netPay)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Week</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Hours</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Net Pay</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(report?.recentPayrolls || []).map((payroll) => (
                      <tr key={payroll._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {format(new Date(payroll.weekStartDate), 'dd MMM yyyy')} - {format(new Date(payroll.weekEndDate), 'dd MMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">{formatHours(payroll.totalHours)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{formatCurrency(payroll.netPay)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              payroll.status === 'paid'
                                ? 'success'
                                : payroll.status === 'disputed'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {payroll.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeReportsPage;

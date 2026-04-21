import { useState, useEffect, useMemo } from 'react';
import { payrollAPI, employeeAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input, Select, Modal, Badge, Spinner, EmptyState, StatCard, SearchBar, FilterBar } from '../../components/common';
import {
  BanknotesIcon,
  CalculatorIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyPoundIcon,
  FunnelIcon,
  EyeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { format, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const savedViewKey = 'mugal-azam-payroll-view';

// Helper to format hours nicely (show minutes for short durations)
const formatHours = (hours) => {
  if (!hours || hours === 0) return '0m';
  if (hours < 0.0167) return '<1m'; // Less than 1 minute
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  return `${hours.toFixed(2)}h`;
};

const PayrollPage = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('week-desc');
  const [savedViews, setSavedViews] = useState([]);
  const [activeView, setActiveView] = useState('default');
  const [isCalculateModalOpen, setIsCalculateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [paying, setPaying] = useState(false);
  
  const [calculateForm, setCalculateForm] = useState({
    employeeId: '',
    weekStartDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  });

  const [payForm, setPayForm] = useState({
    paymentMethod: 'cash',
    paymentReference: '',
    notes: '',
  });

  useEffect(() => {
    const storedViews = JSON.parse(localStorage.getItem(savedViewKey) || '[]');
    setSavedViews(storedViews);
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const visiblePayrolls = useMemo(() => {
    const filtered = payrolls.filter((payroll) => {
      const matchesSearch = !search || payroll.employee?.name?.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'week-asc') return new Date(a.weekStartDate) - new Date(b.weekStartDate);
      if (sortBy === 'amount-desc') return (b.netPay || 0) - (a.netPay || 0);
      if (sortBy === 'amount-asc') return (a.netPay || 0) - (b.netPay || 0);
      return new Date(b.weekStartDate) - new Date(a.weekStartDate);
    });
  }, [payrolls, search, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const [payrollsRes, employeesRes, summaryRes] = await Promise.all([
        payrollAPI.getAll(params),
        employeeAPI.getAll({ isActive: true }),
        payrollAPI.getSummary(),
      ]);
      
      setPayrolls(payrollsRes.data.data);
      setEmployees(employeesRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async (e) => {
    e.preventDefault();
    try {
      setCalculating(true);
      const response = await payrollAPI.calculate(calculateForm);
      toast.success(response.data.message);
      setIsCalculateModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to calculate payroll');
    } finally {
      setCalculating(false);
    }
  };

  const handleOpenPayModal = (payroll) => {
    setSelectedPayroll(payroll);
    setPayForm({
      paymentMethod: 'cash',
      paymentReference: '',
      notes: '',
    });
    setIsPayModalOpen(true);
  };

  const handleViewDetails = async (payroll) => {
    try {
      setLoadingDetails(true);
      setIsDetailsModalOpen(true);
      const response = await payrollAPI.getOne(payroll._id);
      setPayrollDetails(response.data.data);
    } catch (error) {
      toast.error('Failed to load payroll details');
      setIsDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleMarkAsPaid = async (e) => {
    e.preventDefault();
    try {
      setPaying(true);
      await payrollAPI.markPaid(selectedPayroll._id, payForm);
      toast.success('Payment recorded successfully');
      setIsPayModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleBulkPay = async () => {
    const unpaidPayrolls = visiblePayrolls.filter((p) => p.status !== 'paid');
    if (unpaidPayrolls.length === 0) {
      toast.error('No unpaid payrolls to process');
      return;
    }

    if (!confirm(`Mark ${unpaidPayrolls.length} payrolls as paid via cash?`)) return;

    try {
      await payrollAPI.bulkPay({
        payrollIds: unpaidPayrolls.map((p) => p._id),
        paymentMethod: 'cash',
      });
      toast.success('All payments recorded');
      fetchData();
    } catch (error) {
      toast.error('Failed to process bulk payment');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'info',
      paid: 'success',
      disputed: 'danger',
    };
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>;
  };

  const handleSaveView = () => {
    const nextView = {
      id: `view-${Date.now()}`,
      name: `View ${savedViews.length + 1}`,
      filterStatus,
      search,
      sortBy,
    };
    const nextViews = [nextView, ...savedViews].slice(0, 5);
    setSavedViews(nextViews);
    localStorage.setItem(savedViewKey, JSON.stringify(nextViews));
    setActiveView(nextView.id);
    toast.success('Current payroll view saved');
  };

  const handleLoadView = (view) => {
    setFilterStatus(view.filterStatus);
    setSearch(view.search);
    setSortBy(view.sortBy);
    setActiveView(view.id);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
            <p className="text-gray-500 mt-1">Calculate and manage employee salaries</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleBulkPay}
              leftIcon={<CheckCircleIcon className="h-5 w-5" />}
            >
              Pay All
            </Button>
            <Button 
              onClick={() => setIsCalculateModalOpen(true)}
              leftIcon={<CalculatorIcon className="h-5 w-5" />}
            >
              Calculate Payroll
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="This Week's Total"
            value={`£${(summary?.currentWeek?.totalGrossPay || 0).toFixed(2)}`}
            subtitle={`${summary?.currentWeek?.totalEmployees || 0} employees`}
            icon={CurrencyPoundIcon}
          />
          <StatCard
            title="Total Hours"
            value={`${(summary?.currentWeek?.totalHours || 0).toFixed(1)}h`}
            subtitle="This week"
            icon={ClockIcon}
          />
          <StatCard
            title="Paid"
            value={summary?.currentWeek?.paid || 0}
            subtitle="Payrolls marked paid"
            icon={CheckCircleIcon}
          />
          <StatCard
            title="Pending"
            value={summary?.currentWeek?.pending || 0}
            subtitle="Awaiting payment"
            icon={BanknotesIcon}
          />
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Professional Search Bar */}
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search employee..."
            size="md"
            variant="default"
            className="w-full lg:max-w-md"
          />

          {/* Status Filter and Sort */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FilterBar
              filters={[
                { type: 'button', key: 'all', label: 'All', value: 'all', active: filterStatus === 'all', onChange: setFilterStatus },
                { type: 'button', key: 'pending', label: 'Pending', value: 'pending', active: filterStatus === 'pending', onChange: setFilterStatus },
                { type: 'button', key: 'approved', label: 'Approved', value: 'approved', active: filterStatus === 'approved', onChange: setFilterStatus },
                { type: 'button', key: 'paid', label: 'Paid', value: 'paid', active: filterStatus === 'paid', onChange: setFilterStatus },
              ]}
              compact
              showLabel={false}
            />

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'week-desc', label: 'Week: newest first' },
                { value: 'week-asc', label: 'Week: oldest first' },
                { value: 'amount-desc', label: 'Amount: high to low' },
                { value: 'amount-asc', label: 'Amount: low to high' },
              ]}
              placeholder="Sort by..."
              variant="search"
            />
          </div>
        </div>

        {/* Saved Views */}
        <Card>
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-500">Saved views:</span>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSearch('');
                  setSortBy('week-desc');
                  setActiveView('default');
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'default' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Default
              </button>
              {savedViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleLoadView(view)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === view.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {view.name}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={handleSaveView}>
              Save current view
            </Button>
          </div>
        </Card>

        {/* Payroll Table */}
        <Card title="Payroll Records">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : visiblePayrolls.length === 0 ? (
            <EmptyState
              title="No payroll records"
              description="Calculate payroll to generate records"
              icon={BanknotesIcon}
              actionLabel="Calculate Payroll"
              action={() => setIsCalculateModalOpen(true)}
            />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {visiblePayrolls.map((payroll) => (
                  <div key={payroll._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{payroll.employee?.name}</p>
                        <p className="text-xs capitalize text-gray-500">{payroll.employee?.jobRole}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {format(new Date(payroll.weekStartDate), 'MMM d')} - {format(new Date(payroll.weekEndDate), 'MMM d')}
                        </p>
                      </div>
                      {getStatusBadge(payroll.status)}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p><span className="font-medium text-slate-700">Hours:</span> {payroll.totalHours}h</p>
                      <p><span className="font-medium text-slate-700">Rate:</span> £{payroll.hourlyRate}/hr</p>
                      <p><span className="font-medium text-slate-700">Gross:</span> £{payroll.grossPay?.toFixed(2)}</p>
                      <p><span className="font-medium text-slate-700">Net:</span> £{payroll.netPay?.toFixed(2)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleViewDetails(payroll)} title="View Details">
                        View Details
                      </Button>
                      {payroll.status !== 'paid' ? (
                        <Button size="sm" variant="success" onClick={() => handleOpenPayModal(payroll)}>
                          Mark Paid
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500">Paid via {payroll.paymentMethod}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Week</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Gross</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Net Pay</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visiblePayrolls.map((payroll) => (
                      <tr key={payroll._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                              <span className="text-sm font-semibold text-primary-600">
                                {payroll.employee?.name?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{payroll.employee?.name}</p>
                              <p className="text-xs text-gray-500">{payroll.employee?.jobRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {format(new Date(payroll.weekStartDate), 'MMM d')} - {format(new Date(payroll.weekEndDate), 'MMM d')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{payroll.totalHours}h</td>
                        <td className="px-4 py-3 text-sm text-gray-600">£{payroll.hourlyRate}/hr</td>
                        <td className="px-4 py-3 text-sm text-gray-900">£{payroll.grossPay?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">£{payroll.netPay?.toFixed(2)}</td>
                        <td className="px-4 py-3">{getStatusBadge(payroll.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => handleViewDetails(payroll)} title="View Details">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            {payroll.status !== 'paid' && (
                              <Button size="sm" variant="success" onClick={() => handleOpenPayModal(payroll)}>
                                Mark Paid
                              </Button>
                            )}
                            {payroll.status === 'paid' && (
                              <span className="text-xs text-gray-500">Paid via {payroll.paymentMethod}</span>
                            )}
                          </div>
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

      {/* Calculate Payroll Modal */}
      <Modal
        isOpen={isCalculateModalOpen}
        onClose={() => setIsCalculateModalOpen(false)}
        title="Calculate Weekly Payroll"
        size="md"
      >
        <form onSubmit={handleCalculatePayroll} className="space-y-4">
          <Select
            label="Employee (Optional)"
            name="employeeId"
            value={calculateForm.employeeId}
            onChange={(e) => setCalculateForm(prev => ({ ...prev, employeeId: e.target.value }))}
            options={[
              { value: '', label: 'All Employees' },
              ...employees.map((e) => ({ value: e._id, label: e.name })),
            ]}
            helpText="Leave empty to calculate for all employees"
          />

          <Input
            label="Week Start Date"
            type="date"
            value={calculateForm.weekStartDate}
            onChange={(e) => setCalculateForm(prev => ({ ...prev, weekStartDate: e.target.value }))}
            helpText="Select any day in the target week"
          />

          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Payroll will be calculated based on completed shifts for the selected week.
              Existing unpaid payroll records will be updated.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCalculateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={calculating}>
              Calculate Payroll
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pay Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Payment"
        size="md"
      >
        {selectedPayroll && (
          <form onSubmit={handleMarkAsPaid} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Employee:</span>
                <span className="font-medium">{selectedPayroll.employee?.name}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Amount:</span>
                <span className="text-2xl font-bold text-green-600">
                  £{selectedPayroll.netPay?.toFixed(2)}
                </span>
              </div>
            </div>

            <Select
              label="Payment Method"
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
              options={paymentMethods}
              required
            />

            <Input
              label="Payment Reference (Optional)"
              value={payForm.paymentReference}
              onChange={(e) => setPayForm(prev => ({ ...prev, paymentReference: e.target.value }))}
              placeholder="e.g., Transaction ID, Cheque Number"
            />

            <Input
              label="Notes (Optional)"
              value={payForm.notes}
              onChange={(e) => setPayForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsPayModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success" isLoading={paying}>
                Confirm Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Week Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setPayrollDetails(null);
        }}
        title="Weekly Shift Details"
        size="xl"
      >
        {loadingDetails ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : payrollDetails ? (
          <div className="space-y-6">
            {/* Employee & Week Summary */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow">
                    <span className="text-primary-600 font-bold text-xl">
                      {payrollDetails.employee?.name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{payrollDetails.employee?.name}</h3>
                    <p className="text-gray-600 capitalize">{payrollDetails.employee?.jobRole}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarDaysIcon className="h-5 w-5" />
                    <span className="font-medium">
                      {format(new Date(payrollDetails.weekStartDate), 'MMM d')} - {format(new Date(payrollDetails.weekEndDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {getStatusBadge(payrollDetails.status)}
                </div>
              </div>
            </div>

            {/* Daily Shifts Breakdown */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-primary-600" />
                Daily Work History
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Pay is calculated based on scheduled shift times. Manager can edit shift times if needed.
              </p>
              
              {payrollDetails.shifts && payrollDetails.shifts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shift Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Scheduled Time</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Hours</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Daily Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {payrollDetails.shifts
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map((shift, index) => (
                        <tr key={shift._id || index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {format(new Date(shift.date), 'EEE, MMM d')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {shift.shiftType || 'Regular'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-gray-900">
                              {formatHours(shift.hoursWorked || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-green-600">
                              £{((shift.hoursWorked || 0) * payrollDetails.hourlyRate).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals Row */}
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right font-semibold text-gray-700">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                          {formatHours(payrollDetails.totalHours || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600 text-lg">
                          £{payrollDetails.grossPay?.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No shift details available</p>
                </div>
              )}
            </div>

            {/* Pay Summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CurrencyPoundIcon className="h-5 w-5 text-primary-600" />
                Pay Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Hourly Rate</p>
                  <p className="text-lg font-bold text-gray-900">£{payrollDetails.hourlyRate}/hr</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Total Hours</p>
                  <p className="text-lg font-bold text-gray-900">{payrollDetails.totalHours?.toFixed(2)}h</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Gross Pay</p>
                  <p className="text-lg font-bold text-gray-900">£{payrollDetails.grossPay?.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">Deductions</p>
                  <p className="text-lg font-bold text-red-600">-£{(payrollDetails.deductions || 0).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-gray-700">Net Pay:</span>
                  <span className="text-3xl font-bold text-green-600">£{payrollDetails.netPay?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info (if paid) */}
            {payrollDetails.status === 'paid' && payrollDetails.paidAt && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Payment Completed</p>
                    <p className="text-sm text-green-700">
                      Paid via {payrollDetails.paymentMethod} on {format(new Date(payrollDetails.paidAt), 'MMMM d, yyyy \'at\' h:mm a')}
                      {payrollDetails.paymentReference && ` • Ref: ${payrollDetails.paymentReference}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
};

export default PayrollPage;

import { useState, useEffect } from 'react';
import { payrollAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Badge, Spinner, EmptyState, StatCard, Modal, Button } from '../../components/common';
import {
  BanknotesIcon,
  ClockIcon,
  CurrencyPoundIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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

const formatCurrency = (amount) => `£${Number(amount || 0).toFixed(2)}`;

const EmployeePayrollPage = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [totals, setTotals] = useState({
    totalEarned: 0,
    totalHours: 0,
    pendingAmount: 0,
    paidAmount: 0,
  });

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const response = await payrollAPI.getMy();
      const data = response.data.data;
      setPayrolls(data);
      
      // Calculate totals
      const totalEarned = data.reduce((sum, p) => sum + (p.netPay || 0), 0);
      const totalHours = data.reduce((sum, p) => sum + (p.totalHours || 0), 0);
      const pendingAmount = data
        .filter((p) => p.status !== 'paid')
        .reduce((sum, p) => sum + (p.netPay || 0), 0);
      const paidAmount = data
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + (p.netPay || 0), 0);
      
      setTotals({ totalEarned, totalHours, pendingAmount, paidAmount });
    } catch (error) {
      toast.error('Failed to fetch payroll history');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary-700 via-primary-600 to-slate-900 p-6 text-white shadow-lg shadow-primary-900/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                <SparklesIcon className="h-4 w-4" />
                Salary center
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">My Payroll</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
                Monitor earnings, pending amounts, and week-level details with full transparency.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-100">
              Last refreshed: {format(new Date(), 'dd MMM yyyy, h:mm a')}
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Earned"
            value={formatCurrency(totals.totalEarned)}
            subtitle="All time"
            icon={CurrencyPoundIcon}
          />
          <StatCard
            title="Total Hours"
            value={formatHours(totals.totalHours)}
            subtitle="Hours worked"
            icon={ClockIcon}
          />
          <StatCard
            title="Pending"
            value={formatCurrency(totals.pendingAmount)}
            subtitle="Awaiting payment"
            icon={BanknotesIcon}
          />
          <StatCard
            title="Paid"
            value={formatCurrency(totals.paidAmount)}
            subtitle="Received"
            icon={BanknotesIcon}
          />
        </div>

        <section>
          <Card title="Payment Overview" subtitle="How your compensation is currently split">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Already paid</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(totals.paidAmount)}</p>
                <p className="mt-1 text-sm text-slate-500">Amount received in previous payroll runs.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending release</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">{formatCurrency(totals.pendingAmount)}</p>
                <p className="mt-1 text-sm text-slate-500">Generated and waiting for final payment.</p>
              </div>
              <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Total payroll value</p>
                <p className="mt-2 text-2xl font-bold text-primary-800">{formatCurrency(totals.totalEarned)}</p>
                <p className="mt-1 text-sm text-primary-700">Paid + pending across your records.</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Payroll List */}
        <Card title="Payment History" subtitle="Open a row to inspect pay structure and shift references">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : payrolls.length === 0 ? (
            <EmptyState
              title="No payroll records"
              description="Your payroll records will appear here once processed"
              icon={BanknotesIcon}
            />
          ) : (
            <div className="space-y-3">
              {payrolls.map((payroll) => (
                <div
                  key={payroll._id}
                  className="border border-slate-200 rounded-2xl overflow-hidden"
                >
                  {/* Main Row */}
                  <button
                    onClick={() => toggleExpand(payroll._id)}
                    className="w-full p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        payroll.status === 'paid' ? 'bg-emerald-100' : 'bg-amber-100'
                        }`}>
                          <CurrencyPoundIcon className={`h-6 w-6 ${
                            payroll.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-slate-900">
                            Week of {format(new Date(payroll.weekStartDate), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatHours(payroll.totalHours)} @ {formatCurrency(payroll.hourlyRate)}/hr
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                        <div className="text-left sm:text-right">
                          <p className="text-xl font-bold text-slate-900">
                            {formatCurrency(payroll.netPay)}
                          </p>
                          <Badge variant={payroll.status === 'paid' ? 'success' : 'warning'}>
                            {payroll.status}
                          </Badge>
                        </div>
                        {expandedId === payroll._id ? (
                          <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedId === payroll._id && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-200">
                      <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-sm text-slate-500">Week Period</p>
                          <p className="font-medium text-slate-900">
                            {format(new Date(payroll.weekStartDate), 'MMM d')} - {format(new Date(payroll.weekEndDate), 'MMM d')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Regular Hours</p>
                          <p className="font-medium text-slate-900">{formatHours(payroll.regularHours)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Overtime Hours</p>
                          <p className="font-medium text-slate-900">{formatHours(payroll.overtimeHours || 0)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Hourly Rate</p>
                          <p className="font-medium text-slate-900">{formatCurrency(payroll.hourlyRate)}/hr</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-slate-600">Gross Pay</span>
                          <span className="font-medium text-slate-900">{formatCurrency(payroll.grossPay)}</span>
                        </div>
                        {payroll.deductions > 0 && (
                          <div className="flex justify-between mb-2">
                            <span className="text-slate-600">Deductions</span>
                            <span className="font-medium text-rose-600">-{formatCurrency(payroll.deductions)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2 mt-2">
                          <span>Net Pay</span>
                          <span className="text-emerald-600">{formatCurrency(payroll.netPay)}</span>
                        </div>
                      </div>

                      {payroll.status === 'paid' && (
                        <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <p className="text-sm text-emerald-800">
                            <strong>Payment Details:</strong> Paid via {payroll.paymentMethod || 'cash'} on{' '}
                            {payroll.paidAt ? format(new Date(payroll.paidAt), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      )}

                      {/* View Details Button */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(payroll);
                          }}
                          leftIcon={<EyeIcon className="h-4 w-4" />}
                        >
                          View Daily Shift Details
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

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
            {/* Week Summary Header */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-5 border border-primary-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarDaysIcon className="h-6 w-6 text-primary-600" />
                  <span className="text-lg font-semibold">
                    {format(new Date(payrollDetails.weekStartDate), 'MMMM d')} - {format(new Date(payrollDetails.weekEndDate), 'MMMM d, yyyy')}
                  </span>
                </div>
                <Badge variant={payrollDetails.status === 'paid' ? 'success' : 'warning'}>
                  {payrollDetails.status}
                </Badge>
              </div>
            </div>

            {/* Daily Shifts Breakdown */}
            <div>
              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-primary-600" />
                Your Daily Work History
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                Pay is calculated based on scheduled shift times.
              </p>
              
              {payrollDetails.shifts && payrollDetails.shifts.length > 0 ? (
                <div>
                  <div className="space-y-3 md:hidden">
                    {payrollDetails.shifts
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((shift, index) => (
                        <div key={shift._id || index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              {format(new Date(shift.date), 'EEE, MMM d')}
                            </p>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-800">
                              {shift.shiftType || 'Regular'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{shift.startTime} - {shift.endTime}</p>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-slate-900">{formatHours(shift.hoursWorked || 0)}</span>
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency((shift.hoursWorked || 0) * payrollDetails.hourlyRate)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Shift Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Scheduled Time</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Hours</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Earnings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {payrollDetails.shifts
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .map((shift, index) => (
                          <tr key={shift._id || index} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">
                                {format(new Date(shift.date), 'EEE, MMM d')}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                {shift.shiftType || 'Regular'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {shift.startTime} - {shift.endTime}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold text-slate-900">
                                {formatHours(shift.hoursWorked || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-emerald-600">
                                {formatCurrency((shift.hoursWorked || 0) * payrollDetails.hourlyRate)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals Row */}
                      <tfoot className="bg-slate-100">
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right font-semibold text-slate-700">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">
                          {formatHours(payrollDetails.totalHours || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 text-lg">
                          {formatCurrency(payrollDetails.grossPay)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <ClockIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No shift details available</p>
                </div>
              )}
            </div>

            {/* Pay Summary */}
            <div className="bg-slate-50 rounded-xl p-5 space-y-3 border border-slate-200">
              <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <CurrencyPoundIcon className="h-5 w-5 text-primary-600" />
                Pay Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">Hourly Rate</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(payrollDetails.hourlyRate)}/hr</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">Total Hours</p>
                  <p className="text-lg font-bold text-slate-900">{formatHours(payrollDetails.totalHours)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">Gross Pay</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(payrollDetails.grossPay)}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-sm text-slate-500">Deductions</p>
                  <p className="text-lg font-bold text-rose-600">-{formatCurrency(payrollDetails.deductions || 0)}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-slate-700">Net Pay:</span>
                  <span className="text-3xl font-bold text-emerald-600">{formatCurrency(payrollDetails.netPay)}</span>
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

export default EmployeePayrollPage;

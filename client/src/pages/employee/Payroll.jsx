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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payroll</h1>
          <p className="text-gray-500 mt-1">View your earnings and payment history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Earned"
            value={`£${totals.totalEarned.toFixed(2)}`}
            subtitle="All time"
            icon={CurrencyPoundIcon}
          />
          <StatCard
            title="Total Hours"
            value={`${totals.totalHours}h`}
            subtitle="Hours worked"
            icon={ClockIcon}
          />
          <StatCard
            title="Pending"
            value={`£${totals.pendingAmount.toFixed(2)}`}
            subtitle="Awaiting payment"
            icon={BanknotesIcon}
          />
          <StatCard
            title="Paid"
            value={`£${totals.paidAmount.toFixed(2)}`}
            subtitle="Received"
            icon={BanknotesIcon}
          />
        </div>

        {/* Payroll List */}
        <Card title="Payment History">
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
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Main Row */}
                  <button
                    onClick={() => toggleExpand(payroll._id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        payroll.status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <CurrencyPoundIcon className={`h-6 w-6 ${
                          payroll.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          Week of {format(new Date(payroll.weekStartDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payroll.totalHours} hours @ £{payroll.hourlyRate}/hr
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          £{payroll.netPay?.toFixed(2)}
                        </p>
                        <Badge variant={payroll.status === 'paid' ? 'success' : 'warning'}>
                          {payroll.status}
                        </Badge>
                      </div>
                      {expandedId === payroll._id ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedId === payroll._id && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                        <div>
                          <p className="text-sm text-gray-500">Week Period</p>
                          <p className="font-medium">
                            {format(new Date(payroll.weekStartDate), 'MMM d')} - {format(new Date(payroll.weekEndDate), 'MMM d')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Regular Hours</p>
                          <p className="font-medium">{payroll.regularHours}h</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Overtime Hours</p>
                          <p className="font-medium">{payroll.overtimeHours || 0}h</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Hourly Rate</p>
                          <p className="font-medium">£{payroll.hourlyRate}/hr</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Gross Pay</span>
                          <span className="font-medium">£{payroll.grossPay?.toFixed(2)}</span>
                        </div>
                        {payroll.deductions > 0 && (
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Deductions</span>
                            <span className="font-medium text-red-600">-£{payroll.deductions?.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                          <span>Net Pay</span>
                          <span className="text-green-600">£{payroll.netPay?.toFixed(2)}</span>
                        </div>
                      </div>

                      {payroll.status === 'paid' && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>Payment Details:</strong> Paid via {payroll.paymentMethod || 'cash'} on{' '}
                            {payroll.paidAt ? format(new Date(payroll.paidAt), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      )}

                      {/* View Details Button */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
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
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
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
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-primary-600" />
                Your Daily Work History
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Pay is calculated based on scheduled shift times.
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
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Earnings</th>
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
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {shift.startTime} - {shift.endTime}
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

export default EmployeePayrollPage;

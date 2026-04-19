import { useState, useEffect } from 'react';
import { shiftAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Badge, Spinner, EmptyState, Button } from '../../components/common';
import {
  CalendarDaysIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, isSameDay, addDays, isToday, isPast } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors = {
  scheduled: 'info',
  'in-progress': 'warning',
  completed: 'success',
  missed: 'danger',
  cancelled: 'gray',
};

const EmployeeShiftsPage = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchShifts();
  }, [currentWeek]);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await shiftAPI.getMy({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      });
      setShifts(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleThisWeek = () => setCurrentWeek(new Date());

  const getShiftForDay = (date) => {
    return shifts.find((shift) => isSameDay(new Date(shift.date), date));
  };

  const handleCheckIn = async (shiftId) => {
    try {
      setCheckingIn(true);
      await shiftAPI.checkIn(shiftId);
      toast.success('Checked in successfully');
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async (shiftId) => {
    try {
      setCheckingOut(true);
      await shiftAPI.checkOut(shiftId);
      toast.success('Checked out successfully');
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  };

  const getTodayShift = () => {
    return shifts.find((shift) => isToday(new Date(shift.date)));
  };

  const todayShift = getTodayShift();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Shifts</h1>
          <p className="text-gray-500 mt-1">View your assigned shifts and check in/out</p>
        </div>

        {/* Today's Shift - Check In/Out */}
        {todayShift && (
          <Card title="Today's Shift" className="bg-gradient-to-r from-primary-50 to-primary-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {todayShift.startTime} - {todayShift.endTime}
                  </h3>
                  <p className="text-sm text-gray-600 capitalize">{todayShift.shiftType} Shift</p>
                  {todayShift.actualCheckIn && (
                    <p className="text-xs text-green-600 mt-1">
                      Checked in at {format(new Date(todayShift.actualCheckIn), 'HH:mm')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant={statusColors[todayShift.status]} size="lg">
                  {todayShift.status}
                </Badge>
                {todayShift.status === 'scheduled' && (
                  <Button
                    onClick={() => handleCheckIn(todayShift._id)}
                    isLoading={checkingIn}
                    leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                  >
                    Check In
                  </Button>
                )}
                {todayShift.status === 'in-progress' && (
                  <Button
                    onClick={() => handleCheckOut(todayShift._id)}
                    isLoading={checkingOut}
                    variant="warning"
                    leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                  >
                    Check Out
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Week Navigation */}
        <Card>
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h2>
              <button
                onClick={handleThisWeek}
                className="text-sm text-primary-600 hover:text-primary-700 mt-1"
              >
                Go to this week
              </button>
            </div>

            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </Card>

        {/* Weekly Calendar */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const shift = getShiftForDay(day);
              const today = isToday(day);
              const past = isPast(day) && !today;

              return (
                <Card 
                  key={day.toISOString()}
                  className={`
                    ${today ? 'ring-2 ring-primary-500 bg-primary-50' : ''}
                    ${past ? 'opacity-60' : ''}
                  `}
                >
                  <div className="text-center mb-3">
                    <p className={`text-sm font-medium ${today ? 'text-primary-600' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-2xl font-bold ${today ? 'text-primary-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>

                  {shift ? (
                    <div className="p-3 bg-gray-50 rounded-lg text-center">
                      <Badge variant={statusColors[shift.status]} size="sm">
                        {shift.status}
                      </Badge>
                      <p className="text-sm font-semibold mt-2">{shift.startTime}</p>
                      <p className="text-xs text-gray-500">to {shift.endTime}</p>
                      {shift.hoursWorked > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          {shift.hoursWorked}h worked
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 text-center">
                      <p className="text-xs text-gray-400">Day off</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Shift History */}
        <Card title="Shift History">
          {shifts.length === 0 ? (
            <EmptyState
              title="No shifts this week"
              description="You don't have any shifts scheduled for this week"
              icon={CalendarDaysIcon}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shifts.map((shift) => (
                    <tr key={shift._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {format(new Date(shift.date), 'EEE, MMM d')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {shift.startTime} - {shift.endTime}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="primary">{shift.shiftType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColors[shift.status]}>{shift.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {shift.hoursWorked > 0 ? `${shift.hoursWorked}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeShiftsPage;

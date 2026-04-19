import { useState, useEffect, useMemo } from 'react';
import { shiftAPI, employeeAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input, Select, Modal, Badge, Spinner, EmptyState, SearchBar, FilterBar } from '../../components/common';
import {
  PlusIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  PencilSquareIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';

const shiftTypeOptions = [
  { value: 'breakfast', label: 'Breakfast (8:45 AM - 4:00 PM)' },
  { value: 'fullday', label: 'Full Day (8:45 AM - 7:00 PM)' },
  { value: 'midshift', label: 'Mid Shift (11:45 AM - 11:00 PM)' },
  { value: 'lunch', label: 'Lunch (3:45 PM - 11:00 PM)' },
  { value: 'evening', label: 'Evening (5:45 PM - 11:00 PM)' },
  { value: 'dinner', label: 'Dinner (6:45 PM - 11:00 PM)' },
];

const statusColors = {
  scheduled: 'info',
  'in-progress': 'warning',
  completed: 'success',
  missed: 'danger',
  cancelled: 'gray',
};

const EARLY_ARRIVAL_BUFFER_MINUTES = 15;

const calculatePaidHours = (startTime, endTime) => {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);

  let startMins = sH * 60 + sM;
  let endMins = eH * 60 + eM;

  if (endMins < startMins) {
    endMins += 24 * 60;
  }

  const paidMinutes = Math.max(0, endMins - startMins - EARLY_ARRIVAL_BUFFER_MINUTES);
  return (paidMinutes / 60).toFixed(2);
};

const savedViewKey = 'mugal-azam-shifts-view';

const ShiftsPage = () => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-asc');
  const [savedViews, setSavedViews] = useState([]);
  const [activeView, setActiveView] = useState('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // New state for day shifts modal
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayShifts, setSelectedDayShifts] = useState([]);
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  
  const [formData, setFormData] = useState({
    employee: '',
    date: '',
    startTime: '',
    endTime: '',
    shiftType: '',
    notes: '',
    inputMethod: 'times', // 'times' or 'shiftType'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Shift type time templates
  const shiftTypeTimings = {
    breakfast: { start: '08:45', end: '16:00' },
    fullday: { start: '08:45', end: '19:00' },
    midshift: { start: '11:45', end: '23:00' },
    lunch: { start: '15:45', end: '23:00' },
    evening: { start: '17:45', end: '23:00' },
    dinner: { start: '18:45', end: '23:00' },
  };

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const storedViews = JSON.parse(localStorage.getItem(savedViewKey) || '[]');
    setSavedViews(storedViews);
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const visibleShifts = useMemo(() => {
    const filtered = shifts.filter((shift) => {
      const matchesSearch = !search || shift.employee?.name?.toLowerCase().includes(search.toLowerCase()) || shift.employee?.jobRole?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || shift.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'time-asc') return a.startTime.localeCompare(b.startTime);
      if (sortBy === 'time-desc') return b.startTime.localeCompare(a.startTime);
      return new Date(a.date) - new Date(b.date);
    });
  }, [shifts, search, filterStatus, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, employeesRes] = await Promise.all([
        shiftAPI.getWeekly({ date: format(currentWeek, 'yyyy-MM-dd') }),
        employeeAPI.getAll({ isActive: true }),
      ]);
      setShifts(shiftsRes.data.data);
      // Sort employees alphabetically by name
      const sortedEmployees = (employeesRes.data.data || []).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setEmployees(sortedEmployees);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleThisWeek = () => setCurrentWeek(new Date());

  const getShiftsForDay = (date) => {
    return shifts.filter((shift) => isSameDay(new Date(shift.date), date));
  };

  // Open day shifts modal
  const handleViewDayShifts = (date) => {
    const dayShifts = getShiftsForDay(date);
    setSelectedDayShifts(dayShifts);
    setSelectedDayDate(date);
    setIsDayModalOpen(true);
  };

  const handleOpenModal = (date = null, shift = null) => {
    // Close day modal if open
    setIsDayModalOpen(false);
    
    if (shift) {
      // Editing existing shift
      setIsEditing(true);
      setEditingShiftId(shift._id);
      setFormData({
        employee: shift.employee?._id || '',
        date: format(new Date(shift.date), 'yyyy-MM-dd'),
        startTime: shift.startTime,
        endTime: shift.endTime,
        shiftType: shift.shiftType,
        notes: shift.notes || '',
        inputMethod: 'times',
      });
    } else {
      // Creating new shift
      setIsEditing(false);
      setEditingShiftId(null);
      setSelectedDate(date);
      setFormData({
        employee: '',
        date: date ? format(date, 'yyyy-MM-dd') : '',
        startTime: '',
        endTime: '',
        shiftType: '',
        notes: '',
        inputMethod: 'times',
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSaveView = () => {
    const nextView = {
      id: `view-${Date.now()}`,
      name: `View ${savedViews.length + 1}`,
      search,
      filterStatus,
      sortBy,
    };
    const nextViews = [nextView, ...savedViews].slice(0, 5);
    setSavedViews(nextViews);
    localStorage.setItem(savedViewKey, JSON.stringify(nextViews));
    setActiveView(nextView.id);
    toast.success('Current shift view saved');
  };

  const handleLoadView = (view) => {
    setSearch(view.search);
    setFilterStatus(view.filterStatus);
    setSortBy(view.sortBy);
    setActiveView(view.id);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!isEditing && !formData.employee) errors.employee = 'Employee is required';
    if (!formData.date) errors.date = 'Date is required';
    
    // Validate based on input method
    if (formData.inputMethod === 'times') {
      if (!formData.startTime) errors.startTime = 'Start time is required';
      if (!formData.endTime) errors.endTime = 'End time is required';
    } else {
      if (!formData.shiftType) errors.shiftType = 'Shift type is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDate = new Date(formData.date);
    shiftDate.setHours(0, 0, 0, 0);

    // Get actual start/end times to use
    let startTime = formData.startTime;
    let endTime = formData.endTime;
    let shiftType = formData.shiftType;

    // If shift type was selected, use its times
    if (formData.inputMethod === 'shiftType' && formData.shiftType) {
      const timing = shiftTypeTimings[formData.shiftType];
      startTime = timing.start;
      endTime = timing.end;
    }

    // Only apply past date/time validation for NEW shifts, not when editing
    if (!isEditing) {
      // Check if date is in the past
      if (shiftDate < today) {
        toast.error('Cannot create shift for a past date');
        return;
      }

      // Check if start time has passed for today
      if (shiftDate.getTime() === today.getTime()) {
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const shiftStartTime = new Date();
        shiftStartTime.setHours(startHour, startMinute, 0, 0);
        if (shiftStartTime < now) {
          toast.error('Cannot create shift - start time has already passed');
          return;
        }
      }
    } else {
      // For editing: validate end time is after start time
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const startMins = startHour * 60 + startMinute;
      const endMins = endHour * 60 + endMinute;
      if (endMins <= startMins) {
        toast.error('End time must be after start time');
        return;
      }
    }

    try {
      setSubmitting(true);
      const submitData = {
        date: formData.date,
        startTime,
        endTime,
        shiftType: shiftType || formData.shiftType,
        notes: formData.notes,
      };

      if (isEditing) {
        await shiftAPI.update(editingShiftId, submitData);
        toast.success('Shift updated successfully');
      } else {
        await shiftAPI.create({
          employee: formData.employee,
          ...submitData,
        });
        toast.success('Shift assigned successfully');
      }
      setIsModalOpen(false);
      setIsEditing(false);
      setEditingShiftId(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} shift`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelShift = async (shiftId) => {
    if (!confirm('Are you sure you want to cancel this shift?')) return;

    try {
      await shiftAPI.cancel(shiftId);
      toast.success('Shift cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel shift');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shift Schedule</h1>
            <p className="text-gray-500 mt-1">Manage employee shifts and schedules</p>
          </div>
          <Button 
            onClick={() => handleOpenModal()}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Assign Shift
          </Button>
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const dayShifts = getShiftsForDay(day);
              const isToday = isSameDay(day, new Date());
              const scheduledCount = dayShifts.filter(s => s.status === 'scheduled').length;
              const completedCount = dayShifts.filter(s => s.status === 'completed').length;
              const inProgressCount = dayShifts.filter(s => s.status === 'in-progress').length;

              return (
                <Card 
                  key={day.toISOString()}
                  className={`${isToday ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="text-center mb-3">
                    <p className={`text-sm font-medium ${isToday ? 'text-primary-600' : 'text-gray-500'}`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-2xl font-bold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>

                  <div className="min-h-[120px] flex flex-col justify-center">
                    {dayShifts.length > 0 ? (
                      <div className="text-center space-y-3">
                        {/* Summary Stats */}
                        <div className="space-y-1">
                          <p className="text-3xl font-bold text-gray-900">{dayShifts.length}</p>
                          <p className="text-xs text-gray-500">
                            {dayShifts.length === 1 ? 'Shift' : 'Shifts'}
                          </p>
                        </div>

                        {/* Status breakdown */}
                        <div className="flex justify-center gap-2 flex-wrap">
                          {scheduledCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                              {scheduledCount} scheduled
                            </span>
                          )}
                          {inProgressCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                              {inProgressCount} active
                            </span>
                          )}
                          {completedCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                              {completedCount} done
                            </span>
                          )}
                        </div>

                        {/* View Shifts Button */}
                        <button
                          onClick={() => handleViewDayShifts(day)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-sm font-medium transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                          View Shifts
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        <CalendarDaysIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No shifts</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenModal(day)}
                    className="w-full mt-3 py-2 text-xs text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-dashed border-primary-200"
                  >
                    + Add Shift
                  </button>
                </Card>
              );
            })}
          </div>
        )}

        {/* All Shifts Table */}
        <Card title="All Shifts This Week">
          {/* Professional Search and Filter */}
          <div className="mb-6 space-y-4">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search by employee name or role..."
              size="md"
              variant="default"
              className="w-full lg:max-w-md"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-end">
              {/* Status Filter */}
              <FilterBar
                filters={[
                  { type: 'button', key: 'all', label: 'All', value: 'all', active: filterStatus === 'all', onChange: setFilterStatus },
                  { type: 'button', key: 'scheduled', label: 'Scheduled', value: 'scheduled', active: filterStatus === 'scheduled', onChange: setFilterStatus },
                  { type: 'button', key: 'in-progress', label: 'Active', value: 'in-progress', active: filterStatus === 'in-progress', onChange: setFilterStatus },
                  { type: 'button', key: 'completed', label: 'Done', value: 'completed', active: filterStatus === 'completed', onChange: setFilterStatus },
                  { type: 'button', key: 'missed', label: 'Missed', value: 'missed', active: filterStatus === 'missed', onChange: setFilterStatus },
                  { type: 'button', key: 'cancelled', label: 'Cancelled', value: 'cancelled', active: filterStatus === 'cancelled', onChange: setFilterStatus },
                ]}
                compact
                showLabel={false}
              />

              {/* Sort Dropdown */}
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'date-asc', label: 'Date: oldest first' },
                  { value: 'date-desc', label: 'Date: newest first' },
                  { value: 'time-asc', label: 'Time: earliest first' },
                  { value: 'time-desc', label: 'Time: latest first' },
                ]}
                placeholder="Sort by..."
                variant="search"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-500">Saved views:</span>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterStatus('all');
                  setSortBy('date-asc');
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

          {visibleShifts.length === 0 ? (
            <EmptyState
              title="No shifts scheduled"
              description="Start by assigning shifts to your employees"
              icon={CalendarDaysIcon}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleShifts.map((shift) => (
                    <tr key={shift._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-primary-600 font-semibold text-sm">
                              {shift.employee?.name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{shift.employee?.name}</p>
                            <p className="text-xs text-gray-500">{shift.employee?.jobRole}</p>
                          </div>
                        </div>
                      </td>
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
                      <td className="px-4 py-3">
                        {(shift.status === 'scheduled' || shift.status === 'in-progress' || shift.status === 'completed') && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenModal(null, shift)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={shift.status === 'completed' ? 'Edit times (recalculates pay)' : 'Edit shift'}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            {shift.status !== 'completed' && (
                              <button
                                onClick={() => handleCancelShift(shift._id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Cancel shift"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Shift Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsEditing(false);
          setEditingShiftId(null);
        }}
        title={isEditing ? "Edit Shift" : "Assign New Shift"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Show context message when editing */}
          {isEditing && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Editing shift for:</strong> {employees.find(e => e._id === formData.employee)?.name || 'Employee'}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                💡 You can adjust times (e.g., send employee home early) or reschedule. Employee will be notified of changes.
              </p>
            </div>
          )}

          {!isEditing && (
            <Select
              label="Employee"
              name="employee"
              value={formData.employee}
              onChange={handleChange}
              error={formErrors.employee}
              options={employees.map((e) => ({ value: e._id, label: `${e.name} (${e.jobRole})` }))}
              required
            />
          )}
          
          <Input
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            error={formErrors.date}
            required
          />

          {/* Input Method Toggle */}
          {!isEditing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-blue-900 mb-2">Choose how to set the shift:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, inputMethod: 'times', shiftType: '' });
                    setFormErrors({});
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    formData.inputMethod === 'times'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  Custom Times
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, inputMethod: 'shiftType', startTime: '', endTime: '' });
                    setFormErrors({});
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    formData.inputMethod === 'shiftType'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  Preset Shift
                </button>
              </div>
            </div>
          )}

          {/* Custom Times Section */}
          {formData.inputMethod === 'times' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={handleChange}
                error={formErrors.startTime}
                required
              />
              <Input
                label={isEditing ? "End Time (adjust to send home early)" : "End Time"}
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={handleChange}
                error={formErrors.endTime}
                required
              />
            </div>
          )}

          {/* Preset Shift Type Section */}
          {formData.inputMethod === 'shiftType' && (
            <Select
              label="Shift Type"
              name="shiftType"
              value={formData.shiftType}
              onChange={(e) => {
                const timing = shiftTypeTimings[e.target.value];
                setFormData({
                  ...formData,
                  shiftType: e.target.value,
                  startTime: timing?.start || '',
                  endTime: timing?.end || '',
                });
              }}
              error={formErrors.shiftType}
              options={shiftTypeOptions}
              required
            />
          )}

          {/* Show calculated hours */}
          {formData.startTime && formData.endTime && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-900">
                <strong>Calculated Paid Hours:</strong> {`${calculatePaidHours(formData.startTime, formData.endTime)}h`}
              </p>
            </div>
          )}

          <Input
            label="Notes (Optional)"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder={isEditing ? "Reason for change..." : "Any special instructions..."}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setIsModalOpen(false);
                setIsEditing(false);
                setEditingShiftId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {isEditing ? "Update Shift" : "Assign Shift"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Day Shifts Modal */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title={selectedDayDate ? `Shifts for ${format(selectedDayDate, 'EEEE, MMMM d, yyyy')}` : 'Day Shifts'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Summary Header */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900">{selectedDayShifts.length}</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setIsDayModalOpen(false);
                handleOpenModal(selectedDayDate);
              }}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Shift
            </Button>
          </div>

          {/* Shifts List */}
          {selectedDayShifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No shifts scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDayShifts
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((shift) => (
                <div
                  key={shift._id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Employee Avatar */}
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold">
                          {shift.employee?.name?.charAt(0)}
                        </span>
                      </div>
                      
                      {/* Employee Details */}
                      <div>
                        <p className="font-medium text-gray-900">{shift.employee?.name}</p>
                        <p className="text-sm text-gray-500">{shift.employee?.jobRole}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge variant={statusColors[shift.status]}>
                      {shift.status}
                    </Badge>
                  </div>

                  {/* Shift Details */}
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Time</p>
                      <p className="font-medium flex items-center gap-1">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        {shift.startTime} - {shift.endTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Type</p>
                      <p className="font-medium capitalize">{shift.shiftType}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Hours</p>
                      <p className="font-medium">{shift.hoursWorked > 0 ? `${shift.hoursWorked}h` : '-'}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {shift.notes && (
                    <div className="mt-3 text-sm">
                      <p className="text-gray-500">Notes</p>
                      <p className="text-gray-700">{shift.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {(shift.status === 'scheduled' || shift.status === 'in-progress' || shift.status === 'completed') && (
                    <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenModal(null, shift)}
                      >
                        <PencilSquareIcon className="h-4 w-4 mr-1" />
                        {shift.status === 'completed' ? 'Edit Times' : 'Edit'}
                      </Button>
                      {shift.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            handleCancelShift(shift._id);
                            // Refresh the day modal data
                            setSelectedDayShifts(prev => prev.filter(s => s._id !== shift._id));
                          }}
                        >
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ShiftsPage;

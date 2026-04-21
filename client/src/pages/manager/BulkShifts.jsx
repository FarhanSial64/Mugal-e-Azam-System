import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input, Select, Badge, Spinner, SearchBar, FilterBar } from '../../components/common';
import { employeeAPI, shiftAPI } from '../../services/api';
import {
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Predefined shift templates for quick selection
const SHIFT_TEMPLATES = [
  { label: 'Breakfast (8:45 AM - 4:00 PM)', startTime: '08:45', endTime: '16:00', type: 'breakfast' },
  { label: 'Full Day (8:45 AM - 7:00 PM)', startTime: '08:45', endTime: '19:00', type: 'fullday' },
  { label: 'Mid Shift (11:45 AM - 11:00 PM)', startTime: '11:45', endTime: '23:00', type: 'midshift' },
  { label: 'Lunch (3:45 PM - 11:00 PM)', startTime: '15:45', endTime: '23:00', type: 'lunch' },
  { label: 'Evening (5:45 PM - 11:00 PM)', startTime: '17:45', endTime: '23:00', type: 'evening' },
  { label: 'Dinner (6:45 PM - 11:00 PM)', startTime: '18:45', endTime: '23:00', type: 'dinner' },
  { label: 'Custom', startTime: '', endTime: '', type: 'custom' },
];

const JOB_ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'food-picker', label: 'Food Picker' },
  { value: 'bar', label: 'Bar' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'chef', label: 'Chef' },
  { value: 'dish-washer', label: 'Dish Washer' },
];

const BulkShiftsPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSelectedDrawer, setShowSelectedDrawer] = useState(false);
  
  // Shift configuration
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customStart, setCustomStart] = useState('09:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [selectedDates, setSelectedDates] = useState([]);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [skipAvailabilityCheck, setSkipAvailabilityCheck] = useState(false);
  
  // Results
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetchEmployees();
    // Set default date range starting from today
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    setDateRangeStart(today.toISOString().split('T')[0]);
    setDateRangeEnd(nextWeek.toISOString().split('T')[0]);
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getAll({ isActive: true, limit: 100 });
      // Sort employees alphabetically by name
      const sortedEmployees = (response.data.data || []).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setEmployees(sortedEmployees);
    } catch (error) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on role and search
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesRole = !roleFilter || emp.jobRole === roleFilter;
      const matchesSearch = !searchQuery || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [employees, roleFilter, searchQuery]);

  // Generate dates between range
  const generateDatesInRange = () => {
    if (!dateRangeStart || !dateRangeEnd) return [];
    const dates = [];
    const start = new Date(dateRangeStart);
    const end = new Date(dateRangeEnd);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    return dates;
  };

  const datesInRange = useMemo(() => generateDatesInRange(), [dateRangeStart, dateRangeEnd]);

  // Select all employees
  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e._id));
    }
  };

  // Toggle single employee
  const toggleEmployee = (id) => {
    setSelectedEmployees(prev => 
      prev.includes(id) 
        ? prev.filter(e => e !== id) 
        : [...prev, id]
    );
  };

  // Select by job role
  const selectByRole = (role) => {
    const roleEmployees = employees.filter(e => e.jobRole === role).map(e => e._id);
    setSelectedEmployees(prev => {
      const newSelection = new Set([...prev, ...roleEmployees]);
      return Array.from(newSelection);
    });
  };

  // Toggle date selection
  const toggleDate = (date) => {
    setSelectedDates(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  // Select all dates
  const selectAllDates = () => {
    if (selectedDates.length === datesInRange.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates([...datesInRange]);
    }
  };

  // Select weekdays only
  const selectWeekdays = () => {
    const weekdays = datesInRange.filter(date => {
      const day = new Date(date).getDay();
      return day !== 0 && day !== 6;
    });
    setSelectedDates(weekdays);
  };

  // Select weekend only
  const selectWeekend = () => {
    const weekend = datesInRange.filter(date => {
      const day = new Date(date).getDay();
      return day === 0 || day === 6;
    });
    setSelectedDates(weekend);
  };

  // Get shift times
  const getShiftTimes = () => {
    if (selectedTemplate?.type === 'custom') {
      return { startTime: customStart, endTime: customEnd };
    }
    return { startTime: selectedTemplate?.startTime, endTime: selectedTemplate?.endTime };
  };

  // Calculate total shifts to be created
  const totalShiftsCount = selectedEmployees.length * selectedDates.length;

  // Submit bulk shifts
  const handleSubmit = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Please select a shift template');
      return;
    }

    const { startTime, endTime } = getShiftTimes();
    if (!startTime || !endTime) {
      toast.error('Please set shift start and end times');
      return;
    }

    // Validate dates are not in the past
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDates = selectedDates.filter(d => new Date(d) < today);
    if (pastDates.length > 0) {
      toast.error('Cannot create shifts for past dates. Please select future dates only.');
      return;
    }

    // Check if start time has passed for today's date
    const todayStr = today.toISOString().split('T')[0];
    if (selectedDates.includes(todayStr)) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const shiftStartTime = new Date();
      shiftStartTime.setHours(startHour, startMinute, 0, 0);
      if (shiftStartTime < now) {
        toast.error(`Cannot create shift starting at ${startTime} - this time has already passed today`);
        return;
      }
    }

    setSubmitting(true);
    setResults(null);

    try {
      // Build shifts array
      const shifts = [];
      for (const employeeId of selectedEmployees) {
        for (const date of selectedDates) {
          shifts.push({
            employee: employeeId,
            date,
            startTime,
            endTime,
            notes,
          });
        }
      }

      const response = await shiftAPI.bulkCreate({ shifts, skipAvailabilityCheck });
      const resultData = response.data.data || response.data;
      setResults(resultData);
      
      const created = resultData.created?.length || 0;
      const failed = resultData.failed?.length || 0;
      
      if (failed === 0) {
        toast.success(`Successfully created ${created} shifts!`);
      } else {
        toast.success(`Created ${created} shifts, ${failed} failed`);
      }

      // Clear selections after success
      if (created > 0) {
        setSelectedEmployees([]);
        setSelectedDates([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create shifts');
    } finally {
      setSubmitting(false);
    }
  };

  const getDayName = (dateStr) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(dateStr).getDay()];
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatRoleLabel = (role) => {
    if (!role) return 'Unknown Role';
    return role
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const invalidDateRange = !!dateRangeStart && !!dateRangeEnd && dateRangeStart > dateRangeEnd;
  const { startTime: previewStartTime, endTime: previewEndTime } = getShiftTimes();
  const canSubmit =
    !submitting &&
    selectedEmployees.length > 0 &&
    selectedDates.length > 0 &&
    !!selectedTemplate &&
    !!previewStartTime &&
    !!previewEndTime &&
    !invalidDateRange;

  const roleSelectionSummary = useMemo(() => {
    const roleMap = new Map();
    employees
      .filter((emp) => selectedEmployees.includes(emp._id))
      .forEach((emp) => {
        const key = emp.jobRole || 'unknown';
        roleMap.set(key, (roleMap.get(key) || 0) + 1);
      });

    return Array.from(roleMap.entries());
  }, [employees, selectedEmployees]);

  const selectedEmployeeDetails = useMemo(() => {
    if (!selectedEmployees.length) return [];

    const employeeMap = new Map(employees.map((emp) => [emp._id, emp]));
    return selectedEmployees
      .map((id) => employeeMap.get(id))
      .filter(Boolean);
  }, [employees, selectedEmployees]);

  useEffect(() => {
    if (selectedEmployees.length > 0) {
      setShowSelectedDrawer(true);
      return;
    }
    setShowSelectedDrawer(false);
  }, [selectedEmployees.length]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Bulk Shift Assignment</h1>
              <p className="mt-1 text-primary-100">
                Assign many shifts in minutes with guided steps and instant preview.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gray" size="sm">Step 1: Employees</Badge>
              <Badge variant="gray" size="sm">Step 2: Dates</Badge>
              <Badge variant="gray" size="sm">Step 3: Shift Time</Badge>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-white/15 p-3">
              <p className="text-xs text-primary-100">Employees</p>
              <p className="text-xl font-semibold">{selectedEmployees.length}</p>
            </div>
            <div className="rounded-lg bg-white/15 p-3">
              <p className="text-xs text-primary-100">Dates</p>
              <p className="text-xl font-semibold">{selectedDates.length}</p>
            </div>
            <div className="rounded-lg bg-white/15 p-3">
              <p className="text-xs text-primary-100">Template</p>
              <p className="text-sm font-semibold truncate">{selectedTemplate?.label || 'Not selected'}</p>
            </div>
            <div className="rounded-lg bg-white/15 p-3">
              <p className="text-xs text-primary-100">Total Shifts</p>
              <p className="text-xl font-semibold">{totalShiftsCount}</p>
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedEmployees([]);
                setSelectedDates([]);
                setSelectedTemplate(null);
                setResults(null);
                setNotes('');
                setSkipAvailabilityCheck(false);
              }}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Employee Selection */}
          <Card title={
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center">
                <UsersIcon className="h-5 w-5 mr-2" />
                Step 1: Select Employees ({selectedEmployees.length}/{filteredEmployees.length})
              </span>
              {selectedEmployees.length > 0 && (
                <span className="text-xs text-primary-700 font-medium">{selectedEmployees.length} selected</span>
              )}
            </div>
          }>
            {/* Filters */}
            <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-end">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search employees..."
                size="md"
                variant="default"
                className="flex-1"
              />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={JOB_ROLES}
              />
            </div>

            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
              <Button
                size="sm"
                variant={selectedEmployees.length === filteredEmployees.length ? 'primary' : 'outline'}
                onClick={handleSelectAll}
              >
                {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
              </Button>
              {JOB_ROLES.slice(1).map(role => (
                <Button
                  key={role.value}
                  size="sm"
                  variant="outline"
                  onClick={() => selectByRole(role.value)}
                >
                  Add all {role.label}
                </Button>
              ))}
            </div>

            {selectedEmployees.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-gray-50 p-3">
                {roleSelectionSummary.map(([role, count]) => (
                  <Badge key={role} variant="gray" size="sm">
                    {formatRoleLabel(role)}: {count}
                  </Badge>
                ))}
              </div>
            )}

            {/* Selected employees preview drawer */}
            <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50/60">
              <div className="w-full px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-primary-900">Selected Employees</p>
                  <p className="text-xs text-primary-700">
                    {selectedEmployees.length === 0
                      ? 'No employee selected yet'
                      : `${selectedEmployees.length} selected, click to review or remove`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedEmployees.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEmployees([])}
                    >
                      Remove all
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowSelectedDrawer((prev) => !prev)}
                    className="rounded-md p-1.5 text-primary-700 hover:bg-primary-100"
                    aria-label={showSelectedDrawer ? 'Collapse selected employees' : 'Expand selected employees'}
                    title={showSelectedDrawer ? 'Collapse' : 'Expand'}
                  >
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${showSelectedDrawer ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {showSelectedDrawer && selectedEmployees.length > 0 && (
                <div className="border-t border-primary-100 px-3 py-3">
                  <div className="max-h-36 overflow-y-auto flex flex-wrap gap-2">
                    {selectedEmployeeDetails.map((employee) => (
                      <div
                        key={employee._id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-2.5 py-1"
                      >
                        <span className="text-xs font-medium text-gray-800 max-w-[140px] truncate">
                          {employee.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleEmployee(employee._id)}
                          className="rounded-full p-0.5 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          aria-label={`Remove ${employee.name}`}
                          title={`Remove ${employee.name}`}
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Employee List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredEmployees.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm font-medium text-gray-700">No matching employees found</p>
                  <p className="text-xs text-gray-500 mt-1">Try another role or search term.</p>
                </div>
              )}

              {filteredEmployees.map(employee => (
                <label
                  key={employee._id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedEmployees.includes(employee._id)
                      ? 'bg-primary-50 border-primary-300 shadow-sm'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee._id)}
                    onChange={() => toggleEmployee(employee._id)}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{employee.name}</p>
                    <p className="text-xs text-gray-500 truncate">{formatRoleLabel(employee.jobRole)}</p>
                  </div>
                  <Badge variant="gray" size="sm">
                    £{employee.hourlyWage?.toFixed(2)}/hr
                  </Badge>
                </label>
              ))}
            </div>
          </Card>

          {/* Right Column - Date & Time Selection */}
          <div className="space-y-6">
            {/* Date Selection */}
            <Card title={
              <span className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2" />
                Step 2: Select Dates ({selectedDates.length})
              </span>
            }>
              {/* Date Range Picker */}
              <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
                <Input
                  type="date"
                  label="From"
                  value={dateRangeStart}
                  onChange={(e) => {
                    setDateRangeStart(e.target.value);
                    setSelectedDates([]);
                  }}
                />
                <Input
                  type="date"
                  label="To"
                  value={dateRangeEnd}
                  onChange={(e) => {
                    setDateRangeEnd(e.target.value);
                    setSelectedDates([]);
                  }}
                />
              </div>

              {invalidDateRange && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  End date must be the same as or after the start date.
                </div>
              )}

              {/* Quick Date Buttons */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                <Button
                  size="sm"
                  variant={selectedDates.length === datesInRange.length ? 'primary' : 'outline'}
                  onClick={selectAllDates}
                  disabled={invalidDateRange || datesInRange.length === 0}
                >
                  All Days
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectWeekdays}
                  disabled={invalidDateRange || datesInRange.length === 0}
                >
                  Weekdays
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectWeekend}
                  disabled={invalidDateRange || datesInRange.length === 0}
                >
                  Weekend
                </Button>
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {!invalidDateRange && datesInRange.map(date => {
                  const isWeekend = [0, 6].includes(new Date(date).getDay());
                  const now = new Date();
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dateObj = new Date(date);
                  dateObj.setHours(0, 0, 0, 0);
                  const isPastDate = dateObj < today;
                  
                  // Check if today and shift time has passed
                  const isToday = dateObj.getTime() === today.getTime();
                  let isTimePassed = false;
                  if (isToday && selectedTemplate && selectedTemplate.type !== 'custom') {
                    const [startHour, startMinute] = selectedTemplate.startTime.split(':').map(Number);
                    const shiftStartTime = new Date();
                    shiftStartTime.setHours(startHour, startMinute, 0, 0);
                    isTimePassed = shiftStartTime < now;
                  }
                  
                  const isDisabled = isPastDate || isTimePassed;
                  
                  return (
                    <button
                      key={date}
                      onClick={() => !isDisabled && toggleDate(date)}
                      disabled={isDisabled}
                      className={`p-2 rounded-lg text-center transition-all ${
                        isDisabled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : selectedDates.includes(date)
                          ? 'bg-primary-600 text-white'
                          : isWeekend
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-xs font-medium">{getDayName(date)}</div>
                      <div className="text-sm font-bold">{formatDate(date)}</div>
                      {isPastDate && <div className="text-xs">Past</div>}
                      {isTimePassed && !isPastDate && <div className="text-xs">Time Passed</div>}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Shift Template Selection */}
            <Card title={
              <span className="flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                Step 3: Select Shift Time
              </span>
            }>
              <div className="grid grid-cols-1 gap-2 mb-4 md:grid-cols-2">
                {SHIFT_TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      selectedTemplate?.label === template.label
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-sm font-medium">{template.label}</div>
                    {template.type !== 'custom' && (
                      <div className={`text-xs ${selectedTemplate?.label === template.label ? 'text-primary-100' : 'text-gray-500'}`}>
                        {template.startTime} - {template.endTime}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom Time Input */}
              {selectedTemplate?.type === 'custom' && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <Input
                    type="time"
                    label="Start Time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                  <Input
                    type="time"
                    label="End Time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              )}

              {/* Notes */}
              <div className="mt-4">
                <Input
                  label="Notes (optional)"
                  placeholder="Add notes for these shifts..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Skip Availability Check */}
              <div className="mt-4 pt-4 border-t">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipAvailabilityCheck}
                    onChange={(e) => setSkipAvailabilityCheck(e.target.checked)}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Skip availability check</span>
                    <p className="text-xs text-gray-500">Assign shifts even if employees marked as unavailable</p>
                  </div>
                </label>
              </div>
            </Card>
          </div>
        </div>

        {/* Summary & Submit */}
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Review and Create</h3>
              <p className="text-sm text-gray-600">
                {selectedEmployees.length} employees x {selectedDates.length} days ={' '}
                <span className="font-semibold text-gray-900">{totalShiftsCount} shifts</span>
              </p>
              <p className="text-sm text-primary-700 font-medium">
                Time window: {previewStartTime || '--:--'} - {previewEndTime || '--:--'}
              </p>
              {!canSubmit && (
                <p className="text-xs text-gray-500">
                  Complete all three steps to enable bulk creation.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit}
                isLoading={submitting}
                className="w-full sm:w-auto"
              >
                <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                Create Shifts
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        {results && (
          <Card title="Assignment Results">
            <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{results.created?.length || 0}</p>
                    <p className="text-sm text-green-600">Shifts Created</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <XCircleIcon className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{results.failed?.length || 0}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Show failed shifts */}
            {results.failed?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Failed Assignments:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {results.failed.map((fail, idx) => (
                    <div key={idx} className="text-sm p-2 bg-red-50 rounded text-red-700">
                      {fail.error} - Date: {fail.date}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BulkShiftsPage;

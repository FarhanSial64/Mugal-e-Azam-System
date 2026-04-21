import { useState, useEffect, useMemo } from 'react';
import { availabilityAPI, employeeAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Spinner, Badge, EmptyState, Input, Select, SearchBar, FilterBar } from '../../components/common';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { format, addWeeks, subWeeks, startOfWeek, addDays } from 'date-fns';
import toast from 'react-hot-toast';

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const JOB_ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'food-picker', label: 'Food Picker' },
  { value: 'bar', label: 'Bar' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'chef', label: 'Chef' },
  { value: 'dish-washer', label: 'Dish Washer' },
];

const AVAILABILITY_FILTERS = [
  { value: '', label: 'All Availability' },
  { value: 'available', label: 'Available Today' },
  { value: 'unavailable', label: 'Unavailable Today' },
];

const ManagerAvailabilityPage = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesRes, availRes] = await Promise.all([
        employeeAPI.getAll({ limit: 100 }),
        availabilityAPI.getAll({ weekStart: format(currentWeek, 'yyyy-MM-dd') }),
      ]);

      // Sort employees alphabetically by name
      const sortedEmployees = (employeesRes.data.data || []).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      setEmployees(sortedEmployees);
      setAvailabilities(availRes.data.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleThisWeek = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getEmployeeAvailability = (employeeId) => {
    return availabilities.find((a) => a.employee?._id === employeeId);
  };

  const getDayAvailability = (employeeId, day) => {
    const availability = getEmployeeAvailability(employeeId);
    if (!availability) {
      // Default to available if no availability record
      return { isAvailable: true, startTime: '09:00', endTime: '23:00', notes: '', isDefault: true };
    }
    return { ...availability[day], isDefault: false };
  };

  // Get today's day name
  const today = new Date();
  const todayDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Adjust for Monday start
  const todayDayName = dayNames[todayDayIndex];

  // Filter employees based on search, role, and availability
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search filter
      const matchesSearch = !searchQuery || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Role filter
      const matchesRole = !roleFilter || emp.jobRole === roleFilter;
      
      // Availability filter (for today)
      let matchesAvailability = true;
      if (availabilityFilter) {
        const todayAvail = getDayAvailability(emp._id, todayDayName);
        if (availabilityFilter === 'available') {
          matchesAvailability = todayAvail.isAvailable;
        } else if (availabilityFilter === 'unavailable') {
          matchesAvailability = !todayAvail.isAvailable;
        }
      }
      
      return matchesSearch && matchesRole && matchesAvailability;
    });
  }, [employees, searchQuery, roleFilter, availabilityFilter, availabilities]);

  const getAvailableCount = (day) => {
    return employees.filter((emp) => {
      const dayAvail = getDayAvailability(emp._id, day);
      return dayAvail.isAvailable;
    }).length;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Availability</h1>
          <p className="text-gray-500 mt-1">
            View when employees are available for shifts
          </p>
        </div>

        {/* Week Navigation */}
        <Card>
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-4">
              <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
              <span className="font-medium">
                Week of {format(currentWeek, 'MMMM d, yyyy')}
              </span>
              <Button variant="outline" size="sm" onClick={handleThisWeek}>
                This Week
              </Button>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </Card>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Professional Search Bar */}
          <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search employees by name or email..."
            size="md"
            variant="default"
            className="w-full lg:max-w-md"
          />

          {/* Role and Availability Filters */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={JOB_ROLES}
              placeholder="Filter by role..."
              variant="search"
            />
            <Select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              options={AVAILABILITY_FILTERS}
              placeholder="Filter by availability..."
              variant="search"
            />
          </div>

          {/* Clear Filters */}
          {(searchQuery || roleFilter || availabilityFilter) && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
              <p className="text-sm text-amber-800">
                Showing {filteredEmployees.length} of {employees.length} employees
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('');
                  setAvailabilityFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Availability Summary */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {dayNames.map((day, index) => {
            const date = addDays(currentWeek, index);
            const availableCount = getAvailableCount(day);
            return (
              <Card key={day} className="text-center p-3">
                <div className="text-xs text-gray-500">{format(date, 'MMM d')}</div>
                <div className="font-semibold text-gray-900">{dayLabels[index]}</div>
                <div className="mt-2">
                  <Badge variant={availableCount > employees.length / 2 ? 'success' : 'warning'}>
                    {availableCount}/{employees.length}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">available</div>
              </Card>
            );
          })}
        </div>

        {/* Employee Availability Table */}
        {filteredEmployees.length === 0 ? (
          <EmptyState
            icon={UserGroupIcon}
            title={employees.length === 0 ? "No employees" : "No matching employees"}
            description={employees.length === 0 ? "Add employees to see their availability" : "Try adjusting your search or filters"}
          />
        ) : (
          <Card>
            <div className="space-y-3 md:hidden">
              {filteredEmployees.map((employee) => (
                <div key={employee._id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
                    <p className="text-xs capitalize text-gray-500">{employee.jobRole?.replace('-', ' ')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dayNames.map((day, index) => {
                      const date = addDays(currentWeek, index);
                      const dayAvail = getDayAvailability(employee._id, day);
                      return (
                        <div key={day} className="rounded-lg border border-slate-200 p-2 text-xs">
                          <p className="font-medium text-slate-700">{dayLabels[index]}</p>
                          <p className="text-[11px] text-slate-500">{format(date, 'MMM d')}</p>
                          {dayAvail.isAvailable ? (
                            <div className="mt-1 text-emerald-700">
                              <p>{dayAvail.startTime}-{dayAvail.endTime}</p>
                              {dayAvail.isDefault && <p className="text-[11px] text-gray-400">default</p>}
                            </div>
                          ) : (
                            <p className="mt-1 text-rose-700">Unavailable</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">
                      Employee ({filteredEmployees.length})
                    </th>
                    {dayNames.map((day, index) => {
                      const date = addDays(currentWeek, index);
                      return (
                        <th
                          key={day}
                          className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]"
                        >
                          <div>{dayLabels[index]}</div>
                          <div className="font-normal text-gray-400">{format(date, 'MMM d')}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {employee.name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {employee.jobRole?.replace('-', ' ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      {dayNames.map((day) => {
                        const dayAvail = getDayAvailability(employee._id, day);
                        return (
                          <td key={day} className="px-4 py-3 text-center">
                            {dayAvail.isAvailable ? (
                              <div className="inline-flex flex-col items-center">
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                <span className="text-xs text-gray-500 mt-1">
                                  {dayAvail.startTime}-{dayAvail.endTime}
                                </span>
                                {dayAvail.isDefault && (
                                  <span className="text-xs text-gray-400">(default)</span>
                                )}
                                {dayAvail.notes && (
                                  <span className="text-xs text-blue-500 italic">{dayAvail.notes}</span>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-center">
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                <span className="text-xs text-gray-500 mt-1">Unavailable</span>
                                {dayAvail.notes && (
                                  <span className="text-xs text-blue-500 italic">{dayAvail.notes}</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Legend */}
        <Card className="bg-gray-50">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircleIcon className="h-5 w-5 text-red-500" />
              <span>Not Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">(default)</span>
              <span>No availability set - assumed available</span>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagerAvailabilityPage;

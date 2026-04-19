import { useState, useEffect } from 'react';
import { availabilityAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Spinner } from '../../components/common';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultDayAvailability = {
  isAvailable: true,
  startTime: '09:00',
  endTime: '23:00',
  notes: '',
};

const EmployeeAvailabilityPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [availability, setAvailability] = useState({
    monday: { ...defaultDayAvailability },
    tuesday: { ...defaultDayAvailability },
    wednesday: { ...defaultDayAvailability },
    thursday: { ...defaultDayAvailability },
    friday: { ...defaultDayAvailability },
    saturday: { ...defaultDayAvailability },
    sunday: { ...defaultDayAvailability },
  });

  useEffect(() => {
    fetchAvailability();
  }, [currentWeek]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const response = await availabilityAPI.getMy({
        weekStart: format(currentWeek, 'yyyy-MM-dd'),
      });
      const data = response.data.data;
      
      // Set availability from response or defaults
      setAvailability({
        monday: data.monday || { ...defaultDayAvailability },
        tuesday: data.tuesday || { ...defaultDayAvailability },
        wednesday: data.wednesday || { ...defaultDayAvailability },
        thursday: data.thursday || { ...defaultDayAvailability },
        friday: data.friday || { ...defaultDayAvailability },
        saturday: data.saturday || { ...defaultDayAvailability },
        sunday: data.sunday || { ...defaultDayAvailability },
      });
    } catch (error) {
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleThisWeek = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const toggleDayAvailability = (day) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isAvailable: !prev[day].isAvailable,
      },
    }));
  };

  const updateDayField = (day, field, value) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await availabilityAPI.setMy({
        weekStart: format(currentWeek, 'yyyy-MM-dd'),
        ...availability,
      });
      toast.success('Availability saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const setAllAvailable = () => {
    const newAvailability = {};
    dayNames.forEach((day) => {
      newAvailability[day] = { ...defaultDayAvailability };
    });
    setAvailability(newAvailability);
  };

  const setAllUnavailable = () => {
    const newAvailability = {};
    dayNames.forEach((day) => {
      newAvailability[day] = { ...defaultDayAvailability, isAvailable: false };
    });
    setAvailability(newAvailability);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
            <p className="text-gray-500 mt-1">
              Set your availability for each week so managers know when you can work
            </p>
          </div>
          <Button onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
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

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={setAllAvailable}>
            Mark All Available
          </Button>
          <Button variant="outline" size="sm" onClick={setAllUnavailable}>
            Mark All Unavailable
          </Button>
        </div>

        {/* Availability Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dayNames.map((day, index) => (
            <Card key={day} className="overflow-hidden">
              <div
                className={`p-4 cursor-pointer transition-colors ${
                  availability[day].isAvailable
                    ? 'bg-green-50 border-b border-green-100'
                    : 'bg-red-50 border-b border-red-100'
                }`}
                onClick={() => toggleDayAvailability(day)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{dayLabels[index]}</h3>
                  {availability[day].isAvailable ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <p
                  className={`text-sm mt-1 ${
                    availability[day].isAvailable ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {availability[day].isAvailable ? 'Available' : 'Not Available'}
                </p>
              </div>

              {availability[day].isAvailable && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        From
                      </label>
                      <input
                        type="time"
                        value={availability[day].startTime}
                        onChange={(e) => updateDayField(day, 'startTime', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Until
                      </label>
                      <input
                        type="time"
                        value={availability[day].endTime}
                        onChange={(e) => updateDayField(day, 'endTime', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., After 6pm only"
                      value={availability[day].notes}
                      onChange={(e) => updateDayField(day, 'notes', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900">How it works</h4>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>• Click on a day to toggle availability on/off</li>
                <li>• Set your available hours for each day</li>
                <li>• Managers will see your availability when scheduling shifts</li>
                <li>• You won't be assigned shifts outside your available hours</li>
                <li>• Remember to update your availability each week</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeAvailabilityPage;

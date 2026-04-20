import { useState, useEffect } from 'react';
import { availabilityAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Spinner, StatCard, Badge } from '../../components/common';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ClockIcon,
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

const formatTime = (time) => {
  if (!time) return '-';
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
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

  const availableDays = dayNames.filter((day) => availability[day]?.isAvailable).length;
  const unavailableDays = dayNames.length - availableDays;
  const availableWindows = dayNames
    .map((day) => availability[day])
    .filter((day) => day?.isAvailable);
  const earliestStart = availableWindows.length
    ? availableWindows.reduce((min, day) => (day.startTime < min ? day.startTime : min), availableWindows[0].startTime)
    : null;
  const latestEnd = availableWindows.length
    ? availableWindows.reduce((max, day) => (day.endTime > max ? day.endTime : max), availableWindows[0].endTime)
    : null;

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
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-primary-700 via-primary-600 to-slate-900 p-6 text-white shadow-lg shadow-primary-900/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                <SparklesIcon className="h-4 w-4" />
                Availability planner
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">My Availability</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
                Keep your weekly schedule accurate so shifts are assigned within your preferred hours.
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-300">
                Week starting {format(currentWeek, 'EEEE, dd MMMM yyyy')}
              </p>
            </div>
            <Button onClick={handleSave} isLoading={saving} className="bg-white text-slate-900 hover:bg-slate-100 font-semibold">
              Save Changes
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Available Days"
            value={availableDays}
            subtitle="This selected week"
            icon={CheckCircleIcon}
          />
          <StatCard
            title="Unavailable Days"
            value={unavailableDays}
            subtitle="Marked as off"
            icon={XCircleIcon}
          />
          <StatCard
            title="Earliest Start"
            value={formatTime(earliestStart)}
            subtitle="Among available days"
            icon={ClockIcon}
          />
          <StatCard
            title="Latest End"
            value={formatTime(latestEnd)}
            subtitle="Among available days"
            icon={ClockIcon}
          />
        </section>

        {/* Week Navigation */}
        <Card title="Week Navigator" subtitle="Move across weeks and update when your routine changes">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex items-center space-x-4 text-slate-900">
              <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
              <span className="font-semibold">
                Week of {format(currentWeek, 'MMMM d, yyyy')}
              </span>
              <Button variant="outline" size="sm" onClick={handleThisWeek}>
                This Week
              </Button>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions" subtitle="Apply weekly defaults with one click">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={setAllAvailable}>
              Mark All Available
            </Button>
            <Button variant="outline" size="sm" onClick={setAllUnavailable}>
              Mark All Unavailable
            </Button>
          </div>
        </Card>

        {/* Availability Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dayNames.map((day, index) => (
            <Card key={day} className="overflow-hidden">
              <div
                className={`p-4 cursor-pointer transition-colors ${
                  availability[day].isAvailable
                    ? 'bg-emerald-50 border-b border-emerald-100'
                    : 'bg-rose-50 border-b border-rose-100'
                }`}
                onClick={() => toggleDayAvailability(day)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{dayLabels[index]}</h3>
                  {availability[day].isAvailable ? (
                    <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-rose-600" />
                  )}
                </div>
                <div className="mt-2">
                  <Badge variant={availability[day].isAvailable ? 'success' : 'danger'}>
                    {availability[day].isAvailable ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
              </div>

              {availability[day].isAvailable && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        From
                      </label>
                      <input
                        type="time"
                        value={availability[day].startTime}
                        onChange={(e) => updateDayField(day, 'startTime', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Until
                      </label>
                      <input
                        type="time"
                        value={availability[day].endTime}
                        onChange={(e) => updateDayField(day, 'endTime', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., After 6pm only"
                      value={availability[day].notes}
                      onChange={(e) => updateDayField(day, 'notes', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Info Box */}
        <Card className="bg-sky-50 border-sky-200" title="How Availability Works" subtitle="These settings guide shift assignment decisions">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <ul className="text-sm text-sky-800 space-y-1">
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

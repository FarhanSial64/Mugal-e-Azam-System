import { useState, useEffect } from 'react';
import { employeeAPI } from '../../services/api';
import { DashboardLayout } from '../../components/layout';
import { Card, Button, Input, Select, Modal, Badge, Spinner, EmptyState, SearchBar, FilterBar } from '../../components/common';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  KeyIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CurrencyPoundIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const jobRoleOptions = [
  { value: 'waiter', label: 'Waiter' },
  { value: 'food-picker', label: 'Food Picker' },
  { value: 'bar', label: 'Bar' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'chef', label: 'Chef' },
  { value: 'dish-washer', label: 'Dish Washer' },
];

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  jobRole: '',
  hourlyWage: '',
  password: '',
  address: '',
};

const savedViewKey = 'mugal-azam-employees-view';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [savedViews, setSavedViews] = useState([]);
  const [activeView, setActiveView] = useState('default');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedViews = JSON.parse(localStorage.getItem(savedViewKey) || '[]');
    setSavedViews(storedViews);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [search, filterActive, sortBy]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = { search };
      if (filterActive !== 'all') {
        params.isActive = filterActive === 'active';
      }
      const response = await employeeAPI.getAll(params);
      const sortedEmployees = [...(response.data.data || [])].sort((a, b) => {
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'wage-desc') return b.hourlyWage - a.hourlyWage;
        if (sortBy === 'wage-asc') return a.hourlyWage - b.hourlyWage;
        return a.name.localeCompare(b.name);
      });
      setEmployees(sortedEmployees);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (employee = null) => {
    if (employee) {
      setIsEditing(true);
      setSelectedEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        jobRole: employee.jobRole,
        hourlyWage: employee.hourlyWage,
        address: employee.address || '',
        password: '',
      });
    } else {
      setIsEditing(false);
      setSelectedEmployee(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSaveView = () => {
    const nextView = {
      id: `view-${Date.now()}`,
      name: `View ${savedViews.length + 1}`,
      search,
      filterActive,
      sortBy,
    };
    const nextViews = [nextView, ...savedViews].slice(0, 5);
    setSavedViews(nextViews);
    localStorage.setItem(savedViewKey, JSON.stringify(nextViews));
    setActiveView(nextView.id);
    toast.success('Current view saved');
  };

  const handleLoadView = (view) => {
    setSearch(view.search);
    setFilterActive(view.filterActive);
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
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.phone) errors.phone = 'Phone is required';
    if (!formData.jobRole) errors.jobRole = 'Job role is required';
    if (!formData.hourlyWage) errors.hourlyWage = 'Hourly wage is required';
    if (!isEditing && !formData.password) errors.password = 'Password is required for new employees';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const data = {
        ...formData,
        hourlyWage: parseFloat(formData.hourlyWage),
      };
      
      if (isEditing) {
        delete data.email;
        delete data.password;
        await employeeAPI.update(selectedEmployee._id, data);
        toast.success('Employee updated successfully');
      } else {
        await employeeAPI.create(data);
        toast.success('Employee created successfully');
      }
      
      handleCloseModal();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (employee) => {
    if (!confirm(`Are you sure you want to deactivate ${employee.name}?`)) return;

    try {
      await employeeAPI.delete(employee._id);
      toast.success('Employee deactivated');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to deactivate employee');
    }
  };

  const handleReactivate = async (employee) => {
    try {
      await employeeAPI.reactivate(employee._id);
      toast.success('Employee reactivated');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to reactivate employee');
    }
  };

  const handleResetPassword = async (employee) => {
    if (!confirm(`Reset password for ${employee.name}? New password will be sent via email.`)) return;

    try {
      await employeeAPI.resetPassword(employee._id);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-500 mt-1">Manage your restaurant staff</p>
          </div>
          <Button 
            onClick={() => handleOpenModal()}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Add Employee
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Professional Search Bar */}
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search by name, email, or phone..."
            size="md"
            variant="default"
            className="w-full lg:max-w-md"
          />

          {/* Status and Sort Filters */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FilterBar
              filters={[
                { type: 'button', key: 'all', label: 'All', value: 'all', active: filterActive === 'all', onChange: setFilterActive },
                { type: 'button', key: 'active', label: 'Active', value: 'active', active: filterActive === 'active', onChange: setFilterActive },
                { type: 'button', key: 'inactive', label: 'Inactive', value: 'inactive', active: filterActive === 'inactive', onChange: setFilterActive },
              ]}
              compact
              showLabel={false}
            />

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'name-asc', label: 'Name: A to Z' },
                { value: 'name-desc', label: 'Name: Z to A' },
                { value: 'wage-desc', label: 'Hourly wage: high to low' },
                { value: 'wage-asc', label: 'Hourly wage: low to high' },
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
                  setSearch('');
                  setFilterActive('all');
                  setSortBy('name-asc');
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

        {/* Employees Table */}
        <Card>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : employees.length === 0 ? (
            <EmptyState
              title="No employees found"
              description="Get started by adding your first employee"
              actionLabel="Add Employee"
              action={() => handleOpenModal()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="primary">{employee.jobRole}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">£{employee.hourlyWage}/hr</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={employee.isActive ? 'success' : 'danger'}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenModal(employee)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(employee)}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title="Reset Password"
                        >
                          <KeyIcon className="h-5 w-5" />
                        </button>
                        {employee.isActive ? (
                          <button
                            onClick={() => handleDelete(employee)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Deactivate"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(employee)}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Reactivate"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? 'Edit Employee' : 'Add New Employee'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={formErrors.name}
              leftIcon={<UserIcon className="h-5 w-5" />}
              required
            />
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={formErrors.email}
              leftIcon={<EnvelopeIcon className="h-5 w-5" />}
              disabled={isEditing}
              required
            />
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={formErrors.phone}
              leftIcon={<PhoneIcon className="h-5 w-5" />}
              required
            />
            <Select
              label="Job Role"
              name="jobRole"
              value={formData.jobRole}
              onChange={handleChange}
              error={formErrors.jobRole}
              options={jobRoleOptions}
              required
            />
            <Input
              label="Hourly Wage (£)"
              name="hourlyWage"
              type="number"
              step="0.50"
              min="0"
              value={formData.hourlyWage}
              onChange={handleChange}
              error={formErrors.hourlyWage}
              leftIcon={<CurrencyPoundIcon className="h-5 w-5" />}
              required
            />
            {!isEditing && (
              <Input
                label="Initial Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={formErrors.password}
                helpText="Employee will receive this via email"
                required
              />
            )}
          </div>
          <Input
            label="Address (Optional)"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {isEditing ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default EmployeesPage;

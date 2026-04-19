import { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout';
import { announcementAPI } from '../../services/api';
import { Card, Button, Input, Select, Modal, Badge, EmptyState, Spinner } from '../../components/common';
import { MegaphoneIcon, PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const audienceOptions = [
  { value: 'all', label: 'All Staff' },
  { value: 'manager', label: 'Managers only' },
  { value: 'employee', label: 'Employees only' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

const initialForm = {
  title: '',
  message: '',
  audience: 'all',
  priority: 'normal',
  isPinned: false,
  isActive: true,
  startAt: '',
  endAt: '',
};

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const [response, analyticsResponse] = await Promise.all([
        announcementAPI.getAll({ activeOnly: false, limit: 100 }),
        announcementAPI.getAnalytics(),
      ]);
      setAnnouncements(response.data.data || []);
      setAnalytics(analyticsResponse.data.data || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || '',
      message: item.message || '',
      audience: item.audience || 'all',
      priority: item.priority || 'normal',
      isPinned: !!item.isPinned,
      isActive: !!item.isActive,
      startAt: item.startAt ? item.startAt.slice(0, 16) : '',
      endAt: item.endAt ? item.endAt.slice(0, 16) : '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...form,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      };

      if (editing) {
        await announcementAPI.update(editing._id, payload);
        toast.success('Announcement updated');
      } else {
        await announcementAPI.create(payload);
        toast.success('Announcement created');
      }

      closeModal();
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm('Archive this announcement?')) return;

    try {
      await announcementAPI.archive(id);
      toast.success('Announcement archived');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to archive announcement');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-500 mt-1">Create and manage internal notices for your team</p>
          </div>
          <Button onClick={openCreate} leftIcon={<PlusIcon className="h-5 w-5" />}>
            New announcement
          </Button>
        </div>

        <Card title="Notice Board" subtitle="Pinned and recent announcements">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState
              title="No announcements yet"
              description="Create your first internal notice to communicate with staff."
              icon={MegaphoneIcon}
              actionLabel="Create announcement"
              action={openCreate}
            />
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div key={item._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-semibold text-slate-900">{item.title}</p>
                        {item.isPinned && <Badge variant="warning">Pinned</Badge>}
                        <Badge variant={item.isActive ? 'success' : 'gray'}>{item.isActive ? 'Active' : 'Archived'}</Badge>
                        <Badge variant={item.priority === 'high' ? 'danger' : 'info'}>{item.priority}</Badge>
                        <Badge variant="primary">{item.audience}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{item.message}</p>
                      <p className="text-xs text-slate-500 mt-3">
                        Posted by {item.createdBy?.name || 'Manager'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 rounded-lg text-primary-700 hover:bg-primary-50"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      {item.isActive && (
                        <button
                          onClick={() => handleArchive(item._id)}
                          className="p-2 rounded-lg text-rose-700 hover:bg-rose-50"
                          title="Archive"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Announcement Analytics" subtitle="Role-based reach and who viewed what">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : analytics.length === 0 ? (
            <EmptyState
              title="No analytics yet"
              description="View data will appear as users open announcements."
              icon={MegaphoneIcon}
            />
          ) : (
            <div className="space-y-4">
              {analytics.map((item) => (
                <div key={item.announcementId} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <Badge variant="primary">Audience: {item.audience}</Badge>
                    <Badge variant="info">Total views: {item.totalViews}</Badge>
                    <Badge variant="warning">Managers: {item.managerViews}</Badge>
                    <Badge variant="success">Employees: {item.employeeViews}</Badge>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    {item.viewers?.length > 0 ? (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead>
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                            <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                            <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Views</th>
                            <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Seen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {item.viewers.map((viewer) => (
                            <tr key={`${item.announcementId}-${viewer.userId}`}>
                              <td className="px-2 py-2 text-sm text-slate-800">{viewer.name}</td>
                              <td className="px-2 py-2 text-sm text-slate-600 capitalize">{viewer.role}</td>
                              <td className="px-2 py-2 text-sm text-slate-800">{viewer.viewCount}</td>
                              <td className="px-2 py-2 text-sm text-slate-600">
                                {new Date(viewer.lastSeenAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-slate-500">No viewers yet for this announcement.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Announcement' : 'Create Announcement'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              className="block w-full px-3 py-2 text-sm border rounded-lg shadow-sm border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={5}
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Audience"
              value={form.audience}
              onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
              options={audienceOptions}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              options={priorityOptions}
            />
            <Input
              label="Start at"
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
            />
            <Input
              label="End at (optional)"
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) => setForm((prev) => ({ ...prev, isPinned: e.target.checked }))}
              />
              Pin announcement
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editing ? 'Update' : 'Create'} announcement
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default AnnouncementsPage;

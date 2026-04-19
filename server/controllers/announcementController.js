import { Announcement, AnnouncementView } from '../models/index.js';
import { asyncHandler, ApiError } from '../utils/helpers.js';

/**
 * @desc    Get announcements for current user
 * @route   GET /api/announcements
 * @access  Private
 */
export const getAnnouncements = asyncHandler(async (req, res) => {
  const { activeOnly = 'true', limit = 20 } = req.query;
  const now = new Date();
  const roleAudience = req.user.role === 'manager' ? 'manager' : 'employee';

  const query = {
    audience: { $in: ['all', roleAudience] },
  };

  if (activeOnly === 'true') {
    query.isActive = true;
    query.startAt = { $lte: now };
    query.$or = [{ endAt: null }, { endAt: { $gte: now } }];
  }

  const announcements = await Announcement.find(query)
    .populate('createdBy', 'name role')
    .sort({ isPinned: -1, priority: -1, createdAt: -1 })
    .limit(parseInt(limit, 10));

  const announcementIds = announcements.map((item) => item._id);
  const views = await AnnouncementView.find({
    user: req.user._id,
    announcement: { $in: announcementIds },
  }).select('announcement lastSeenAt');

  const seenMap = new Map(views.map((view) => [view.announcement.toString(), view.lastSeenAt]));

  const data = announcements.map((item) => {
    const raw = item.toObject();
    const seenAt = seenMap.get(item._id.toString()) || null;
    return {
      ...raw,
      isSeen: !!seenAt,
      seenAt,
    };
  });

  const unseenCount = data.filter((item) => !item.isSeen).length;

  res.status(200).json({
    success: true,
    count: data.length,
    unseenCount,
    data,
  });
});

/**
 * @desc    Mark announcement as seen for current user
 * @route   POST /api/announcements/:id/seen
 * @access  Private
 */
export const markAnnouncementSeen = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    throw new ApiError('Announcement not found', 404);
  }

  const now = new Date();
  const view = await AnnouncementView.findOneAndUpdate(
    {
      announcement: announcement._id,
      user: req.user._id,
    },
    {
      $set: { lastSeenAt: now },
      $setOnInsert: { firstSeenAt: now },
      $inc: { viewCount: 1 },
    },
    {
      new: true,
      upsert: true,
    }
  );

  res.status(200).json({
    success: true,
    data: {
      announcementId: announcement._id,
      seenAt: view.lastSeenAt,
      viewCount: view.viewCount,
    },
  });
});

/**
 * @desc    Get role-based announcement analytics
 * @route   GET /api/announcements/analytics
 * @access  Private/Manager
 */
export const getAnnouncementAnalytics = asyncHandler(async (req, res) => {
  const { announcementId } = req.query;

  const match = {};
  if (announcementId) {
    match._id = announcementId;
  }

  const announcements = await Announcement.find(match)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name role');

  const announcementIds = announcements.map((item) => item._id);
  const views = await AnnouncementView.find({ announcement: { $in: announcementIds } })
    .populate('user', 'name email role')
    .sort({ lastSeenAt: -1 });

  const viewersByAnnouncement = views.reduce((acc, view) => {
    const key = view.announcement.toString();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      userId: view.user?._id,
      name: view.user?.name,
      email: view.user?.email,
      role: view.user?.role,
      firstSeenAt: view.firstSeenAt,
      lastSeenAt: view.lastSeenAt,
      viewCount: view.viewCount,
    });
    return acc;
  }, {});

  const roleStatsByAnnouncement = announcements.map((item) => {
    const key = item._id.toString();
    const viewers = viewersByAnnouncement[key] || [];

    const managerViews = viewers.filter((v) => v.role === 'manager').length;
    const employeeViews = viewers.filter((v) => v.role === 'employee').length;

    return {
      announcementId: item._id,
      title: item.title,
      audience: item.audience,
      priority: item.priority,
      isActive: item.isActive,
      createdAt: item.createdAt,
      createdBy: item.createdBy,
      totalViews: viewers.length,
      managerViews,
      employeeViews,
      viewers,
    };
  });

  res.status(200).json({
    success: true,
    count: roleStatsByAnnouncement.length,
    data: roleStatsByAnnouncement,
  });
});

/**
 * @desc    Create announcement
 * @route   POST /api/announcements
 * @access  Private/Manager
 */
export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, audience, priority, isPinned, isActive, startAt, endAt } = req.body;

  if (endAt && startAt && new Date(endAt) < new Date(startAt)) {
    throw new ApiError('End date must be after start date', 400);
  }

  const announcement = await Announcement.create({
    title,
    message,
    audience,
    priority,
    isPinned,
    isActive,
    startAt: startAt ? new Date(startAt) : new Date(),
    endAt: endAt ? new Date(endAt) : null,
    createdBy: req.user._id,
  });

  const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name role');

  res.status(201).json({
    success: true,
    data: populated,
  });
});

/**
 * @desc    Update announcement
 * @route   PUT /api/announcements/:id
 * @access  Private/Manager
 */
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, audience, priority, isPinned, isActive, startAt, endAt } = req.body;

  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    throw new ApiError('Announcement not found', 404);
  }

  if (endAt && startAt && new Date(endAt) < new Date(startAt)) {
    throw new ApiError('End date must be after start date', 400);
  }

  announcement.title = title ?? announcement.title;
  announcement.message = message ?? announcement.message;
  announcement.audience = audience ?? announcement.audience;
  announcement.priority = priority ?? announcement.priority;
  announcement.isPinned = isPinned ?? announcement.isPinned;
  announcement.isActive = isActive ?? announcement.isActive;
  announcement.startAt = startAt ? new Date(startAt) : announcement.startAt;
  announcement.endAt = endAt === null ? null : (endAt ? new Date(endAt) : announcement.endAt);

  await announcement.save();

  const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name role');

  res.status(200).json({
    success: true,
    data: populated,
  });
});

/**
 * @desc    Deactivate announcement (soft delete)
 * @route   DELETE /api/announcements/:id
 * @access  Private/Manager
 */
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    throw new ApiError('Announcement not found', 404);
  }

  announcement.isActive = false;
  await announcement.save();

  res.status(200).json({
    success: true,
    message: 'Announcement archived successfully',
  });
});

export default {
  getAnnouncements,
  markAnnouncementSeen,
  getAnnouncementAnalytics,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
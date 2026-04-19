import mongoose from 'mongoose';

const announcementViewSchema = new mongoose.Schema(
  {
    announcement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Announcement',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    viewCount: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

announcementViewSchema.index({ announcement: 1, user: 1 }, { unique: true });
announcementViewSchema.index({ user: 1, lastSeenAt: -1 });
announcementViewSchema.index({ announcement: 1, lastSeenAt: -1 });

const AnnouncementView = mongoose.model('AnnouncementView', announcementViewSchema);

export default AnnouncementView;
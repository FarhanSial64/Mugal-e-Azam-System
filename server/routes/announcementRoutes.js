import express from 'express';
import {
  getAnnouncements,
  markAnnouncementSeen,
  getAnnouncementAnalytics,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { protect, managerOnly } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAnnouncements);
router.get('/analytics', managerOnly, getAnnouncementAnalytics);
router.post('/:id/seen', markAnnouncementSeen);
router.post('/', managerOnly, createAnnouncement);
router.put('/:id', managerOnly, updateAnnouncement);
router.delete('/:id', managerOnly, deleteAnnouncement);

export default router;
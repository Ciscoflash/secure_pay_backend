import express from 'express';
import { list, read, readAll } from '../controllers/notificationController';
import protect, { requireVerified } from '../middleware/auth';

const router = express.Router();

router.use(protect, requireVerified);

router.get('/', list);
router.post('/read-all', readAll);
router.post('/:id/read', read);

export default router;
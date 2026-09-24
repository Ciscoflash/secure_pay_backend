import express from 'express';
import { list, pay, show } from '../controllers/shipmentController';
import protect, { requireVerified } from '../middleware/auth';

const router = express.Router();

router.use(protect, requireVerified);

router.get('/', list);
router.get('/:id', show);
router.post('/:id/pay', pay);

export default router;

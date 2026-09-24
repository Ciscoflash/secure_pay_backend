import express from 'express';
import { fund, show } from '../controllers/walletController';
import protect, { requireVerified } from '../middleware/auth';

const router = express.Router();

router.use(protect, requireVerified);

router.get('/', show);
router.post('/fund', fund);

export default router;

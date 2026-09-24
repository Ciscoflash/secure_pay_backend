import express from 'express';
import { growth, overview } from '../controllers/dashboardController';
import protect, { requireVerified } from '../middleware/auth';

const router = express.Router();

router.use(protect, requireVerified);

router.get('/overview', overview);
router.get('/growth', growth);

export default router;

import express from 'express';
import {
  create,
  estimate,
  list,
  pay,
  show,
} from '../controllers/shipmentController';
import protect, { requireVerified } from '../middleware/auth';
const router = express.Router();
router.use(protect, requireVerified);
router.get('/', list);
router.post('/estimate', estimate);
router.post('/', create);
router.get('/:id', show);
router.post('/:id/pay', pay);
export default router;

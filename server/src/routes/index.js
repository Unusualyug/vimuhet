import { Router } from 'express';
import authRoutes from './auth.routes.js';
import catalogRoutes from './catalog.routes.js';
import storeRoutes from './store.routes.js';
import adminRoutes from './admin.routes.js';
import consentRoutes from './consent.routes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, message: 'Vimuhet API is healthy', timestamp: new Date().toISOString() })
);

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/', consentRoutes);
router.use('/', catalogRoutes);
router.use('/', storeRoutes);

export default router;

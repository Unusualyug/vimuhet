import { Router } from 'express';
import { body } from 'express-validator';
import * as consent from '../controllers/consent.controller.js';
import * as analytics from '../controllers/analytics.controller.js';
import { validate } from '../middleware/validate.js';
import { optionalUser } from '../middleware/auth.js';
import { analyticsLimiter, writeLimiter } from '../middleware/rateLimit.js';
import { attachConsent } from '../services/consent.service.js';

const router = Router();

router.use(attachConsent);

/* ------------------------------ Cookie policy ----------------------------- */

router.get('/cookies/policy', consent.policy);
router.get('/cookies/consent', consent.current);

router.post(
  '/cookies/consent',
  writeLimiter,
  optionalUser,
  body('consent').isObject().withMessage('Consent choices are required'),
  validate,
  consent.save
);

router.post('/cookies/withdraw', optionalUser, consent.withdraw);

/* ------------------------- Recently viewed (functional) ------------------- */

/** Recently viewed pieces — needs functional consent, otherwise returns empty. */
router.get('/recently-viewed', optionalUser, analytics.recentlyViewed);
router.post('/recently-viewed', analyticsLimiter, optionalUser, analytics.trackRecentView);

/* ------------------------------- Data rights ------------------------------ */

router.post(
  '/privacy/data-request',
  writeLimiter,
  optionalUser,
  body('type').isIn(['ACCESS', 'DELETION']).withMessage('Choose access or deletion'),
  body('email').isEmail().withMessage('Enter a valid email address'),
  validate,
  consent.dataRequest
);

export default router;

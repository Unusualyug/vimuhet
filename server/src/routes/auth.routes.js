import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { protectUser, protectAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, refreshLimiter } from '../middleware/rateLimit.js';
import {
  changePasswordRules,
  forgotRules,
  loginRules,
  registerRules,
  resetRules,
  profileRules,
} from '../validators/auth.validators.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.post('/register', authLimiter, registerRules, validate, auth.register);
router.post('/login', authLimiter, loginRules, validate, auth.login);
router.post('/admin/login', authLimiter, loginRules, validate, auth.adminLogin);
router.post('/refresh', refreshLimiter, auth.refresh);
router.post('/logout', auth.logout);
router.post('/forgot-password', authLimiter, forgotRules, validate, auth.forgotPassword);
router.post('/reset-password', authLimiter, resetRules, validate, auth.resetPassword);
router.post('/verify-email', auth.verifyEmail);

router.get('/me', protectUser, auth.me);
router.patch('/me', protectUser, profileRules, validate, auth.updateMe);
router.post('/change-password', protectUser, changePasswordRules, validate, auth.changePassword);
router.get('/sessions', protectUser, auth.sessions);
router.post('/sessions/revoke-all', protectUser, auth.revokeSessions);
router.post('/account-deletion', protectUser, auth.requestAccountDeletion);

router.get('/admin/me', protectAdmin, auth.adminMe);
router.post('/admin/change-password', protectAdmin, changePasswordRules, validate, auth.adminChangePassword);

export default router;

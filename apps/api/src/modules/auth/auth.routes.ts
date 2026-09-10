import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rate-limit.js';
import * as controller from './auth.controller.js';

/**
 * `/api/v1/auth`
 *
 * Credential endpoints sit behind a stricter rate limiter than the rest of the API.
 */
export const authRouter: Router = Router();

authRouter.post('/register', authRateLimiter, controller.registerHandler);
authRouter.post('/login', authRateLimiter, controller.loginHandler);
authRouter.post('/refresh', authRateLimiter, controller.refreshHandler);
authRouter.post('/logout', controller.logoutHandler);

authRouter.get('/session', authenticate(), controller.sessionHandler);
authRouter.patch('/password', authenticate(), authRateLimiter, controller.changePasswordHandler);

authRouter.get('/invitations/:token', controller.previewInvitationHandler);
authRouter.post('/invitations/accept', authenticate(), controller.acceptInvitationHandler);

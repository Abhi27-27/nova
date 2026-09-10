import {
  acceptInvitationSchema,
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '@nova/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { sendCreated, sendData } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import { acceptInvitation, previewInvitation } from '../workspaces/workspace.service.js';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from './auth.cookies.js';
import * as authService from './auth.service.js';

function requestMeta(req: Request): authService.RequestMeta {
  return { userAgent: req.header('user-agent'), ipAddress: req.ip };
}

function readRefreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[REFRESH_TOKEN_COOKIE];
}

export const registerHandler = defineRoute({ body: registerSchema }, async ({ body, req, res }) => {
  const result = await authService.register(body, requestMeta(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  // The access token is returned in the body as well so non-browser clients
  // (cURL, the OpenAPI explorer) can use `Authorization: Bearer`.
  return sendCreated(res, { ...result.session, accessToken: result.accessToken });
});

export const loginHandler = defineRoute({ body: loginSchema }, async ({ body, req, res }) => {
  const result = await authService.login(body, requestMeta(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  return sendData(res, { ...result.session, accessToken: result.accessToken });
});

export const refreshHandler = defineRoute({}, async ({ req, res }) => {
  const result = await authService.refresh(readRefreshCookie(req), requestMeta(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  return sendData(res, { ...result.session, accessToken: result.accessToken });
});

export const logoutHandler = defineRoute({}, async ({ req, res }) => {
  await authService.logout(readRefreshCookie(req));
  clearAuthCookies(res);
  return sendData(res, { signedOut: true });
});

export const sessionHandler = defineRoute({}, async ({ user, res }) => {
  return sendData(res, await authService.getSession(user.id));
});

export const changePasswordHandler = defineRoute(
  { body: changePasswordSchema },
  async ({ body, user, req, res }) => {
    const result = await authService.changePassword(user.id, body, requestMeta(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendData(res, { ...result.session, accessToken: result.accessToken });
  },
);

export const previewInvitationHandler = defineRoute(
  { params: z.object({ token: z.string().min(1) }) },
  async ({ params, res }) => sendData(res, await previewInvitation(params.token)),
);

export const acceptInvitationHandler = defineRoute(
  { body: acceptInvitationSchema },
  async ({ body, user, res }) => sendData(res, await acceptInvitation(body.token, user.id)),
);

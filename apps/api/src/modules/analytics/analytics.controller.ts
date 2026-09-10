import { dashboardQuerySchema } from '@nova/shared';
import { sendData } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import { getDashboard } from './analytics.service.js';

export const dashboardHandler = defineRoute(
  { query: dashboardQuerySchema },
  async ({ query, workspace, user, res }) =>
    sendData(res, await getDashboard(workspace, user.id, query)),
);

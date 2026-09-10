import { createLabelSchema, idSchema, updateLabelSchema } from '@nova/shared';
import { z } from 'zod';
import { sendCreated, sendData, sendNoContent } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import * as labelService from './label.service.js';

const labelParams = z.object({ labelId: idSchema });

export const listLabelsHandler = defineRoute({}, async ({ workspace, res }) =>
  sendData(res, await labelService.listLabels(workspace.id)),
);

export const createLabelHandler = defineRoute(
  { body: createLabelSchema },
  async ({ body, workspace, res }) =>
    sendCreated(res, await labelService.createLabel(workspace.id, body)),
);

export const updateLabelHandler = defineRoute(
  { params: labelParams, body: updateLabelSchema },
  async ({ params, body, workspace, res }) =>
    sendData(res, await labelService.updateLabel(workspace.id, params.labelId, body)),
);

export const deleteLabelHandler = defineRoute(
  { params: labelParams },
  async ({ params, workspace, res }) => {
    await labelService.deleteLabel(workspace.id, params.labelId);
    return sendNoContent(res);
  },
);

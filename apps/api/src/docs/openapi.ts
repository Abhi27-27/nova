import {
  APP_DESCRIPTION,
  APP_NAME,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  WORKSPACE_ROLES,
} from '@nova/shared';
import { env } from '../config/env.js';

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** Wraps a schema in the standard success envelope. */
const envelope = (schema: object) => ({
  type: 'object',
  properties: { success: { type: 'boolean', enum: [true] }, data: schema },
  required: ['success', 'data'],
});

const paginated = (name: string) =>
  envelope({
    type: 'object',
    properties: { items: { type: 'array', items: ref(name) }, pageInfo: ref('PageInfo') },
    required: ['items', 'pageInfo'],
  });

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ref('ApiError') } },
});

const commonResponses = {
  400: errorResponse('Malformed request'),
  401: errorResponse('Not authenticated'),
  403: errorResponse('Authenticated but not permitted'),
  404: errorResponse('Resource does not exist or is outside the caller workspace'),
  422: errorResponse('Validation failed — see error.details'),
  429: errorResponse('Rate limit exceeded'),
};

const pathParam = (name: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
});

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  {
    name: 'pageSize',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
  },
];

const jsonBody = (schema: object, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});

/**
 * Hand-written OpenAPI 3.1 description of the API, served at `/api/v1/openapi.json`
 * and rendered by Swagger UI at `/docs`.
 *
 * It is written by hand rather than generated so the prose — what an endpoint is
 * for, which role it needs — is part of the document, which is the half of an API
 * reference a generator cannot produce.
 */
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: `${APP_NAME} API`,
    version: '1.0.0',
    description: [
      APP_DESCRIPTION,
      '',
      '### Authentication',
      'Sign in through `POST /auth/login`. The API sets httpOnly `nova_access_token` and',
      '`nova_refresh_token` cookies, and also returns the access token in the response body',
      'so non-browser clients can send `Authorization: Bearer <token>`.',
      '',
      '### Workspaces',
      'Every endpoint below `/workspaces/current` operates inside one workspace. Select it',
      "with the `X-Workspace-Id` header; when omitted, the caller's first workspace is used.",
      '',
      '### Envelopes',
      'Successful responses are `{ "success": true, "data": ... }`. Failures are',
      '`{ "success": false, "error": { code, message, details?, requestId } }`.',
    ].join('\n'),
    license: { name: 'MIT' },
  },
  servers: [
    { url: `http://localhost:${env.PORT}/api/v1`, description: 'Local development' },
    { url: '/api/v1', description: 'Current origin' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness and readiness' },
    { name: 'Auth', description: 'Registration, sessions and invitations' },
    { name: 'Users', description: 'Profile and workspace directory' },
    { name: 'Workspaces', description: 'Tenants, members and invitations' },
    { name: 'Projects', description: 'Projects and project membership' },
    { name: 'Tasks', description: 'Tasks, the Kanban board and drag-and-drop ordering' },
    { name: 'Comments', description: 'Task discussion' },
    { name: 'Labels', description: 'Workspace-wide task labels' },
    { name: 'Activity', description: 'Workspace audit trail' },
    { name: 'Notifications', description: 'Per-user in-app notifications' },
    { name: 'Analytics', description: 'Dashboard aggregates' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'nova_access_token' },
    },
    parameters: {
      WorkspaceHeader: {
        name: 'X-Workspace-Id',
        in: 'header',
        required: false,
        description: "Workspace to operate in. Defaults to the caller's first workspace.",
        schema: { type: 'string' },
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'UNAUTHORIZED',
                  'FORBIDDEN',
                  'NOT_FOUND',
                  'CONFLICT',
                  'RATE_LIMITED',
                  'PAYLOAD_TOO_LARGE',
                  'INTERNAL_ERROR',
                ],
              },
              message: { type: 'string' },
              details: {
                type: 'object',
                additionalProperties: { type: 'array', items: { type: 'string' } },
              },
              requestId: { type: 'string' },
            },
            required: ['code', 'message'],
          },
        },
        required: ['success', 'error'],
      },
      PageInfo: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPreviousPage: { type: 'boolean' },
        },
      },
      UserSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          avatarUrl: { type: ['string', 'null'] },
        },
      },
      User: {
        allOf: [
          ref('UserSummary'),
          {
            type: 'object',
            properties: {
              jobTitle: { type: ['string', 'null'] },
              timezone: { type: ['string', 'null'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      AuthSession: {
        type: 'object',
        properties: {
          user: ref('User'),
          defaultWorkspace: { oneOf: [ref('WorkspaceSummary'), { type: 'null' }] },
          accessToken: { type: 'string', description: 'Also set as an httpOnly cookie.' },
        },
      },
      WorkspaceSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: ['string', 'null'] },
          role: { type: 'string', enum: [...WORKSPACE_ROLES] },
        },
      },
      Workspace: {
        allOf: [
          ref('WorkspaceSummary'),
          {
            type: 'object',
            properties: {
              memberCount: { type: 'integer' },
              projectCount: { type: 'integer' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      WorkspaceMember: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          role: { type: 'string', enum: [...WORKSPACE_ROLES] },
          joinedAt: { type: 'string', format: 'date-time' },
          user: ref('UserSummary'),
        },
      },
      ProjectStats: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          completed: { type: 'integer' },
          inProgress: { type: 'integer' },
          overdue: { type: 'integer' },
          progress: { type: 'integer', description: '0-100' },
          byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspaceId: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string', example: 'NOVA' },
          description: { type: ['string', 'null'] },
          status: { type: 'string', enum: [...PROJECT_STATUSES] },
          color: { type: 'string', example: '#6366f1' },
          startDate: { type: ['string', 'null'], format: 'date-time' },
          dueDate: { type: ['string', 'null'], format: 'date-time' },
          createdBy: ref('UserSummary'),
          members: { type: 'array', items: ref('ProjectMember') },
          stats: ref('ProjectStats'),
          viewerRole: { type: ['string', 'null'], enum: ['LEAD', 'MEMBER', 'VIEWER', null] },
        },
      },
      ProjectMember: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          role: { type: 'string', enum: ['LEAD', 'MEMBER', 'VIEWER'] },
          joinedAt: { type: 'string', format: 'date-time' },
          user: ref('UserSummary'),
        },
      },
      Label: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          color: { type: 'string' },
          workspaceId: { type: 'string' },
          taskCount: { type: 'integer' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          reference: { type: 'string', example: 'NOVA-42' },
          number: { type: 'integer' },
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
          status: { type: 'string', enum: [...TASK_STATUSES] },
          priority: { type: 'string', enum: [...TASK_PRIORITIES] },
          position: { type: 'number', description: 'Fractional index within its board column.' },
          estimateHours: { type: ['number', 'null'] },
          startDate: { type: ['string', 'null'], format: 'date-time' },
          dueDate: { type: ['string', 'null'], format: 'date-time' },
          completedAt: { type: ['string', 'null'], format: 'date-time' },
          project: ref('ProjectSummary'),
          assignee: { oneOf: [ref('UserSummary'), { type: 'null' }] },
          createdBy: ref('UserSummary'),
          labels: { type: 'array', items: ref('Label') },
          commentCount: { type: 'integer' },
          isOverdue: { type: 'boolean' },
        },
      },
      ProjectSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
          color: { type: 'string' },
          status: { type: 'string', enum: [...PROJECT_STATUSES] },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          taskId: { type: 'string' },
          body: { type: 'string' },
          isEdited: { type: 'boolean' },
          author: ref('UserSummary'),
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          actor: ref('UserSummary'),
          context: { type: 'object' },
          metadata: { type: 'object' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: ['string', 'null'] },
          link: { type: ['string', 'null'] },
          readAt: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DashboardSummary: {
        type: 'object',
        properties: {
          totals: { type: 'object' },
          completionRate: { type: 'integer' },
          tasksByStatus: { type: 'array', items: { type: 'object' } },
          tasksByPriority: { type: 'array', items: { type: 'object' } },
          throughput: { type: 'array', items: { type: 'object' } },
          workload: { type: 'array', items: { type: 'object' } },
          upcomingDeadlines: { type: 'array', items: ref('Task') },
          recentActivity: { type: 'array', items: ref('Activity') },
        },
      },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service and database readiness',
        security: [],
        responses: {
          200: { description: 'Healthy' },
          503: { description: 'Database unreachable' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        description:
          'Creates the user, their first workspace (or accepts `invitationToken`) and the starter label set in one transaction.',
        security: [],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2 },
            email: { type: 'string', format: 'email' },
            password: {
              type: 'string',
              minLength: 8,
              description: 'At least 8 characters with upper, lower and a digit.',
            },
            workspaceName: { type: 'string' },
            invitationToken: { type: 'string' },
          },
          required: ['name', 'email', 'password'],
        }),
        responses: {
          201: {
            description: 'Account created',
            content: { 'application/json': { schema: envelope(ref('AuthSession')) } },
          },
          409: errorResponse('Email already registered'),
          422: commonResponses[422],
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        security: [],
        requestBody: jsonBody({
          type: 'object',
          properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
          required: ['email', 'password'],
        }),
        responses: {
          200: {
            description: 'Signed in',
            content: { 'application/json': { schema: envelope(ref('AuthSession')) } },
          },
          401: errorResponse('Incorrect email or password'),
          429: commonResponses[429],
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate the session',
        description:
          'Exchanges the refresh cookie for a new pair. Replaying a used token revokes every session for that user.',
        security: [],
        responses: {
          200: {
            description: 'Rotated',
            content: { 'application/json': { schema: envelope(ref('AuthSession')) } },
          },
          401: errorResponse('Refresh token missing, expired or replayed'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out and clear cookies',
        security: [],
        responses: { 200: { description: 'Signed out' } },
      },
    },
    '/auth/session': {
      get: {
        tags: ['Auth'],
        summary: 'Current session',
        responses: {
          200: {
            description: 'Session',
            content: { 'application/json': { schema: envelope(ref('AuthSession')) } },
          },
          401: commonResponses[401],
        },
      },
    },
    '/auth/password': {
      patch: {
        tags: ['Auth'],
        summary: 'Change password',
        description: 'Revokes every other session and issues a fresh one for the current device.',
        requestBody: jsonBody({
          type: 'object',
          properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } },
          required: ['currentPassword', 'newPassword'],
        }),
        responses: { 200: { description: 'Password changed' }, 422: commonResponses[422] },
      },
    },
    '/auth/invitations/{token}': {
      get: {
        tags: ['Auth'],
        summary: 'Preview an invitation without consuming it',
        security: [],
        parameters: [pathParam('token')],
        responses: { 200: { description: 'Invitation details' }, 404: commonResponses[404] },
      },
    },
    '/auth/invitations/accept': {
      post: {
        tags: ['Auth'],
        summary: 'Accept an invitation as the signed-in user',
        requestBody: jsonBody({
          type: 'object',
          properties: { token: { type: 'string' } },
          required: ['token'],
        }),
        responses: { 200: { description: 'Joined workspace' }, 404: commonResponses[404] },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Current profile',
        responses: {
          200: {
            description: 'Profile',
            content: { 'application/json': { schema: envelope(ref('User')) } },
          },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update profile',
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string' },
            jobTitle: { type: ['string', 'null'] },
            timezone: { type: ['string', 'null'] },
            avatarUrl: { type: ['string', 'null'], format: 'uri' },
          },
        }),
        responses: { 200: { description: 'Updated' }, 422: commonResponses[422] },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Members of the current workspace',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        responses: {
          200: {
            description: 'Directory',
            content: {
              'application/json': {
                schema: envelope({ type: 'array', items: ref('UserSummary') }),
              },
            },
          },
        },
      },
    },
    '/workspaces': {
      get: {
        tags: ['Workspaces'],
        summary: 'Workspaces the caller belongs to',
        responses: {
          200: {
            description: 'List',
            content: {
              'application/json': { schema: envelope({ type: 'array', items: ref('Workspace') }) },
            },
          },
        },
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Create a workspace',
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: ['string', 'null'] },
          },
          required: ['name'],
        }),
        responses: { 201: { description: 'Created' }, 422: commonResponses[422] },
      },
    },
    '/workspaces/current': {
      get: {
        tags: ['Workspaces'],
        summary: 'Current workspace',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        responses: {
          200: {
            description: 'Workspace',
            content: { 'application/json': { schema: envelope(ref('Workspace')) } },
          },
        },
      },
      patch: {
        tags: ['Workspaces'],
        summary: 'Update the current workspace',
        description: 'Requires the ADMIN role.',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        requestBody: jsonBody({
          type: 'object',
          properties: { name: { type: 'string' }, description: { type: ['string', 'null'] } },
        }),
        responses: { 200: { description: 'Updated' }, 403: commonResponses[403] },
      },
      delete: {
        tags: ['Workspaces'],
        summary: 'Delete the current workspace',
        description: "Requires the OWNER role. Refused when it is the caller's only workspace.",
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        responses: {
          204: { description: 'Deleted' },
          403: commonResponses[403],
          409: errorResponse('Only workspace'),
        },
      },
    },
    '/workspaces/current/members': {
      get: {
        tags: ['Workspaces'],
        summary: 'List members',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        responses: {
          200: {
            description: 'Members',
            content: {
              'application/json': {
                schema: envelope({ type: 'array', items: ref('WorkspaceMember') }),
              },
            },
          },
        },
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Invite a member',
        description:
          'Existing NOVA accounts are added immediately; unknown addresses receive a tokenised invitation link returned in the response. Requires ADMIN.',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
          },
          required: ['email'],
        }),
        responses: {
          201: { description: 'Member added or invitation created' },
          409: errorResponse('Already a member or already invited'),
        },
      },
    },
    '/workspaces/current/members/{memberId}': {
      patch: {
        tags: ['Workspaces'],
        summary: 'Change a member role (ADMIN)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('memberId')],
        requestBody: jsonBody({
          type: 'object',
          properties: { role: { type: 'string', enum: ['ADMIN', 'MEMBER'] } },
          required: ['role'],
        }),
        responses: { 200: { description: 'Updated' }, 403: commonResponses[403] },
      },
      delete: {
        tags: ['Workspaces'],
        summary: 'Remove a member (ADMIN)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('memberId')],
        responses: { 204: { description: 'Removed' }, 403: commonResponses[403] },
      },
    },
    '/workspaces/current/members/{memberId}/transfer-ownership': {
      post: {
        tags: ['Workspaces'],
        summary: 'Transfer ownership (OWNER)',
        description: 'Promotes the target to OWNER and demotes the caller to ADMIN.',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('memberId')],
        responses: { 200: { description: 'Transferred' }, 403: commonResponses[403] },
      },
    },
    '/workspaces/current/invitations': {
      get: {
        tags: ['Workspaces'],
        summary: 'Pending invitations (ADMIN)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        responses: { 200: { description: 'Invitations' } },
      },
    },
    '/workspaces/current/invitations/{invitationId}': {
      delete: {
        tags: ['Workspaces'],
        summary: 'Revoke an invitation (ADMIN)',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          pathParam('invitationId'),
        ],
        responses: { 204: { description: 'Revoked' } },
      },
    },
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          ...paginationParams,
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            description: 'Comma separated',
            schema: { type: 'string' },
          },
          { name: 'memberId', in: 'query', schema: { type: 'string' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'name', 'dueDate'] },
          },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: {
            description: 'Projects',
            content: { 'application/json': { schema: paginated('Project') } },
          },
        },
      },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
        description:
          'The creator becomes the project LEAD. A unique key is derived from the name when not supplied.',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string' },
            key: { type: 'string', maxLength: 6 },
            description: { type: ['string', 'null'] },
            status: { type: 'string', enum: [...PROJECT_STATUSES] },
            color: { type: 'string' },
            startDate: { type: ['string', 'null'], format: 'date-time' },
            dueDate: { type: ['string', 'null'], format: 'date-time' },
            memberIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['name'],
        }),
        responses: { 201: { description: 'Created' }, 422: commonResponses[422] },
      },
    },
    '/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Get a project with its rollup stats',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('projectId')],
        responses: {
          200: {
            description: 'Project',
            content: { 'application/json': { schema: envelope(ref('Project')) } },
          },
          404: commonResponses[404],
        },
      },
      patch: {
        tags: ['Projects'],
        summary: 'Update a project (LEAD)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('projectId')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string' },
            status: { type: 'string', enum: [...PROJECT_STATUSES] },
          },
        }),
        responses: { 200: { description: 'Updated' }, 403: commonResponses[403] },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project and everything in it (LEAD)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('projectId')],
        responses: { 204: { description: 'Deleted' }, 403: commonResponses[403] },
      },
    },
    '/projects/{projectId}/members': {
      get: {
        tags: ['Projects'],
        summary: 'List project members',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('projectId')],
        responses: { 200: { description: 'Members' } },
      },
      post: {
        tags: ['Projects'],
        summary: 'Add a workspace member to the project (LEAD)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('projectId')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            userId: { type: 'string' },
            role: { type: 'string', enum: ['LEAD', 'MEMBER', 'VIEWER'] },
          },
          required: ['userId'],
        }),
        responses: {
          201: { description: 'Added' },
          409: errorResponse('Already a project member'),
        },
      },
    },
    '/projects/{projectId}/members/{memberId}': {
      patch: {
        tags: ['Projects'],
        summary: 'Change a project role (LEAD)',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          pathParam('projectId'),
          pathParam('memberId'),
        ],
        requestBody: jsonBody({
          type: 'object',
          properties: { role: { type: 'string', enum: ['LEAD', 'MEMBER', 'VIEWER'] } },
          required: ['role'],
        }),
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Projects'],
        summary: 'Remove a project member (LEAD)',
        description: 'Refused when it would leave the project without a lead.',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          pathParam('projectId'),
          pathParam('memberId'),
        ],
        responses: { 204: { description: 'Removed' }, 409: errorResponse('Last lead') },
      },
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Search and filter tasks across the workspace',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          ...paginationParams,
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            description: 'Comma separated',
            schema: { type: 'string' },
          },
          {
            name: 'priority',
            in: 'query',
            description: 'Comma separated',
            schema: { type: 'string' },
          },
          {
            name: 'assigneeId',
            in: 'query',
            description: 'Comma separated',
            schema: { type: 'string' },
          },
          {
            name: 'labelId',
            in: 'query',
            description: 'Comma separated',
            schema: { type: 'string' },
          },
          {
            name: 'scope',
            in: 'query',
            schema: { type: 'string', enum: ['all', 'me', 'created', 'unassigned'] },
          },
          { name: 'overdue', in: 'query', schema: { type: 'boolean' } },
          { name: 'includeDone', in: 'query', schema: { type: 'boolean', default: true } },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['position', 'createdAt', 'updatedAt', 'dueDate', 'priority', 'title'],
            },
          },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: {
            description: 'Tasks',
            content: { 'application/json': { schema: paginated('Task') } },
          },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task (project MEMBER)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            projectId: { type: 'string' },
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            status: { type: 'string', enum: [...TASK_STATUSES] },
            priority: { type: 'string', enum: [...TASK_PRIORITIES] },
            assigneeId: { type: ['string', 'null'] },
            dueDate: { type: ['string', 'null'], format: 'date-time' },
            estimateHours: { type: ['number', 'null'] },
            labelIds: { type: 'array', items: { type: 'string' } },
          },
          required: ['projectId', 'title'],
        }),
        responses: {
          201: {
            description: 'Created',
            content: { 'application/json': { schema: envelope(ref('Task')) } },
          },
          422: commonResponses[422],
        },
      },
    },
    '/tasks/board': {
      get: {
        tags: ['Tasks'],
        summary: 'Full Kanban board for one project',
        description: 'Returns all five columns, ordered by fractional position. Not paginated.',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          { name: 'projectId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'assigneeId', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'labelId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Board' }, 404: commonResponses[404] },
      },
    },
    '/tasks/{taskId}': {
      get: {
        tags: ['Tasks'],
        summary: 'Get a task',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('taskId')],
        responses: {
          200: {
            description: 'Task',
            content: { 'application/json': { schema: envelope(ref('Task')) } },
          },
          404: commonResponses[404],
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task (project MEMBER)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('taskId')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: ['string', 'null'] },
            status: { type: 'string', enum: [...TASK_STATUSES] },
            priority: { type: 'string', enum: [...TASK_PRIORITIES] },
            assigneeId: { type: ['string', 'null'] },
            dueDate: { type: ['string', 'null'], format: 'date-time' },
            labelIds: { type: 'array', items: { type: 'string' } },
          },
        }),
        responses: { 200: { description: 'Updated' }, 403: commonResponses[403] },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task (project MEMBER)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('taskId')],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/tasks/{taskId}/move': {
      post: {
        tags: ['Tasks'],
        summary: 'Move a task on the board',
        description:
          'Send the destination column and the ids of the cards that will sit either side of the dropped card. The server derives the fractional position from those neighbours, so concurrent drags stay consistent.',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('taskId')],
        requestBody: jsonBody({
          type: 'object',
          properties: {
            status: { type: 'string', enum: [...TASK_STATUSES] },
            beforeTaskId: {
              type: ['string', 'null'],
              description: 'Card immediately above the drop point.',
            },
            afterTaskId: {
              type: ['string', 'null'],
              description: 'Card immediately below the drop point.',
            },
          },
          required: ['status'],
        }),
        responses: {
          200: {
            description: 'Moved',
            content: { 'application/json': { schema: envelope(ref('Task')) } },
          },
        },
      },
    },
    '/tasks/{taskId}/comments': {
      get: {
        tags: ['Comments'],
        summary: 'List comments on a task',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          pathParam('taskId'),
          ...paginationParams,
        ],
        responses: {
          200: {
            description: 'Comments',
            content: { 'application/json': { schema: paginated('Comment') } },
          },
        },
      },
      post: {
        tags: ['Comments'],
        summary: 'Add a comment (project MEMBER)',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('taskId')],
        requestBody: jsonBody({
          type: 'object',
          properties: { body: { type: 'string', maxLength: 5000 } },
          required: ['body'],
        }),
        responses: { 201: { description: 'Created' } },
      },
    },
    '/comments/{commentId}': {
      patch: {
        tags: ['Comments'],
        summary: 'Edit your own comment',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('commentId')],
        requestBody: jsonBody({
          type: 'object',
          properties: { body: { type: 'string' } },
          required: ['body'],
        }),
        responses: { 200: { description: 'Updated' }, 403: commonResponses[403] },
      },
      delete: {
        tags: ['Comments'],
        summary: 'Delete a comment',
        description: 'Authors may delete their own; project leads may moderate any.',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('commentId')],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/labels': {
      get: {
        tags: ['Labels'],
        summary: 'List workspace labels with usage counts',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        responses: {
          200: {
            description: 'Labels',
            content: {
              'application/json': { schema: envelope({ type: 'array', items: ref('Label') }) },
            },
          },
        },
      },
      post: {
        tags: ['Labels'],
        summary: 'Create a label',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }],
        requestBody: jsonBody({
          type: 'object',
          properties: { name: { type: 'string' }, color: { type: 'string' } },
          required: ['name'],
        }),
        responses: { 201: { description: 'Created' }, 409: errorResponse('Name already used') },
      },
    },
    '/labels/{labelId}': {
      patch: {
        tags: ['Labels'],
        summary: 'Update a label',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('labelId')],
        requestBody: jsonBody({
          type: 'object',
          properties: { name: { type: 'string' }, color: { type: 'string' } },
        }),
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Labels'],
        summary: 'Delete a label',
        parameters: [{ $ref: '#/components/parameters/WorkspaceHeader' }, pathParam('labelId')],
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/activity': {
      get: {
        tags: ['Activity'],
        summary: 'Workspace audit trail',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          ...paginationParams,
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'taskId', in: 'query', schema: { type: 'string' } },
          { name: 'actorId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Activity',
            content: { 'application/json': { schema: paginated('Activity') } },
          },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Your notifications',
        parameters: [
          ...paginationParams,
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'Notifications with an unread count' } },
      },
    },
    '/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark everything read',
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/notifications/{notificationId}/read': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark one notification read',
        parameters: [pathParam('notificationId')],
        responses: { 200: { description: 'Updated' }, 404: commonResponses[404] },
      },
    },
    '/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Everything the dashboard needs, in one call',
        description:
          'Totals, status and priority breakdowns, a created-vs-completed time series, per-member workload, upcoming deadlines and recent activity.',
        parameters: [
          { $ref: '#/components/parameters/WorkspaceHeader' },
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', minimum: 7, maximum: 180, default: 30 },
          },
        ],
        responses: {
          200: {
            description: 'Summary',
            content: { 'application/json': { schema: envelope(ref('DashboardSummary')) } },
          },
        },
      },
    },
  },
} as const;

import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    displayName: z.string().min(2, 'Display name must be at least 2 characters long').max(50),
    inviteToken: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).max(50).optional(),
    realName: z.string().max(100).optional(),
    title: z.string().max(100).optional(),
    avatarUrl: z.string().optional(),
  }),
});

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Workspace name must be at least 2 characters').max(80),
    description: z.string().max(500).optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required'),
    role: z.enum(['admin', 'member', 'guest']).optional(),
  }),
});

export const createChannelSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, 'Workspace ID is required'),
    name: z
      .string()
      .min(2, 'Channel name must be at least 2 characters')
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/, 'Channel name can only contain letters, numbers, hyphens, and underscores'),
    topic: z.string().max(250).optional(),
    description: z.string().max(500).optional(),
    isPrivate: z.boolean().optional(),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    workspaceId: z.string().min(1, 'Workspace ID is required'),
    conversationType: z.enum(['channel', 'conversation']),
    targetId: z.string().min(1, 'Target channel or conversation ID is required'),
    content: z.string().min(1, 'Message content cannot be empty'),
    structuredContent: z.any().optional(),
    parentId: z.string().nullable().optional(),
    attachments: z
      .array(
        z.object({
          fileAssetId: z.string().optional(),
          originalName: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          size: z.number(),
          url: z.string(),
        })
      )
      .optional(),
    idempotencyKey: z.string().optional(),
  }),
});

export const editMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message content cannot be empty'),
  }),
});

export const reactionSchema = z.object({
  body: z.object({
    emoji: z.string().min(1, 'Emoji is required'),
  }),
});

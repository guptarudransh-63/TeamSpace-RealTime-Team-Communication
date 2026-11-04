import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Workspace,
  WorkspaceMember,
  Channel,
  ChannelMember,
  Conversation,
  Message,
  ReadState,
} from '../models/index.js';

export const seedDatabase = async () => {
  console.log('[Seed] Starting database seed...');
  await connectDB();

  // Clean collections
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    WorkspaceMember.deleteMany({}),
    Channel.deleteMany({}),
    ChannelMember.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    ReadState.deleteMany({}),
  ]);

  // 1. Create Users
  const alex = await User.create({
    email: 'alex@teamspace.dev',
    password: 'password123',
    displayName: 'alex',
    realName: 'Alex Chen',
    title: 'Engineering Lead',
    presence: 'online',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: { emoji: '💻', text: 'Coding real-time engines' },
  });

  const sarah = await User.create({
    email: 'sarah@teamspace.dev',
    password: 'password123',
    displayName: 'sarah',
    realName: 'Sarah Connor',
    title: 'Product Manager',
    presence: 'online',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: { emoji: '📅', text: 'Sprint planning' },
  });

  const elena = await User.create({
    email: 'elena@teamspace.dev',
    password: 'password123',
    displayName: 'elena',
    realName: 'Elena Rostova',
    title: 'Staff Frontend Engineer',
    presence: 'away',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    status: { emoji: '🎨', text: 'Polishing Tailwind UI' },
  });

  console.log('[Seed] Created users: alex, sarah, elena');

  // 2. Create Workspace
  const workspace = await Workspace.create({
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'Acme Global Workspace for Product & Engineering',
    ownerId: alex._id,
  });

  // Add memberships
  await WorkspaceMember.insertMany([
    { workspaceId: workspace._id, userId: alex._id, role: 'owner' },
    { workspaceId: workspace._id, userId: sarah._id, role: 'admin' },
    { workspaceId: workspace._id, userId: elena._id, role: 'member' },
  ]);

  console.log('[Seed] Created workspace: Acme Corp');

  // 3. Create Channels
  const general = await Channel.create({
    workspaceId: workspace._id,
    name: 'general',
    topic: 'Company-wide announcements and team discussions',
    description: 'Welcome to TeamSpace! This is the main channel for team updates.',
    isPrivate: false,
    createdBy: alex._id,
  });

  const engineering = await Channel.create({
    workspaceId: workspace._id,
    name: 'engineering',
    topic: 'Architecture, PRs, and technical syncs',
    description: 'Engineering discussions, deployments, and bug reports.',
    isPrivate: false,
    createdBy: alex._id,
  });

  const random = await Channel.create({
    workspaceId: workspace._id,
    name: 'random',
    topic: 'Water cooler banter, coffee, and memes',
    description: 'Casual chats and non-work discussions.',
    isPrivate: false,
    createdBy: sarah._id,
  });

  const leadership = await Channel.create({
    workspaceId: workspace._id,
    name: 'leadership',
    topic: 'Executive syncs and roadmap strategy (Private)',
    description: 'Confidential strategy discussions.',
    isPrivate: true,
    createdBy: alex._id,
  });

  // Assign channel memberships
  await ChannelMember.insertMany([
    // #general has all 3
    { channelId: general._id, userId: alex._id, role: 'admin' },
    { channelId: general._id, userId: sarah._id, role: 'member' },
    { channelId: general._id, userId: elena._id, role: 'member' },
    // #engineering has all 3
    { channelId: engineering._id, userId: alex._id, role: 'admin' },
    { channelId: engineering._id, userId: sarah._id, role: 'member' },
    { channelId: engineering._id, userId: elena._id, role: 'member' },
    // #random has all 3
    { channelId: random._id, userId: alex._id, role: 'member' },
    { channelId: random._id, userId: sarah._id, role: 'admin' },
    { channelId: random._id, userId: elena._id, role: 'member' },
    // #leadership ONLY has alex & sarah
    { channelId: leadership._id, userId: alex._id, role: 'admin' },
    { channelId: leadership._id, userId: sarah._id, role: 'member' },
  ]);

  workspace.settings.defaultChannelId = general._id;
  await workspace.save();

  console.log('[Seed] Created channels: #general, #engineering, #random, #leadership');

  // 4. Create Messages in #general
  const m1 = await Message.create({
    workspaceId: workspace._id,
    conversationType: 'channel',
    targetId: general._id,
    senderId: alex._id,
    content: '🚀 Welcome to **TeamSpace**! Our new real-time communication platform is live.',
    createdAt: new Date(Date.now() - 3600000 * 4),
    reactions: [
      { emoji: '🎉', users: [sarah._id, elena._id] },
      { emoji: '🔥', users: [alex._id] },
    ],
  });

  const m2 = await Message.create({
    workspaceId: workspace._id,
    conversationType: 'channel',
    targetId: general._id,
    senderId: sarah._id,
    content: 'Love the new interface! Fast message recovery and clean layout.',
    createdAt: new Date(Date.now() - 3600000 * 3),
    reactions: [{ emoji: '❤️', users: [alex._id] }],
  });

  const m3 = await Message.create({
    workspaceId: workspace._id,
    conversationType: 'channel',
    targetId: general._id,
    senderId: elena._id,
    content: 'Check out the thread feature below — works in real-time!',
    createdAt: new Date(Date.now() - 3600000 * 2),
    replyCount: 2,
    lastReplyAt: new Date(Date.now() - 3600000 * 1),
  });

  // Thread replies on m3
  await Message.create({
    workspaceId: workspace._id,
    conversationType: 'channel',
    targetId: general._id,
    parentId: m3._id,
    senderId: alex._id,
    content: 'Yes! Thread replies are kept organized in the right panel.',
    createdAt: new Date(Date.now() - 3600000 * 1.5),
  });

  await Message.create({
    workspaceId: workspace._id,
    conversationType: 'channel',
    targetId: general._id,
    parentId: m3._id,
    senderId: sarah._id,
    content: 'And reply counts update live on the parent message in the timeline.',
    createdAt: new Date(Date.now() - 3600000 * 1),
  });

  // 5. Create Messages in #engineering
  await Message.create({
    workspaceId: workspace._id,
    conversationType: 'channel',
    targetId: engineering._id,
    senderId: alex._id,
    content: 'Here is a quick TypeScript example of our cursor pagination:\n```typescript\ninterface CursorPayload {\n  cursor: string; // base64(createdAt + "_" + id)\n  limit: number;\n}\n```',
    createdAt: new Date(Date.now() - 7200000),
    reactions: [{ emoji: '👍', users: [elena._id] }],
  });

  // 6. Create Direct Conversation between Alex and Sarah
  const canonicalHash = [alex._id.toString(), sarah._id.toString()].sort().join(':');
  const directConv = await Conversation.create({
    workspaceId: workspace._id,
    type: 'direct',
    participants: [alex._id, sarah._id],
    canonicalHash,
    lastMessageAt: new Date(),
  });

  await Message.create({
    workspaceId: workspace._id,
    conversationType: 'conversation',
    targetId: directConv._id,
    senderId: sarah._id,
    content: 'Hey Alex, did you review the roadmap doc for Q4?',
    createdAt: new Date(Date.now() - 1800000),
  });

  await Message.create({
    workspaceId: workspace._id,
    conversationType: 'conversation',
    targetId: directConv._id,
    senderId: alex._id,
    content: 'Yes, looking great! We are ready to launch.',
    createdAt: new Date(Date.now() - 600000),
  });

  // 7. Setup ReadStates
  await ReadState.create({
    userId: alex._id,
    workspaceId: workspace._id,
    targetId: general._id,
    conversationType: 'channel',
    lastReadMessageId: m3._id,
    lastReadTimestamp: new Date(),
  });

  console.log('[Seed] Database successfully seeded with demo data!');
  console.log('----------------------------------------------------');
  console.log('Demo Accounts:');
  console.log('1. alex@teamspace.dev   / password123 (Owner)');
  console.log('2. sarah@teamspace.dev  / password123 (Admin)');
  console.log('3. elena@teamspace.dev  / password123 (Member)');
  console.log('Workspace: Acme Corp (acme-corp)');
  console.log('----------------------------------------------------');
};

// If run directly from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed Error]', err);
      await disconnectDB();
      process.exit(1);
    });
}

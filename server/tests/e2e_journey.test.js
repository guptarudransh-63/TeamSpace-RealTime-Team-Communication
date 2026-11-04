import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { io: ClientIO } = require('socket.io-client');
import app from '../src/app.js';
import { setupTestDB } from './setup.js';
import { initializeSocket } from '../src/socket/socket.js';
import { User, Notification, FileAsset } from '../src/models/index.js';

describe('TeamSpace End-to-End User Journey', () => {
  setupTestDB();

  let server;
  let serverPort;
  let serverUrl;
  const clientSockets = [];

  beforeAll(async () => {
    server = http.createServer(app);
    initializeSocket(server);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        serverUrl = `http://127.0.0.1:${serverPort}`;
        console.log('[E2E Server] Running at', serverUrl);
        resolve();
      });
    });
  });

  afterAll(async () => {
    for (const s of clientSockets) {
      if (s.connected) s.disconnect();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('completes the entire 15-step end-to-end collaboration journey', async () => {
    console.log('[E2E] Step 1: Register User A and create workspace');
    // 1. User A (Alex) registers and creates workspace
    const regResA = await request(app).post('/api/v1/auth/register').send({
      email: 'alex@journey.dev',
      password: 'password123',
      displayName: 'alex',
    });
    expect(regResA.status).toBe(201);
    const tokenA = regResA.body.data.token;
    const userA = regResA.body.data.user;

    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Acme Journey Corp' });

    expect(wsRes.status).toBe(201);
    const workspace = wsRes.body.data.workspace;
    const wsId = workspace._id;

    console.log('[E2E] Step 2: Invite User B and register');
    // 2. Alex invites User B (Sarah)
    const inviteRes = await request(app)
      .post(`/api/v1/workspaces/${wsId}/invitations`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: 'sarah@journey.dev', role: 'member' });

    expect(inviteRes.status).toBe(200);
    const inviteToken = inviteRes.body.data.invitation.token;

    // Sarah registers and accepts invite
    const regResB = await request(app).post('/api/v1/auth/register').send({
      email: 'sarah@journey.dev',
      password: 'password123',
      displayName: 'sarah',
      inviteToken,
    });
    expect(regResB.status).toBe(201);
    const tokenB = regResB.body.data.token;
    const userB = regResB.body.data.user;

    console.log('[E2E] Step 3: Create channel');
    // 3. Sarah creates a channel (#product-roadmap)
    const chanRes = await request(app)
      .post('/api/v1/channels')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        workspaceId: wsId,
        name: 'product-roadmap',
        topic: 'Q4 Product Roadmap Discussion',
      });

    expect(chanRes.status).toBe(201);
    const channelId = chanRes.body.data.channel._id;

    // Alex joins #product-roadmap
    await request(app)
      .post(`/api/v1/channels/${channelId}/join`)
      .set('Authorization', `Bearer ${tokenA}`);

    console.log('[E2E] Step 4: Connecting sockets for Alex and Sarah');
    const waitForConnect = (sock) => {
      if (sock.connected) return Promise.resolve();
      return new Promise((resolve, reject) => {
        sock.once('connect', () => {
          console.log('[E2E Socket] Connected:', sock.id);
          resolve();
        });
        sock.once('connect_error', (err) => {
          console.error('[E2E Socket] Connect Error:', err.message);
          reject(err);
        });
      });
    };

    // 4. Establish real-time socket connections for both Alex and Sarah
    const socketA = ClientIO(serverUrl, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });
    clientSockets.push(socketA);

    const socketB = ClientIO(serverUrl, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });
    clientSockets.push(socketB);

    await waitForConnect(socketA);
    await waitForConnect(socketB);

    // Both join channel socket room
    console.log('[E2E] Sockets joining channel...');
    await new Promise((resolve) => socketA.emit('join_channel', { channelId }, (res) => {
      console.log('[E2E SocketA] join_channel response:', res);
      resolve();
    }));
    await new Promise((resolve) => socketB.emit('join_channel', { channelId }, (res) => {
      console.log('[E2E SocketB] join_channel response:', res);
      resolve();
    }));
    console.log('[E2E] Both sockets joined channel room');

    console.log('[E2E] Step 5: Sending message');
    // Listen for incoming message on Sarah's socket
    const messageReceivedPromise = new Promise((resolve) => {
      socketB.on('new_message', (msg) => {
        console.log('[E2E SocketB] Received new_message:', msg._id);
        resolve(msg);
      });
    });

    // 5. Alex sends message
    const sendRes1 = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        content: 'Hey @sarah, the roadmap looks fantastic!',
        idempotencyKey: 'idemp-journey-1',
      });

    expect(sendRes1.status).toBe(201);
    const message1 = sendRes1.body.data.message;

    // Verify real-time socket delivery to Sarah
    const receivedMsg = await messageReceivedPromise;
    expect(receivedMsg._id).toBe(message1._id);
    expect(receivedMsg.content).toBe('Hey @sarah, the roadmap looks fantastic!');

    // 6. Sarah replies in thread to message1
    // Alex joins the thread room to receive real-time thread replies
    socketA.emit('join_thread', { messageId: message1._id });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const threadReplyPromise = new Promise((resolve) => {
      socketA.on('thread_reply', (reply) => {
        console.log('[E2E SocketA] Received thread_reply:', reply._id);
        resolve(reply);
      });
    });

    const threadRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        parentId: message1._id,
        content: 'Thanks Alex! Shipping next week.',
        idempotencyKey: 'idemp-journey-2',
      });

    expect(threadRes.status).toBe(201);
    const threadReply = await threadReplyPromise;
    expect(threadReply.parentId).toBe(message1._id);

    // 7. Both users react to message1
    await request(app)
      .post(`/api/v1/messages/${message1._id}/reactions`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ emoji: '🚀' });

    const reactResB = await request(app)
      .post(`/api/v1/messages/${message1._id}/reactions`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ emoji: '🚀' });

    expect(reactResB.status).toBe(200);
    expect(reactResB.body.data.reactions[0].users.length).toBe(2);

    // 8. Mention notification check for Sarah
    const notifsRes = await request(app)
      .get(`/api/v1/notifications?workspaceId=${wsId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(notifsRes.status).toBe(200);
    const mentions = notifsRes.body.data.notifications.filter((n) => n.type === 'mention');
    expect(mentions.length).toBeGreaterThan(0);

    // 9. File attachment upload & authorization
    const uploadRes = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('workspaceId', wsId)
      .field('targetId', channelId)
      .field('conversationType', 'channel')
      .attach('file', Buffer.from('console.log("TeamSpace Full-Stack");'), 'index.js');

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.data.file.fileAssetId;

    // Sarah downloads file
    const downloadRes = await request(app)
      .get(`/api/v1/files/${fileId}/download`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(downloadRes.status).toBe(200);

    // 10. Reconnection & Missed Message Recovery
    // Disconnect Alex's socket
    socketA.disconnect();

    // Sarah posts a message while Alex is disconnected
    const missedSendRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        content: 'Alex, while you were offline I updated the diagram.',
        idempotencyKey: 'idemp-journey-3',
      });

    const missedMsgId = missedSendRes.body.data.message._id;

    // Alex reconnects socket and requests recovery
    const socketAReconnected = ClientIO(serverUrl, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });
    clientSockets.push(socketAReconnected);

    await waitForConnect(socketAReconnected);

    const recoveredMessages = await new Promise((resolve) => {
      socketAReconnected.emit(
        'recover_missed_messages',
        { targetId: channelId, sinceTimestamp: message1.createdAt },
        (res) => resolve(res.messages)
      );
    });

    expect(recoveredMessages.some((m) => m._id === missedMsgId)).toBe(true);

    // 11. Unread counts tracking
    const unreadRes = await request(app)
      .get(`/api/v1/unread/workspace/${wsId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.data.totalUnread).toBeGreaterThan(0);

    // 12. Search messages
    const searchRes = await request(app)
      .get(`/api/v1/search?workspaceId=${wsId}&q=roadmap`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.results.length).toBeGreaterThan(0);

    // 13. Private channel authorization verification
    const privChanRes = await request(app)
      .post('/api/v1/channels')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        workspaceId: wsId,
        name: 'alex-secret-lab',
        isPrivate: true,
      });

    const secretChanId = privChanRes.body.data.channel._id;

    // Sarah (regular member, not invited) cannot access private channel
    const sarahAccess = await request(app)
      .get(`/api/v1/channels/${secretChanId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(sarahAccess.status).toBe(403);

    // Clean up sockets
    socketAReconnected.disconnect();
    socketB.disconnect();
  }, 60000);
});

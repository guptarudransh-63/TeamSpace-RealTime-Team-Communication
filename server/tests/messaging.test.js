import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';

describe('Messaging, Idempotency, Threads & Search', () => {
  setupTestDB();

  const registerUser = async (email, displayName) => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email,
      password: 'password123',
      displayName,
    });
    return {
      user: res.body.data.user,
      token: res.body.data.token,
    };
  };

  it('persists message and prevents duplicate on retrying same idempotencyKey', async () => {
    const user = await registerUser('sender@example.com', 'sender');

    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Msg Workspace' });

    const wsId = wsRes.body.data.workspace._id;
    const channelId = wsRes.body.data.defaultChannel._id;
    const idempotencyKey = 'unique-key-12345';

    // First send
    const send1 = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        content: 'Hello World!',
        idempotencyKey,
      });

    expect(send1.status).toBe(201);
    expect(send1.body.data.isDuplicate).toBe(false);
    const msgId1 = send1.body.data.message._id;

    // Retry with identical idempotency key
    const send2 = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        content: 'Hello World (retry)!',
        idempotencyKey,
      });

    expect(send2.status).toBe(200);
    expect(send2.body.data.isDuplicate).toBe(true);
    expect(send2.body.data.message._id).toBe(msgId1);
  });

  it('handles cursor-based pagination deterministically', async () => {
    const user = await registerUser('paginator@example.com', 'paginator');
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Pagination WS' });

    const wsId = wsRes.body.data.workspace._id;
    const channelId = wsRes.body.data.defaultChannel._id;

    // Send 5 messages sequentially
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          workspaceId: wsId,
          conversationType: 'channel',
          targetId: channelId,
          content: `Message ${i}`,
        });
    }

    // Fetch page of 3 messages (direction=older)
    const page1 = await request(app)
      .get(`/api/v1/messages/channel/${channelId}?limit=3`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.data.messages.length).toBe(3);
    expect(page1.body.data.hasMore).toBe(true);
    expect(page1.body.data.nextCursor).toBeDefined();

    // Fetch next older page using cursor
    const page2 = await request(app)
      .get(`/api/v1/messages/channel/${channelId}?limit=3&cursor=${page1.body.data.nextCursor}`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.data.messages.length).toBe(2);
    expect(page2.body.data.hasMore).toBe(false);
  });

  it('creates thread replies and updates parent reply count', async () => {
    const user = await registerUser('threaduser@example.com', 'threaduser');
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Thread WS' });

    const wsId = wsRes.body.data.workspace._id;
    const channelId = wsRes.body.data.defaultChannel._id;

    // Post parent message
    const parentRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        content: 'Parent thread message',
      });

    const parentId = parentRes.body.data.message._id;

    // Post thread reply
    const replyRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        parentId,
        content: 'Replying to parent',
      });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.message.parentId).toBe(parentId);

    // Fetch thread
    const threadRes = await request(app)
      .get(`/api/v1/messages/thread/${parentId}`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(threadRes.status).toBe(200);
    expect(threadRes.body.data.parentMessage.replyCount).toBe(1);
    expect(threadRes.body.data.messages.length).toBe(1);
    expect(threadRes.body.data.messages[0].content).toBe('Replying to parent');
  });

  it('toggles reactions on messages idempotently', async () => {
    const user = await registerUser('reactuser@example.com', 'reactuser');
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'React WS' });

    const wsId = wsRes.body.data.workspace._id;
    const channelId = wsRes.body.data.defaultChannel._id;

    const msgRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        workspaceId: wsId,
        conversationType: 'channel',
        targetId: channelId,
        content: 'React to me!',
      });

    const msgId = msgRes.body.data.message._id;

    // Add reaction
    const addRes = await request(app)
      .post(`/api/v1/messages/${msgId}/reactions`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ emoji: '🔥' });

    expect(addRes.status).toBe(200);
    expect(addRes.body.data.reactions.length).toBe(1);
    expect(addRes.body.data.reactions[0].emoji).toBe('🔥');
    expect(addRes.body.data.reactions[0].users.length).toBe(1);

    // Toggle (remove) reaction
    const removeRes = await request(app)
      .post(`/api/v1/messages/${msgId}/reactions`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ emoji: '🔥' });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.reactions.length).toBe(0);
  });
});

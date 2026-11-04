import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';

describe('Workspaces and Channels', () => {
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
      cookie: res.headers['set-cookie'],
    };
  };

  it('creates workspace with owner role and default #general and #random channels', async () => {
    const { token } = await registerUser('owner@example.com', 'owner');

    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rocket Launch',
        description: 'Mission to Mars',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workspace.name).toBe('Rocket Launch');
    expect(res.body.data.workspace.slug).toBe('rocket-launch');

    const wsId = res.body.data.workspace._id;

    // Check channels in workspace
    const channelsRes = await request(app)
      .get(`/api/v1/channels/workspace/${wsId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(channelsRes.status).toBe(200);
    const channelNames = channelsRes.body.data.channels.map((c) => c.name);
    expect(channelNames).toContain('general');
    expect(channelNames).toContain('random');
  });

  it('enforces private channel authorization', async () => {
    const userA = await registerUser('alice@example.com', 'alice');
    const userB = await registerUser('bob@example.com', 'bob');

    // Alice creates workspace
    const wsRes = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'Secret Org' });

    const wsId = wsRes.body.data.workspace._id;

    // Alice invites Bob to workspace
    const inviteRes = await request(app)
      .post(`/api/v1/workspaces/${wsId}/invitations`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ email: 'bob@example.com' });

    const inviteToken = inviteRes.body.data.invitation.token;

    // Bob accepts invitation
    await request(app)
      .post(`/api/v1/workspaces/invitations/${inviteToken}/accept`)
      .set('Authorization', `Bearer ${userB.token}`);

    // Alice creates a private channel
    const privChanRes = await request(app)
      .post('/api/v1/channels')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        workspaceId: wsId,
        name: 'finance-confidential',
        isPrivate: true,
      });

    expect(privChanRes.status).toBe(201);
    const privChanId = privChanRes.body.data.channel._id;

    // Bob should not see this private channel in his channel list
    const bobChannelsRes = await request(app)
      .get(`/api/v1/channels/workspace/${wsId}`)
      .set('Authorization', `Bearer ${userB.token}`);

    const bobChanNames = bobChannelsRes.body.data.channels.map((c) => c.name);
    expect(bobChanNames).not.toContain('finance-confidential');

    // Bob attempting to fetch details of private channel gets 403 Forbidden
    const bobAccessRes = await request(app)
      .get(`/api/v1/channels/${privChanId}`)
      .set('Authorization', `Bearer ${userB.token}`);

    expect(bobAccessRes.status).toBe(403);
  });
});

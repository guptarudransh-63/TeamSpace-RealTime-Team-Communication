import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';
import { User } from '../src/models/User.js';

describe('Auth Endpoints', () => {
  setupTestDB();

  it('registers a new user and sets auth cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'testuser',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.displayName).toBe('testuser');
    expect(res.headers['set-cookie']).toBeDefined();

    const dbUser = await User.findOne({ email: 'test@example.com' });
    expect(dbUser).not.toBeNull();
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'duplicate@example.com',
      password: 'password123',
      displayName: 'user1',
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'duplicate@example.com',
      password: 'password456',
      displayName: 'user2',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('logs in an existing user with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'login@example.com',
      password: 'password123',
      displayName: 'loginuser',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects login with incorrect password', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'wrongpass@example.com',
      password: 'password123',
      displayName: 'wrongpass',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'wrongpass@example.com',
      password: 'incorrectPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

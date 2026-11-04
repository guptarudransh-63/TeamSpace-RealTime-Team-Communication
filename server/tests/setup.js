process.env.AWS_EC2_METADATA_DISABLED = 'true';
import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';

let mongodProcess = null;
const TEST_PORT = 27021;
let TEST_URI = `mongodb://127.0.0.1:${TEST_PORT}/teamspace_test`;
const testDbDir = '/tmp/teamspace-test-db';

const isPortOpen = (port) =>
  new Promise((resolve) => {
    const client = net.createConnection({ port, host: '127.0.0.1' }, () => {
      client.end();
      resolve(true);
    });
    client.on('error', () => resolve(false));
  });

export const setupTestDB = () => {
  beforeAll(async () => {
    // If standard MongoDB is already running on port 27017, use it!
    const is27017Open = await isPortOpen(27017);
    if (is27017Open) {
      TEST_URI = 'mongodb://127.0.0.1:27017/teamspace_test';
    } else {
      const is27021Open = await isPortOpen(TEST_PORT);
      if (!is27021Open) {
        if (!fs.existsSync(testDbDir)) {
          fs.mkdirSync(testDbDir, { recursive: true });
        }

        await new Promise((resolve, reject) => {
          mongodProcess = spawn('/opt/homebrew/bin/mongod', [
            '--dbpath',
            testDbDir,
            '--port',
            String(TEST_PORT),
            '--bind_ip',
            '127.0.0.1',
          ]);

          const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for test mongod to start'));
          }, 15000);

          mongodProcess.stdout.on('data', (data) => {
            if (data.toString().includes('Waiting for connections')) {
              clearTimeout(timeout);
              resolve();
            }
          });

          mongodProcess.stderr.on('data', (data) => {
            console.error('[mongod err]', data.toString());
          });

          mongodProcess.on('exit', (code) => {
            if (code !== 0) {
              clearTimeout(timeout);
              reject(new Error(`mongod exited with code ${code}`));
            }
          });

          mongodProcess.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      }
    }

    await mongoose.connect(TEST_URI);
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }, 20000);

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongodProcess) {
      await new Promise((resolve) => {
        mongodProcess.once('exit', resolve);
        mongodProcess.kill('SIGINT');
        setTimeout(resolve, 2000);
      });
      mongodProcess = null;
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });
};

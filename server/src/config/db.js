import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/teamspace';

  try {
    // Attempt standard connection first with 3s timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`[Database] Connected to MongoDB at ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Database] Local MongoDB not reachable (${error.message}). Initializing MongoMemoryServer fallback...`);
      process.env.MONGOMS_SYSTEM_BINARY = '/opt/homebrew/bin/mongod';
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'teamspace' },
        binary: {
          systemBinary: '/opt/homebrew/bin/mongod',
        },
      });
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to in-memory MongoDB at ${memoryUri}`);
    } else {
      console.error('[Database] MongoDB connection error:', error);
      throw error;
    }
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('[Database] Disconnected from MongoDB');
  } catch (error) {
    console.error('[Database] Disconnect error:', error);
  }
};

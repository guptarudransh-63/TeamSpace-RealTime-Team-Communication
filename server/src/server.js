import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { initializeSocket } from './socket/socket.js';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB (with automated memory server fallback in dev/test)
    await connectDB();

    // 2. Create HTTP server
    const httpServer = http.createServer(app);

    // 3. Initialize Socket.IO
    initializeSocket(httpServer);

    // 4. Start HTTP listener
    httpServer.listen(PORT, () => {
      console.log(`[TeamSpace Server] Running on http://localhost:${PORT}`);
      console.log(`[API Docs] Available at http://localhost:${PORT}/api/docs`);
    });
  } catch (err) {
    console.error('[TeamSpace Server] Failed to start:', err);
    process.exit(1);
  }
};

startServer();

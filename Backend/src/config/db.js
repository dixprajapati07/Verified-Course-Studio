import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verified_course_studio';
  
  try {
    // Attempt connecting with short timeout to detect local MongoDB
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected to database: ${mongoose.connection.name}`);
  } catch (err) {
    console.warn(`[MongoDB] Local MongoDB connection failed (${err.message}). Starting in-memory MongoDB server...`);
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[MongoDB] Connected to In-Memory MongoDB Server at: ${memoryUri}`);
    } catch (memErr) {
      console.error('[MongoDB] Failed to start in-memory MongoDB:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}

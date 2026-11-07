import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      autoIndex: !env.isProd,
      serverSelectionTimeoutMS: 15000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

export async function disconnectDB() {
  await mongoose.connection.close();
}

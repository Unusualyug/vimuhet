import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'node:path';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import webhookRoutes from './webhooks/razorpay.webhook.js';
import { errorHandler, notFound } from './middleware/error.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { csrfGuard } from './middleware/csrf.js';
import logger from './utils/logger.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const allowedOrigins = [env.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowedOrigins.includes(origin) || env.nodeEnv !== 'production') return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
      exposedHeaders: ['X-Total-Count'],
    })
  );

  // Webhooks must be mounted BEFORE the JSON body parser so the raw payload is
  // available for Razorpay HMAC signature verification.
  app.use('/api/webhooks', webhookRoutes);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  /* Anything presenting the refresh cookie must come from an origin we trust. */
  app.use('/api', csrfGuard(allowedOrigins));
  app.use(compression());
  if (env.nodeEnv !== 'test') {
    app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: { write: (m) => logger.info(m.trim()) } }));
  }

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads'), { maxAge: '7d' }));
  app.use('/api', globalLimiter, routes);

  app.get('/', (_req, res) =>
    res.json({ success: true, name: 'Vimuhet API', version: '1.0.0', health: '/api/health' })
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export async function startServer() {
  await connectDB();
  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    logger.info(`Vimuhet API listening on http://0.0.0.0:${env.port} (${env.nodeEnv})`);
  });
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err?.message || err));
  process.on('uncaughtException', (err) => logger.error('Uncaught exception:', err?.stack || err?.message));
  return { app, server };
}

export default createApp;

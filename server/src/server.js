import { startServer } from './app.js';
import logger from './utils/logger.js';

startServer().catch((err) => {
  logger.error('Fatal startup error:', err.stack || err.message);
  process.exit(1);
});

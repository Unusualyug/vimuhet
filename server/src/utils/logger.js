import fs from 'node:fs';
import path from 'node:path';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
const logDir = path.resolve(process.cwd(), 'logs');

function write(level, args) {
  if (LEVELS[level] > current) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ')}`;
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : console.log)(line);
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'app.log'), `${line}\n`);
  } catch {
    /* logging must never break the request */
  }
}

const logger = {
  error: (...a) => write('error', a),
  warn: (...a) => write('warn', a),
  info: (...a) => write('info', a),
  debug: (...a) => write('debug', a),
};

export default logger;

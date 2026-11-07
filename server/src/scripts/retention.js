/**
 * Data-retention job.
 *
 * Deletes data past the retention periods published in the Cookie Policy, so the
 * policy is something the system actually enforces rather than a statement.
 *
 *   npm run retention            # run the cleanup
 *   npm run retention -- --dry   # report what would be removed, delete nothing
 *
 * Intended to be scheduled daily (cron / platform scheduler).
 */
import mongoose from 'mongoose';
import 'dotenv/config';
import VisitorSession from '../models/VisitorSession.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import ConsentRecord from '../models/ConsentRecord.js';
import RecentView from '../models/RecentView.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import { DATA_RETENTION_DAYS } from '../config/cookies.js';

const dry = process.argv.includes('--dry');
const DAY = 24 * 60 * 60 * 1000;
const before = (days) => new Date(Date.now() - days * DAY);

export async function runRetention({ dryRun = false, log = console.log } = {}) {
  const report = {};

  const plan = [
    { name: 'visitorSessions', model: VisitorSession, query: { startedAt: { $lt: before(DATA_RETENTION_DAYS.visitorSessions) } } },
    { name: 'analyticsEvents', model: AnalyticsEvent, query: { createdAt: { $lt: before(DATA_RETENTION_DAYS.analyticsEvents) } } },
    { name: 'consentRecords', model: ConsentRecord, query: { decidedAt: { $lt: before(DATA_RETENTION_DAYS.consentRecords) } } },
    { name: 'recentViews', model: RecentView, query: { updatedAt: { $lt: before(DATA_RETENTION_DAYS.recentViews) } } },
    /* Guest shopping data: only for carts that never converted and are long idle. */
    {
      name: 'guestCarts',
      model: Cart,
      query: { user: { $exists: false }, updatedAt: { $lt: before(DATA_RETENTION_DAYS.guestCarts) } },
    },
    {
      name: 'guestWishlists',
      model: Wishlist,
      query: { user: { $exists: false }, updatedAt: { $lt: before(DATA_RETENTION_DAYS.guestWishlists) } },
    },
  ];

  for (const item of plan) {
    const count = await item.model.countDocuments(item.query);
    if (!dryRun && count) await item.model.deleteMany(item.query);
    report[item.name] = count;
    log(`  ${item.name.padEnd(18)} ${String(count).padStart(6)} ${dryRun ? 'would be removed' : 'removed'}`);
  }

  return report;
}

/* Allow `node src/scripts/retention.js` as well as `npm run retention`. */
const isDirectRun = process.argv[1] && process.argv[1].endsWith('retention.js');
if (isDirectRun) {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vimuhet');
  console.log(`Vimuhet data retention ${dry ? '(dry run)' : ''}`);
  await runRetention({ dryRun: dry });
  await mongoose.disconnect();
}

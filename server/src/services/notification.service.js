import Notification from '../models/Notification.js';

export async function notifyAdmin({ type, title, message, link = '', meta = {} }) {
  try {
    await Notification.create({ type, title, message, audience: 'ADMIN', link, meta });
  } catch {
    /* notifications are best-effort */
  }
}

export async function notifyCustomer(userId, { type, title, message, link = '', meta = {} }) {
  if (!userId) return;
  try {
    await Notification.create({ type, title, message, audience: 'CUSTOMER', user: userId, link, meta });
  } catch {
    /* best-effort */
  }
}

export const notificationService = { notifyAdmin, notifyCustomer };
export default notificationService;

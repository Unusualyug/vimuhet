import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

/** Fire-and-forget audit trail writer for admin mutations. */
export async function recordAudit(req, { action, entity, entityId, description, changes }) {
  try {
    await AuditLog.create({
      actor: req.admin?._id,
      actorName: req.admin?.name,
      actorEmail: req.admin?.email,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      description,
      changes,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (err) {
    logger.warn('Audit log write failed:', err.message);
  }
}

export const audit = (action, entity) => (req, _res, next) => {
  req.auditContext = { action, entity };
  next();
};

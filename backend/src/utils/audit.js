// ════════════════════════════════════════════════════════════════
// audit.js — fire-and-forget admin action logging
// Records who changed what and when into the AuditLog table.
// Failures here must NEVER break the originating request, so every
// write is wrapped and errors are only logged to the console.
// ════════════════════════════════════════════════════════════════

/**
 * Write an audit log entry. Non-blocking — returns a promise but callers
 * generally should not await it (fire-and-forget).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} req - Express request (for IP + actor)
 * @param {object} entry
 * @param {string} entry.action - e.g. 'create', 'update', 'delete', 'login'
 * @param {string} entry.entityType - e.g. 'order', 'product', 'coupon'
 * @param {string|number} [entry.entityId]
 * @param {string} [entry.summary] - human-readable description
 * @param {object} [entry.metadata] - extra structured detail
 */
export function audit(prisma, req, entry) {
  const data = {
    actor: req?.admin?.username || 'admin',
    action: String(entry.action || 'unknown'),
    entityType: String(entry.entityType || 'unknown'),
    entityId: entry.entityId != null ? String(entry.entityId) : null,
    summary: entry.summary || null,
    metadata: entry.metadata || undefined,
    ip: req?.ip || null,
  };
  return prisma.auditLog.create({ data }).catch(err => {
    console.error('[audit] failed to write log:', err.message);
  });
}

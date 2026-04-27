import auditLogRepository from '../repositories/auditLogRepository.js';

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return metadata;
};

const auditLogService = {
  async write(req, entry) {
    const actorUid = req.user?.uid ?? req.user?.firebaseUid ?? null;
    const actorEmail = req.user?.email ?? null;
    const actorRole = req.user?.role ?? null;

    return auditLogRepository.insert({
      actorUid,
      actorEmail,
      actorRole,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: sanitizeMetadata(entry.metadata),
    });
  },
};

export default auditLogService;

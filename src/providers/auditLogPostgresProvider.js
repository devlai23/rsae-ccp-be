import { pgPool } from '../config/database.js';

const isMySql = typeof pgPool.execute === 'function';

const getPlaceholder = (values, value) => {
  values.push(value);
  return isMySql ? '?' : `$${values.length}`;
};

const queryRows = async (sql, values = []) => {
  const result = await pgPool.query(sql, values);

  if (Array.isArray(result)) {
    return result[0] || [];
  }

  return result?.rows || [];
};

const queryResult = async (sql, values = []) => {
  const result = await pgPool.query(sql, values);

  if (Array.isArray(result)) {
    return result[0] || {};
  }

  return result;
};

const normalizeMetadata = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return {};
};

const mapAuditLogRow = (row) => ({
  id: row.id,
  actorUid: row.actorUid ?? row.actor_uid,
  actorEmail: row.actorEmail ?? row.actor_email,
  actorRole: row.actorRole ?? row.actor_role,
  actionType: row.actionType ?? row.action_type,
  entityType: row.entityType ?? row.entity_type,
  entityId: row.entityId ?? row.entity_id,
  metadata: normalizeMetadata(row.metadata),
  createdAt: row.createdAt ?? row.created_at,
});

const auditLogPostgresProvider = {
  async insert(entry) {
    if (isMySql) {
      const sql = `
        INSERT INTO audit_logs (
          actor_uid,
          actor_email,
          actor_role,
          action_type,
          entity_type,
          entity_id,
          metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

      const result = await queryResult(sql, [
        entry.actorUid ?? null,
        entry.actorEmail ?? null,
        entry.actorRole ?? null,
        entry.actionType,
        entry.entityType,
        entry.entityId ?? null,
        JSON.stringify(entry.metadata ?? {}),
      ]);

      if (!result.insertId) {
        return null;
      }

      const rows = await queryRows(
        `
          SELECT
            id,
            actor_uid,
            actor_email,
            actor_role,
            action_type,
            entity_type,
            entity_id,
            metadata,
            created_at
          FROM audit_logs
          WHERE id = ?
          LIMIT 1;
        `,
        [result.insertId]
      );

      return rows[0] ? mapAuditLogRow(rows[0]) : null;
    }

    const sql = `
      INSERT INTO audit_logs (
        actor_uid,
        actor_email,
        actor_role,
        action_type,
        entity_type,
        entity_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        actor_uid,
        actor_email,
        actor_role,
        action_type,
        entity_type,
        entity_id,
        metadata,
        created_at;
    `;

    const rows = await queryRows(sql, [
      entry.actorUid ?? null,
      entry.actorEmail ?? null,
      entry.actorRole ?? null,
      entry.actionType,
      entry.entityType,
      entry.entityId ?? null,
      entry.metadata ?? {},
    ]);

    return rows[0] ? mapAuditLogRow(rows[0]) : null;
  },

  async list({ category, from, to, limit = 200 } = {}) {
    const values = [];
    const clauses = [];

    if (category) {
      const idx = getPlaceholder(values, `${category}.%`);
      clauses.push(`action_type LIKE ${idx}`);
    }

    if (from) {
      const idx = getPlaceholder(values, from);
      clauses.push(`created_at >= ${idx}`);
    }

    if (to) {
      const idx = getPlaceholder(values, to);
      clauses.push(`created_at <= ${idx}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limitIdx = getPlaceholder(
      values,
      Math.min(Math.max(Number(limit) || 200, 1), 500)
    );

    const sql = `
      SELECT
        id,
        actor_uid,
        actor_email,
        actor_role,
        action_type,
        entity_type,
        entity_id,
        metadata,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitIdx};
    `;

    const rows = await queryRows(sql, values);
    return rows.map(mapAuditLogRow);
  },
};

export default auditLogPostgresProvider;

import { pgPool } from '../config/database.js';

const auditLogPostgresProvider = {
  async insert(entry) {
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
      RETURNING id, created_at AS "createdAt";
    `;

    const values = [
      entry.actorUid ?? null,
      entry.actorEmail ?? null,
      entry.actorRole ?? null,
      entry.actionType,
      entry.entityType,
      entry.entityId ?? null,
      entry.metadata ?? {},
    ];

    const { rows } = await pgPool.query(sql, values);
    return rows[0];
  },

  async list({ category, from, to, limit = 200 } = {}) {
    const values = [];
    const clauses = [];

    if (category) {
      values.push(`${category}.%`);
      clauses.push(`action_type LIKE $${values.length}`);
    }

    if (from) {
      values.push(from);
      clauses.push(`created_at >= $${values.length}::timestamptz`);
    }

    if (to) {
      values.push(to);
      clauses.push(`created_at <= $${values.length}::timestamptz`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    values.push(Math.min(Math.max(Number(limit) || 200, 1), 500));
    const limitIdx = values.length;

    const sql = `
      SELECT
        id,
        actor_uid AS "actorUid",
        actor_email AS "actorEmail",
        actor_role AS "actorRole",
        action_type AS "actionType",
        entity_type AS "entityType",
        entity_id AS "entityId",
        metadata,
        created_at AS "createdAt"
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIdx};
    `;

    const { rows } = await pgPool.query(sql, values);
    return rows;
  },
};

export default auditLogPostgresProvider;

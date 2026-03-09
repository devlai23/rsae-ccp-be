import { pgPool } from '../config/database.js';

export default {
  async createUser({ uid, username, email, firstname, lastname }) {
    const sql = `INSERT INTO users (firebase_uid, username, email, firstname, lastname) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const { rows } = await pgPool.query(sql, [
      uid,
      username,
      email,
      firstname,
      lastname,
    ]);
    return { id: rows[0].id, uid, username, email };
  },

  async upsertUser({ uid, username, email, firstname, lastname }) {
    const sql = `
      INSERT INTO users (firebase_uid, username, email, firstname, lastname)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (firebase_uid) DO UPDATE SET
        email = EXCLUDED.email,
        firstname = EXCLUDED.firstname,
        lastname = EXCLUDED.lastname;
    `;
    await pgPool.query(sql, [uid, username, email, firstname, lastname]);
    return this.findByUid(uid);
  },

  async findByUid(uid) {
    const sql = `SELECT id, firebase_uid AS "firebaseUid", username, email, firstname, lastname FROM users WHERE firebase_uid = $1`;
    const { rows } = await pgPool.query(sql, [uid]);
    return rows[0] || null;
  },

  async getAll() {
    const { rows } = await pgPool.query(
      `SELECT username, email, firstname, lastname FROM users ORDER BY username ASC`
    );
    return rows;
  },

  async create(proposalData) {
    const {
      title,
      category,
      description,
      submittedBy = 'Anonymous Resident',
      tags = [],
    } = proposalData;

    const sql = `
    INSERT INTO proposals (title, category, description, submitted_by, tags)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING 
      id, 
      title, 
      category, 
      description, 
      votes, 
      submitted_by AS "submittedBy", 
      submitted_at AS "submittedAt", 
      status, 
      tags;
  `;

    const values = [title, category, description, submittedBy, tags];
    const { rows } = await pgPool.query(sql, values);

    return rows[0];
  },
};

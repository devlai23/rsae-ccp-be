import auditLogRepository from '../repositories/auditLogRepository.js';

const asIsoStart = (dateString) => `${dateString}T00:00:00.000Z`;
const asIsoEnd = (dateString) => `${dateString}T23:59:59.999Z`;

const auditLogsController = {
  async list(req, res) {
    try {
      const categoryRaw = (req.query.category || '').trim().toLowerCase();
      const category = ['auth', 'proposal', 'comment'].includes(categoryRaw)
        ? categoryRaw
        : '';

      const fromRaw = (req.query.from || '').trim();
      const toRaw = (req.query.to || '').trim();

      const from = fromRaw ? asIsoStart(fromRaw) : null;
      const to = toRaw ? asIsoEnd(toRaw) : null;

      const limitRaw = req.query.limit;
      const items = await auditLogRepository.list({
        category: category || null,
        from,
        to,
        limit: limitRaw,
      });

      return res.status(200).json({ items });
    } catch (error) {
      console.error('List audit logs error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load audit logs'
            : error.message,
      });
    }
  },
};

export default auditLogsController;

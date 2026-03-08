import dashboardService from '../services/dashboardService.js';

const dashboardController = {
  async getMetrics(_req, res) {
    try {
      const metrics = await dashboardService.getMetrics();
      return res.status(200).json(metrics);
    } catch (error) {
      console.error('Dashboard metrics error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load metrics'
            : error.message,
      });
    }
  },

  async getCategories(_req, res) {
    try {
      const categories = await dashboardService.getCategories();
      return res.status(200).json(categories);
    } catch (error) {
      console.error('Dashboard categories error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load categories'
            : error.message,
      });
    }
  },

  async getProposals(_req, res) {
    try {
      const proposals = await dashboardService.getProposals();
      return res.status(200).json(proposals);
    } catch (error) {
      console.error('Dashboard proposals error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load proposals'
            : error.message,
      });
    }
  },
};

export default dashboardController;

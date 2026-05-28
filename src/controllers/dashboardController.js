import dashboardService from '../services/dashboardService.js';

const dashboardController = {
  async getPublicMetrics(_req, res) {
    try {
      const metrics = await dashboardService.getPublicMetrics();
      return res.status(200).json(metrics);
    } catch (error) {
      console.error('Public dashboard metrics error:', error);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'production'
            ? 'Failed to load metrics'
            : error.message,
      });
    }
  },

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
};

export default dashboardController;

const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  const isAdmin =
    role === 'admin' ||
    req.user?.admin === true ||
    req.user?.isAdmin === true ||
    req.user?.claims?.admin === true;

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
};

export default requireAdmin;

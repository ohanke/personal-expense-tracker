const { logger } = require('../utils/logger');

const getUser = (req, res) => {
  if (!req.user) {
    logger.warn('[AUTH] GET /auth/me - user not authenticated');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  logger.info('[AUTH] GET /auth/me - user data retrieved', { userId: req.user.id });
  res.json({
    id: req.user.id,
    name: req.user.display_name,
    email: req.user.email,
    avatar: req.user.avatar_url,
  });
};

const logout = (req, res) => {
  const userId = req.user?.id;
  req.logout((err) => {
    if (err) {
      logger.error('[AUTH] Logout failed', err, { userId });
      return res.status(500).json({ error: 'Logout failed' });
    }
    logger.auth.logout(userId);
    res.json({ message: 'Logged out successfully' });
  });
};

module.exports = { getUser, logout };

const getUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({
    id: req.user.id,
    name: req.user.display_name,
    email: req.user.email,
    avatar: req.user.avatar_url,
  });
};

const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};

module.exports = { getUser, logout };

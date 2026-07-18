const express = require('express');
const passport = require('passport');
const { getUser, logout } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user) => {
    if (err) {
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    if (!user) {
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.redirect('http://localhost:5173/login?error=auth_failed');
      }
      res.redirect('http://localhost:5173/');
    });
  })(req, res, next);
});

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', (err, user) => {
    if (err) {
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    if (!user) {
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.redirect('http://localhost:5173/login?error=auth_failed');
      }
      res.redirect('http://localhost:5173/');
    });
  })(req, res, next);
});

router.get('/me', isAuthenticated, getUser);

router.post('/logout', isAuthenticated, logout);

module.exports = router;

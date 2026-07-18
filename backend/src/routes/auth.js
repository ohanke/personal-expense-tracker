const express = require('express');
const passport = require('passport');
const { getUser, logout } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

router.get('/google', (req, res, next) => {
  logger.auth.oauthStart('google');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user) => {
    if (err) {
      logger.auth.oauthCallback('google', false);
      logger.error('[AUTH] Google callback error', err);
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    if (!user) {
      logger.auth.oauthCallback('google', false);
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    logger.auth.oauthCallback('google', true, user.id);
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.auth.loginFailed('google', 'Session login failed');
        logger.error('[AUTH] Login session error', loginErr);
        return res.redirect('http://localhost:5173/login?error=auth_failed');
      }
      logger.auth.loginSuccess(user.id, 'google');
      res.redirect('http://localhost:5173/');
    });
  })(req, res, next);
});

router.get('/github', (req, res, next) => {
  logger.auth.oauthStart('github');
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', (err, user) => {
    if (err) {
      logger.auth.oauthCallback('github', false);
      logger.error('[AUTH] GitHub callback error', err);
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    if (!user) {
      logger.auth.oauthCallback('github', false);
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    logger.auth.oauthCallback('github', true, user.id);
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.auth.loginFailed('github', 'Session login failed');
        logger.error('[AUTH] Login session error', loginErr);
        return res.redirect('http://localhost:5173/login?error=auth_failed');
      }
      logger.auth.loginSuccess(user.id, 'github');
      res.redirect('http://localhost:5173/');
    });
  })(req, res, next);
});

router.get('/me', isAuthenticated, getUser);

router.post('/logout', isAuthenticated, logout);

module.exports = router;

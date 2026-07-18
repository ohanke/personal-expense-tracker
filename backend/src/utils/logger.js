/* eslint-disable no-console */

const censorEmail = (email) => {
  if (!email || typeof email !== 'string') return 'unknown';
  const [local, domain] = email.split('@');
  if (!domain) return 'invalid-email';
  const censored = local.charAt(0) + '*'.repeat(Math.max(1, local.length - 2)) + (local.length > 1 ? local.charAt(local.length - 1) : '');
  return `${censored}@${domain}`;
};

const censorUserId = (userId) => {
  if (!userId) return 'unknown';
  return userId.substring(0, 4) + '...';
};

const censorToken = (token) => {
  if (!token) return '[token]';
  return token.substring(0, 10) + '...' + token.substring(token.length - 4);
};

const sanitize = (obj) => {
  if (!obj) return obj;
  const sanitized = { ...obj };
  if (sanitized.email) sanitized.email = censorEmail(sanitized.email);
  if (sanitized.id) sanitized.id = censorUserId(sanitized.id);
  if (sanitized.provider_user_id) sanitized.provider_user_id = censorToken(sanitized.provider_user_id);
  if (sanitized.avatar_url) delete sanitized.avatar_url;
  return sanitized;
};

const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, meta);
  },

  debug: (message, meta = {}) => {
    if (process.env.DEBUG_LOGS === 'true') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] DEBUG: ${message}`, meta);
    }
  },

  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, meta);
  },

  error: (message, error = null, meta = {}) => {
    const timestamp = new Date().toISOString();
    const errorInfo = error ? {
      message: error.message,
      code: error.code,
    } : {};
    console.error(`[${timestamp}] ERROR: ${message}`, { ...errorInfo, ...meta });
  },

  auth: {
    oauthStart: (strategy) => {
      logger.info(`[AUTH] OAuth flow initiated: ${strategy}`);
    },

    oauthCallback: (strategy, success, userId = null) => {
      if (success) {
        logger.info(`[AUTH] OAuth callback success: ${strategy}`, { userId: censorUserId(userId) });
      } else {
        logger.warn(`[AUTH] OAuth callback failed: ${strategy}`);
      }
    },

    loginSuccess: (userId, strategy) => {
      logger.info(`[AUTH] User logged in successfully`, { userId: censorUserId(userId), strategy });
    },

    loginFailed: (strategy, reason) => {
      logger.warn(`[AUTH] Login failed`, { strategy, reason });
    },

    logout: (userId) => {
      logger.info(`[AUTH] User logged out`, { userId: censorUserId(userId) });
    },
  },

  api: {
    request: (method, path, userId = null) => {
      logger.debug(`[API] ${method} ${path}`, userId ? { userId: censorUserId(userId) } : {});
    },

    response: (method, path, statusCode, userId = null) => {
      logger.info(`[API] ${method} ${path} → ${statusCode}`, userId ? { userId: censorUserId(userId) } : {});
    },

    error: (method, path, statusCode, error, userId = null) => {
      logger.error(`[API] ${method} ${path} failed with ${statusCode}`, error, userId ? { userId: censorUserId(userId) } : {});
    },
  },

  crud: {
    create: (resource, id, userId) => {
      logger.info(`[CRUD] CREATE ${resource}`, { resourceId: id, userId: censorUserId(userId) });
    },

    read: (resource, id, userId) => {
      logger.debug(`[CRUD] READ ${resource}`, { resourceId: id, userId: censorUserId(userId) });
    },

    update: (resource, id, userId) => {
      logger.info(`[CRUD] UPDATE ${resource}`, { resourceId: id, userId: censorUserId(userId) });
    },

    delete: (resource, id, userId) => {
      logger.info(`[CRUD] DELETE ${resource}`, { resourceId: id, userId: censorUserId(userId) });
    },

    error: (operation, resource, userId, error) => {
      logger.error(`[CRUD] ${operation} ${resource} failed`, error, { userId: censorUserId(userId) });
    },
  },

  websocket: {
    connect: (userId) => {
      logger.info(`[WS] Client connected`, { userId: censorUserId(userId) });
    },

    disconnect: (userId) => {
      logger.info(`[WS] Client disconnected`, { userId: censorUserId(userId) });
    },

    message: (userId, messageType) => {
      logger.debug(`[WS] Message from client`, { userId: censorUserId(userId), type: messageType });
    },

    alert: (userId, threshold, percentage) => {
      logger.info(`[WS] Budget alert sent`, { userId: censorUserId(userId), threshold, percentageUsed: percentage });
    },

    error: (userId, error) => {
      logger.error(`[WS] WebSocket error`, error, { userId: censorUserId(userId) });
    },
  },
};

module.exports = { logger, sanitize, censorEmail, censorUserId };

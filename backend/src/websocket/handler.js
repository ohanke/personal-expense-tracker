const WebSocket = require('ws');
const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');
const {
  calculateBudgetSummary,
  getAlertsToSend,
  recordAlertSent,
  handleClientMessage,
} = require('./budgetAlerts');

const wsClients = new Map();

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const setupWebSocketServer = (server) => {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const hasSession = request.headers.cookie?.split(';').some(c => c.trim().startsWith('connect.sid='));

    if (!hasSession) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', async (ws, request) => {
    const userId = request.session?.passport?.user || null;

    if (!userId) {
      logger.warn('[WS] Connection rejected: no userId');
      ws.close(1008, 'Unauthorized');
      return;
    }

    logger.websocket.connect(userId);
    wsClients.set(userId, ws);

    const currentMonth = getCurrentMonth();
    try {
      const { percentageUsed } = await calculateBudgetSummary(userId, currentMonth);

      const alertsToSend = await getAlertsToSend(userId, currentMonth, percentageUsed);

      for (const alert of alertsToSend) {
        ws.send(JSON.stringify({
          type: 'budget_alert',
          threshold: alert.threshold,
          percentageUsed: Math.round(alert.percentageUsed),
          budgetAmount: alert.budgetAmount,
          month: currentMonth,
        }));

        logger.websocket.alert(userId, alert.threshold, Math.round(alert.percentageUsed));

        const budget = await prisma.budget.findUnique({
          where: {
            user_id_month: {
              user_id: userId,
              month: currentMonth,
            },
          },
        });
        if (budget) {
          await recordAlertSent(budget.id, userId, alert.threshold);
        }
      }
    } catch (error) {
      logger.error('[WS] Error sending initial alerts', error, { userId });
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        logger.websocket.message(userId, msg.type || 'unknown');
        const response = await handleClientMessage(data);
        if (response) {
          ws.send(JSON.stringify(response));
        }
      } catch {
        logger.debug('[WS] Invalid message format');
      }
    });

    ws.on('close', () => {
      logger.websocket.disconnect(userId);
      wsClients.delete(userId);
    });

    ws.on('error', (error) => {
      logger.websocket.error(userId, error);
      wsClients.delete(userId);
    });
  });

  return { wss, wsClients };
};

const sendBudgetAlert = async (userId, threshold, percentageUsed, month) => {
  const ws = wsClients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    const budget = await prisma.budget.findUnique({
      where: {
        user_id_month: {
          user_id: userId,
          month,
        },
      },
    });

    if (budget) {
      ws.send(JSON.stringify({
        type: 'budget_alert',
        threshold,
        percentageUsed: Math.round(percentageUsed),
        budgetAmount: budget.amount,
        month,
      }));

      logger.websocket.alert(userId, threshold, Math.round(percentageUsed));
      await recordAlertSent(budget.id, userId, threshold);
    }
  } else {
    logger.debug('[WS] Client not connected', { userId });
  }
};

module.exports = {
  setupWebSocketServer,
  sendBudgetAlert,
  getCurrentMonth,
};

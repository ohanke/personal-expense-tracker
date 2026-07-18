const WebSocket = require('ws');
const { prisma } = require('../utils/prisma');
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
      ws.close(1008, 'Unauthorized');
      return;
    }

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
      console.error('Error sending initial alerts:', error);
    }

    ws.on('message', async (data) => {
      const response = await handleClientMessage(data);
      if (response) {
        ws.send(JSON.stringify(response));
      }
    });

    ws.on('close', () => {
      wsClients.delete(userId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
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

      await recordAlertSent(budget.id, userId, threshold);
    }
  }
};

module.exports = {
  setupWebSocketServer,
  sendBudgetAlert,
  getCurrentMonth,
};

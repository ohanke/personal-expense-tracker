const { prisma } = require('../utils/prisma');

const THRESHOLDS = [50, 80, 100];

const getAlertThresholds = (percentageUsed) => {
  const triggeredThresholds = [];
  for (const threshold of THRESHOLDS) {
    if (percentageUsed >= threshold) {
      triggeredThresholds.push(threshold);
    }
  }
  return triggeredThresholds;
};

const calculateBudgetSummary = async (userId, month) => {
  const [year, m] = month.split('-');
  const monthStart = new Date(`${year}-${m}-01T00:00:00Z`);
  const monthEnd = new Date(year, parseInt(m), 0, 23, 59, 59, 999);

  const budget = await prisma.budget.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month,
      },
    },
  });

  const transactions = await prisma.transaction.findMany({
    where: {
      user_id: userId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
  });

  const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const budgetAmount = budget?.amount || null;
  let percentageUsed = budgetAmount !== null && budgetAmount > 0
    ? (spent / budgetAmount) * 100
    : null;
  if (percentageUsed !== null) {
    percentageUsed = Math.round(percentageUsed * 100) / 100;
  }

  return {
    budgetAmount,
    spent,
    percentageUsed,
    budget,
  };
};

const getAlertsToSend = async (userId, month, currentPercentageUsed) => {
  if (!currentPercentageUsed) {
    return [];
  }

  const budget = await prisma.budget.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month,
      },
    },
  });

  if (!budget) {
    return [];
  }

  const triggeredThresholds = getAlertThresholds(currentPercentageUsed);
  const alertsToSend = [];

  for (const threshold of triggeredThresholds) {
    const existingAlert = await prisma.budgetAlert.findUnique({
      where: {
        budget_id_threshold: {
          budget_id: budget.id,
          threshold,
        },
      },
    });

    if (!existingAlert) {
      alertsToSend.push({
        threshold,
        percentageUsed: currentPercentageUsed,
        budgetAmount: budget.amount,
        month,
      });
    }
  }

  return alertsToSend;
};

const recordAlertSent = async (budgetId, userId, threshold) => {
  await prisma.budgetAlert.create({
    data: {
      budget_id: budgetId,
      user_id: userId,
      threshold,
    },
  });
};

const handleClientMessage = async (message) => {
  try {
    const data = JSON.parse(message);

    if (data.type === 'acknowledge_alert') {
      return {
        type: 'ack_received',
        message: 'Alert acknowledged',
      };
    }

    return null;
  } catch (error) {
    console.error('Error handling client message:', error);
    return null;
  }
};

module.exports = {
  THRESHOLDS,
  getAlertThresholds,
  calculateBudgetSummary,
  getAlertsToSend,
  recordAlertSent,
  handleClientMessage,
};

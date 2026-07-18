const { prisma } = require('../utils/prisma');

const validateMonth = (month) => {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(month)) {
    return 'Month must be in YYYY-MM format (e.g., 2026-07)';
  }
  const [, m] = month.split('-');
  if (parseInt(m) < 1 || parseInt(m) > 12) {
    return 'Month must be between 01 and 12';
  }
  return null;
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    return 'Amount must be a number greater than 0';
  }
  return null;
};

const getBudget = async (req, res) => {
  try {
    const { month } = req.params;
    const monthError = validateMonth(month);
    if (monthError) {
      return res.status(400).json({ error: monthError });
    }

    const budget = await prisma.budget.findUnique({
      where: {
        user_id_month: {
          user_id: req.user.id,
          month,
        },
      },
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found for this month' });
    }

    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createOrUpdateBudget = async (req, res) => {
  try {
    const { month, amount } = req.body;

    const monthError = validateMonth(month);
    if (monthError) {
      return res.status(400).json({ error: monthError });
    }

    const amountError = validateAmount(amount);
    if (amountError) {
      return res.status(400).json({ error: amountError });
    }

    const existingBudget = await prisma.budget.findUnique({
      where: {
        user_id_month: {
          user_id: req.user.id,
          month,
        },
      },
    });

    if (existingBudget) {
      const updated = await prisma.budget.update({
        where: {
          user_id_month: {
            user_id: req.user.id,
            month,
          },
        },
        data: { amount: parseFloat(amount) },
      });
      return res.status(200).json(updated);
    }

    const created = await prisma.budget.create({
      data: {
        user_id: req.user.id,
        month,
        amount: parseFloat(amount),
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating/updating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBudgetSummary = async (req, res) => {
  try {
    const { month } = req.params;
    const monthError = validateMonth(month);
    if (monthError) {
      return res.status(400).json({ error: monthError });
    }

    const [year, m] = month.split('-');
    const monthStart = new Date(`${year}-${m}-01T00:00:00Z`);
    const monthEnd = new Date(year, parseInt(m), 0, 23, 59, 59, 999);

    const budget = await prisma.budget.findUnique({
      where: {
        user_id_month: {
          user_id: req.user.id,
          month,
        },
      },
    });

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: req.user.id,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const budgetAmount = budget?.amount || null;
    const remaining = budgetAmount !== null ? budgetAmount - spent : null;
    const percentageUsed = budgetAmount !== null && budgetAmount > 0
      ? (spent / budgetAmount) * 100
      : null;

    res.json({
      budgetAmount,
      spent: parseFloat(spent.toFixed(2)),
      remaining: remaining !== null ? parseFloat(remaining.toFixed(2)) : null,
      percentageUsed: percentageUsed !== null ? parseFloat(percentageUsed.toFixed(2)) : null,
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getBudget,
  createOrUpdateBudget,
  getBudgetSummary,
};

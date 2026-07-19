const { prisma } = require('../utils/prisma');

let webSocketHandler = null;
try {
  webSocketHandler = require('../websocket/handler');
} catch {
  console.warn('WebSocket handler not available (testing environment)');
}

const ISO_4217_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
  'MXN', 'SGD', 'HKD', 'NOK', 'KRW', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR'
]);

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    return 'Amount must be a number greater than 0';
  }
  return null;
};

const validateDate = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Date must be a valid ISO date string';
  }
  if (d > new Date()) {
    return 'Date cannot be in the future';
  }
  return null;
};

const validateTitle = (title) => {
  const trimmed = String(title || '').trim();
  if (!trimmed) {
    return 'Title is required and must be non-empty';
  }
  if (trimmed.length > 255) {
    return 'Title must be 255 characters or less';
  }
  return null;
};

const validateCurrency = (currency) => {
  if (!currency) return null;
  const upper = String(currency).toUpperCase();
  if (!ISO_4217_CURRENCIES.has(upper)) {
    return `Currency must be a valid ISO 4217 code (received: ${currency})`;
  }
  return null;
};

const getTransactions = async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      search = '',
      category,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const limitNum = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const offsetNum = Math.max(0, parseInt(offset) || 0);

    const where = { user_id: req.user.id };

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { notes: { contains: search.trim() } },
      ];
    }

    if (category) {
      where.category_id = category;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) {
        where.amount.gte = parseFloat(amountMin);
      }
      if (amountMax) {
        where.amount.lte = parseFloat(amountMax);
      }
    }

    const orderBy = {};
    if (sortBy === 'amount') {
      orderBy.amount = sortOrder === 'asc' ? 'asc' : 'desc';
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.date = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        take: limitNum,
        skip: offsetNum,
        include: { category: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      data: transactions,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total,
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { title, amount, currency, date, notes, category_id } = req.body;

    let titleError = validateTitle(title);
    if (titleError) {
      return res.status(400).json({ error: titleError });
    }

    let amountError = validateAmount(amount);
    if (amountError) {
      return res.status(400).json({ error: amountError });
    }

    let dateError = validateDate(date);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    let currencyError = validateCurrency(currency);
    if (currencyError) {
      return res.status(400).json({ error: currencyError });
    }

    if (category_id) {
      const cat = await prisma.category.findUnique({
        where: { id: category_id },
      });
      if (!cat) {
        return res.status(404).json({ error: 'Category not found' });
      }
      if (cat.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        title: String(title).trim(),
        amount: parseFloat(amount),
        currency: currency ? String(currency).toUpperCase() : 'USD',
        date: new Date(date),
        notes: notes ? String(notes).trim() : null,
        user_id: req.user.id,
        category_id: category_id || null,
      },
      include: { category: true },
    });

    if (webSocketHandler) {
      try {
        const currentMonth = webSocketHandler.getCurrentMonth();
        const { calculateBudgetSummary, getAlertsToSend } = require('../websocket/budgetAlerts');
        const { percentageUsed } = await calculateBudgetSummary(req.user.id, currentMonth);
        if (percentageUsed) {
          const alertsToSend = await getAlertsToSend(req.user.id, currentMonth, percentageUsed);
          for (const alert of alertsToSend) {
            await webSocketHandler.sendBudgetAlert(req.user.id, alert.threshold, percentageUsed, currentMonth);
          }
        }
      } catch (error) {
        console.error('Error sending budget alerts:', error);
      }
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, currency, date, notes, category_id } = req.body;

    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let titleError = validateTitle(title);
    if (titleError) {
      return res.status(400).json({ error: titleError });
    }

    let amountError = validateAmount(amount);
    if (amountError) {
      return res.status(400).json({ error: amountError });
    }

    let dateError = validateDate(date);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    let currencyError = validateCurrency(currency);
    if (currencyError) {
      return res.status(400).json({ error: currencyError });
    }

    if (category_id) {
      const cat = await prisma.category.findUnique({
        where: { id: category_id },
      });
      if (!cat) {
        return res.status(404).json({ error: 'Category not found' });
      }
      if (cat.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        title: String(title).trim(),
        amount: parseFloat(amount),
        currency: String(currency).toUpperCase(),
        date: new Date(date),
        notes: notes ? String(notes).trim() : null,
        category_id: category_id || null,
      },
      include: { category: true },
    });

    if (webSocketHandler) {
      try {
        const currentMonth = webSocketHandler.getCurrentMonth();
        const { calculateBudgetSummary, getAlertsToSend } = require('../websocket/budgetAlerts');
        const { percentageUsed } = await calculateBudgetSummary(req.user.id, currentMonth);
        if (percentageUsed) {
          const alertsToSend = await getAlertsToSend(req.user.id, currentMonth, percentageUsed);
          for (const alert of alertsToSend) {
            await webSocketHandler.sendBudgetAlert(req.user.id, alert.threshold, percentageUsed, currentMonth);
          }
        }
      } catch (error) {
        console.error('Error sending budget alerts:', error);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.transaction.delete({
      where: { id },
    });

    if (webSocketHandler) {
      try {
        const currentMonth = webSocketHandler.getCurrentMonth();
        const { calculateBudgetSummary, getAlertsToSend } = require('../websocket/budgetAlerts');
        const { percentageUsed } = await calculateBudgetSummary(req.user.id, currentMonth);
        if (percentageUsed) {
          const alertsToSend = await getAlertsToSend(req.user.id, currentMonth, percentageUsed);
          for (const alert of alertsToSend) {
            await webSocketHandler.sendBudgetAlert(req.user.id, alert.threshold, percentageUsed, currentMonth);
          }
        }
      } catch (error) {
        console.error('Error sending budget alerts:', error);
      }
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
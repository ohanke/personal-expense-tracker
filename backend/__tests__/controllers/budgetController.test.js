jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    budget: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
  },
}));

const {
  getBudget,
  createOrUpdateBudget,
  getBudgetSummary,
} = require('../../src/controllers/budgetController');
const { prisma } = require('../../src/utils/prisma');

describe('Budget Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'user-1' },
      params: {},
      body: {},
    };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getBudget', () => {
    it('should return 400 for invalid month format', async () => {
      req.params.month = 'invalid';
      await getBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('YYYY-MM'),
      }));
    });

    it('should return 400 for invalid month value (13)', async () => {
      req.params.month = '2026-13';
      await getBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when budget not found', async () => {
      req.params.month = '2026-07';
      prisma.budget.findUnique.mockResolvedValue(null);

      await getBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Budget not found'),
      }));
    });

    it('should return budget when found', async () => {
      req.params.month = '2026-07';
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      prisma.budget.findUnique.mockResolvedValue(budget);

      await getBudget(req, res);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(budget);
      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: {
          user_id_month: {
            user_id: 'user-1',
            month: '2026-07',
          },
        },
      });
    });

    it('should handle database errors', async () => {
      req.params.month = '2026-07';
      prisma.budget.findUnique.mockRejectedValue(new Error('DB Error'));

      await getBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Internal server error',
      }));
    });
  });

  describe('createOrUpdateBudget', () => {
    it('should return 400 for invalid month format', async () => {
      req.body = { month: 'invalid', amount: 5000 };
      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid amount (0)', async () => {
      req.body = { month: '2026-07', amount: 0 };
      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Amount must be a number greater than 0'),
      }));
    });

    it('should return 400 for negative amount', async () => {
      req.body = { month: '2026-07', amount: -100 };
      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for non-numeric amount', async () => {
      req.body = { month: '2026-07', amount: 'invalid' };
      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create new budget with 201 status', async () => {
      req.body = { month: '2026-08', amount: 6000 };
      const newBudget = {
        id: 'budget-new',
        user_id: 'user-1',
        month: '2026-08',
        amount: 6000,
      };
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue(newBudget);

      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newBudget);
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          month: '2026-08',
          amount: 6000,
        },
      });
    });

    it('should update existing budget with 200 status', async () => {
      req.body = { month: '2026-07', amount: 7000 };
      const existingBudget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      const updatedBudget = { ...existingBudget, amount: 7000 };
      prisma.budget.findUnique.mockResolvedValue(existingBudget);
      prisma.budget.update.mockResolvedValue(updatedBudget);

      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedBudget);
      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: {
          user_id_month: {
            user_id: 'user-1',
            month: '2026-07',
          },
        },
        data: { amount: 7000 },
      });
    });

    it('should convert string amount to float', async () => {
      req.body = { month: '2026-07', amount: '5000.50' };
      const newBudget = {
        id: 'budget-new',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000.5,
      };
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue(newBudget);

      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          month: '2026-07',
          amount: 5000.5,
        },
      });
    });

    it('should handle database errors on create', async () => {
      req.body = { month: '2026-08', amount: 6000 };
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.budget.create.mockRejectedValue(new Error('DB Error'));

      await createOrUpdateBudget(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getBudgetSummary', () => {
    it('should return 400 for invalid month format', async () => {
      req.params.month = 'invalid';
      await getBudgetSummary(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return summary with all fields when budget exists', async () => {
      req.params.month = '2026-07';
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      const transactions = [
        { id: '1', amount: 1000 },
        { id: '2', amount: 500 },
        { id: '3', amount: 1500 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      await getBudgetSummary(req, res);
      expect(res.json).toHaveBeenCalledWith({
        budgetAmount: 5000,
        spent: 3000,
        remaining: 2000,
        percentageUsed: 60,
      });
    });

    it('should calculate correct percentage when spent equals budget', async () => {
      req.params.month = '2026-07';
      const budget = {
        id: 'budget-1',
        amount: 5000,
      };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([
        { id: '1', amount: 5000 },
      ]);

      await getBudgetSummary(req, res);
      expect(res.json).toHaveBeenCalledWith({
        budgetAmount: 5000,
        spent: 5000,
        remaining: 0,
        percentageUsed: 100,
      });
    });

    it('should handle budget > spent', async () => {
      req.params.month = '2026-07';
      const budget = { amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([
        { amount: 2000 },
      ]);

      await getBudgetSummary(req, res);
      expect(res.json).toHaveBeenCalledWith({
        budgetAmount: 5000,
        spent: 2000,
        remaining: 3000,
        percentageUsed: 40,
      });
    });

    it('should handle spent > budget (overspent)', async () => {
      req.params.month = '2026-07';
      const budget = { amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([
        { amount: 3000 },
        { amount: 2500 },
      ]);

      await getBudgetSummary(req, res);
      expect(res.json).toHaveBeenCalledWith({
        budgetAmount: 5000,
        spent: 5500,
        remaining: -500,
        percentageUsed: 110,
      });
    });

    it('should return null values when no budget is set', async () => {
      req.params.month = '2026-07';
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.transaction.findMany.mockResolvedValue([
        { amount: 1000 },
      ]);

      await getBudgetSummary(req, res);
      expect(res.json).toHaveBeenCalledWith({
        budgetAmount: null,
        spent: 1000,
        remaining: null,
        percentageUsed: null,
      });
    });

    it('should return 0 spent when no transactions', async () => {
      req.params.month = '2026-07';
      const budget = { amount: 5000 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([]);

      await getBudgetSummary(req, res);
      expect(res.json).toHaveBeenCalledWith({
        budgetAmount: 5000,
        spent: 0,
        remaining: 5000,
        percentageUsed: 0,
      });
    });

    it('should query transactions for correct month', async () => {
      req.params.month = '2026-07';
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.transaction.findMany.mockResolvedValue([]);

      await getBudgetSummary(req, res);

      const callArgs = prisma.transaction.findMany.mock.calls[0][0];
      expect(callArgs.where.user_id).toBe('user-1');
      expect(callArgs.where.date).toBeDefined();
      expect(callArgs.where.date.gte).toBeDefined();
      expect(callArgs.where.date.lte).toBeDefined();
    });

    it('should handle decimal amounts correctly', async () => {
      req.params.month = '2026-07';
      const budget = { amount: 5000.75 };
      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([
        { amount: 1234.56 },
        { amount: 789.33 },
      ]);

      await getBudgetSummary(req, res);
      const result = res.json.mock.calls[0][0];
      expect(result.spent).toBe(2023.89);
      expect(result.remaining).toBe(2976.86);
      expect(result.percentageUsed).toBeCloseTo(40.48, 1);
    });

    it('should handle database errors', async () => {
      req.params.month = '2026-07';
      prisma.budget.findUnique.mockRejectedValue(new Error('DB Error'));

      await getBudgetSummary(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

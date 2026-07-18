jest.mock('../../src/utils/prisma', () => {
  return {
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
  };
});

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const budgetRouter = require('../../src/routes/budgets');
const { prisma } = require('../../src/utils/prisma');

describe('Budget Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());

    app.use((req, res, next) => {
      req.user = { id: 'user-1' };
      next();
    });

    app.use('/api/budgets', budgetRouter);
  });

  describe('GET /api/budgets/:month', () => {
    it('should return 401 for unauthenticated users', async () => {
      const appUnauth = express();
      appUnauth.use(express.json());
      appUnauth.use(
        session({
          secret: 'test-secret',
          resave: false,
          saveUninitialized: false,
        })
      );
      appUnauth.use(passport.initialize());
      appUnauth.use(passport.session());
      appUnauth.use('/api/budgets', budgetRouter);

      const res = await require('supertest')(appUnauth)
        .get('/api/budgets/2026-07');
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid month format', async () => {
      const res = await require('supertest')(app)
        .get('/api/budgets/2026-7');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('YYYY-MM');
    });

    it('should return 400 for invalid month value', async () => {
      const res = await require('supertest')(app)
        .get('/api/budgets/2026-13');
      expect(res.status).toBe(400);
    });

    it('should return 404 when budget not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-08');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Budget not found');
    });

    it('should return budget when found', async () => {
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
        created_at: new Date('2026-07-01'),
        updated_at: new Date('2026-07-01'),
      };
      prisma.budget.findUnique.mockResolvedValue(budget);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07');
      expect(res.status).toBe(200);
      expect(res.body.month).toBe('2026-07');
      expect(res.body.amount).toBe(5000);
      expect(res.body.user_id).toBe('user-1');
    });
  });

  describe('POST /api/budgets', () => {
    it('should return 401 for unauthenticated users', async () => {
      const appUnauth = express();
      appUnauth.use(express.json());
      appUnauth.use(
        session({
          secret: 'test-secret',
          resave: false,
          saveUninitialized: false,
        })
      );
      appUnauth.use(passport.initialize());
      appUnauth.use(passport.session());
      appUnauth.use('/api/budgets', budgetRouter);

      const res = await require('supertest')(appUnauth)
        .post('/api/budgets')
        .send({ month: '2026-07', amount: 5000 });
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid month format', async () => {
      const res = await require('supertest')(app)
        .post('/api/budgets')
        .send({ month: '2026-7', amount: 5000 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('YYYY-MM');
    });

    it('should return 400 for invalid amount', async () => {
      const res = await require('supertest')(app)
        .post('/api/budgets')
        .send({ month: '2026-07', amount: 0 });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Amount must be a number greater than 0');
    });

    it('should return 400 for negative amount', async () => {
      const res = await require('supertest')(app)
        .post('/api/budgets')
        .send({ month: '2026-07', amount: -100 });
      expect(res.status).toBe(400);
    });

    it('should return 400 for non-numeric amount', async () => {
      const res = await require('supertest')(app)
        .post('/api/budgets')
        .send({ month: '2026-07', amount: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should create new budget with 201 status', async () => {
      const newBudget = {
        id: 'budget-new',
        user_id: 'user-1',
        month: '2026-08',
        amount: 6000,
        created_at: new Date(),
        updated_at: new Date(),
      };
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue(newBudget);

      const res = await require('supertest')(app)
        .post('/api/budgets')
        .send({ month: '2026-08', amount: 6000 });
      expect(res.status).toBe(201);
      expect(res.body.month).toBe('2026-08');
      expect(res.body.amount).toBe(6000);
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-1',
          month: '2026-08',
          amount: 6000,
        },
      });
    });

    it('should update existing budget with 200 status', async () => {
      const existingBudget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      const updatedBudget = { ...existingBudget, amount: 7000 };
      prisma.budget.findUnique.mockResolvedValue(existingBudget);
      prisma.budget.update.mockResolvedValue(updatedBudget);

      const res = await require('supertest')(app)
        .post('/api/budgets')
        .send({ month: '2026-07', amount: 7000 });
      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(7000);
      expect(prisma.budget.update).toHaveBeenCalled();
    });
  });

  describe('GET /api/budgets/:month/summary', () => {
    it('should return 401 for unauthenticated users', async () => {
      const appUnauth = express();
      appUnauth.use(express.json());
      appUnauth.use(
        session({
          secret: 'test-secret',
          resave: false,
          saveUninitialized: false,
        })
      );
      appUnauth.use(passport.initialize());
      appUnauth.use(passport.session());
      appUnauth.use('/api/budgets', budgetRouter);

      const res = await require('supertest')(appUnauth)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid month format', async () => {
      const res = await require('supertest')(app)
        .get('/api/budgets/invalid/summary');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('YYYY-MM');
    });

    it('should return summary with budgetAmount, spent, remaining, percentageUsed', async () => {
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

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(200);
      expect(res.body.budgetAmount).toBe(5000);
      expect(res.body.spent).toBe(3000);
      expect(res.body.remaining).toBe(2000);
      expect(res.body.percentageUsed).toBe(60);
    });

    it('should calculate 100% when spent equals budget', async () => {
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      const transactions = [
        { id: '1', amount: 5000 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(200);
      expect(res.body.spent).toBe(5000);
      expect(res.body.remaining).toBe(0);
      expect(res.body.percentageUsed).toBe(100);
    });

    it('should handle budget > spent correctly', async () => {
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      const transactions = [
        { id: '1', amount: 2000 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(200);
      expect(res.body.budgetAmount).toBe(5000);
      expect(res.body.spent).toBe(2000);
      expect(res.body.remaining).toBe(3000);
      expect(res.body.percentageUsed).toBe(40);
    });

    it('should handle when spent exceeds budget', async () => {
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      const transactions = [
        { id: '1', amount: 3000 },
        { id: '2', amount: 2500 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(200);
      expect(res.body.budgetAmount).toBe(5000);
      expect(res.body.spent).toBe(5500);
      expect(res.body.remaining).toBe(-500);
      expect(res.body.percentageUsed).toBe(110);
    });

    it('should return null values when no budget is set', async () => {
      const transactions = [
        { id: '1', amount: 1000 },
      ];

      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(200);
      expect(res.body.budgetAmount).toBe(null);
      expect(res.body.spent).toBe(1000);
      expect(res.body.remaining).toBe(null);
      expect(res.body.percentageUsed).toBe(null);
    });

    it('should return 0 spent when no transactions exist', async () => {
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue([]);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(200);
      expect(res.body.budgetAmount).toBe(5000);
      expect(res.body.spent).toBe(0);
      expect(res.body.remaining).toBe(5000);
      expect(res.body.percentageUsed).toBe(0);
    });

    it('should correctly filter transactions to the specified month', async () => {
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000,
      };
      const transactions = [
        { id: '1', amount: 1500 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');

      const callArgs = prisma.transaction.findMany.mock.calls[0][0];
      expect(callArgs.where.user_id).toBe('user-1');
      expect(callArgs.where.date.gte).toBeDefined();
      expect(callArgs.where.date.lte).toBeDefined();
    });

    it('should handle decimal amounts correctly', async () => {
      const budget = {
        id: 'budget-1',
        user_id: 'user-1',
        month: '2026-07',
        amount: 5000.75,
      };
      const transactions = [
        { id: '1', amount: 1234.56 },
        { id: '2', amount: 789.33 },
      ];

      prisma.budget.findUnique.mockResolvedValue(budget);
      prisma.transaction.findMany.mockResolvedValue(transactions);

      const res = await require('supertest')(app)
        .get('/api/budgets/2026-07/summary');
      expect(res.status).toBe(200);
      expect(res.body.spent).toBe(2023.89);
      expect(res.body.remaining).toBe(2976.86);
      expect(res.body.percentageUsed).toBeCloseTo(40.48, 1);
    });
  });
});

const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/utils/prisma');
const transactionRoutes = require('../../src/routes/transactions');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use((req, res, next) => {
    if (req.query.authenticated === 'true') {
      req.isAuthenticated = () => true;
      req.user = { id: 'user-123' };
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });

  app.use('/api/transactions', transactionRoutes);
  return app;
};

describe('Transactions Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /api/transactions', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/transactions');
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return list of transactions for authenticated user', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          title: 'Groceries',
          amount: 50.5,
          currency: 'USD',
          date: '2026-07-15T00:00:00.000Z',
          notes: null,
          user_id: 'user-123',
          category_id: 'cat-1',
          category: { id: 'cat-1', name: 'Food' },
        },
      ];
      prisma.transaction.findMany.mockResolvedValue(mockTransactions);
      prisma.transaction.count.mockResolvedValue(1);

      const response = await request(app).get('/api/transactions?authenticated=true');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockTransactions);
      expect(response.body.pagination.total).toBe(1);
      expect(response.body.pagination.hasMore).toBe(false);
    });

    it('should return empty list when user has no transactions', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app).get('/api/transactions?authenticated=true');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should support pagination with limit and offset', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/transactions?authenticated=true&limit=10&offset=20');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should support search by title (case-insensitive)', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/transactions?authenticated=true&search=grocery');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'grocery' } }),
              expect.objectContaining({ notes: { contains: 'grocery' } }),
            ]),
          }),
        })
      );
    });

    it('should support filtering by category', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/transactions?authenticated=true&category=cat-1');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            category_id: 'cat-1',
          }),
        })
      );
    });

    it('should support date range filtering (dateFrom and dateTo)', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/transactions?authenticated=true&dateFrom=2026-07-01&dateTo=2026-07-31');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should support amount range filtering (amountMin and amountMax)', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/transactions?authenticated=true&amountMin=10&amountMax=100');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 'user-123',
            amount: expect.objectContaining({
              gte: 10,
              lte: 100,
            }),
          }),
        })
      );
    });

    it('should default to sorting by date descending', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app).get('/api/transactions?authenticated=true');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: 'desc' },
        })
      );
    });

    it('should support sorting by amount', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/transactions?authenticated=true&sortBy=amount&sortOrder=asc');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amount: 'asc' },
        })
      );
    });

    it('should support sorting by title', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/transactions?authenticated=true&sortBy=title&sortOrder=asc');

      expect(response.status).toBe(200);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        })
      );
    });
  });

  describe('POST /api/transactions', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .send({ title: 'Groceries', amount: 50 });
      expect(response.status).toBe(401);
    });

    it('should create transaction with valid data', async () => {
      const newTransaction = {
        id: 'tx-1',
        title: 'Groceries',
        amount: 50.5,
        currency: 'USD',
        date: '2026-07-15T00:00:00.000Z',
        notes: 'Weekly shopping',
        user_id: 'user-123',
        category_id: 'cat-1',
        category: { id: 'cat-1', name: 'Food' },
      };

      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1', user_id: 'user-123' });
      prisma.transaction.create.mockResolvedValue(newTransaction);

      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({
          title: 'Groceries',
          amount: 50.5,
          currency: 'USD',
          date: '2026-07-15',
          notes: 'Weekly shopping',
          category_id: 'cat-1',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newTransaction);
    });

    it('should default currency to USD if not provided', async () => {
      const newTransaction = {
        id: 'tx-1',
        title: 'Groceries',
        amount: 50.5,
        currency: 'USD',
        date: new Date('2026-07-15'),
        notes: null,
        user_id: 'user-123',
        category_id: null,
      };

      prisma.transaction.create.mockResolvedValue(newTransaction);

      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({
          title: 'Groceries',
          amount: 50.5,
          date: '2026-07-15',
        });

      expect(response.status).toBe(201);
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'USD',
          }),
        })
      );
    });

    it('should reject empty title', async () => {
      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({ title: '', amount: 50, date: '2026-07-15' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject amount <= 0', async () => {
      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({ title: 'Test', amount: 0, date: '2026-07-15' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('greater than 0');
    });

    it('should reject invalid amount (non-numeric)', async () => {
      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({ title: 'Test', amount: 'abc', date: '2026-07-15' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('number');
    });

    it('should reject future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({
          title: 'Test',
          amount: 50,
          date: futureDate.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('future');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({ title: 'Test', amount: 50, date: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('valid');
    });

    it('should reject invalid currency', async () => {
      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({
          title: 'Test',
          amount: 50,
          date: '2026-07-15',
          currency: 'INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ISO 4217');
    });

    it('should reject non-existent category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({
          title: 'Test',
          amount: 50,
          date: '2026-07-15',
          category_id: 'nonexistent',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Category not found');
    });

    it('should reject category not owned by user', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        user_id: 'other-user',
      });

      const response = await request(app)
        .post('/api/transactions?authenticated=true')
        .send({
          title: 'Test',
          amount: 50,
          date: '2026-07-15',
          category_id: 'cat-1',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put('/api/transactions/tx-1')
        .send({ title: 'Updated', amount: 75 });
      expect(response.status).toBe(401);
    });

    it('should update transaction with valid data', async () => {
      const existingTransaction = {
        id: 'tx-1',
        title: 'Groceries',
        amount: 50.5,
        currency: 'USD',
        date: new Date('2026-07-15'),
        notes: null,
        user_id: 'user-123',
        category_id: null,
      };

      const updatedTransaction = {
        id: 'tx-1',
        title: 'Updated Groceries',
        amount: 75.5,
        currency: 'USD',
        date: '2026-07-15T00:00:00.000Z',
        notes: null,
        user_id: 'user-123',
        category_id: null,
      };

      prisma.transaction.findUnique.mockResolvedValue(existingTransaction);
      prisma.transaction.update.mockResolvedValue(updatedTransaction);

      const response = await request(app)
        .put('/api/transactions/tx-1?authenticated=true')
        .send({
          title: 'Updated Groceries',
          amount: 75.5,
          currency: 'USD',
          date: '2026-07-15',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedTransaction);
    });

    it('should return 404 if transaction not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/transactions/nonexistent?authenticated=true')
        .send({ title: 'Updated', amount: 75, date: '2026-07-15' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Transaction not found');
    });

    it('should return 403 if user does not own transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'other-user',
      });

      const response = await request(app)
        .put('/api/transactions/tx-1?authenticated=true')
        .send({ title: 'Updated', amount: 75, date: '2026-07-15', currency: 'USD' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject invalid amount in update', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'user-123',
      });

      const response = await request(app)
        .put('/api/transactions/tx-1?authenticated=true')
        .send({ title: 'Test', amount: -10, date: '2026-07-15', currency: 'USD' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('greater than 0');
    });

    it('should reject future date in update', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'user-123',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const response = await request(app)
        .put('/api/transactions/tx-1?authenticated=true')
        .send({
          title: 'Test',
          amount: 50,
          date: futureDate.toISOString(),
          currency: 'USD',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('future');
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).delete('/api/transactions/tx-1');
      expect(response.status).toBe(401);
    });

    it('should delete transaction owned by user', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'user-123',
      });
      prisma.transaction.delete.mockResolvedValue({ id: 'tx-1' });

      const response = await request(app).delete('/api/transactions/tx-1?authenticated=true');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Transaction deleted successfully' });
      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
      });
    });

    it('should return 404 if transaction not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      const response = await request(app).delete('/api/transactions/nonexistent?authenticated=true');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Transaction not found');
    });

    it('should return 403 if user does not own transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx-1',
        user_id: 'other-user',
      });

      const response = await request(app).delete('/api/transactions/tx-1?authenticated=true');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });
  });
});

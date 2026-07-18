const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../../src/utils/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { prisma } = require('../../src/utils/prisma');
const categoryRoutes = require('../../src/routes/categories');

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

  // Mock middleware to set user
  app.use((req, res, next) => {
    if (req.query.authenticated === 'true') {
      req.isAuthenticated = () => true;
      req.user = { id: 'user-123' };
    } else {
      req.isAuthenticated = () => false;
    }
    next();
  });

  app.use('/api/categories', categoryRoutes);
  return app;
};

describe('Categories Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /api/categories', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/categories');
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return categories for authenticated user', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Food', user_id: 'user-123' },
        { id: 'cat-2', name: 'Transport', user_id: 'user-123' },
      ];
      prisma.category.findMany.mockResolvedValue(mockCategories);

      const response = await request(app).get('/api/categories?authenticated=true');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });

  describe('POST /api/categories', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/categories').send({ name: 'Food' });
      expect(response.status).toBe(401);
    });

    it('should create category for authenticated user', async () => {
      const newCategory = { id: 'cat-1', name: 'Food', user_id: 'user-123' };
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(newCategory);

      const response = await request(app)
        .post('/api/categories?authenticated=true')
        .send({ name: 'Food' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newCategory);
    });

    it('should reject empty name', async () => {
      const response = await request(app)
        .post('/api/categories?authenticated=true')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).put('/api/categories/cat-1').send({ name: 'New Name' });
      expect(response.status).toBe(401);
    });

    it('should update category for authenticated user', async () => {
      const existingCategory = { id: 'cat-1', name: 'Food', user_id: 'user-123' };
      const updatedCategory = { id: 'cat-1', name: 'Groceries', user_id: 'user-123' };

      prisma.category.findUnique.mockResolvedValueOnce(existingCategory).mockResolvedValueOnce(null);
      prisma.category.update.mockResolvedValue(updatedCategory);

      const response = await request(app)
        .put('/api/categories/cat-1?authenticated=true')
        .send({ name: 'Groceries' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedCategory);
    });

    it('should return 404 for nonexistent category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/categories/nonexistent?authenticated=true')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).delete('/api/categories/cat-1');
      expect(response.status).toBe(401);
    });

    it('should delete empty category', async () => {
      const categoryWithoutTransactions = {
        id: 'cat-1',
        name: 'Food',
        user_id: 'user-123',
        transactions: [],
      };

      prisma.category.findUnique.mockResolvedValue(categoryWithoutTransactions);
      prisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      const response = await request(app).delete('/api/categories/cat-1?authenticated=true');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Category deleted successfully' });
    });

    it('should reject deletion if category has transactions', async () => {
      const categoryWithTransactions = {
        id: 'cat-1',
        name: 'Food',
        user_id: 'user-123',
        transactions: [{ id: 'tx-1' }],
      };

      prisma.category.findUnique.mockResolvedValue(categoryWithTransactions);

      const response = await request(app).delete('/api/categories/cat-1?authenticated=true');

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('transactionCount', 1);
    });
  });
});

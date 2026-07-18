const { getCategories, createCategory, updateCategory, deleteCategory } = require('../../src/controllers/categoryController');

// Mock Prisma
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

describe('Category Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return list of user categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Food', user_id: 'user-123' },
        { id: 'cat-2', name: 'Transport', user_id: 'user-123' },
      ];

      prisma.category.findMany.mockResolvedValue(mockCategories);

      const req = { user: { id: 'user-123' } };
      const res = { json: jest.fn() };

      await getCategories(req, res);

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        orderBy: { created_at: 'asc' },
      });
      expect(res.json).toHaveBeenCalledWith(mockCategories);
    });

    it('should handle errors gracefully', async () => {
      prisma.category.findMany.mockRejectedValue(new Error('DB error'));

      const req = { user: { id: 'user-123' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch categories' });
    });
  });

  describe('createCategory', () => {
    it('should create category with valid name', async () => {
      const mockCategory = { id: 'cat-1', name: 'Food', user_id: 'user-123' };
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory);

      const req = {
        user: { id: 'user-123' },
        body: { name: 'Food' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCategory);
    });

    it('should reject empty name', async () => {
      const req = {
        user: { id: 'user-123' },
        body: { name: '' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category name is required and must be non-empty' });
    });

    it('should reject duplicate category name', async () => {
      const existingCategory = { id: 'cat-1', name: 'Food', user_id: 'user-123' };
      prisma.category.findUnique.mockResolvedValue(existingCategory);

      const req = {
        user: { id: 'user-123' },
        body: { name: 'Food' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category with this name already exists' });
    });

    it('should reject name longer than 100 characters', async () => {
      const req = {
        user: { id: 'user-123' },
        body: { name: 'A'.repeat(101) },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category name must be 100 characters or less' });
    });
  });

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const existingCategory = { id: 'cat-1', name: 'Food', user_id: 'user-123' };
      const updatedCategory = { id: 'cat-1', name: 'Groceries', user_id: 'user-123' };

      prisma.category.findUnique.mockResolvedValueOnce(existingCategory).mockResolvedValueOnce(null);
      prisma.category.update.mockResolvedValue(updatedCategory);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'cat-1' },
        body: { name: 'Groceries' },
      };
      const res = { json: jest.fn() };

      await updateCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedCategory);
    });

    it('should return 404 if category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'nonexistent' },
        body: { name: 'New Name' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });

    it('should return 403 if user does not own category', async () => {
      const otherUserCategory = { id: 'cat-1', name: 'Food', user_id: 'other-user' };
      prisma.category.findUnique.mockResolvedValue(otherUserCategory);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'cat-1' },
        body: { name: 'New Name' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('deleteCategory', () => {
    it('should delete empty category', async () => {
      const categoryWithoutTransactions = {
        id: 'cat-1',
        name: 'Food',
        user_id: 'user-123',
        transactions: [],
      };

      prisma.category.findUnique.mockResolvedValue(categoryWithoutTransactions);
      prisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      const req = {
        user: { id: 'user-123' },
        params: { id: 'cat-1' },
      };
      const res = { json: jest.fn() };

      await deleteCategory(req, res);

      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
      expect(res.json).toHaveBeenCalledWith({ message: 'Category deleted successfully' });
    });

    it('should reject deletion if category has transactions', async () => {
      const categoryWithTransactions = {
        id: 'cat-1',
        name: 'Food',
        user_id: 'user-123',
        transactions: [{ id: 'tx-1' }, { id: 'tx-2' }],
      };

      prisma.category.findUnique.mockResolvedValue(categoryWithTransactions);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'cat-1' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot delete category with existing transactions. Please reassign or delete transactions first.',
        transactionCount: 2,
      });
    });

    it('should return 403 if user does not own category', async () => {
      const otherUserCategory = {
        id: 'cat-1',
        name: 'Food',
        user_id: 'other-user',
        transactions: [],
      };

      prisma.category.findUnique.mockResolvedValue(otherUserCategory);

      const req = {
        user: { id: 'user-123' },
        params: { id: 'cat-1' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});

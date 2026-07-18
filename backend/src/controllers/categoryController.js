const { prisma } = require('../utils/prisma');
const { logger } = require('../utils/logger');

const getCategories = async (req, res) => {
  try {
    logger.api.request('GET', '/api/categories', req.user.id);
    const categories = await prisma.category.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'asc' },
    });

    logger.api.response('GET', '/api/categories', 200, req.user.id);
    res.json(categories);
  } catch (error) {
    logger.crud.error('READ', 'Categories', req.user.id, error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    logger.api.request('POST', '/api/categories', req.user.id);
    const { name } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      logger.warn('[CRUD] Invalid category name provided');
      return res.status(400).json({ error: 'Category name is required and must be non-empty' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      logger.warn('[CRUD] Category name too long', { length: trimmedName.length });
      return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }

    // Check for duplicate
    const existing = await prisma.category.findUnique({
      where: { user_id_name: { user_id: req.user.id, name: trimmedName } },
    });

    if (existing) {
      logger.warn('[CRUD] Category already exists', { categoryName: trimmedName, userId: req.user.id });
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        user_id: req.user.id,
      },
    });

    logger.crud.create('Category', category.id, req.user.id);
    logger.api.response('POST', '/api/categories', 201, req.user.id);
    res.status(201).json(category);
  } catch (error) {
    logger.crud.error('CREATE', 'Category', req.user.id, error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  try {
    logger.api.request('PUT', `/api/categories/${req.params.id}`, req.user.id);
    const { id } = req.params;
    const { name } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required and must be non-empty' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }

    // Verify ownership
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      logger.warn('[CRUD] Category not found', { categoryId: id });
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.user_id !== req.user.id) {
      logger.warn('[CRUD] Unauthorized category update attempt', { categoryId: id, attemptedBy: req.user.id });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check for duplicate with other categories
    if (category.name !== trimmedName) {
      const existing = await prisma.category.findUnique({
        where: { user_id_name: { user_id: req.user.id, name: trimmedName } },
      });

      if (existing) {
        return res.status(409).json({ error: 'Category with this name already exists' });
      }
    }

    // Update category
    const updated = await prisma.category.update({
      where: { id },
      data: { name: trimmedName },
    });

    logger.crud.update('Category', id, req.user.id);
    logger.api.response('PUT', `/api/categories/${id}`, 200, req.user.id);
    res.json(updated);
  } catch (error) {
    logger.crud.error('UPDATE', 'Category', req.user.id, error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    logger.api.request('DELETE', `/api/categories/${req.params.id}`, req.user.id);
    const { id } = req.params;

    // Verify ownership and get category
    const category = await prisma.category.findUnique({
      where: { id },
      include: { transactions: { select: { id: true } } },
    });

    if (!category) {
      logger.warn('[CRUD] Category not found for deletion', { categoryId: id });
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.user_id !== req.user.id) {
      logger.warn('[CRUD] Unauthorized category deletion attempt', { categoryId: id, attemptedBy: req.user.id });
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if category has transactions
    if (category.transactions && category.transactions.length > 0) {
      logger.warn('[CRUD] Cannot delete category with transactions', {
        categoryId: id,
        transactionCount: category.transactions.length,
      });
      return res.status(409).json({
        error: 'Cannot delete category with existing transactions. Please reassign or delete transactions first.',
        transactionCount: category.transactions.length,
      });
    }

    // Delete category
    await prisma.category.delete({
      where: { id },
    });

    logger.crud.delete('Category', id, req.user.id);
    logger.api.response('DELETE', `/api/categories/${id}`, 200, req.user.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    logger.crud.error('DELETE', 'Category', req.user.id, error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };

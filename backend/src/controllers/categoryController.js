const { prisma } = require('../utils/prisma');

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required and must be non-empty' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }

    // Check for duplicate
    const existing = await prisma.category.findUnique({
      where: { user_id_name: { user_id: req.user.id, name: trimmedName } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        user_id: req.user.id,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error.message);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  try {
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
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.user_id !== req.user.id) {
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

    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error.message);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership and get category
    const category = await prisma.category.findUnique({
      where: { id },
      include: { transactions: { select: { id: true } } },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if category has transactions
    if (category.transactions && category.transactions.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete category with existing transactions. Please reassign or delete transactions first.',
        transactionCount: category.transactions.length,
      });
    }

    // Delete category
    await prisma.category.delete({
      where: { id },
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error.message);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };

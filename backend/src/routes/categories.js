const express = require('express');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// All category endpoints require authentication
router.use(isAuthenticated);

// GET /api/categories - list user's categories
router.get('/', getCategories);

// POST /api/categories - create new category
router.post('/', createCategory);

// PUT /api/categories/:id - update category name
router.put('/:id', updateCategory);

// DELETE /api/categories/:id - delete category
router.delete('/:id', deleteCategory);

module.exports = router;

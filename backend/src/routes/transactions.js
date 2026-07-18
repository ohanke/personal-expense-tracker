const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

const router = express.Router();

router.get('/', isAuthenticated, getTransactions);
router.post('/', isAuthenticated, createTransaction);
router.put('/:id', isAuthenticated, updateTransaction);
router.delete('/:id', isAuthenticated, deleteTransaction);

module.exports = router;

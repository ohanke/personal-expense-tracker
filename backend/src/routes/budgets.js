const express = require('express');
const router = express.Router();
const {
  getBudget,
  createOrUpdateBudget,
  getBudgetSummary,
} = require('../controllers/budgetController');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

router.get('/:month', getBudget);
router.post('/', createOrUpdateBudget);
router.get('/:month/summary', getBudgetSummary);

module.exports = router;

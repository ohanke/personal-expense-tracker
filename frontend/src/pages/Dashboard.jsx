import { useEffect, useState } from 'react';
import { budgetAPI } from '../services/api';
import CategoriesManager from '../components/CategoriesManager';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [formAmount, setFormAmount] = useState('');

  const [showCategoriesManager, setShowCategoriesManager] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchBudgetSummary();
  }, [currentMonth, refreshTrigger]);

  const fetchBudgetSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await budgetAPI.getBudgetSummary(currentMonth);
      setBudgetData(data);
    } catch (err) {
      setError(err.message);
      setBudgetData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    const [year, month] = currentMonth.split('-');
    const date = new Date(year, parseInt(month) - 1 - 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-');
    const date = new Date(year, parseInt(month) + 1 - 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!formAmount || parseFloat(formAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setError(null);
      await budgetAPI.setBudget(currentMonth, parseFloat(formAmount));
      setFormAmount('');
      setShowBudgetForm(false);
      await fetchBudgetSummary();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
  };

  const handleTransactionSuccess = () => {
    setEditingTransaction(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRefreshBudget = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
      <div className="w-full flex flex-col items-center space-y-8">
        {error && (
            <div className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-xl">
              <p className="text-red-600 text-sm font-semibold text-center">{error}</p>
            </div>
        )}

        {/* Header z miesiącem */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
          <button
              onClick={handlePreviousMonth}
              className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all"
          >
            ← Previous
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 min-w-[200px] text-center">
            {formatMonth(currentMonth)}
          </h2>
          <button
              onClick={handleNextMonth}
              className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all"
          >
            Next →
          </button>
        </div>

        {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-500 font-medium">Loading data...</p>
            </div>
        ) : budgetData && budgetData.budgetAmount ? (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Karta Budżetu */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Spent</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(budgetData.spent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Budget</p>
                    <p className="text-2xl font-bold text-slate-600 mt-1">
                      {formatCurrency(budgetData.budgetAmount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <p className="text-slate-600 text-sm font-medium">Budget Usage</p>
                    <p className="text-slate-900 font-bold">
                      {budgetData.percentageUsed.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all ${
                            budgetData.percentageUsed < 80 ? 'bg-slate-800' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(budgetData.percentageUsed, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Remaining</p>
                  <p
                      className={`text-2xl font-bold ${
                          budgetData.remaining >= 0 ? 'text-slate-900' : 'text-red-600'
                      }`}
                  >
                    {formatCurrency(budgetData.remaining)}
                  </p>
                </div>
              </div>

              {/* Karta Ustawień */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col justify-center">
                <h3 className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider">Budget Settings</h3>
                {showBudgetForm ? (
                    <form onSubmit={handleSetBudget} className="space-y-4">
                      <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-900 font-medium focus:border-slate-800 focus:outline-none transition-colors"
                          autoFocus
                      />
                      <div className="flex gap-3">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
                        >
                          Save
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                              setShowBudgetForm(false);
                              setFormAmount('');
                            }}
                            className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                ) : (
                    <button
                        onClick={() => setShowBudgetForm(true)}
                        className="w-full px-4 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
                    >
                      Update Budget
                    </button>
                )}
              </div>
            </div>
        ) : (
            <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                No Budget Set
              </h3>
              <p className="text-slate-500 mb-8 font-medium">
                Set up a budget to start tracking your expenses.
              </p>
              <button
                  onClick={() => setShowBudgetForm(true)}
                  className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
              >
                Set Budget Now
              </button>
            </div>
        )}

        {/* Sekcja transakcji */}
        <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <div className="flex flex-wrap gap-4 mb-8">
            <button
                onClick={() => {
                  setEditingTransaction(null);
                  setShowTransactionForm(true);
                }}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-all"
            >
              + Add Transaction
            </button>
            <button
                onClick={() => setShowCategoriesManager(true)}
                className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
            >
              Manage Categories
            </button>
          </div>

          <TransactionList
              month={currentMonth}
              onEdit={handleEditTransaction}
              onRefreshBudget={handleRefreshBudget}
              refreshTrigger={refreshTrigger}
          />
        </div>

        <CategoriesManager
            isOpen={showCategoriesManager}
            onClose={() => setShowCategoriesManager(false)}
            onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
        />

        <TransactionForm
            isOpen={showTransactionForm}
            onClose={() => {
              setShowTransactionForm(false);
              setEditingTransaction(null);
            }}
            onSuccess={handleTransactionSuccess}
            transactionToEdit={editingTransaction}
            month={currentMonth}
        />
      </div>
  );
}
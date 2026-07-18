import { useEffect, useState } from 'react';
import { budgetAPI } from '../services/api';

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

  useEffect(() => {
    fetchBudgetSummary();
  }, [currentMonth]);

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
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handlePreviousMonth}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Previous
        </button>
        <h2 className="text-2xl font-bold text-gray-900 min-w-48 text-center">
          {formatMonth(currentMonth)}
        </h2>
        <button
          onClick={handleNextMonth}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Next →
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading budget data...</p>
        </div>
      ) : budgetData && budgetData.budgetAmount ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-gray-600 text-sm font-medium">Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(budgetData.spent)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">Budget</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(budgetData.budgetAmount)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Usage</p>
                <p className="text-gray-900 font-semibold">
                  {budgetData.percentageUsed.toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    budgetData.percentageUsed < 50
                      ? 'bg-green-500'
                      : budgetData.percentageUsed < 80
                      ? 'bg-yellow-500'
                      : budgetData.percentageUsed < 100
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(budgetData.percentageUsed, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-gray-600 text-sm font-medium mb-2">Remaining</p>
              <p
                className={`text-3xl font-bold ${
                  budgetData.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(budgetData.remaining)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Settings</h3>
            {showBudgetForm ? (
              <form onSubmit={handleSetBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Budget Amount (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBudgetForm(false);
                      setFormAmount('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowBudgetForm(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Update Budget
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Budget Set for {formatMonth(currentMonth)}
            </h3>
            <p className="text-gray-600 mb-6">
              Set up a budget to start tracking your expenses and receiving alerts.
            </p>
            <button
              onClick={() => setShowBudgetForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Set Budget Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

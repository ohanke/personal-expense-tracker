import { useEffect, useState } from 'react';
import { transactionAPI, categoryAPI } from '../services/api';

const LIMIT = 10;

export default function TransactionList({ month, onEdit, onRefreshBudget, refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateRange, setDateRange] = useState('this-month');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [month, search, selectedCategory, dateRange, customDateFrom, customDateTo, amountMin, amountMax, refreshTrigger]);

  useEffect(() => {
    fetchTransactions();
  }, [month, search, selectedCategory, dateRange, customDateFrom, customDateTo, amountMin, amountMax, offset, refreshTrigger]);

  const fetchCategories = async () => {
    try {
      const data = await categoryAPI.getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const getDateRange = () => {
    const [year, monthNum] = month.split('-');
    const y = parseInt(year);
    const m = parseInt(monthNum);

    let from, to;
    if (dateRange === 'this-month') {
      from = new Date(y, m - 1, 1).toISOString().split('T')[0];
      to = new Date(y, m, 0).toISOString().split('T')[0];
    } else if (dateRange === 'last-month') {
      from = new Date(y, m - 2, 1).toISOString().split('T')[0];
      to = new Date(y, m - 1, 0).toISOString().split('T')[0];
    } else if (dateRange === 'custom') {
      from = customDateFrom;
      to = customDateTo;
    } else {
      from = undefined;
      to = undefined;
    }

    return { from, to };
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getDateRange();
      const filters = {
        search: search || undefined,
        category: selectedCategory || undefined,
        dateFrom: from,
        dateTo: to,
        amountMin: amountMin || undefined,
        amountMax: amountMax || undefined,
        limit: LIMIT + 1,
        offset,
      };

      const data = await transactionAPI.getTransactions(filters);
      const items = data.data || [];

      if (items.length > LIMIT) {
        setTransactions(items.slice(0, LIMIT));
        setHasMore(true);
      } else {
        setTransactions(items);
        setHasMore(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;

    try {
      setError(null);
      await transactionAPI.deleteTransaction(id);
      await fetchTransactions();
      onRefreshBudget?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePrevious = () => {
    setOffset(Math.max(0, offset - LIMIT));
  };

  const handleNext = () => {
    setOffset(offset + LIMIT);
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return '—';
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : '—';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title or notes..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
          >
            <option value="">All dates</option>
            <option value="this-month">This month</option>
            <option value="last-month">Last month</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex gap-2">
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              placeholder="From"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
            />
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              placeholder="To"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Min Amount</label>
          <input
            type="number"
            step="0.01"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Max Amount</label>
          <input
            type="number"
            step="0.01"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            placeholder="9999.99"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-slate-300 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No transactions found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{tx.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getCategoryName(tx.category_id)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center space-x-1">
                      <button
                        onClick={() => onEdit(tx)}
                        className="inline-block px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="inline-block px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handlePrevious}
              disabled={offset === 0}
              className="px-4 py-2 bg-slate-200 text-gray-900 rounded-lg font-medium hover:bg-slate-300 transition-colors disabled:bg-slate-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-600">
              Showing {offset + 1}–{offset + transactions.length}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasMore}
              className="px-4 py-2 bg-slate-200 text-gray-900 rounded-lg font-medium hover:bg-slate-300 transition-colors disabled:bg-slate-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

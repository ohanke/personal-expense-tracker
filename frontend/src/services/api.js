const API_BASE = 'http://localhost:3000';

const request = async (endpoint, options = {}) => {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

export const authAPI = {
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  loginGoogle: () => {
    window.location.href = `${API_BASE}/auth/google`;
  },
  loginGitHub: () => {
    window.location.href = `${API_BASE}/auth/github`;
  },
};

export const budgetAPI = {
  getBudgetSummary: (month) => request(`/api/budgets/${month}/summary`),
  setBudget: (month, amount) =>
    request('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ month, amount }),
    }),
};

export const categoryAPI = {
  getCategories: () => request('/api/categories'),
  createCategory: (name) =>
    request('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateCategory: (id, name) =>
    request(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteCategory: (id) =>
    request(`/api/categories/${id}`, {
      method: 'DELETE',
    }),
};

const buildQueryString = (params) => {
  const filtered = Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (filtered.length === 0) return '';
  return '?' + filtered.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
};

export const transactionAPI = {
  getTransactions: (filters = {}) => {
    const { search, category, dateFrom, dateTo, amountMin, amountMax, limit = 10, offset = 0 } = filters;
    const query = buildQueryString({
      search: search || undefined,
      category: category || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      amountMin: amountMin || undefined,
      amountMax: amountMax || undefined,
      limit,
      offset,
    });
    return request(`/api/transactions${query}`);
  },
  createTransaction: (data) =>
    request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTransaction: (id, data) =>
    request(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id) =>
    request(`/api/transactions/${id}`, {
      method: 'DELETE',
    }),
};

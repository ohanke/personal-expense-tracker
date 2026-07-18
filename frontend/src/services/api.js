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

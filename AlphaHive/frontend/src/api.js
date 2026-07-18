import axios from 'axios';

export const api = axios.create({ baseURL: '' });

const enc = (handle) => encodeURIComponent(handle);

export const profileApi = {
  get: (handle) => api.get(`/api/profile/${enc(handle)}`),
  save: (body) => api.post('/api/profile', body),
  analyze: (scores) => api.post('/api/profile/analyze', scores),
  reset: (handle) => api.post(`/api/profile/${enc(handle)}/reset`),
  completeOnboarding: (handle) => api.post(`/api/profile/${enc(handle)}/complete-onboarding`),
  brands: (category) => api.get('/api/profile/meta/brands', { params: { category } }),
  smartPortfolio: (body) => api.post('/api/profile/smart-portfolio', body),
  validateHoldings: (holdings) => api.post('/api/profile/validate-holdings', { holdings }),
  simulation: (handle, portfolioName) =>
    api.get(`/api/profile/${enc(handle)}/simulation`, { params: { portfolio_name: portfolioName } }),
};

export const portfolioApi = {
  list: (handle) => api.get(`/api/portfolios/${enc(handle)}`),
  get: (handle, name) => api.get(`/api/portfolios/${enc(handle)}/${encodeURIComponent(name)}`),
  save: (handle, name, holdings) =>
    api.post(`/api/portfolios/${enc(handle)}`, { name, holdings }),
  remove: (handle, name) => api.delete(`/api/portfolios/${enc(handle)}/${encodeURIComponent(name)}`),
};

export const marketApi = {
  analysis: (ticker, opts = {}) =>
    api.get(`/api/market/analysis/${encodeURIComponent(ticker)}`, { params: opts }),
  tickers: (category) => api.get('/api/market/tickers', { params: { category } }),
  stars: (category, period) => api.get('/api/market/stars', { params: { category, period } }),
  quotes: (tickers) => api.get('/api/market/quotes', { params: { tickers: tickers.join(',') } }),
  pdfUrl: (ticker) => `/api/market/snapshot/${encodeURIComponent(ticker)}/pdf`,
  correlation: (tickers) => api.post('/api/market/analytics/correlation', { tickers }),
  rebalance: (tickers, quantities, mode = 'safety') =>
    api.post('/api/market/analytics/rebalance', { tickers, quantities, mode }),
  portfolioVisuals: (tickers, holdings) =>
    api.post('/api/market/analytics/portfolio-visuals', { tickers, holdings }),
};

export const forecastApi = {
  list: (handle, live = true) => api.get(`/api/forecasts/${enc(handle)}`, { params: { live } }),
  save: (body) => api.post('/api/forecasts', body),
  remove: (handle, timestamps) => api.post(`/api/forecasts/${enc(handle)}/delete`, { user_handle: handle, timestamps }),
  generate: (body) => api.post('/api/forecasts/generate', body),
};

export const shadowApi = {
  user: (handle) => api.get(`/api/shadow/${enc(handle)}`),
  market: () => api.get('/api/shadow/market'),
  sectorFlow: () => api.get('/api/shadow/live/sector-flow'),
  trap: () => api.get('/api/shadow/live/trap-indicator'),
  sector: (name) => api.get(`/api/shadow/live/sector/${encodeURIComponent(name)}/accumulation`),
  stock: (ticker) => api.get(`/api/shadow/live/stock/${encodeURIComponent(ticker)}/scan`),
  sectors: () => api.get('/api/shadow/sectors'),
};

export const calendarApi = {
  overview: (year) => api.get('/api/calendar/overview', { params: { year } }),
  ticker: (ticker, mode, excludeOutliers) =>
    api.get(`/api/calendar/ticker/${encodeURIComponent(ticker)}`, {
      params: { mode, exclude_outliers: excludeOutliers },
    }),
};

export const brainApi = {
  agents: (platform) => api.get('/api/brain/agents', { params: { platform } }),
  memory: (handle) => api.get('/api/brain/memory', { params: handle ? { user_handle: handle } : {} }),
  autonomy: () => api.get('/api/brain/autonomy'),
};

export const healthApi = {
  overview: () => api.get('/api/health/overview'),
  workflows: () => api.get('/api/health/workflows'),
  engagement: () => api.get('/api/health/engagement'),
  errors: () => api.get('/api/health/errors'),
};

export const reportsApi = {
  list: (handle) => api.get(`/api/reports/${enc(handle)}`),
  downloadUrl: (handle, filename) => `/api/reports/${enc(handle)}/${encodeURIComponent(filename)}`,
};

export const analyzeApi = {
  run: (tickers, handle, holdings = null) => api.post('/api/analyze', {
    tickers,
    discoverable_handle: handle,
    holdings: holdings || undefined,
  }),
  status: (taskId) => api.get(`/api/analyze/status/${taskId}`),
};


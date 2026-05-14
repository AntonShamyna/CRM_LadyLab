import { useAuthStore, AuthUser } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
  ) {
    super(typeof payload === 'object' && payload && 'message' in payload ? String(payload.message) : 'API error');
  }
}

type RequestOptions = RequestInit & { skipRefresh?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken, refreshToken, setSession, clearSession } = useAuthStore.getState();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && refreshToken && !options.skipRefresh) {
    try {
      const refreshed = await request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipRefresh: true,
      });
      setSession(refreshed);
      return request<T>(path, options);
    } catch {
      clearSession();
    }
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }
  return payload as T;
}

export const api = {
  login: (body: { login: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      skipRefresh: true,
    }),
  me: () => request<AuthUser>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  dashboard: () => request<DashboardResponse>('/dashboard'),
  orders: (query = '') => request<ListResponse<Order>>(`/orders${query}`),
  order: (id: string) => request<Order>(`/orders/${id}`),
  createOrder: (body: unknown) => request<{ order: Order; warnings: StockWarning[] }>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  sendOrder: (id: string, comment?: string) =>
    request<{ order: Order; warnings: StockWarning[] }>(`/orders/${id}/send`, { method: 'POST', body: JSON.stringify({ comment }) }),
  paidOrder: (id: string) => request<Order>(`/orders/${id}/paid`, { method: 'POST', body: JSON.stringify({}) }),
  returnOrder: (id: string, body: { stockAction: 'RETURN_TO_STOCK' | 'WRITE_OFF'; comment?: string }) =>
    request<Order>(`/orders/${id}/return`, { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder: (id: string) => request<Order>(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) }),
  customers: (query = '') => request<ListResponse<Customer>>(`/customers${query}`),
  customer: (id: string) => request<Customer>(`/customers/${id}`),
  createCustomer: (body: Partial<Customer>) => request<Customer>('/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id: string, body: Partial<Customer>) => request<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  customerOrders: (id: string) => request<Order[]>(`/customers/${id}/orders`),
  customerStats: (id: string) => request<CustomerStats>(`/customers/${id}/statistics`),
  products: (query = '') => request<ListResponse<Product>>(`/products${query}`),
  product: (id: string) => request<Product>(`/products/${id}`),
  createProduct: (body: Partial<Product>) => request<Product>('/products', { method: 'POST', body: JSON.stringify(body) }),
  productBatches: (id: string) => request<ProductBatch[]>(`/products/${id}/batches`),
  createBatch: (id: string, body: Partial<ProductBatch>) =>
    request<ProductBatch>(`/products/${id}/batches`, { method: 'POST', body: JSON.stringify(body) }),
  reminders: (query = '') => request<ListResponse<Reminder>>(`/reminders${query}`),
  createReminder: (body: Partial<Reminder>) => request<Reminder>('/reminders', { method: 'POST', body: JSON.stringify(body) }),
  expenses: (query = '') => request<ListResponse<Expense>>(`/expenses${query}`),
  createExpense: (body: Partial<Expense>) => request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  analyticsSummary: (query = '') => request<AnalyticsSummary>(`/analytics/summary${query}`),
  analyticsProducts: (query = '') => request<ProductAnalyticsRow[]>(`/analytics/products${query}`),
  users: () => request<User[]>('/users'),
  createUser: (body: { login: string; password: string; role: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
};

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  city: string;
  address: string;
  birthDate?: string;
  note?: string;
  personalDiscountPercent: number;
  isRegular: boolean;
  isBlacklisted: boolean;
  ordersCount?: number;
  totalOrdersKopecks?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  volume: number;
  unit: 'G' | 'ML' | 'KG' | 'PCS';
  salePriceKopecks: number;
  aroma?: string;
  color?: string;
  description?: string;
  batches?: ProductBatch[];
  totalStock?: number;
  nearestExpirationDate?: string;
  profitKopecks?: number;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  stockQuantity: number;
  costPriceKopecks: number;
  expirationDate: string;
  productionDate?: string;
  comment?: string;
}

export interface OrderItem {
  id: string;
  productNameSnapshot: string;
  batchNumberSnapshot: string;
  quantity: number;
  salePriceSnapshotKopecks: number;
  costPriceSnapshotKopecks: number;
  lineTotalKopecks: number;
}

export interface Order {
  id: string;
  status: 'ON_ASSEMBLY' | 'AWAITING_PAYMENT' | 'CLOSED' | 'RETURNED' | 'CANCELLED';
  customer: Customer;
  items: OrderItem[];
  deliveryService: string;
  deliveryPriceKopecks: number;
  paymentMethod: string;
  discountPercent: number;
  productsTotalAfterDiscountKopecks: number;
  totalToPayKopecks: number;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  returnedAt?: string;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  remindAt: string;
  status: 'ACTIVE' | 'DONE' | 'CANCELLED';
  customer?: Customer;
}

export interface Expense {
  id: string;
  year: number;
  month: number;
  category: string;
  amountKopecks: number;
  comment?: string;
}

export interface User {
  id: string;
  login: string;
  role: string;
  isActive: boolean;
}

export interface StockWarning {
  batchId: string;
  batchNumber: string;
  requested: number;
  available: number;
  deficit: number;
}

export interface DashboardResponse {
  currentDate: string;
  revenueTodayKopecks: number;
  revenueMonthKopecks: number;
  queueOrders: Order[];
  reminders: Reminder[];
}

export interface AnalyticsSummary {
  ordersCount: number;
  returnsCount: number;
  goodsRevenueKopecks: number;
  deliveryRevenueKopecks: number;
  totalToPayKopecks: number;
  costKopecks: number;
  grossProfitKopecks: number;
  expensesKopecks: number;
  netProfitKopecks: number;
  averageCheckKopecks: number;
  newCustomersCount: number;
  repeatOrdersCount: number;
}

export interface ProductAnalyticsRow {
  productName: string;
  soldQuantity: number;
  salesKopecks: number;
  costKopecks: number;
  profitKopecks: number;
  ordersCount: number;
}

export interface CustomerStats {
  ordersCount: number;
  averageCheckKopecks: number;
  totalKopecks: number;
  returnsCount: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
}

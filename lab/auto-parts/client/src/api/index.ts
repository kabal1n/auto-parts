import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// Auth
export const authApi = {
  login: (login: string, password: string) => api.post('/auth/login', { login, password }),
  me: () => api.get('/auth/me'),
};

// Products
export const productsApi = {
  list: (params?: Record<string, string>) => api.get('/products', { params }),
  get: (id: number) => api.get(`/products/${id}`),
  byBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  create: (data: unknown) => api.post('/products', data),
  update: (id: number, data: unknown) => api.put(`/products/${id}`, data),
  remove: (id: number) => api.delete(`/products/${id}`),
};

// Lookups (Category, Manufacturer, Unit)
export interface LookupOption { id: number; name: string; markup_percent?: number; }
export const lookupsApi = {
  categories: () => api.get<LookupOption[]>('/lookups/categories'),
  addCategory: (name: string) => api.post<LookupOption>('/lookups/categories', { name }),
  updateCategory: (id: number, name: string) => api.put<LookupOption>(`/lookups/categories/${id}`, { name }),
  deleteCategory: (id: number) => api.delete(`/lookups/categories/${id}`),
  manufacturers: () => api.get<LookupOption[]>('/lookups/manufacturers'),
  addManufacturer: (name: string) => api.post<LookupOption>('/lookups/manufacturers', { name }),
  updateManufacturer: (id: number, name: string) => api.put<LookupOption>(`/lookups/manufacturers/${id}`, { name }),
  deleteManufacturer: (id: number) => api.delete(`/lookups/manufacturers/${id}`),
  units: () => api.get<LookupOption[]>('/lookups/units'),
  addUnit: (name: string) => api.post<LookupOption>('/lookups/units', { name }),
  updateUnit: (id: number, name: string) => api.put<LookupOption>(`/lookups/units/${id}`, { name }),
  deleteUnit: (id: number) => api.delete(`/lookups/units/${id}`),
};

// Stock
export const stockApi = {
  list: (params?: Record<string, string | number>) => api.get('/stock', { params }),
  low: (params?: Record<string, string | number>) => api.get('/stock/low', { params }),
  update: (id: number, data: unknown) => api.put(`/stock/${id}`, data),
  ensure: (store_id: number, product_id: number) => api.post('/stock/ensure', { store_id, product_id }),
};

// Customers
export const customersApi = {
  list: (params?: Record<string, string>) => api.get('/customers', { params }),
  get: (id: number) => api.get(`/customers/${id}`),
  byPhone: (phone: string) => api.get(`/customers/phone/${phone}`),
  create: (data: unknown) => api.post('/customers', data),
  update: (id: number, data: unknown) => api.put(`/customers/${id}`, data),
  addCar: (id: number, data: unknown) => api.post(`/customers/${id}/cars`, data),
  updateCar: (car_id: number, data: unknown) => api.put(`/customers/cars/${car_id}`, data),
  removeCar: (car_id: number) => api.delete(`/customers/cars/${car_id}`),
  statuses: () => api.get('/customers/statuses'),
};

// Sales
export const salesApi = {
  list: (params?: Record<string, string>) => api.get('/sales', { params }),
  get: (id: number) => api.get(`/sales/${id}`),
  create: (data: unknown) => api.post('/sales', data),
};

// Orders
export const ordersApi = {
  list: (params?: Record<string, string>) => api.get('/orders', { params }),
  get: (id: number) => api.get(`/orders/${id}`),
  create: (data: unknown) => api.post('/orders', data),
  statuses: () => api.get('/orders/statuses'),
  setStatus: (id: number, order_status_id: number) => api.patch(`/orders/${id}/status`, { order_status_id }),
  update: (id: number, data: { expected_date?: string | null; notes?: string | null }) =>
    api.patch(`/orders/${id}`, data),
  checkout: (id: number, data: { cash_amount: number; card_amount: number }) =>
    api.post(`/orders/${id}/checkout`, data),
};

// Receipts
export const receiptsApi = {
  list: (params?: Record<string, string>) => api.get('/receipts', { params }),
  get: (id: number) => api.get(`/receipts/${id}`),
  create: (data: unknown) => api.post('/receipts', data),
  upload: (formData: FormData) => api.post('/receipts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  patchItem: (receiptId: number, itemId: number, data: unknown) =>
    api.patch(`/receipts/${receiptId}/items/${itemId}`, data),
  createProduct: (receiptId: number, itemId: number, data: unknown) =>
    api.post(`/receipts/${receiptId}/items/${itemId}/create-product`, data),
  createIssue: (receiptId: number, itemId: number, data: unknown) =>
    api.post(`/receipts/${receiptId}/items/${itemId}/issue`, data),
  patchStatus: (receiptId: number, status: string) =>
    api.patch(`/receipts/${receiptId}/status`, { status }),
  issues: () => api.get('/receipts/issues'),
  resolveIssue: (issueId: number) => api.patch(`/receipts/issues/${issueId}/resolve`),
};

// Suppliers
export interface Supplier {
  supplier_id: number;
  name: string;
  xls_config: {
    startRow: number;
    article: string;
    name: string;
    barcode: string | null;
    manufacturer: string | null;
    quantity: string;
    purchase_price: string;
    supplierNameCells: string[];
    aliases: string[];
  };
}
export const suppliersApi = {
  list: () => api.get<Supplier[]>('/suppliers'),
  create: (data: unknown) => api.post<Supplier>('/suppliers', data),
  update: (id: number, data: unknown) => api.put<Supplier>(`/suppliers/${id}`, data),
  remove: (id: number) => api.delete(`/suppliers/${id}`),
};

// Reorder
export const reorderApi = {
  list: (params?: Record<string, string>) => api.get('/reorder', { params }),
  create: (data: unknown) => api.post('/reorder', data),
  setStatus: (id: number, status: string) => api.patch(`/reorder/${id}/status`, { status }),
  remove: (id: number) => api.delete(`/reorder/${id}`),
};

// Reports
export const reportsApi = {
  sales: (params?: Record<string, string>) => api.get('/reports/sales', { params }),
  stock: (params?: Record<string, string>) => api.get('/reports/stock', { params }),
  exportSales: (params?: Record<string, string>) =>
    api.get('/reports/sales/export', { params, responseType: 'blob' }),
};

// Users
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  remove: (id: number) => api.delete(`/users/${id}`),
  roles: () => api.get('/users/roles'),
};

// Audit log
export const auditApi = {
  list: (params?: Record<string, string>) => api.get('/audit-log', { params }),
};

// Stores
export const storesApi = {
  list: () => api.get('/stores'),
  create: (name: string) => api.post('/stores', { name }),
};

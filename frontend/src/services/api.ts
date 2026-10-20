const API_BASE = '/api';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('erp_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.body instanceof FormData ? {
      ...(localStorage.getItem('erp_token') ? { Authorization: `Bearer ${localStorage.getItem('erp_token')}` } : {})
    } : { ...this.getHeaders(), ...options.headers };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_user');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth
  login = (credentials: any) => this.request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  switchRole = (role: string) => this.request<any>('/auth/switch-role', { method: 'POST', body: JSON.stringify({ role }) });
  getMe = () => this.request<any>('/auth/me');
  getUsers = () => this.request<any>('/auth/users');

  // Dashboard
  getDashboardMetrics = (projectId?: string) => this.request<any>(`/dashboard/metrics${projectId ? `?projectId=${projectId}` : ''}`);

  // Projects
  getProjects = (params: string = '') => this.request<any>(`/projects${params ? `?${params}` : ''}`);
  getProjectById = (id: string) => this.request<any>(`/projects/${id}`);
  createProject = (data: any) => this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) });
  updateProject = (id: string, data: any) => this.request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  createSite = (projectId: string, data: any) => this.request<any>(`/projects/${projectId}/sites`, { method: 'POST', body: JSON.stringify(data) });
  createPhase = (projectId: string, data: any) => this.request<any>(`/projects/${projectId}/phases`, { method: 'POST', body: JSON.stringify(data) });
  createChangeOrder = (projectId: string, data: any) => this.request<any>(`/projects/${projectId}/change-orders`, { method: 'POST', body: JSON.stringify(data) });

  // BOQ
  getBOQ = (projectId: string) => this.request<any>(`/boq/${projectId}`);
  createBOQItem = (projectId: string, data: any) => this.request<any>(`/boq/${projectId}/items`, { method: 'POST', body: JSON.stringify(data) });
  updateBOQProgress = (id: string, data: any) => this.request<any>(`/boq/items/${id}/progress`, { method: 'PUT', body: JSON.stringify(data) });
  createBudgetRevision = (projectId: string, data: any) => this.request<any>(`/boq/${projectId}/revisions`, { method: 'POST', body: JSON.stringify(data) });

  // Inventory
  getMaterials = (params: string = '') => this.request<any>(`/inventory/materials${params ? `?${params}` : ''}`);
  createMaterial = (data: any) => this.request<any>('/inventory/materials', { method: 'POST', body: JSON.stringify(data) });
  getWarehouses = () => this.request<any>('/inventory/warehouses');
  getRequisitions = (params: string = '') => this.request<any>(`/inventory/requisitions${params ? `?${params}` : ''}`);
  createRequisition = (data: any) => this.request<any>('/inventory/requisitions', { method: 'POST', body: JSON.stringify(data) });
  approveRequisition = (id: string, data: any) => this.request<any>(`/inventory/requisitions/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) });
  recordStockMovement = (data: any) => this.request<any>('/inventory/transactions', { method: 'POST', body: JSON.stringify(data) });
  getStockLedger = (params: string = '') => this.request<any>(`/inventory/ledger${params ? `?${params}` : ''}`);

  // Procurement
  getSuppliers = () => this.request<any>('/procurement/suppliers');
  createSupplier = (data: any) => this.request<any>('/procurement/suppliers', { method: 'POST', body: JSON.stringify(data) });
  getPurchaseOrders = (params: string = '') => this.request<any>(`/procurement/purchase-orders${params ? `?${params}` : ''}`);
  createPurchaseOrder = (data: any) => this.request<any>('/procurement/purchase-orders', { method: 'POST', body: JSON.stringify(data) });
  getGRNs = (params: string = '') => this.request<any>(`/procurement/grn${params ? `?${params}` : ''}`);
  createGRN = (data: any) => this.request<any>('/procurement/grn', { method: 'POST', body: JSON.stringify(data) });
  getSupplierInvoices = (params: string = '') => this.request<any>(`/procurement/invoices${params ? `?${params}` : ''}`);
  createSupplierInvoice = (data: any) => this.request<any>('/procurement/invoices', { method: 'POST', body: JSON.stringify(data) });
  recordSupplierPayment = (data: any) => this.request<any>('/procurement/payments', { method: 'POST', body: JSON.stringify(data) });

  // Labour
  getWorkers = (params: string = '') => this.request<any>(`/labour/workers${params ? `?${params}` : ''}`);
  createWorker = (data: any) => this.request<any>('/labour/workers', { method: 'POST', body: JSON.stringify(data) });
  getDailyAttendance = (date: string, projectId: string) => this.request<any>(`/labour/attendance?date=${date}&projectId=${projectId}`);
  saveBulkAttendance = (data: any) => this.request<any>('/labour/attendance/bulk', { method: 'POST', body: JSON.stringify(data) });
  getMusterRoll = (params: string = '') => this.request<any>(`/labour/muster-roll${params ? `?${params}` : ''}`);
  getSubcontractors = () => this.request<any>('/labour/subcontractors');

  // Tasks & DPR
  getTasks = (params: string = '') => this.request<any>(`/tasks${params ? `?${params}` : ''}`);
  createTask = (data: any) => this.request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) });
  updateTask = (id: string, data: any) => this.request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  addTaskComment = (id: string, comment: string) => this.request<any>(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment }) });
  getDailyReports = (params: string = '') => this.request<any>(`/dpr${params ? `?${params}` : ''}`);
  getDailyReportById = (id: string) => this.request<any>(`/dpr/${id}`);
  createDailyReport = (data: any) => this.request<any>('/dpr', { method: 'POST', body: JSON.stringify(data) });
  approveDailyReport = (id: string) => this.request<any>(`/dpr/${id}/approve`, { method: 'PUT' });

  // Expenses & Petty Cash
  getPettyCashAccounts = (projectId?: string) => this.request<any>(`/expenses/petty-cash${projectId ? `?projectId=${projectId}` : ''}`);
  createPettyCashAccount = (data: any) => this.request<any>('/expenses/petty-cash', { method: 'POST', body: JSON.stringify(data) });
  recordPettyCashTxn = (data: any) => this.request<any>('/expenses/petty-cash/transactions', { method: 'POST', body: JSON.stringify(data) });
  getExpenses = (params: string = '') => this.request<any>(`/expenses${params ? `?${params}` : ''}`);
  createExpense = (data: any) => this.request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) });

  // Client Billing & Receipts
  getClients = () => this.request<any>('/billing/clients');
  createClient = (data: any) => this.request<any>('/billing/clients', { method: 'POST', body: JSON.stringify(data) });
  getClientInvoices = (params: string = '') => this.request<any>(`/billing/invoices${params ? `?${params}` : ''}`);
  createClientInvoice = (data: any) => this.request<any>('/billing/invoices', { method: 'POST', body: JSON.stringify(data) });
  getClientReceipts = (params: string = '') => this.request<any>(`/billing/receipts${params ? `?${params}` : ''}`);
  recordClientReceipt = (data: any) => this.request<any>('/billing/receipts', { method: 'POST', body: JSON.stringify(data) });

  // Accounts & Financials
  getCOA = () => this.request<any>('/accounts/coa');
  getJournalEntries = (params: string = '') => this.request<any>(`/accounts/journal${params ? `?${params}` : ''}`);
  createManualJournal = (data: any) => this.request<any>('/accounts/journal', { method: 'POST', body: JSON.stringify(data) });
  getTrialBalance = () => this.request<any>('/accounts/trial-balance');
  getProfitAndLoss = () => this.request<any>('/accounts/pnl');
  getBalanceSheet = () => this.request<any>('/accounts/balance-sheet');
  getAgingReports = () => this.request<any>('/accounts/aging');

  // Equipment
  getEquipment = (params: string = '') => this.request<any>(`/equipment${params ? `?${params}` : ''}`);
  createEquipment = (data: any) => this.request<any>('/equipment', { method: 'POST', body: JSON.stringify(data) });
  logEquipmentUsage = (id: string, data: any) => this.request<any>(`/equipment/${id}/usage`, { method: 'POST', body: JSON.stringify(data) });
  recordMaintenance = (id: string, data: any) => this.request<any>(`/equipment/${id}/maintenance`, { method: 'POST', body: JSON.stringify(data) });

  // Documents
  getDocuments = (params: string = '') => this.request<any>(`/documents${params ? `?${params}` : ''}`);
  uploadDocument = (formData: FormData) => this.request<any>('/documents', { method: 'POST', body: formData });
}

export const api = new ApiService();
export default api;

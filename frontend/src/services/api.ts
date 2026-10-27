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
  superAdminLogin = (credentials: any) => this.request<any>('/auth/superadmin-login', { method: 'POST', body: JSON.stringify(credentials) });
  switchRole = (role: string) => this.request<any>('/auth/switch-role', { method: 'POST', body: JSON.stringify({ role }) });
  getMe = () => this.request<any>('/auth/me');
  getUsers = () => this.request<any>('/auth/users');

  // Dashboard
  getDashboardMetrics = (projectId?: string) => this.request<any>(`/dashboard/metrics${projectId ? `?projectId=${projectId}` : ''}`);

  // Projects
  getProjects = (params: string = '') => this.request<any>(`/projects${params ? `?${params}` : ''}`);
  getNextProjectCode = () => this.request<any>('/projects/next-code');
  getProjectById = (id: string) => this.request<any>(`/projects/${id}`);
  getProjectDailyShareReport = (id: string) => this.request<any>(`/projects/${id}/daily-share-report`);
  createProject = (data: any) => this.request<any>('/projects', { method: 'POST', body: JSON.stringify(data) });
  updateProject = (id: string, data: any) => this.request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteProject = (id: string) => this.request<any>(`/projects/${id}`, { method: 'DELETE' });
  createSite = (projectId: string, data: any) => this.request<any>(`/projects/${projectId}/sites`, { method: 'POST', body: JSON.stringify(data) });
  updateSite = (projectId: string, siteId: string, data: any) => this.request<any>(`/projects/${projectId}/sites/${siteId}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteSite = (projectId: string, siteId: string) => this.request<any>(`/projects/${projectId}/sites/${siteId}`, { method: 'DELETE' });
  createPhase = (projectId: string, data: any) => this.request<any>(`/projects/${projectId}/phases`, { method: 'POST', body: JSON.stringify(data) });
  createChangeOrder = (projectId: string, data: any) => this.request<any>(`/projects/${projectId}/change-orders`, { method: 'POST', body: JSON.stringify(data) });
  updateChangeOrder = (projectId: string, changeOrderId: string, data: any) => this.request<any>(`/projects/${projectId}/change-orders/${changeOrderId}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteChangeOrder = (projectId: string, changeOrderId: string) => this.request<any>(`/projects/${projectId}/change-orders/${changeOrderId}`, { method: 'DELETE' });
  seedInteriorPhases = (projectId: string) => this.request<any>(`/projects/${projectId}/seed-interior-phases`, { method: 'POST' });

  // BOQ
  getBOQ = (projectId: string) => this.request<any>(`/boq/${projectId}`);
  createBOQItem = (projectId: string, data: any) => this.request<any>(`/boq/${projectId}/items`, { method: 'POST', body: JSON.stringify(data) });
  updateBOQItem = (id: string, data: any) => this.request<any>(`/boq/items/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteBOQItem = (id: string) => this.request<any>(`/boq/items/${id}`, { method: 'DELETE' });
  updateBOQProgress = (id: string, data: any) => this.request<any>(`/boq/items/${id}/progress`, { method: 'PUT', body: JSON.stringify(data) });
  createBudgetRevision = (projectId: string, data: any) => this.request<any>(`/boq/${projectId}/revisions`, { method: 'POST', body: JSON.stringify(data) });

  // Inventory
  getMaterials = (params: string = '') => this.request<any>(`/inventory/materials${params ? `?${params}` : ''}`);
  getNextMaterialCode = () => this.request<any>('/inventory/materials/next-code');
  createMaterial = (data: any) => this.request<any>('/inventory/materials', { method: 'POST', body: JSON.stringify(data) });
  updateMaterial = (id: string, data: any) => this.request<any>(`/inventory/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteMaterial = (id: string) => this.request<any>(`/inventory/materials/${id}`, { method: 'DELETE' });
  getWarehouses = () => this.request<any>('/inventory/warehouses');
  createWarehouse = (data: any) => this.request<any>('/inventory/warehouses', { method: 'POST', body: JSON.stringify(data) });
  updateWarehouse = (id: string, data: any) => this.request<any>(`/inventory/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteWarehouse = (id: string) => this.request<any>(`/inventory/warehouses/${id}`, { method: 'DELETE' });
  getRequisitions = (params: string = '') => this.request<any>(`/inventory/requisitions${params ? `?${params}` : ''}`);
  createRequisition = (data: any) => this.request<any>('/inventory/requisitions', { method: 'POST', body: JSON.stringify(data) });
  approveRequisition = (id: string, data: any) => this.request<any>(`/inventory/requisitions/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) });
  deleteRequisition = (id: string) => this.request<any>(`/inventory/requisitions/${id}`, { method: 'DELETE' });
  recordStockMovement = (data: any) => this.request<any>('/inventory/transactions', { method: 'POST', body: JSON.stringify(data) });
  getStockLedger = (params: string = '') => this.request<any>(`/inventory/ledger${params ? `?${params}` : ''}`);
  getProjectMaterials = (params: string = '') => this.request<any>(`/inventory/project-materials${params ? `?${params}` : ''}`);
  addStock = (data: any) => this.request<any>('/inventory/add-stock', { method: 'POST', body: JSON.stringify(data) });
  adjustStock = (data: any) => this.request<any>('/inventory/adjust-stock', { method: 'POST', body: JSON.stringify(data) });

  // Procurement
  getSuppliers = () => this.request<any>('/procurement/suppliers');
  createSupplier = (data: any) => this.request<any>('/procurement/suppliers', { method: 'POST', body: JSON.stringify(data) });
  updateSupplier = (id: string, data: any) => this.request<any>(`/procurement/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteSupplier = (id: string) => this.request<any>(`/procurement/suppliers/${id}`, { method: 'DELETE' });
  getPurchaseOrders = (params: string = '') => this.request<any>(`/procurement/purchase-orders${params ? `?${params}` : ''}`);
  createPurchaseOrder = (data: any) => this.request<any>('/procurement/purchase-orders', { method: 'POST', body: JSON.stringify(data) });
  updatePurchaseOrder = (id: string, data: any) => this.request<any>(`/procurement/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deletePurchaseOrder = (id: string) => this.request<any>(`/procurement/purchase-orders/${id}`, { method: 'DELETE' });
  getGRNs = (params: string = '') => this.request<any>(`/procurement/grn${params ? `?${params}` : ''}`);
  createGRN = (data: any) => this.request<any>('/procurement/grn', { method: 'POST', body: JSON.stringify(data) });
  updateGRN = (id: string, data: any) => this.request<any>(`/procurement/grn/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteGRN = (id: string) => this.request<any>(`/procurement/grn/${id}`, { method: 'DELETE' });
  getSupplierInvoices = (params: string = '') => this.request<any>(`/procurement/invoices${params ? `?${params}` : ''}`);
  createSupplierInvoice = (data: any) => this.request<any>('/procurement/invoices', { method: 'POST', body: JSON.stringify(data) });
  updateSupplierInvoice = (id: string, data: any) => this.request<any>(`/procurement/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteSupplierInvoice = (id: string) => this.request<any>(`/procurement/invoices/${id}`, { method: 'DELETE' });
  recordSupplierPayment = (data: any) => this.request<any>('/procurement/payments', { method: 'POST', body: JSON.stringify(data) });
  deleteSupplierPayment = (id: string) => this.request<any>(`/procurement/payments/${id}`, { method: 'DELETE' });

  // Labour
  getWorkers = (params: string = '') => this.request<any>(`/labour/workers${params ? `?${params}` : ''}`);
  getWorkerById = (id: string) => this.request<any>(`/labour/workers/${id}`);
  getNextWorkerCode = () => this.request<any>('/labour/next-worker-code');
  createWorker = (data: any) =>
    this.request<any>('/labour/workers', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  updateWorker = (id: string, data: any) =>
    this.request<any>(`/labour/workers/${id}`, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  deleteWorker = (id: string) => this.request<any>(`/labour/workers/${id}`, { method: 'DELETE' });
  getDailyAttendance = (date: string, projectId: string) => this.request<any>(`/labour/attendance?date=${date}&projectId=${projectId}`);
  saveBulkAttendance = (data: any) => this.request<any>('/labour/attendance/bulk', { method: 'POST', body: JSON.stringify(data) });
  updateAttendanceRecord = (id: string, data: any) => this.request<any>(`/labour/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteAttendanceRecord = (id: string) => this.request<any>(`/labour/attendance/${id}`, { method: 'DELETE' });
  getMusterRoll = (params: string = '') => this.request<any>(`/labour/muster-roll${params ? `?${params}` : ''}`);
  getSubcontractors = () => this.request<any>('/labour/subcontractors');
  recordWagePayment = (data: any) => this.request<any>('/labour/payout', { method: 'POST', body: JSON.stringify(data) });
  deleteWagePayment = (id: string) => this.request<any>(`/labour/payout/${id}`, { method: 'DELETE' });
  assignWorkerToProject = (data: { projectId: string; workerId?: string; workerIds?: string[] }) =>
    this.request<any>('/labour/assign-existing', { method: 'POST', body: JSON.stringify(data) });
  unassignWorkerFromProject = (data: { projectId: string; workerId: string }) =>
    this.request<any>('/labour/unassign', { method: 'POST', body: JSON.stringify(data) });

  // Tasks & DPR
  getTasks = (params: string = '') => this.request<any>(`/tasks${params ? `?${params}` : ''}`);
  createTask = (data: any) => this.request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) });
  updateTask = (id: string, data: any) => this.request<any>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteTask = (id: string) => this.request<any>(`/tasks/${id}`, { method: 'DELETE' });
  addTaskComment = (id: string, comment: string) => this.request<any>(`/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ comment }) });
  getDailyReports = (params: string = '') => this.request<any>(`/dpr${params ? `?${params}` : ''}`);
  getDailyReportById = (id: string) => this.request<any>(`/dpr/${id}`);
  createDailyReport = (data: any) => this.request<any>('/dpr', { method: 'POST', body: JSON.stringify(data) });
  updateDailyReport = (id: string, data: any) => this.request<any>(`/dpr/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteDailyReport = (id: string) => this.request<any>(`/dpr/${id}`, { method: 'DELETE' });
  approveDailyReport = (id: string) => this.request<any>(`/dpr/${id}/approve`, { method: 'PUT' });

  // Expenses & Petty Cash
  getPettyCashAccounts = (projectId?: string) => this.request<any>(`/expenses/petty-cash${projectId ? `?projectId=${projectId}` : ''}`);
  createPettyCashAccount = (data: any) => this.request<any>('/expenses/petty-cash', { method: 'POST', body: JSON.stringify(data) });
  deletePettyCashAccount = (id: string) => this.request<any>(`/expenses/petty-cash/${id}`, { method: 'DELETE' });
  recordPettyCashTxn = (data: any) => this.request<any>('/expenses/petty-cash/transactions', { method: 'POST', body: JSON.stringify(data) });
  updatePettyCashTxn = (id: string, data: any) => this.request<any>(`/expenses/petty-cash/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deletePettyCashTxn = (id: string) => this.request<any>(`/expenses/petty-cash/transactions/${id}`, { method: 'DELETE' });
  getExpenses = (params: string = '') => this.request<any>(`/expenses${params ? `?${params}` : ''}`);
  createExpense = (data: any) => this.request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) });
  updateExpense = (id: string, data: any) => this.request<any>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteExpense = (id: string) => this.request<any>(`/expenses/${id}`, { method: 'DELETE' });

  // Client Billing & Receipts
  getClients = () => this.request<any>('/billing/clients');
  createClient = (data: any) => this.request<any>('/billing/clients', { method: 'POST', body: JSON.stringify(data) });
  updateClient = (id: string, data: any) => this.request<any>(`/billing/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteClient = (id: string) => this.request<any>(`/billing/clients/${id}`, { method: 'DELETE' });
  getClientInvoices = (params: string = '') => this.request<any>(`/billing/invoices${params ? `?${params}` : ''}`);
  getNextInvoiceNumber = (projectId?: string) => this.request<any>(`/billing/next-invoice-number${projectId ? `?projectId=${projectId}` : ''}`);
  createClientInvoice = (data: any) => this.request<any>('/billing/invoices', { method: 'POST', body: JSON.stringify(data) });
  updateClientInvoice = (id: string, data: any) => this.request<any>(`/billing/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteClientInvoice = (id: string) => this.request<any>(`/billing/invoices/${id}`, { method: 'DELETE' });
  getClientReceipts = (params: string = '') => this.request<any>(`/billing/receipts${params ? `?${params}` : ''}`);
  recordClientReceipt = (data: any) => this.request<any>('/billing/receipts', { method: 'POST', body: JSON.stringify(data) });
  updateClientReceipt = (id: string, data: any) => this.request<any>(`/billing/receipts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteClientReceipt = (id: string) => this.request<any>(`/billing/receipts/${id}`, { method: 'DELETE' });

  // Accounts & Financials
  getCOA = () => this.request<any>('/accounts/coa');
  getJournalEntries = (params: string = '') => this.request<any>(`/accounts/journal${params ? `?${params}` : ''}`);
  createManualJournal = (data: any) => this.request<any>('/accounts/journal', { method: 'POST', body: JSON.stringify(data) });
  getTrialBalance = () => this.request<any>('/accounts/trial-balance');
  getProfitAndLoss = () => this.request<any>('/accounts/pnl');
  getBalanceSheet = () => this.request<any>('/accounts/balance-sheet');
  getAgingReports = () => this.request<any>('/accounts/aging');
  getIndianStatutory = () => this.request<any>('/accounts/indian-statutory');

  downloadTallyXML = async (params: string = '') => {
    const token = localStorage.getItem('erp_token');
    const res = await fetch(`${API_BASE}/accounts/export/tally-xml${params ? `?${params}` : ''}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (!res.ok) throw new Error('Failed to download Tally XML');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApexBuild_Tally_Import_${new Date().toISOString().slice(0, 10)}.xml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  downloadDaybookCSV = async (params: string = '') => {
    const token = localStorage.getItem('erp_token');
    const res = await fetch(`${API_BASE}/accounts/export/daybook-csv${params ? `?${params}` : ''}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (!res.ok) throw new Error('Failed to download Day Book CSV');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ApexBuild_DayBook_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Equipment
  getEquipment = (params: string = '') => this.request<any>(`/equipment${params ? `?${params}` : ''}`);
  createEquipment = (data: any) => this.request<any>('/equipment', { method: 'POST', body: JSON.stringify(data) });
  logEquipmentUsage = (id: string, data: any) => this.request<any>(`/equipment/${id}/usage`, { method: 'POST', body: JSON.stringify(data) });
  recordMaintenance = (id: string, data: any) => this.request<any>(`/equipment/${id}/maintenance`, { method: 'POST', body: JSON.stringify(data) });

  // Documents
  getDocuments = (params: string = '') => this.request<any>(`/documents${params ? `?${params}` : ''}`);
  uploadDocument = (formData: FormData) => this.request<any>('/documents', { method: 'POST', body: formData });

  // Office Staff & Overheads Management
  getOfficeStaff = (params: string = '') => this.request<any>(`/office/staff${params ? `?${params}` : ''}`);
  createOfficeStaff = (data: any) =>
    this.request<any>('/office/staff', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  updateOfficeStaff = (id: string, data: any) =>
    this.request<any>(`/office/staff/${id}`, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  deleteOfficeStaff = (id: string) => this.request<any>(`/office/staff/${id}`, { method: 'DELETE' });

  // Office Staff Attendance
  getDailyStaffAttendance = (date: string, roleCategory?: string) =>
    this.request<any>(`/office/attendance?date=${date}${roleCategory ? `&roleCategory=${roleCategory}` : ''}`);
  saveBulkStaffAttendance = (data: any) =>
    this.request<any>('/office/attendance', { method: 'POST', body: JSON.stringify(data) });
  getStaffAttendanceMatrix = (monthYear: string) =>
    this.request<any>(`/office/attendance/matrix?monthYear=${monthYear}`);
  saveStaffAttendanceCell = (data: any) =>
    this.request<any>('/office/attendance/cell', { method: 'POST', body: JSON.stringify(data) });

  // Staff Salary Disbursements & Attendance Payroll
  getSalaryPayments = (params: string = '') => this.request<any>(`/office/salaries${params ? `?${params}` : ''}`);
  disburseSalary = (data: any) => this.request<any>('/office/salaries', { method: 'POST', body: JSON.stringify(data) });
  updateSalaryPayment = (id: string, data: any) => this.request<any>(`/office/salaries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteSalaryPayment = (id: string) => this.request<any>(`/office/salaries/${id}`, { method: 'DELETE' });
  getStaffPayrollSummary = (monthYear: string) => this.request<any>(`/office/payroll-summary?monthYear=${monthYear}`);

  // Office Overhead Expenses
  getOfficeExpenses = (params: string = '') => this.request<any>(`/office/expenses${params ? `?${params}` : ''}`);
  createOfficeExpense = (data: any) => this.request<any>('/office/expenses', { method: 'POST', body: JSON.stringify(data) });
  updateOfficeExpense = (id: string, data: any) => this.request<any>(`/office/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteOfficeExpense = (id: string) => this.request<any>(`/office/expenses/${id}`, { method: 'DELETE' });

  // Corporate Financials & Combined Ledger
  getCompanyOverallFinancials = () => this.request<any>('/office/financials');

  // AI Chatbot Automation Engine
  sendAIPrompt = (prompt: string) => this.request<any>('/ai/chat', { method: 'POST', body: JSON.stringify({ prompt }) });

  // MODULE 1: Leads Pipeline
  getLeads = (params: string = '') => this.request<any>(`/leads${params ? `?${params}` : ''}`);
  getLeadById = (id: string) => this.request<any>(`/leads/${id}`);
  getNextLeadNumber = () => this.request<any>('/leads/next-number');
  createLead = (data: any) => this.request<any>('/leads', { method: 'POST', body: JSON.stringify(data) });
  updateLead = (id: string, data: any) => this.request<any>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteLead = (id: string) => this.request<any>(`/leads/${id}`, { method: 'DELETE' });
  convertLeadToProject = (id: string, data: any) =>
    this.request<any>(`/leads/${id}/convert-to-project`, { method: 'POST', body: JSON.stringify(data) });

  // MODULE 2 & 4: BOQ Quotation Generator & Milestone Invoices
  getQuotations = (params: string = '') => this.request<any>(`/quotations${params ? `?${params}` : ''}`);
  getQuotationById = (id: string) => this.request<any>(`/quotations/${id}`);
  getNextQuotationNumber = () => this.request<any>('/quotations/next-number');
  getBOQTemplates = () => this.request<any>('/quotations/templates');
  createQuotation = (data: any) => this.request<any>('/quotations', { method: 'POST', body: JSON.stringify(data) });
  updateQuotation = (id: string, data: any) => this.request<any>(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteQuotation = (id: string) => this.request<any>(`/quotations/${id}`, { method: 'DELETE' });
  dispatchQuotation = (id: string, data: any = {}) =>
    this.request<any>(`/quotations/${id}/dispatch`, { method: 'POST', body: JSON.stringify(data) });
  generateMilestoneInvoice = (id: string, data: any) =>
    this.request<any>(`/quotations/${id}/generate-milestone-invoice`, { method: 'POST', body: JSON.stringify(data) });
  // MODULE 3: Kickoff Gate - Finance Advance Confirmation
  confirmProjectAdvance = (projectId: string, data: any = {}) =>
    this.request<any>(`/projects/${projectId}/confirm-advance`, { method: 'POST', body: JSON.stringify(data) });

  // MULTI-TENANCY, TRIAL MANAGEMENT & SUPER ADMIN
  signupTrial = (data: any) =>
    this.request<any>('/auth/signup-trial', { method: 'POST', body: JSON.stringify(data) });
  getSuperAdminStats = () => this.request<any>('/superadmin/stats');
  getAllTenants = (params: string = '') =>
    this.request<any>(`/superadmin/tenants${params ? `?${params}` : ''}`);
  createTenant = (data: any) =>
    this.request<any>('/superadmin/tenants', { method: 'POST', body: JSON.stringify(data) });
  extendTrial = (id: string, data: any) =>
    this.request<any>(`/superadmin/tenants/${id}/extend-trial`, { method: 'PATCH', body: JSON.stringify(data) });
  updateTenantStatus = (id: string, data: any) =>
    this.request<any>(`/superadmin/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) });
  getTenantCurrentStatus = () => this.request<any>('/company/current-status');

  // COMPANY CONFIGURATION & OUTBOUND WHATSAPP LOGS
  getCompanySettings = () => this.request<any>('/company/settings');
  updateCompanySettings = (data: any) =>
    this.request<any>('/company/settings', { method: 'PUT', body: JSON.stringify(data) });
  testWhatsAppConnection = (data: any) =>
    this.request<any>('/whatsapp/test-connection', { method: 'POST', body: JSON.stringify(data) });
  getWhatsAppLogs = (params: string = '') =>
    this.request<any>(`/whatsapp/logs${params ? `?${params}` : ''}`);

  // UNIVERSAL OPERATIONAL ARCHITECTURE: DYNAMIC DROPDOWNS, LIFECYCLE & DAILY OPS
  getDropdowns = (category?: string) =>
    this.request<any>(`/dropdowns${category ? `?category=${category}` : ''}`);
  createDropdownOption = (data: { category: string; label: string; value?: string }) =>
    this.request<any>('/dropdowns', { method: 'POST', body: JSON.stringify(data) });
  deleteDropdownOption = (id: string) =>
    this.request<any>(`/dropdowns/${id}`, { method: 'DELETE' });

  updateLifecycleStatus = (data: {
    entityType: string;
    entityId: string;
    toStatus: string;
    notes?: string;
    metadata?: any;
  }) => this.request<any>('/lifecycle/status', { method: 'POST', body: JSON.stringify(data) });
  getActivityLogs = (params: string = '') =>
    this.request<any>(`/lifecycle/activity-logs${params ? `?${params}` : ''}`);

  quickAddTask = (data: {
    title: string;
    projectId?: string;
    assignedToId?: string;
    priority?: string;
    dueDate?: string;
    startDate?: string;
    status?: string;
    description?: string;
  }) => this.request<any>('/tasks/quick-add', { method: 'POST', body: JSON.stringify(data) });

  getDailyAttendanceRoster = (date?: string) =>
    this.request<any>(`/attendance/daily${date ? `?date=${date}` : ''}`);
  saveBulkShiftAttendance = (data: { date: string; records: any[] }) =>
    this.request<any>('/attendance/bulk', { method: 'POST', body: JSON.stringify(data) });
  markAllStaffPresent = (data: { date: string; checkInTime?: string; notes?: string }) =>
    this.request<any>('/attendance/mark-all-present', { method: 'POST', body: JSON.stringify(data) });

  // RECYCLE BIN / DELETED RECORDS VAULT
  getRecycleBinItems = (params: string = '') =>
    this.request<any>(`/recycle-bin${params ? `?${params}` : ''}`);
  restoreRecycleBinItem = (id: string) =>
    this.request<any>(`/recycle-bin/${id}/restore`, { method: 'POST' });
  permanentDeleteRecycleBinItem = (id: string) =>
    this.request<any>(`/recycle-bin/${id}`, { method: 'DELETE' });
  emptyRecycleBin = () =>
    this.request<any>('/recycle-bin/empty', { method: 'DELETE' });
}

export const api = new ApiService();
export default api;


export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'STAFF'
  | 'OWNER'
  | 'PROJECT_MANAGER'
  | 'SITE_ENGINEER'
  | 'ACCOUNTS_MANAGER'
  | 'PURCHASE_MANAGER'
  | 'STOREKEEPER'
  | 'HR_MANAGER'
  | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation?: string;
  phone?: string;
  company?: Company;
}

export interface Company {
  id: string;
  name: string;
  companyName?: string;
  code: string;
  ownerEmail?: string;
  status?: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED';
  planType?: 'FREE_TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  trialStartDate?: string;
  trialEndDate?: string;
  daysRemaining?: number;
  isTrialExpired?: boolean;
  gstin?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  phone: string;
  email: string;
  currencySymbol: string;
  logoUrl?: string;
  businessAddress?: string;
  invoiceFooterNotes?: string;
  whatsappApiKey?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  useSharedGateway?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  companyName: string;
  code: string;
  ownerEmail: string;
  adminPassword?: string;
  databasePath?: string;
  databaseSize?: string;
  phone: string;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED';
  planType: 'FREE_TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  trialStartDate?: string;
  trialEndDate?: string;
  daysRemaining: number;
  isTrialExpired: boolean;
  whatsappConfigured: boolean;
  useSharedGateway: boolean;
  logoUrl?: string;
  businessAddress?: string;
  userCount: number;
  projectCount: number;
  leadCount: number;
  quotationCount: number;
  invoiceCount: number;
  whatsappLogCount: number;
  createdAt: string;
}

export interface SuperAdminStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  expiredTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalProjects: number;
  totalLeads: number;
  totalInvoices: number;
  totalSaaSBilling: number;
  totalSaaSCollections: number;
}

export interface WhatsAppLog {
  id: string;
  tenantId?: string;
  tenant?: { id: string; name: string; code: string };
  recipientPhone: string;
  recipientName?: string;
  messageType: 'QUOTATION_SUMMARY' | 'DAILY_DPR' | 'INVOICE_ALERT' | 'TRIAL_WELCOME' | 'TEST_PING' | 'CUSTOM';
  messageBody: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  gatewayUsed: 'SHARED_GATEWAY' | 'TENANT_GATEWAY';
  externalMsgId?: string;
  createdAt: string;
  sentBy?: { id: string; name: string; role: string };
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
  code: string;
  location: string;
  supervisorName?: string;
  contactPhone?: string;
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  sequence: number;
  startDate?: string;
  endDate?: string;
  status: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  clientName: string;
  clientContact?: string;
  clientEmail?: string;
  clientBillingAddr?: string;
  clientGstin?: string;
  siteAddress: string;
  city?: string;
  state?: string;
  projectType: string;
  contractType: string;
  contractValue: number;
  approvedBudget: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  paymentTerms?: string;
  taxRatePercent: number;
  completionPercent: number;
  createdAt: string;
  sites?: Site[];
  phases?: Phase[];
  changeOrders?: ContractChangeOrder[];
  financials?: {
    totalBilled: number;
    totalReceived: number;
    cashReceived?: number;
    bankReceived?: number;
    outstandingReceivable: number;
    actualCost?: number;
    remainingBudget?: number;
    budgetBurnPercent?: number;
    netProfit?: number;
    netProfitMargin?: number;
  };
  advancePaymentRequired?: number;
  advancePaymentReceived?: number;
  advancePaymentConfirmed?: boolean;
  advancePaymentConfirmedBy?: string;
  advancePaymentConfirmedAt?: string;
  advancePaymentReference?: string;
  convertedFromLeadId?: string;
  _count?: {
    tasks: number;
    boqItems: number;
    dailyReports: number;
    clientInvoices: number;
    expenses: number;
  };
}

export interface ContractChangeOrder {
  id: string;
  projectId: string;
  orderNumber: string;
  title?: string;
  description: string;
  scopeType: 'DESIGN_VARIATION' | 'CLIENT_REQUEST' | 'SPECIFICATION_CHANGE' | 'SITE_CONDITION';
  requestedBy?: string;
  amountDelta: number;
  timeDeltaDays: number;
  swatchRenderUrl?: string;
  clientSignOffUrl?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface BOQItem {
  id: string;
  projectId: string;
  itemCode: string;
  description: string;
  category: string;
  unit: string;
  estimatedQty: number;
  materialUnitCost: number;
  labourUnitCost: number;
  equipmentUnitCost: number;
  subcontractUnitCost: number;
  otherUnitCost: number;
  unitRate: number;
  estimatedTotal: number;
  actualQtyCompleted: number;
  actualExpenditure: number;
  materialSwatchUrl?: string;
  designRenderUrl?: string;
  clientApprovalStatus?: string;
  clientSignOffDoc?: string;
  clientSignOffDate?: string;
  scopeVariationNotes?: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  brand?: string;
  unit: string;
  standardPrice: number;
  minStockLevel: number;
  reorderQty: number;
  taxPercent: number;
  totalQty?: number;
  totalValuation?: number;
  avgCost?: number;
  isLowStock?: boolean;
  stockBalances?: {
    id: string;
    warehouseId: string;
    currentQty: number;
    avgUnitCost: number;
    totalValuation: number;
    warehouse: { id: string; name: string; code: string; isSiteStore: boolean };
  }[];
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  isSiteStore: boolean;
  contactPerson?: string;
  projectId?: string;
}

export interface MaterialRequisition {
  id: string;
  requisitionNumber: string;
  projectId: string;
  project?: { code: string; name: string };
  site?: { name: string };
  requestedBy: { name: string; role: string };
  requiredDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PO_CREATED' | 'FULFILLED';
  remarks?: string;
  createdAt: string;
  items: {
    id: string;
    materialId: string;
    material: { code: string; name: string; unit: string; standardPrice: number };
    requestedQty: number;
    approvedQty?: number;
    unit: string;
    purpose?: string;
  }[];
}

export interface StockLedger {
  id: string;
  txnNumber: string;
  txnType: string;
  materialId: string;
  material: { code: string; name: string; unit: string };
  qty: number;
  unit: string;
  unitRate: number;
  totalValue: number;
  sourceWarehouse?: { code: string; name: string };
  destWarehouse?: { code: string; name: string };
  project?: { code: string; name: string };
  referenceNo?: string;
  remarks?: string;
  responsibleBy?: string;
  txnDate: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  gstin?: string;
  paymentTerms?: string;
  currentBalance: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  projectId: string;
  project: { code: string; name: string };
  supplierId: string;
  supplier: { name: string; phone: string; gstin?: string };
  poDate: string;
  deliveryDueDate: string;
  status: 'DRAFT' | 'APPROVED' | 'PARTIAL_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  freightCharges: number;
  totalAmount: number;
  termsConditions?: string;
  items: {
    id: string;
    materialId: string;
    material: { code: string; name: string; unit: string };
    orderQty: number;
    unitPrice: number;
    taxPercent: number;
    taxAmount: number;
    totalAmount: number;
    receivedQty: number;
  }[];
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  purchaseOrder: { poNumber: string; supplier: { name: string } };
  warehouse: { code: string; name: string };
  project: { code: string; name: string };
  deliveryNoteNo?: string;
  vehicleNo?: string;
  grnDate: string;
  receivedBy: { name: string };
  remarks?: string;
  items: {
    material: { code: string; name: string; unit: string };
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    remarks?: string;
  }[];
}

export interface SupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplier: { name: string; gstin?: string };
  purchaseOrder?: { poNumber: string };
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
}

export interface Worker {
  id: string;
  workerCode: string;
  name: string;
  phone?: string;
  trade: string;
  skillLevel: string;
  dailyWageRate: number;
  overtimeHourlyRate: number;
  paymentMethod: string;
  photoUrl?: string;
  documentUrl?: string;
  documentName?: string;
  projectId?: string;
  project?: { code: string; name: string };
}

export interface LabourAttendance {
  id: string;
  date: string;
  workerId: string;
  worker: Worker;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
  regularHours: number;
  overtimeHours: number;
  workActivity?: string;
  wageCalculated: number;
  overtimeWage: number;
  totalWageEarned: number;
}

export interface Task {
  id: string;
  projectId: string;
  project: { code: string; name: string };
  siteId?: string;
  site?: { name: string };
  phaseId?: string;
  phase?: { id: string; name: string };
  boqItemId?: string;
  boqItem?: {
    id: string;
    itemCode: string;
    description: string;
    category?: string;
    unit?: string;
    estimatedQty?: number;
    estimatedTotal?: number;
    actualExpenditure?: number;
  };
  title: string;
  description?: string;
  assignedToId?: string;
  assignedUser?: { name: string; role: string };
  startDate: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  plannedQty: number;
  completedQty: number;
  unit?: string;
  estimatedCost: number;
  actualCost: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'DELAYED' | 'ON_HOLD';
  materialSwatchUrl?: string;
  designRenderUrl?: string;
  clientSignOffDoc?: string;
  clientApprovalStatus?: string;
  isScopeVariation?: boolean;
  comments?: {
    id: string;
    comment: string;
    createdAt: string;
    user: { name: string; role: string };
  }[];
}

export interface DailySiteReport {
  id: string;
  projectId: string;
  project: { code: string; name: string };
  siteId: string;
  site: { code: string; name: string };
  reportDate: string;
  weather?: string;
  temperature?: string;
  preparedBy: { name: string; role: string };
  approvedBy?: { name: string };
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
  workSummary?: string;
  delaysReason?: string;
  safetyIncidents?: string;
  issuesNoted?: string;
  labourEntries: {
    id: string;
    trade: string;
    headcount: number;
    regularHours: number;
    overtimeHours: number;
    notes?: string;
  }[];
  materialEntries: {
    id: string;
    materialName: string;
    unit: string;
    qtyReceived: number;
    qtyConsumed: number;
    notes?: string;
  }[];
  equipmentEntries: {
    id: string;
    equipmentName: string;
    hoursOperated: number;
    fuelConsumed: number;
    workDone?: string;
  }[];
  photos: {
    id: string;
    photoUrl: string;
    caption?: string;
  }[];
}

export interface PettyCashAccount {
  id: string;
  name: string;
  projectId: string;
  project: { code: string; name: string };
  site?: { name: string };
  custodian: { name: string; phone?: string };
  openingBalance: number;
  currentBalance: number;
  minFloatThreshold: number;
  transactions?: {
    id: string;
    txnDate: string;
    txnType: string;
    amount: number;
    balanceAfter: number;
    recipient?: string;
    voucherNo?: string;
    description: string;
  }[];
}

export interface Expense {
  id: string;
  expenseNumber: string;
  projectId?: string;
  project?: { code: string; name: string };
  site?: { code: string; name: string };
  taskId?: string;
  task?: { id: string; title: string };
  boqItemId?: string;
  boqItem?: { id: string; itemCode: string; description: string; estimatedTotal?: number; actualExpenditure?: number };
  category: string;
  description: string;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paidTo: string;
  invoiceReceiptNo?: string;
  receiptUrl?: string;
  isPaid: boolean;
  status: string;
  createdBy: { name: string; role: string };
  approvedBy?: { name: string };
  expenseDate: string;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  billingAddress: string;
  gstin?: string;
  pan?: string;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  client?: Client;
  projectId: string;
  project: { code: string; name: string };
  invoiceType: string;
  invoiceDate: string;
  dueDate: string;
  workPeriodStart?: string;
  workPeriodEnd?: string;
  subtotal: number;
  retentionPercent: number;
  retentionAmount: number;
  tdsPercent: number;
  tdsAmount: number;
  gstPercent: number;
  gstAmount: number;
  netInvoiceAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  certificationNotes?: string;
  items?: {
    id: string;
    description: string;
    previousQty: number;
    currentQty: number;
    cumulativeQty: number;
    unit: string;
    rate: number;
    amount: number;
  }[];
}

export interface ClientReceipt {
  id: string;
  receiptNumber: string;
  clientId?: string;
  client?: Client;
  projectId?: string;
  project: {
    id?: string;
    code: string;
    name: string;
    clientContact?: string;
    clientName?: string;
    clientEmail?: string;
    clientBillingAddr?: string;
  };
  invoiceId?: string;
  invoice?: {
    id?: string;
    invoiceNumber: string;
    netInvoiceAmount: number;
    paidAmount?: number;
    balanceDue?: number;
    subtotal?: number;
  };
  receiptDate: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  notes?: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  subType: string;
  currentBalance: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  referenceType: string;
  narration: string;
  lines: {
    id: string;
    account: { code: string; name: string };
    debit: number;
    credit: number;
    project?: { code: string; name: string };
  }[];
}

export interface EquipmentAsset {
  id: string;
  code: string;
  name: string;
  assetType: 'OWNED' | 'RENTED';
  category: string;
  modelNo?: string;
  serialNo?: string;
  rentalRateType?: string;
  rentalRate: number;
  currentProjectId?: string;
  currentOperator?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'BREAKDOWN';
  hoursRunTotal: number;
  logs?: any[];
  maintenances?: any[];
}

export interface DocumentAttachment {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  projectId?: string;
  project?: { code: string; name: string };
  createdAt: string;
}

export type StaffRoleCategory =
  | 'EXECUTIVE'
  | 'MANAGEMENT'
  | 'TECHNICAL'
  | 'ACCOUNTS_ADMIN'
  | 'SUPPORT_STAFF'
  | 'SITE_OPS';

export interface OfficeStaff {
  id: string;
  staffCode: string;
  name: string;
  roleCategory: StaffRoleCategory;
  designation: string;
  phone: string;
  email?: string;
  address: string;
  idDocumentType: string;
  idDocumentNumber?: string;
  panNumber?: string;
  documentUrl?: string;
  documentName?: string;
  documentsJson?: string;
  photoUrl?: string;
  joiningDate: string;
  fixedSalary: number;
  basicSalary?: number;
  hra?: number;
  allowances?: number;
  pfNumber?: string;
  pfEmployeePercent?: number;
  pfEmployerPercent?: number;
  esiNumber?: string;
  esiPercent?: number;
  professionalTax?: number;
  tdsDeduction?: number;
  standardWorkingDays?: number;
  paidLeavesAllowed?: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI';
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  upiId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  salaryPayments?: StaffSalaryPayment[];
  _count?: { salaryPayments: number };
}

export interface StaffSalaryPayment {
  id: string;
  paymentNumber?: string;
  voucherNo?: string;
  staffId: string;
  staff?: OfficeStaff;
  monthYear: string;
  disbursementDate: string;
  basicSalary: number;
  bonus: number;
  deductions: number;
  netPaid: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI';
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface StaffAttendance {
  id: string;
  date: string;
  staffId: string;
  staff?: OfficeStaff;
  attendanceStatus: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'PAID_LEAVE';
  regularHours: number;
  overtimeHours: number;
  notes?: string;
  createdAt: string;
}

export interface StaffPayrollRecord {
  staff: OfficeStaff;
  fixedSalary: number;
  basicSalary?: number;
  hra?: number;
  allowances?: number;
  standardWorkingDays?: number;
  paidLeavesAllowed?: number;
  daysInMonth: number;
  hasAttendanceRecords: boolean;
  totalRecordedDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  absentDays: number;
  excessAbsentDays?: number;
  effectiveDays: number;
  unpaidDays: number;
  perDaySalary: number;
  leaveDeduction?: number;
  calculatedBasic: number;
  totalOtHours: number;
  calculatedOtPay: number;
  grossSalary: number;
  employeePf?: number;
  employerPf?: number;
  employeeEsi?: number;
  employerEsi?: number;
  professionalTax?: number;
  tdsDeduction?: number;
  totalDeductions?: number;
  bonus: number;
  deductions: number;
  netPayable: number;
  paymentStatus: 'PAID' | 'PENDING';
  payment?: StaffSalaryPayment;
}

export interface StaffAttendanceMatrixResponse {
  success: boolean;
  monthYear: string;
  year: number;
  month: number;
  daysInMonth: number;
  allStaff: OfficeStaff[];
  matrix: Record<string, Record<number, { id?: string; status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'PAID_LEAVE'; otHours?: number; notes?: string }>>;
}

export type OfficeExpenseCategory =
  | 'RENT'
  | 'ELECTRICITY'
  | 'INTERNET_PHONE'
  | 'OFFICE_SUPPLIES'
  | 'PANTRY_BEVERAGES'
  | 'REPAIR_MAINTENANCE'
  | 'TRAVEL_CONVEYANCE'
  | 'LEGAL_PROFESSIONAL'
  | 'SOFTWARE_SUBSCRIPTIONS'
  | 'OTHER';

export interface OfficeExpense {
  id: string;
  expenseNumber: string;
  category: OfficeExpenseCategory;
  title: string;
  description?: string;
  expenseDate: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI';
  paidTo: string;
  referenceNo?: string;
  periodMonth?: string;
  receiptUrl?: string;
  status: string;
  createdAt: string;
}

export interface CompanyOverallFinancials {
  summary: {
    totalRevenue: number;
    totalCashReceived: number;
    totalBankReceived: number;
    totalProjectExpenses: number;
    totalOfficeExpenses: number;
    totalStaffSalaries: number;
    totalOverheads: number;
    totalCompanyExpenses: number;
    netProfit: number;
    netProfitMargin: number;
    cashInHand: number;
    bankBalance: number;
    totalCashOutflow: number;
    totalBankOutflow: number;
  };
  projectBreakdown: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    clientName: string;
    contractValue: number;
    billed: number;
    receivedTotal: number;
    cashReceived: number;
    bankReceived: number;
    outstandingReceivable: number;
    directCost: number;
    projectNetProfit: number;
  }>;
  ledgerStream: Array<{
    id: string;
    date: string;
    type: 'INCOME' | 'EXPENSE';
    category: string;
    title: string;
    party: string;
    projectName?: string;
    paymentMode: string;
    channel: 'CASH' | 'BANK';
    inflow: number;
    outflow: number;
    referenceNo?: string;
  }>;
}

export interface AIChatResponse {
  success: boolean;
  message: string;
  actionTaken?: string;
  data?: any;
  shareableUrls?: {
    whatsapp?: string;
    email?: string;
  };
  googleSheetsCsv?: string;
  suggestedPrompts?: string[];
}

// -------------------------------------------------------------
// MODULE 1: Leads Pipeline Types
// -------------------------------------------------------------

export type LeadStage =
  | 'NEW_LEAD'
  | 'SITE_VISIT_SCHEDULED'
  | 'SITE_MEASUREMENT_COMPLETED'
  | 'DESIGN_CONCEPT_DISCUSSION'
  | 'BOQ_QUOTATION_SHARED'
  | 'NEGOTIATION'
  | 'LEAD_WON'
  | 'LEAD_LOST';

export type LeadProjectType =
  | 'RESIDENTIAL_INTERIOR'
  | 'COMMERCIAL_FITOUT'
  | 'FULL_VILLA_CONSTRUCTION'
  | 'RENOVATION';

export type LeadBudgetRange =
  | '10L_25L'
  | '25L_50L'
  | '50L_1CR'
  | '1CR_2.5CR'
  | '2.5CR_PLUS';

export type LeadSource =
  | 'WEBSITE'
  | 'INSTAGRAM'
  | 'REFERRAL'
  | 'ARCHITECT_REFERRAL'
  | 'WALKIN'
  | 'GOOGLE_ADS'
  | 'PROPERTY_EXPO'
  | 'OTHER';

export type AssignedTeam = 'DESIGN_TEAM' | 'EXECUTION_TEAM' | 'SALES_TEAM';

export interface Lead {
  id: string;
  leadNumber: string;
  clientName: string;
  contactNumber: string;
  email?: string;
  siteAddress: string;
  city?: string;
  state?: string;
  projectType: LeadProjectType;
  budgetRange: LeadBudgetRange;
  source: LeadSource;
  stage: LeadStage;
  lostReason?: string;
  assignedTeam?: AssignedTeam;
  assignedProjectManagerId?: string;
  assignedProjectManager?: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
  };
  siteVisitDate?: string;
  siteVisitNotes?: string | null;
  clientBudgetDiscussion?: string | null;
  canViewConfidential?: boolean;
  isConfidentialMasked?: boolean;
  convertedProjectId?: string;
  convertedProject?: {
    id: string;
    code: string;
    name: string;
    status: string;
    advancePaymentConfirmed: boolean;
    advancePaymentReceived: number;
    advancePaymentRequired: number;
    advancePaymentConfirmedBy?: string;
    advancePaymentConfirmedAt?: string;
  };
  quotations?: Quotation[];
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// MODULE 2: BOQ Quotation Types
// -------------------------------------------------------------

export interface QuotationItem {
  id?: string;
  quotationId?: string;
  areaRoom: string;
  workDescription: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  orderIndex?: number;
}

export interface MilestoneTerm {
  name: string;
  percentage: number;
  amount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  leadId?: string;
  lead?: Lead;
  projectId?: string;
  project?: Project;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  siteAddress: string;
  projectType: LeadProjectType;
  status: 'DRAFT' | 'SHARED' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';
  subtotal: number;
  gstMode: 'EXCLUSIVE' | 'INCLUSIVE';
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  penaltyTerms?: string;
  milestoneTerms?: string;
  notes?: string;
  sharedVia?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  sharedAt?: string;
  validUntil?: string;
  createdById?: string;
  items: QuotationItem[];
  invoices?: any[];
  createdAt: string;
  updatedAt: string;
}



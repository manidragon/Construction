export type UserRole =
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
  code: string;
  gstin?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  currencySymbol: string;
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
  financials?: {
    totalBilled: number;
    totalReceived: number;
    outstandingReceivable: number;
    actualCost: number;
    remainingBudget: number;
    budgetBurnPercent: number;
  };
  _count?: {
    tasks: number;
    boqItems: number;
    dailyReports: number;
    clientInvoices: number;
    expenses: number;
  };
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
  category: string;
  description: string;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paidTo: string;
  invoiceReceiptNo?: string;
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
  client?: Client;
  project: { code: string; name: string };
  invoice?: { invoiceNumber: string; netInvoiceAmount: number };
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

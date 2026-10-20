import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { login, switchRole, getMe, getUsers } from '../controllers/authController';
import { getExecutiveMetrics } from '../controllers/dashboardController';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  createSite,
  createPhase,
  createChangeOrder,
} from '../controllers/projectController';
import {
  getBOQByProject,
  createBOQItem,
  updateBOQProgress,
  createBudgetRevision,
} from '../controllers/boqController';
import {
  getMaterials,
  createMaterial,
  getWarehouses,
  getRequisitions,
  createRequisition,
  approveRequisition,
  recordStockMovement,
  getStockLedger,
} from '../controllers/inventoryController';
import {
  getSuppliers,
  createSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  getGoodsReceiptNotes,
  createGoodsReceiptNote,
  getSupplierInvoices,
  createSupplierInvoice,
  recordSupplierPayment,
} from '../controllers/procurementController';
import {
  getWorkers,
  createWorker,
  getDailyAttendance,
  saveBulkAttendance,
  getMusterRoll,
  getSubcontractors,
} from '../controllers/labourController';
import { getTasks, createTask, updateTask, addTaskComment } from '../controllers/taskController';
import { getDailyReports, getDailyReportById, createDailyReport, approveDailyReport } from '../controllers/dprController';
import {
  getPettyCashAccounts,
  createPettyCashAccount,
  recordPettyCashTxn,
  getExpenses,
  createExpense,
} from '../controllers/expenseController';
import {
  getClients,
  createClient,
  getClientInvoices,
  createClientInvoice,
  getClientReceipts,
  recordClientReceipt,
} from '../controllers/billingController';
import {
  getChartOfAccounts,
  getJournalEntries,
  createManualJournal,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getAgingReports,
} from '../controllers/accountsController';
import {
  getEquipment,
  createEquipment,
  logEquipmentUsage,
  recordMaintenance,
} from '../controllers/equipmentController';
import { getDocuments, createDocument } from '../controllers/documentController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Setup multer storage for document/photo uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

// ----------------------------------------------------------------------
// Auth Routes (Public)
// ----------------------------------------------------------------------
router.post('/auth/login', login);
router.post('/auth/switch-role', switchRole); // For evaluator convenience

// ----------------------------------------------------------------------
// Protected Routes
// ----------------------------------------------------------------------
router.use(authenticateToken);

// Current User Profile & Users List
router.get('/auth/me', getMe);
router.get('/auth/users', getUsers);

// Dashboard (Owner, PM, Accounts, Auditor)
router.get('/dashboard/metrics', getExecutiveMetrics);

// Projects
router.get('/projects', getProjects);
router.get('/projects/:id', getProjectById);
router.post('/projects', requireRole('OWNER', 'PROJECT_MANAGER'), createProject);
router.put('/projects/:id', requireRole('OWNER', 'PROJECT_MANAGER'), updateProject);
router.post('/projects/:projectId/sites', requireRole('OWNER', 'PROJECT_MANAGER'), createSite);
router.post('/projects/:projectId/phases', requireRole('OWNER', 'PROJECT_MANAGER'), createPhase);
router.post('/projects/:projectId/change-orders', requireRole('OWNER', 'PROJECT_MANAGER'), createChangeOrder);

// BOQ & Budgets
router.get('/boq/:projectId', getBOQByProject);
router.post('/boq/:projectId/items', requireRole('OWNER', 'PROJECT_MANAGER'), createBOQItem);
router.put('/boq/items/:id/progress', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), updateBOQProgress);
router.post('/boq/:projectId/revisions', requireRole('OWNER'), createBudgetRevision);

// Materials & Inventory
router.get('/inventory/materials', getMaterials);
router.post('/inventory/materials', requireRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER'), createMaterial);
router.get('/inventory/warehouses', getWarehouses);
router.get('/inventory/requisitions', getRequisitions);
router.post('/inventory/requisitions', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), createRequisition);
router.put('/inventory/requisitions/:id/approve', requireRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER'), approveRequisition);
router.post('/inventory/transactions', requireRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER'), recordStockMovement);
router.get('/inventory/ledger', getStockLedger);

// Procurement & Suppliers
router.get('/procurement/suppliers', getSuppliers);
router.post('/procurement/suppliers', requireRole('OWNER', 'PURCHASE_MANAGER', 'ACCOUNTS_MANAGER'), createSupplier);
router.get('/procurement/purchase-orders', getPurchaseOrders);
router.post('/procurement/purchase-orders', requireRole('OWNER', 'PURCHASE_MANAGER'), createPurchaseOrder);
router.get('/procurement/grn', getGoodsReceiptNotes);
router.post('/procurement/grn', requireRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER'), createGoodsReceiptNote);
router.get('/procurement/invoices', getSupplierInvoices);
router.post('/procurement/invoices', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createSupplierInvoice);
router.post('/procurement/payments', requireRole('OWNER', 'ACCOUNTS_MANAGER'), recordSupplierPayment);

// Labour, Attendance & Subcontractors
router.get('/labour/workers', getWorkers);
router.post('/labour/workers', requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER'), createWorker);
router.get('/labour/attendance', getDailyAttendance);
router.post('/labour/attendance/bulk', requireRole('OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), saveBulkAttendance);
router.get('/labour/muster-roll', getMusterRoll);
router.get('/labour/subcontractors', getSubcontractors);

// Tasks
router.get('/tasks', getTasks);
router.post('/tasks', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), createTask);
router.put('/tasks/:id', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), updateTask);
router.post('/tasks/:id/comments', addTaskComment);

// Daily Site Reports (DPR)
router.get('/dpr', getDailyReports);
router.get('/dpr/:id', getDailyReportById);
router.post('/dpr', requireRole('OWNER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), createDailyReport);
router.put('/dpr/:id/approve', requireRole('OWNER', 'PROJECT_MANAGER'), approveDailyReport);

// Expenses & Petty Cash
router.get('/expenses/petty-cash', getPettyCashAccounts);
router.post('/expenses/petty-cash', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createPettyCashAccount);
router.post('/expenses/petty-cash/transactions', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER'), recordPettyCashTxn);
router.get('/expenses', getExpenses);
router.post('/expenses', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), createExpense);

// Client Billing & Receipts
router.get('/billing/clients', getClients);
router.post('/billing/clients', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER'), createClient);
router.get('/billing/invoices', getClientInvoices);
router.post('/billing/invoices', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createClientInvoice);
router.get('/billing/receipts', getClientReceipts);
router.post('/billing/receipts', requireRole('OWNER', 'ACCOUNTS_MANAGER'), recordClientReceipt);

// Double-Entry Accounting Reports (Restricted to OWNER, ACCOUNTS_MANAGER, AUDITOR)
router.get('/accounts/coa', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getChartOfAccounts);
router.get('/accounts/journal', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getJournalEntries);
router.post('/accounts/journal', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createManualJournal);
router.get('/accounts/trial-balance', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getTrialBalance);
router.get('/accounts/pnl', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getProfitAndLoss);
router.get('/accounts/balance-sheet', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getBalanceSheet);
router.get('/accounts/aging', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getAgingReports);

// Equipment & Machinery
router.get('/equipment', getEquipment);
router.post('/equipment', requireRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER'), createEquipment);
router.post('/equipment/:id/usage', requireRole('OWNER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), logEquipmentUsage);
router.post('/equipment/:id/maintenance', requireRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER'), recordMaintenance);

// Documents
router.get('/documents', getDocuments);
router.post('/documents', upload.single('file'), createDocument);

export default router;

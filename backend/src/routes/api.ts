import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { login, superAdminLogin, switchRole, getMe, getUsers, signupTrial } from '../controllers/authController';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  resetTeamMemberPassword,
  toggleTeamMemberStatus,
  deleteTeamMember,
} from '../controllers/teamController';
import {
  getSuperAdminStats,
  getAllTenants,
  createTenant,
  extendTrial,
  updateTenantStatus,
  getTenantCurrentStatus,
  resetDemoTenantData,
} from '../controllers/tenantController';
import {
  getCompanySettings,
  updateCompanySettings,
  testWhatsAppConnection,
  getWhatsAppLogs,
} from '../controllers/companySettingsController';
import { checkTrialStatus } from '../middleware/auth';
import { getExecutiveMetrics } from '../controllers/dashboardController';
import {
  getProjects,
  getNextProjectCode,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  createSite,
  updateSite,
  deleteSite,
  createPhase,
  createChangeOrder,
  updateChangeOrder,
  deleteChangeOrder,
  seedInteriorLifecyclePhases,
  getProjectDailyShareReport,
  confirmProjectAdvancePayment,
} from '../controllers/projectController';
import {
  getLeads,
  getLeadById,
  getNextLeadNumber,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToProject,
} from '../controllers/leadController';
import {
  getQuotations,
  getQuotationById,
  getNextQuotationNumber,
  getStandardBOQTemplates,
  createQuotation,
  updateQuotation,
  dispatchQuotation,
  generateMilestoneInvoiceFromQuotation,
  deleteQuotation,
} from '../controllers/quotationController';
import {
  getBOQByProject,
  createBOQItem,
  updateBOQItem,
  deleteBOQItem,
  updateBOQProgress,
  createBudgetRevision,
} from '../controllers/boqController';
import {
  getMaterials,
  getNextMaterialCode,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getRequisitions,
  createRequisition,
  approveRequisition,
  deleteRequisition,
  recordStockMovement,
  getStockLedger,
  getProjectMaterials,
  addStock,
  adjustStock,
} from '../controllers/inventoryController';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getGoodsReceiptNotes,
  createGoodsReceiptNote,
  updateGoodsReceiptNote,
  deleteGoodsReceiptNote,
  getSupplierInvoices,
  createSupplierInvoice,
  updateSupplierInvoice,
  deleteSupplierInvoice,
  recordSupplierPayment,
  deleteSupplierPayment,
} from '../controllers/procurementController';
import {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  getNextWorkerCode,
  getDailyAttendance,
  saveBulkAttendance,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getMusterRoll,
  getSubcontractors,
  recordWagePayment,
  deleteWagePayment,
  assignWorkerToProject,
  unassignWorkerFromProject,
} from '../controllers/labourController';
import { getTasks, createTask, updateTask, deleteTask, addTaskComment, quickAddTask } from '../controllers/taskController';
import { getDropdownOptions, createDropdownOption, deleteDropdownOption } from '../controllers/dropdownController';
import { transitionStatus, getActivityLogs } from '../controllers/lifecycleController';
import { getDailyAttendanceRoster, saveBulkAttendance as saveBulkShiftAttendance, markAllPresent } from '../controllers/attendanceController';
import { getDailyReports, getDailyReportById, createDailyReport, updateDailyReport, deleteDailyReport, approveDailyReport } from '../controllers/dprController';
import {
  getPettyCashAccounts,
  createPettyCashAccount,
  recordPettyCashTxn,
  updatePettyCashTxn,
  deletePettyCashTxn,
  deletePettyCashAccount,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getClientInvoices,
  getNextInvoiceNumber,
  createClientInvoice,
  updateClientInvoice,
  deleteClientInvoice,
  getClientReceipts,
  recordClientReceipt,
  updateClientReceipt,
  deleteClientReceipt,
} from '../controllers/billingController';
import {
  getChartOfAccounts,
  getJournalEntries,
  createManualJournal,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getAgingReports,
  exportTallyXML,
  exportDaybookCSV,
  getIndianStatutorySummary,
} from '../controllers/accountsController';
import {
  getEquipment,
  createEquipment,
  logEquipmentUsage,
  recordMaintenance,
} from '../controllers/equipmentController';
import { getDocuments, createDocument } from '../controllers/documentController';
import {
  getStaffList,
  createStaff,
  updateStaff,
  deleteStaff,
  getSalaryPayments,
  disburseSalary,
  updateSalaryPayment,
  deleteSalaryPayment,
  getOfficeExpenses,
  createOfficeExpense,
  updateOfficeExpense,
  deleteOfficeExpense,
  getCompanyOverallFinancials,
  getDailyStaffAttendance,
  saveBulkStaffAttendance,
  getStaffPayrollSummary,
  getStaffMonthlyAttendanceMatrix,
  saveStaffAttendanceCell,
} from '../controllers/officeController';
import { processAIPrompt } from '../controllers/aiController';
import {
  getRecycleBinItems,
  restoreRecycleBinItem,
  permanentDeleteRecycleBinItem,
  emptyRecycleBin,
} from '../controllers/recycleBinController';
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
router.post('/auth/superadmin-login', superAdminLogin); // Dedicated Platform Vendor Login
router.post('/auth/switch-role', switchRole); // For evaluator convenience
router.post('/auth/signup-trial', signupTrial); // Self-serve 14-day free trial signup

// ----------------------------------------------------------------------
// Protected Routes
// ----------------------------------------------------------------------
router.use(authenticateToken);

// Current User Profile & Users List
router.get('/auth/me', getMe);
router.get('/auth/users', getUsers);

// Tenant Current Status (accessible even if trial expired, so UI can display upgrade banner/modal)
router.get('/company/current-status', getTenantCurrentStatus);

// ----------------------------------------------------------------------
// Constructor Staff & Team Logins Management
// ----------------------------------------------------------------------
router.get('/company/team', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), getTeamMembers);
router.post('/company/team', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), checkTrialStatus, createTeamMember);
router.put('/company/team/:id', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), checkTrialStatus, updateTeamMember);
router.patch('/company/team/:id/reset-password', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), checkTrialStatus, resetTeamMemberPassword);
router.patch('/company/team/:id/status', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), checkTrialStatus, toggleTeamMemberStatus);
router.delete('/company/team/:id', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), checkTrialStatus, deleteTeamMember);

// ----------------------------------------------------------------------
// SUPER_ADMIN SaaS Management Routes
// ----------------------------------------------------------------------
router.get('/superadmin/stats', requireRole('SUPER_ADMIN'), getSuperAdminStats);
router.get('/superadmin/tenants', requireRole('SUPER_ADMIN'), getAllTenants);
router.post('/superadmin/tenants', requireRole('SUPER_ADMIN'), createTenant);
router.patch('/superadmin/tenants/:id/extend-trial', requireRole('SUPER_ADMIN'), extendTrial);
router.patch('/superadmin/tenants/:id/status', requireRole('SUPER_ADMIN'), updateTenantStatus);
router.post('/superadmin/tenants/:id/reset-demo', requireRole('SUPER_ADMIN'), resetDemoTenantData);
router.post('/company/reset-demo', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), resetDemoTenantData);

// ----------------------------------------------------------------------
// Company Branding, Invoice Prefs & Outbound WhatsApp Configuration
// ----------------------------------------------------------------------
router.get('/company/settings', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), getCompanySettings);
router.put('/company/settings', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), updateCompanySettings);
router.post('/whatsapp/test-connection', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER'), testWhatsAppConnection);
router.get('/whatsapp/logs', getWhatsAppLogs);

// ----------------------------------------------------------------------
// Operational Modules - Protected by Trial Expiration Middleware
// ----------------------------------------------------------------------
router.use(checkTrialStatus);

// Dashboard (Owner, PM, Accounts, Auditor)
router.get('/dashboard/metrics', getExecutiveMetrics);

// Projects
router.get('/projects', getProjects);
router.get('/projects/next-code', getNextProjectCode);
router.get('/projects/:id', getProjectById);
router.get('/projects/:id/daily-share-report', getProjectDailyShareReport);
router.post('/projects', requireRole('OWNER', 'PROJECT_MANAGER'), createProject);
router.put('/projects/:id', requireRole('OWNER', 'PROJECT_MANAGER'), updateProject);
router.delete('/projects/:id', requireRole('OWNER'), deleteProject);
router.post('/projects/:id/confirm-advance', requireRole('OWNER', 'ACCOUNTS_MANAGER'), confirmProjectAdvancePayment);
router.post('/projects/:projectId/sites', requireRole('OWNER', 'PROJECT_MANAGER'), createSite);
router.put('/projects/:projectId/sites/:siteId', requireRole('OWNER', 'PROJECT_MANAGER'), updateSite);
router.delete('/projects/:projectId/sites/:siteId', requireRole('OWNER', 'PROJECT_MANAGER'), deleteSite);
router.post('/projects/:projectId/phases', requireRole('OWNER', 'PROJECT_MANAGER'), createPhase);
router.post('/projects/:projectId/seed-interior-phases', requireRole('OWNER', 'PROJECT_MANAGER'), seedInteriorLifecyclePhases);
router.post('/projects/:projectId/change-orders', requireRole('OWNER', 'PROJECT_MANAGER'), createChangeOrder);
router.put('/projects/:projectId/change-orders/:changeOrderId', requireRole('OWNER', 'PROJECT_MANAGER'), updateChangeOrder);
router.delete('/projects/:projectId/change-orders/:changeOrderId', requireRole('OWNER', 'PROJECT_MANAGER'), deleteChangeOrder);

// BOQ & Budgets
router.get('/boq/:projectId', getBOQByProject);
router.post('/boq/:projectId/items', requireRole('OWNER', 'PROJECT_MANAGER'), createBOQItem);
router.put('/boq/items/:id', requireRole('OWNER', 'PROJECT_MANAGER'), updateBOQItem);
router.delete('/boq/items/:id', requireRole('OWNER', 'PROJECT_MANAGER'), deleteBOQItem);
router.put('/boq/items/:id/progress', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), updateBOQProgress);
router.post('/boq/:projectId/revisions', requireRole('OWNER'), createBudgetRevision);

// MODULE 1: Leads & Pipeline
router.get('/leads', getLeads);
router.get('/leads/next-number', getNextLeadNumber);
router.get('/leads/:id', getLeadById);
router.post('/leads', requireRole('OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER', 'HR_MANAGER'), createLead);
router.put('/leads/:id', requireRole('OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER'), updateLead);
router.delete('/leads/:id', requireRole('OWNER', 'PROJECT_MANAGER'), deleteLead);
router.post('/leads/:id/convert-to-project', requireRole('OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'), convertLeadToProject);

// MODULE 2 & MODULE 4: BOQ Quotation Generator & Milestone Invoicing
router.get('/quotations', getQuotations);
router.get('/quotations/next-number', getNextQuotationNumber);
router.get('/quotations/templates', getStandardBOQTemplates);
router.get('/quotations/:id', getQuotationById);
router.post('/quotations', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'), createQuotation);
router.put('/quotations/:id', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'), updateQuotation);
router.post('/quotations/:id/dispatch', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'), dispatchQuotation);
router.post('/quotations/:id/generate-milestone-invoice', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER'), generateMilestoneInvoiceFromQuotation);
router.delete('/quotations/:id', requireRole('SUPER_ADMIN', 'TENANT_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'), deleteQuotation);

// Materials & Inventory
router.get('/inventory/materials', getMaterials);
router.get('/inventory/materials/next-code', getNextMaterialCode);
router.post('/inventory/materials', requireRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), createMaterial);
router.put('/inventory/materials/:id', requireRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER'), updateMaterial);
router.delete('/inventory/materials/:id', requireRole('OWNER', 'PURCHASE_MANAGER'), deleteMaterial);
router.get('/inventory/warehouses', getWarehouses);
router.post('/inventory/warehouses', requireRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER'), createWarehouse);
router.put('/inventory/warehouses/:id', requireRole('OWNER', 'PURCHASE_MANAGER', 'STOREKEEPER'), updateWarehouse);
router.delete('/inventory/warehouses/:id', requireRole('OWNER', 'PURCHASE_MANAGER'), deleteWarehouse);
router.get('/inventory/requisitions', getRequisitions);
router.post('/inventory/requisitions', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), createRequisition);
router.put('/inventory/requisitions/:id/approve', requireRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER'), approveRequisition);
router.delete('/inventory/requisitions/:id', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), deleteRequisition);
router.post('/inventory/transactions', requireRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER'), recordStockMovement);
router.get('/inventory/ledger', getStockLedger);
router.get('/inventory/project-materials', getProjectMaterials);
router.post('/inventory/add-stock', requireRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER', 'PURCHASE_MANAGER', 'PROJECT_MANAGER'), addStock);
router.post('/inventory/adjust-stock', requireRole('OWNER', 'STOREKEEPER', 'PURCHASE_MANAGER', 'PROJECT_MANAGER'), adjustStock);

// Procurement & Suppliers
router.get('/procurement/suppliers', getSuppliers);
router.post('/procurement/suppliers', requireRole('OWNER', 'PURCHASE_MANAGER', 'ACCOUNTS_MANAGER'), createSupplier);
router.put('/procurement/suppliers/:id', requireRole('OWNER', 'PURCHASE_MANAGER', 'ACCOUNTS_MANAGER'), updateSupplier);
router.delete('/procurement/suppliers/:id', requireRole('OWNER', 'PURCHASE_MANAGER'), deleteSupplier);
router.get('/procurement/purchase-orders', getPurchaseOrders);
router.post('/procurement/purchase-orders', requireRole('OWNER', 'PURCHASE_MANAGER'), createPurchaseOrder);
router.put('/procurement/purchase-orders/:id', requireRole('OWNER', 'PURCHASE_MANAGER'), updatePurchaseOrder);
router.delete('/procurement/purchase-orders/:id', requireRole('OWNER', 'PURCHASE_MANAGER'), deletePurchaseOrder);
router.get('/procurement/grn', getGoodsReceiptNotes);
router.post('/procurement/grn', requireRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER'), createGoodsReceiptNote);
router.put('/procurement/grn/:id', requireRole('OWNER', 'STOREKEEPER', 'SITE_ENGINEER'), updateGoodsReceiptNote);
router.delete('/procurement/grn/:id', requireRole('OWNER', 'STOREKEEPER'), deleteGoodsReceiptNote);
router.get('/procurement/invoices', getSupplierInvoices);
router.post('/procurement/invoices', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createSupplierInvoice);
router.put('/procurement/invoices/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), updateSupplierInvoice);
router.delete('/procurement/invoices/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deleteSupplierInvoice);
router.post('/procurement/payments', requireRole('OWNER', 'ACCOUNTS_MANAGER'), recordSupplierPayment);
router.delete('/procurement/payments/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deleteSupplierPayment);

// Labour, Attendance & Subcontractors
router.get('/labour/next-worker-code', getNextWorkerCode);
router.get('/labour/workers', getWorkers);
router.get('/labour/workers/:id', getWorkerById);
router.post(
  '/labour/workers',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER'),
  createWorker
);
router.put(
  '/labour/workers/:id',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'SITE_ENGINEER'),
  updateWorker
);
router.delete(
  '/labour/workers/:id',
  requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER'),
  deleteWorker
);
router.get('/labour/attendance', getDailyAttendance);
router.post('/labour/attendance/bulk', requireRole('OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), saveBulkAttendance);
router.put('/labour/attendance/:id', requireRole('OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), updateAttendanceRecord);
router.delete('/labour/attendance/:id', requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER'), deleteAttendanceRecord);
router.get('/labour/muster-roll', getMusterRoll);
router.get('/labour/subcontractors', getSubcontractors);
router.post('/labour/payout', requireRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER'), recordWagePayment);
router.delete('/labour/payout/:id', requireRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER'), deleteWagePayment);
router.post('/labour/assign-existing', requireRole('OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), assignWorkerToProject);
router.post('/labour/unassign', requireRole('OWNER', 'HR_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), unassignWorkerFromProject);

// Tasks
router.get('/tasks', getTasks);
router.post('/tasks', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), createTask);
router.put('/tasks/:id', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), updateTask);
router.delete('/tasks/:id', requireRole('OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'), deleteTask);
router.post('/tasks/:id/comments', addTaskComment);

// Daily Site Reports (DPR)
router.get('/dpr', getDailyReports);
router.get('/dpr/:id', getDailyReportById);
router.post('/dpr', requireRole('OWNER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), createDailyReport);
router.put('/dpr/:id', requireRole('OWNER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), updateDailyReport);
router.delete('/dpr/:id', requireRole('OWNER', 'PROJECT_MANAGER'), deleteDailyReport);
router.put('/dpr/:id/approve', requireRole('OWNER', 'PROJECT_MANAGER'), approveDailyReport);

// Expenses & Petty Cash
router.get('/expenses/petty-cash', getPettyCashAccounts);
router.post('/expenses/petty-cash', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createPettyCashAccount);
router.delete('/expenses/petty-cash/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deletePettyCashAccount);
router.post('/expenses/petty-cash/transactions', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER'), recordPettyCashTxn);
router.put('/expenses/petty-cash/transactions/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER'), updatePettyCashTxn);
router.delete('/expenses/petty-cash/transactions/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deletePettyCashTxn);
router.get('/expenses', getExpenses);
router.post('/expenses', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), createExpense);
router.put('/expenses/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), updateExpense);
router.delete('/expenses/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER'), deleteExpense);

// Client Billing & Receipts
router.get('/billing/clients', getClients);
router.post('/billing/clients', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER'), createClient);
router.put('/billing/clients/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER'), updateClient);
router.delete('/billing/clients/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deleteClient);
router.get('/billing/next-invoice-number', getNextInvoiceNumber);
router.get('/billing/invoices', getClientInvoices);
router.post('/billing/invoices', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createClientInvoice);
router.put('/billing/invoices/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'PROJECT_MANAGER'), updateClientInvoice);
router.delete('/billing/invoices/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deleteClientInvoice);
router.get('/billing/receipts', getClientReceipts);
router.post('/billing/receipts', requireRole('OWNER', 'ACCOUNTS_MANAGER'), recordClientReceipt);
router.put('/billing/receipts/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), updateClientReceipt);
router.delete('/billing/receipts/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deleteClientReceipt);

// Double-Entry Accounting Reports (Restricted to OWNER, ACCOUNTS_MANAGER, AUDITOR)
router.get('/accounts/coa', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getChartOfAccounts);
router.get('/accounts/journal', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getJournalEntries);
router.post('/accounts/journal', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createManualJournal);
router.get('/accounts/trial-balance', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getTrialBalance);
router.get('/accounts/pnl', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getProfitAndLoss);
router.get('/accounts/balance-sheet', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getBalanceSheet);
router.get('/accounts/aging', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getAgingReports);
router.get('/accounts/export/tally-xml', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), exportTallyXML);
router.get('/accounts/export/daybook-csv', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), exportDaybookCSV);
router.get('/accounts/indian-statutory', requireRole('OWNER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getIndianStatutorySummary);

// Equipment & Machinery
router.get('/equipment', getEquipment);
router.post('/equipment', requireRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER'), createEquipment);
router.post('/equipment/:id/usage', requireRole('OWNER', 'SITE_ENGINEER', 'PROJECT_MANAGER'), logEquipmentUsage);
router.post('/equipment/:id/maintenance', requireRole('OWNER', 'PROJECT_MANAGER', 'STOREKEEPER'), recordMaintenance);

// Documents
router.get('/documents', getDocuments);
router.post('/documents', upload.single('file'), createDocument);

// Office Staff Management
router.get('/office/staff', getStaffList);
router.post(
  '/office/staff',
  requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  createStaff
);
router.put(
  '/office/staff/:id',
  requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]),
  updateStaff
);
router.delete('/office/staff/:id', requireRole('OWNER', 'HR_MANAGER'), deleteStaff);

// Staff Payroll & Salary Disbursements
router.get('/office/salaries', requireRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'AUDITOR'), getSalaryPayments);
router.post('/office/salaries', requireRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER'), disburseSalary);
router.put('/office/salaries/:id', requireRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER'), updateSalaryPayment);
router.delete('/office/salaries/:id', requireRole('OWNER', 'HR_MANAGER'), deleteSalaryPayment);
router.get('/office/payroll-summary', requireRole('OWNER', 'HR_MANAGER', 'ACCOUNTS_MANAGER'), getStaffPayrollSummary);

// Office Staff Attendance
router.get('/office/attendance', getDailyStaffAttendance);
router.post('/office/attendance', requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'), saveBulkStaffAttendance);
router.get('/office/attendance/matrix', getStaffMonthlyAttendanceMatrix);
router.post('/office/attendance/cell', requireRole('OWNER', 'HR_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER'), saveStaffAttendanceCell);

// Office Overhead Expenses
router.get('/office/expenses', getOfficeExpenses);
router.post('/office/expenses', requireRole('OWNER', 'ACCOUNTS_MANAGER'), createOfficeExpense);
router.put('/office/expenses/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), updateOfficeExpense);
router.delete('/office/expenses/:id', requireRole('OWNER', 'ACCOUNTS_MANAGER'), deleteOfficeExpense);

// Corporate Financials & Combined Ledger (Cash vs Bank)
router.get('/office/financials', getCompanyOverallFinancials);

// AI Chatbot Automation Engine
router.post('/ai/chat', processAIPrompt);

// -------------------------------------------------------------
// Universal Operational Architecture: Dynamic Dropdowns, Lifecycle & Daily Operations
// -------------------------------------------------------------

// Dynamic Dropdown Metadata Management
router.get('/dropdowns', getDropdownOptions);
router.post('/dropdowns', createDropdownOption);
router.delete('/dropdowns/:id', deleteDropdownOption);

// Generic Status & Lifecycle Handler Engine
router.post('/lifecycle/status', transitionStatus);
router.patch('/lifecycle/status', transitionStatus);
router.get('/lifecycle/activity-logs', getActivityLogs);

// Task Quick-Add
router.post('/tasks/quick-add', quickAddTask);

// Attendance & Daily Shift Logger
router.get('/attendance/daily', getDailyAttendanceRoster);
router.post('/attendance/bulk', saveBulkShiftAttendance);
router.post('/attendance/mark-all-present', markAllPresent);

// -------------------------------------------------------------
// Universal Recycle Bin / Deleted Records Vault
// -------------------------------------------------------------
router.get('/recycle-bin', getRecycleBinItems);
router.post('/recycle-bin/:id/restore', restoreRecycleBinItem);
router.delete('/recycle-bin/empty', emptyRecycleBin);
router.delete('/recycle-bin/:id', permanentDeleteRecycleBinItem);

export default router;

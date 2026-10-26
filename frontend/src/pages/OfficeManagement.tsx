import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  OfficeStaff,
  StaffSalaryPayment,
  OfficeExpense,
  CompanyOverallFinancials,
  StaffRoleCategory,
  OfficeExpenseCategory,
  StaffPayrollRecord,
  StaffAttendanceMatrixResponse,
} from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../services/api';
import {
  Building,
  Users,
  Wallet,
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  Landmark,
  TrendingUp,
  FileSpreadsheet,
  Share2,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Shield,
  Clock,
  Printer,
  Copy,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Download,
  Calculator,
  CalendarDays,
  Check,
  ExternalLink,
} from 'lucide-react';

const defaultStaffForm = {
  name: '',
  roleCategory: 'SUPPORT_STAFF' as StaffRoleCategory,
  designation: '',
  phone: '',
  email: '',
  address: '',
  idDocumentType: 'AADHAR',
  idDocumentNumber: '',
  panNumber: '',
  documentUrl: '',
  documentName: '',
  joiningDate: new Date().toISOString().split('T')[0],
  fixedSalary: '',
  basicSalary: '',
  hra: '',
  allowances: '',
  pfNumber: '',
  pfEmployeePercent: '12',
  pfEmployerPercent: '12',
  esiNumber: '',
  esiPercent: '0.75',
  professionalTax: '200',
  tdsDeduction: '0',
  standardWorkingDays: '26',
  paidLeavesAllowed: '1',
  paymentMode: 'BANK_TRANSFER',
  bankName: '',
  bankAccountNo: '',
  bankIfsc: '',
  upiId: '',
  notes: '',
};

export const OfficeManagement: React.FC = () => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'attendance' | 'expenses' | 'salaries' | 'ledger'>('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [staffList, setStaffList] = useState<OfficeStaff[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<StaffSalaryPayment[]>([]);
  const [officeExpenses, setOfficeExpenses] = useState<OfficeExpense[]>([]);
  const [financials, setFinancials] = useState<CompanyOverallFinancials | null>(null);

  // Attendance Payroll Summary state
  const [payrollMonthYear, setPayrollMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payrollSummary, setPayrollSummary] = useState<any | null>(null);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  // Interactive Monthly Attendance Matrix state
  const [matrixMonthYear, setMatrixMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [matrixData, setMatrixData] = useState<StaffAttendanceMatrixResponse | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    staffId: string;
    staffName: string;
    dayNum: number;
    dateStr: string;
    currentStatus: string;
    otHours: number;
    notes: string;
  } | null>(null);
  const [showCellModal, setShowCellModal] = useState(false);

  // Filters & search
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<string>('ALL');
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('ALL');
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [ledgerChannelFilter, setLedgerChannelFilter] = useState<string>('ALL');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('ALL');

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<OfficeStaff | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<OfficeStaff | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierStaff, setDossierStaff] = useState<OfficeStaff | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<StaffSalaryPayment | null>(null);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState<OfficeStaff | null>(null);

  // Staff Form
  const [staffForm, setStaffForm] = useState({ ...defaultStaffForm });
  const [editStaffForm, setEditStaffForm] = useState({ ...defaultStaffForm });

  // Expense Form
  const [expenseForm, setExpenseForm] = useState({
    category: 'RENT' as OfficeExpenseCategory,
    title: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    paidTo: '',
    referenceNo: '',
    periodMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    receiptUrl: '',
  });

  // Salary Disbursement Form
  const [salaryForm, setSalaryForm] = useState({
    staffId: '',
    monthYear: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    disbursementDate: new Date().toISOString().split('T')[0],
    basicSalary: '',
    bonus: '0',
    deductions: '0',
    paymentMethod: 'BANK_TRANSFER',
    referenceNo: '',
    notes: '',
  });

  // Upload status
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [staffRes, salaryRes, expRes, finRes] = await Promise.allSettled([
        api.getOfficeStaff(),
        api.getSalaryPayments(),
        api.getOfficeExpenses(),
        api.getCompanyOverallFinancials(),
      ]);

      if (staffRes.status === 'fulfilled' && staffRes.value?.success) {
        setStaffList(staffRes.value.staff || []);
      }
      if (salaryRes.status === 'fulfilled' && salaryRes.value?.success) {
        setSalaryPayments(salaryRes.value.payments || []);
      }
      if (expRes.status === 'fulfilled' && expRes.value?.success) {
        setOfficeExpenses(expRes.value.expenses || []);
      }
      if (finRes.status === 'fulfilled' && finRes.value) {
        const data = finRes.value;
        const normSummary = data.summary || data.financials || {};
        const normProjects = Array.isArray(data.projectBreakdown) ? data.projectBreakdown : [];
        const normLedger = Array.isArray(data.ledgerStream)
          ? data.ledgerStream
          : Array.isArray(data.unifiedLedger)
          ? data.unifiedLedger
          : [];

        setFinancials({
          summary: {
            totalRevenue: normSummary.totalRevenue ?? normSummary.totalRevenueBilled ?? 0,
            totalCashReceived: normSummary.totalCashReceived ?? normSummary.cashReceived ?? 0,
            totalBankReceived: normSummary.totalBankReceived ?? normSummary.bankReceived ?? 0,
            totalProjectExpenses: normSummary.totalProjectExpenses ?? normSummary.totalProjectDirectCosts ?? 0,
            totalOfficeExpenses: normSummary.totalOfficeExpenses ?? 0,
            totalStaffSalaries: normSummary.totalStaffSalaries ?? 0,
            totalOverheads: normSummary.totalOverheads ?? normSummary.totalOfficeOverheads ?? 0,
            totalCompanyExpenses: normSummary.totalCompanyExpenses ?? normSummary.totalAllExpenses ?? 0,
            netProfit: normSummary.netProfit ?? normSummary.netProfitOnBilling ?? 0,
            netProfitMargin: normSummary.netProfitMargin ?? normSummary.profitMarginPercent ?? 0,
            cashInHand: normSummary.cashInHand ?? normSummary.netCashInHand ?? 0,
            bankBalance: normSummary.bankBalance ?? normSummary.netBankAccountBalance ?? 0,
            totalCashOutflow: normSummary.totalCashOutflow ?? normSummary.totalCashOutflows ?? 0,
            totalBankOutflow: normSummary.totalBankOutflow ?? normSummary.totalBankOutflows ?? 0,
          },
          projectBreakdown: normProjects,
          ledgerStream: normLedger,
        });
      }
    } catch (err) {
      console.error('Error fetching office data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollSummary = async (mYear: string) => {
    setLoadingPayroll(true);
    try {
      const res = await api.getStaffPayrollSummary(mYear);
      if (res.success) {
        setPayrollSummary(res);
      }
    } catch (e) {
      console.error('Failed to load payroll summary:', e);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const fetchAttendanceMatrix = async (mYear: string) => {
    setLoadingMatrix(true);
    try {
      const res = await api.getStaffAttendanceMatrix(mYear);
      if (res.success) {
        setMatrixData(res);
      }
    } catch (e) {
      console.error('Failed to load staff attendance matrix:', e);
    } finally {
      setLoadingMatrix(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchPayrollSummary(payrollMonthYear);
  }, [payrollMonthYear]);

  useEffect(() => {
    fetchAttendanceMatrix(matrixMonthYear);
  }, [matrixMonthYear, activeTab]);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4500);
  };

  // Auto-Calculate Salary Structure (50% Basic, 20% HRA, 30% Allowance, 12% PF, 0.75% ESI, 26 days, 1 paid leave)
  const handleAutoCalcSalary = (formType: 'new' | 'edit') => {
    const form = formType === 'new' ? staffForm : editStaffForm;
    const gross = Number(form.fixedSalary) || 0;
    if (gross <= 0) {
      alert('Please enter a valid Fixed Monthly Salary first.');
      return;
    }
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(gross * 0.2);
    const allowances = Math.max(0, gross - basic - hra);
    const updated = {
      ...form,
      basicSalary: String(basic),
      hra: String(hra),
      allowances: String(allowances),
      pfEmployeePercent: '12',
      pfEmployerPercent: '12',
      esiPercent: gross <= 21000 ? '0.75' : '0',
      professionalTax: '200',
      standardWorkingDays: '26',
      paidLeavesAllowed: '1',
    };
    if (formType === 'new') setStaffForm(updated);
    else setEditStaffForm(updated);
    showNotification('Calculated standard salary breakdown (50% Basic, 20% HRA, 30% Allowances)!');
  };

  // Document upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'staffDoc' | 'expenseReceipt' | 'editStaffDoc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('category', targetField === 'expenseReceipt' ? 'OFFICE_RECEIPT' : 'STAFF_ID');

    setIsUploadingDoc(true);
    try {
      const res = await api.uploadDocument(formData);
      if (res.success && res.document) {
        if (targetField === 'staffDoc') {
          setStaffForm((prev) => ({ ...prev, documentUrl: res.document.fileUrl, documentName: file.name }));
        } else if (targetField === 'editStaffDoc') {
          setEditStaffForm((prev) => ({ ...prev, documentUrl: res.document.fileUrl, documentName: file.name }));
        } else {
          setExpenseForm((prev) => ({ ...prev, receiptUrl: res.document.fileUrl }));
        }
        showNotification(`File uploaded: ${file.name}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('File upload failed. Please try again.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.designation || !staffForm.phone || !staffForm.address) {
      alert('Please fill out Name, Designation, Phone, and Address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fixed = Number(staffForm.fixedSalary) || 0;
      const res = await api.createOfficeStaff({
        ...staffForm,
        phone: staffForm.phone.replace(/\s+/g, ''),
        fixedSalary: fixed,
        basicSalary: staffForm.basicSalary ? Number(staffForm.basicSalary) : Math.round(fixed * 0.5),
        hra: staffForm.hra ? Number(staffForm.hra) : Math.round(fixed * 0.2),
        allowances: staffForm.allowances ? Number(staffForm.allowances) : Math.max(0, fixed - Math.round(fixed * 0.7)),
        pfEmployeePercent: Number(staffForm.pfEmployeePercent) || 12,
        pfEmployerPercent: Number(staffForm.pfEmployerPercent) || 12,
        esiPercent: Number(staffForm.esiPercent) || 0.75,
        professionalTax: Number(staffForm.professionalTax) || 200,
        tdsDeduction: Number(staffForm.tdsDeduction) || 0,
        standardWorkingDays: Number(staffForm.standardWorkingDays) || 26,
        paidLeavesAllowed: Number(staffForm.paidLeavesAllowed) ?? 1,
      });

      if (res.success) {
        showNotification(`Staff member ${staffForm.name} added successfully!`);
        setShowStaffModal(false);
        setStaffForm({ ...defaultStaffForm });
        fetchAllData();
        fetchAttendanceMatrix(matrixMonthYear);
        fetchPayrollSummary(payrollMonthYear);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save staff record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Edit Staff
  const handleStartEdit = (staff: OfficeStaff) => {
    setEditingStaff(staff);
    setEditStaffForm({
      name: staff.name || '',
      roleCategory: staff.roleCategory || 'SUPPORT_STAFF',
      designation: staff.designation || '',
      phone: staff.phone || '',
      email: staff.email || '',
      address: staff.address || '',
      idDocumentType: staff.idDocumentType || 'AADHAR',
      idDocumentNumber: staff.idDocumentNumber || '',
      panNumber: staff.panNumber || '',
      documentUrl: staff.documentUrl || '',
      documentName: staff.documentName || '',
      joiningDate: staff.joiningDate ? staff.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0],
      fixedSalary: String(staff.fixedSalary ?? ''),
      basicSalary: String(staff.basicSalary ?? Math.round((staff.fixedSalary || 0) * 0.5)),
      hra: String(staff.hra ?? Math.round((staff.fixedSalary || 0) * 0.2)),
      allowances: String(staff.allowances ?? Math.max(0, (staff.fixedSalary || 0) - Math.round((staff.fixedSalary || 0) * 0.7))),
      pfNumber: staff.pfNumber || '',
      pfEmployeePercent: String(staff.pfEmployeePercent ?? 12),
      pfEmployerPercent: String(staff.pfEmployerPercent ?? 12),
      esiNumber: staff.esiNumber || '',
      esiPercent: String(staff.esiPercent ?? 0.75),
      professionalTax: String(staff.professionalTax ?? 200),
      tdsDeduction: String(staff.tdsDeduction ?? 0),
      standardWorkingDays: String(staff.standardWorkingDays ?? 26),
      paidLeavesAllowed: String(staff.paidLeavesAllowed ?? 1),
      paymentMode: staff.paymentMode || 'BANK_TRANSFER',
      bankName: staff.bankName || '',
      bankAccountNo: staff.bankAccountNo || '',
      bankIfsc: staff.bankIfsc || '',
      upiId: staff.upiId || '',
      notes: staff.notes || '',
    });
    setShowEditStaffModal(true);
  };

  // Update Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editStaffForm.name || !editStaffForm.designation || !editStaffForm.phone || !editStaffForm.address) {
      alert('Please fill out Name, Designation, Phone, and Address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fixed = Number(editStaffForm.fixedSalary) || 0;
      const res = await api.updateOfficeStaff(editingStaff.id, {
        ...editStaffForm,
        phone: editStaffForm.phone.replace(/\s+/g, ''),
        fixedSalary: fixed,
        basicSalary: editStaffForm.basicSalary ? Number(editStaffForm.basicSalary) : Math.round(fixed * 0.5),
        hra: editStaffForm.hra ? Number(editStaffForm.hra) : Math.round(fixed * 0.2),
        allowances: editStaffForm.allowances ? Number(editStaffForm.allowances) : Math.max(0, fixed - Math.round(fixed * 0.7)),
        pfEmployeePercent: Number(editStaffForm.pfEmployeePercent) || 12,
        pfEmployerPercent: Number(editStaffForm.pfEmployerPercent) || 12,
        esiPercent: Number(editStaffForm.esiPercent) || 0.75,
        professionalTax: Number(editStaffForm.professionalTax) || 200,
        tdsDeduction: Number(editStaffForm.tdsDeduction) || 0,
        standardWorkingDays: Number(editStaffForm.standardWorkingDays) || 26,
        paidLeavesAllowed: Number(editStaffForm.paidLeavesAllowed) ?? 1,
      });

      if (res.success) {
        showNotification(`Staff member ${editStaffForm.name} updated successfully!`);
        setShowEditStaffModal(false);
        setEditingStaff(null);
        fetchAllData();
        fetchAttendanceMatrix(matrixMonthYear);
        fetchPayrollSummary(payrollMonthYear);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update staff record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Delete Staff
  const handleStartDelete = (staff: OfficeStaff) => {
    setStaffToDelete(staff);
    setShowDeleteConfirm(true);
  };

  // Confirm Delete Staff
  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await api.deleteOfficeStaff(staffToDelete.id);
      if (res.success) {
        showNotification(`Staff member ${staffToDelete.name} has been removed.`);
        setShowDeleteConfirm(false);
        setStaffToDelete(null);
        fetchAllData();
        fetchAttendanceMatrix(matrixMonthYear);
        fetchPayrollSummary(payrollMonthYear);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete staff record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Staff Dossier
  const handleOpenDossier = (staff: OfficeStaff) => {
    setDossierStaff(staff);
    setShowDossierModal(true);
  };

  // Quick 1-Click Save Cell Attendance Status
  const handleSaveCellStatus = async (status: string, otHours: number = 0, notesStr: string = '') => {
    if (!selectedCell) return;
    try {
      const res = await api.saveStaffAttendanceCell({
        staffId: selectedCell.staffId,
        date: selectedCell.dateStr,
        attendanceStatus: status,
        overtimeHours: otHours,
        notes: notesStr,
      });
      if (res.success) {
        showNotification(`Attendance marked as ${status} for ${selectedCell.staffName}`);
        setShowCellModal(false);
        setSelectedCell(null);
        fetchAttendanceMatrix(matrixMonthYear);
        fetchPayrollSummary(payrollMonthYear);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance');
    }
  };

  // Create Office Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.paidTo || !expenseForm.amount) {
      alert('Please fill out Title, Paid To, and Amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createOfficeExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount),
      });

      if (res.success) {
        showNotification(`Office Expense of ${formatCurrency(Number(expenseForm.amount))} recorded!`);
        setShowExpenseModal(false);
        setExpenseForm({
          category: 'RENT',
          title: '',
          description: '',
          expenseDate: new Date().toISOString().split('T')[0],
          amount: '',
          paymentMethod: 'BANK_TRANSFER',
          paidTo: '',
          referenceNo: '',
          periodMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
          receiptUrl: '',
        });
        fetchAllData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disburse Salary
  const handleDisburseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryForm.staffId || !salaryForm.monthYear || !salaryForm.basicSalary) {
      alert('Please select staff member and enter basic salary.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.disburseSalary({
        staffId: salaryForm.staffId,
        monthYear: salaryForm.monthYear,
        disbursementDate: salaryForm.disbursementDate,
        basicSalary: Number(salaryForm.basicSalary),
        bonus: Number(salaryForm.bonus) || 0,
        deductions: Number(salaryForm.deductions) || 0,
        paymentMethod: salaryForm.paymentMethod,
        referenceNo: salaryForm.referenceNo,
        notes: salaryForm.notes,
      });

      if (res.success) {
        showNotification(`Salary voucher ${res.payment?.voucherNo || ''} generated successfully!`);
        setShowSalaryModal(false);
        fetchAllData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to disburse salary');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe financial data derivation with complete fallbacks
  const summary = financials?.summary || (financials as any)?.financials || {
    totalRevenue: 0,
    totalCashReceived: 0,
    totalBankReceived: 0,
    totalCompanyExpenses: 0,
    totalProjectExpenses: 0,
    totalOverheads: 0,
    totalStaffSalaries: 0,
    totalOfficeExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0,
    cashInHand: 0,
    totalCashOutflow: 0,
    bankBalance: 0,
    totalBankOutflow: 0,
  };
  const projectsList = Array.isArray(financials?.projectBreakdown) ? financials.projectBreakdown : [];
  const ledgerList: any[] = Array.isArray(financials?.ledgerStream)
    ? financials.ledgerStream
    : Array.isArray((financials as any)?.unifiedLedger)
    ? (financials as any).unifiedLedger
    : [];

  // Export Unified Ledger to CSV for Google Sheets
  const handleExportGoogleSheets = () => {
    if (!ledgerList.length) {
      alert('No ledger records available to export.');
      return;
    }

    let csvContent = 'Date,Transaction Type,Category,Title / Description,Party / Payee,Project,Channel,Payment Mode,Inflow (₹),Outflow (₹),Reference #\n';
    ledgerList.forEach((tx: any) => {
      const d = formatDate(tx.date);
      csvContent += `"${d}","${tx.type || ''}","${tx.category || ''}","${(tx.title || '').replace(/"/g, '""')}","${(tx.party || '').replace(/"/g, '""')}","${((tx as any).projectName || 'Corporate Overhead').replace(/"/g, '""')}","${tx.channel || ''}","${tx.paymentMode || ''}",${tx.inflow || 0},${tx.outflow || 0},"${tx.referenceNo || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Corporate_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Corporate Ledger CSV downloaded. Ready to open in Google Sheets!');
  };

  // Share corporate summary to WhatsApp
  const handleShareSummaryWhatsApp = () => {
    const s = summary;
    const msg = `🏢 *APEXBUILD CORPORATE FINANCIAL & LEDGER SUMMARY*
📅 Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

💰 *REVENUE & COLLECTIONS:*
• Total Revenue: ${formatCurrency(s.totalRevenue)}
  └ In Cash: ${formatCurrency(s.totalCashReceived)}
  └ In Bank Account: ${formatCurrency(s.totalBankReceived)}

📉 *EXPENDITURE SUMMARY:*
• Direct Site Costs: ${formatCurrency(s.totalProjectExpenses)}
• Office Staff Salaries: ${formatCurrency(s.totalStaffSalaries)}
• Office Overhead Expenses: ${formatCurrency(s.totalOfficeExpenses)}
• *Total Expenses:* ${formatCurrency(s.totalCompanyExpenses)}

📈 *NET PROFIT & MARGIN:*
• Realized Net Profit: *${formatCurrency(s.netProfit)}* (${s.netProfitMargin}%)

🏦 *CURRENT TREASURY POSITION:*
• 💵 Cash in Hand: *${formatCurrency(s.cashInHand)}*
• 🏛️ Bank Account Balance: *${formatCurrency(s.bankBalance)}*

_Generated automatically via ApexBuild ERP_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchCat = staffCategoryFilter === 'ALL' || s.roleCategory === staffCategoryFilter;
    const q = staffSearch.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q) ||
      s.staffCode.toLowerCase().includes(q) ||
      s.phone.includes(q);
    return matchCat && matchSearch;
  });

  // Filtered office expenses
  const filteredExpenses = officeExpenses.filter((e) => {
    const matchCat = expenseCategoryFilter === 'ALL' || e.category === expenseCategoryFilter;
    const q = expenseSearch.toLowerCase();
    const matchSearch =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.paidTo.toLowerCase().includes(q) ||
      e.expenseNumber.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // Filtered ledger stream
  const filteredLedger = ledgerList.filter((tx: any) => {
    const matchChannel = ledgerChannelFilter === 'ALL' || tx.channel === ledgerChannelFilter;
    const matchType = ledgerTypeFilter === 'ALL' || tx.type === ledgerTypeFilter;
    return matchChannel && matchType;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-emerald-400 border border-emerald-500/30 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Office & Overhead Expenses</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete payroll directory (Owner to Cleaners), office overheads (Rent, Utilities), Cash vs. Bank accounts, and corporate ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Google Sheets */}
          <button
            onClick={handleExportGoogleSheets}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-sm"
            title="Export Ledger data to CSV for Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export to Google Sheet</span>
          </button>

          {/* Share on WhatsApp */}
          <button
            onClick={handleShareSummaryWhatsApp}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            title="Share accounts & profit summary via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
            <span>Share Summary</span>
          </button>

          {/* Add Staff */}
          {hasRole('OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER') && (
            <button
              onClick={() => setShowStaffModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Staff</span>
            </button>
          )}

          {/* Add Expense */}
          {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" />
              <span>Record Office Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Corporate Financial Health Strip (Cash vs Bank & P&L) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Revenue & Collections */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Project Revenue</span>
          <strong className="text-base font-extrabold text-slate-900 block mt-0.5">
            {formatCurrency(summary.totalRevenue)}
          </strong>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold">Cash: {formatCurrency(summary.totalCashReceived)}</span>
            <span className="text-blue-700 font-semibold">Bank: {formatCurrency(summary.totalBankReceived)}</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Company Expenses</span>
          <strong className="text-base font-extrabold text-rose-700 block mt-0.5">
            {formatCurrency(summary.totalCompanyExpenses)}
          </strong>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Site: {formatCurrency(summary.totalProjectExpenses)}</span>
            <span>Office: {formatCurrency(summary.totalOverheads)}</span>
          </div>
        </div>

        {/* Net Profit & Margin */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">Net Company Profit</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-200/70 text-emerald-950 rounded">
              {summary.netProfitMargin}% Margin
            </span>
          </div>
          <strong className="text-lg font-mono font-extrabold text-emerald-900 block mt-0.5">
            {formatCurrency(summary.netProfit)}
          </strong>
          <span className="text-[10px] text-emerald-700 block mt-1 font-medium">After all project & office overheads</span>
        </div>

        {/* Cash in Hand Position */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-4 rounded-2xl border border-emerald-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <strong className="text-base font-mono font-extrabold text-white block mt-0.5">
            {formatCurrency(summary.cashInHand)}
          </strong>
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-200/80">
            <span>In: {formatCurrency(summary.totalCashReceived)}</span>
            <span>Out: {formatCurrency(summary.totalCashOutflow)}</span>
          </div>
        </div>

        {/* Bank Account Balance */}
        <div className="bg-gradient-to-br from-blue-950 to-slate-900 text-white p-4 rounded-2xl border border-blue-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Bank Account Balance</span>
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <strong className="text-base font-mono font-extrabold text-white block mt-0.5">
            {formatCurrency(summary.bankBalance)}
          </strong>
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-blue-200/80">
            <span>In: {formatCurrency(summary.totalBankReceived)}</span>
            <span>Out: {formatCurrency(summary.totalBankOutflow)}</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'Company P&L & Projects', icon: TrendingUp },
          { id: 'staff', label: `Staff Directory (${staffList.length})`, icon: Users },
          { id: 'attendance', label: 'Monthly Attendance Matrix & Leaves', icon: CalendarDays },
          { id: 'expenses', label: `Office Overheads (${officeExpenses.length})`, icon: Receipt },
          { id: 'salaries', label: `Salary Vouchers (${salaryPayments.length})`, icon: DollarSign },
          { id: 'ledger', label: 'Cash & Bank Ledger Stream', icon: FileSpreadsheet },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: COMPANY P&L & PROJECTS BREAKDOWN
      ===================================================================== */}
      {/* =====================================================================
          TAB 1: COMPANY P&L & PROJECTS BREAKDOWN
      ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Project Collections: Cash vs Bank Detailed Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Project-by-Project Collections & Net Contribution</h3>
                <p className="text-xs text-slate-500">Live split of Cash in Hand vs Bank Account RTGS/NEFT receipts</p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {projectsList.length} Active Projects
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Project & Client</th>
                    <th className="p-3 text-right">Contract Value</th>
                    <th className="p-3 text-right">Total Billed</th>
                    <th className="p-3 text-right text-emerald-800">Cash Received</th>
                    <th className="p-3 text-right text-blue-800">Bank Received</th>
                    <th className="p-3 text-right">Total Received</th>
                    <th className="p-3 text-right text-amber-800">Balance Due</th>
                    <th className="p-3 text-right">Site Direct Cost</th>
                    <th className="p-3 text-right font-extrabold text-emerald-900">Project Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectsList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No projects recorded yet.
                      </td>
                    </tr>
                  ) : (
                    projectsList.map((p) => (
                      <tr key={p.projectId} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <span className="font-mono text-[10px] font-bold text-slate-500 block">{p.projectCode}</span>
                          <strong className="text-slate-900 font-semibold">{p.projectName}</strong>
                          <span className="text-[11px] text-slate-500 block">Client: {p.clientName}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-slate-700">{formatCurrency(p.contractValue)}</td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-900">{formatCurrency(p.billed)}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                          {formatCurrency(p.cashReceived)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-700 bg-blue-50/40">
                          {formatCurrency(p.bankReceived)}
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                          {formatCurrency(p.receivedTotal)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-amber-700">
                          {p.outstandingReceivable === 0 ? '✓ Paid in Full' : formatCurrency(p.outstandingReceivable)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(p.directCost)}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                          {formatCurrency(p.projectNetProfit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overheads vs Direct Costs Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Office Overhead Expenses Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Office Overheads Summary</span>
                <span className="text-xs font-mono font-bold text-rose-700">{formatCurrency(summary.totalOverheads)}</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Office Staff Salaries (Fixed Payroll)</span>
                  <strong className="font-mono text-slate-900">{formatCurrency(summary.totalStaffSalaries)}</strong>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Office Rent & Utilities (Electricity, Internet)</span>
                  <strong className="font-mono text-slate-900">{formatCurrency(summary.totalOfficeExpenses)}</strong>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Site Direct Operational Costs</span>
                  <strong className="font-mono text-slate-900">{formatCurrency(summary.totalProjectExpenses)}</strong>
                </div>
              </div>
            </div>

            {/* Treasury Balance Summary */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Company Treasury & Liquidity</span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {formatCurrency((summary.cashInHand || 0) + (summary.bankBalance || 0))} Total
                </span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                  <div>
                    <strong className="text-emerald-950 font-bold block">💵 Cash in Hand</strong>
                    <span className="text-[11px] text-emerald-800">Petty Cash & Physical Cash Reserves</span>
                  </div>
                  <strong className="text-sm font-mono font-extrabold text-emerald-900">
                    {formatCurrency(summary.cashInHand)}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200/80">
                  <div>
                    <strong className="text-blue-950 font-bold block">🏛️ Corporate Bank Accounts</strong>
                    <span className="text-[11px] text-blue-800">Current Accounts, RTGS/NEFT & UPI</span>
                  </div>
                  <strong className="text-sm font-mono font-extrabold text-blue-900">
                    {formatCurrency(summary.bankBalance)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: STAFF DIRECTORY (OWNER DOWN TO OFFICE BOYS & CLEANERS)
      ===================================================================== */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, code, phone, designation..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Category:</span>
              <select
                value={staffCategoryFilter}
                onChange={(e) => setStaffCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Roles (Owner to Cleaner)</option>
                <option value="EXECUTIVE">Executive (Owner / Director / MD)</option>
                <option value="MANAGEMENT">Management (PM / Tech Lead)</option>
                <option value="TECHNICAL">Technical (Architect / Structural / Engineer)</option>
                <option value="ACCOUNTS_ADMIN">Accounts & Admin (Accountant / HR)</option>
                <option value="SUPPORT_STAFF">Support Staff (Office Boy / Cleaner / Driver / Security)</option>
                <option value="SITE_OPS">Site Operations (Supervisor / Storekeeper)</option>
              </select>
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staff) => (
              <div
                key={staff.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Header: Code & Category */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {staff.staffCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        staff.roleCategory === 'EXECUTIVE'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : staff.roleCategory === 'SUPPORT_STAFF'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {staff.roleCategory}
                    </span>
                  </div>

                  {/* Name & Designation */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-slate-900">{staff.name}</h3>
                    <p className="text-xs font-semibold text-amber-600">{staff.designation}</p>
                  </div>

                  {/* Contact & Address */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center">
                      <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                      <span>{staff.phone}</span>
                    </div>
                    {staff.email && (
                      <div className="flex items-center">
                        <Mail className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    )}
                    <div className="flex items-start">
                      <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-500 line-clamp-2">{staff.address}</span>
                    </div>
                  </div>

                  {/* Salary & Statutory Compensation Breakdown */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Monthly CTC:</span>
                      <strong className="text-sm font-mono font-extrabold text-slate-900">
                        {formatCurrency(staff.fixedSalary)}
                      </strong>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200/60 text-[10px] text-slate-600 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Basic</span>
                        <span className="font-bold text-slate-800">{formatCurrency(staff.basicSalary || Math.round(staff.fixedSalary * 0.5))}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">HRA</span>
                        <span className="font-bold text-slate-800">{formatCurrency(staff.hra || Math.round(staff.fixedSalary * 0.2))}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-sans">Allowances</span>
                        <span className="font-bold text-slate-800">{formatCurrency(staff.allowances || Math.max(0, staff.fixedSalary - Math.round(staff.fixedSalary * 0.7)))}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      {staff.pfNumber ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold" title="PF Account Number">
                          PF: {staff.pfNumber} ({staff.pfEmployeePercent ?? 12}%)
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[9px]">PF: N/A</span>
                      )}

                      {staff.esiNumber ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold" title="ESI IP Number">
                          ESI: {staff.esiNumber}
                        </span>
                      ) : null}

                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold" title="Working Rules">
                        {staff.standardWorkingDays || 26}d std • {staff.paidLeavesAllowed ?? 1} paid leave
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>Payment: <strong className="text-slate-800 font-bold">{staff.paymentMode}</strong></span>
                      {staff.bankAccountNo && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ••••{staff.bankAccountNo.slice(-4)} {staff.bankIfsc ? `(${staff.bankIfsc})` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Uploaded Document / ID Badge */}
                  <div className="mt-3 flex items-center justify-between text-xs p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900">
                    <span className="flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      <span className="text-[11px] font-medium">
                        {staff.idDocumentType}: {staff.idDocumentNumber || (staff.panNumber ? `PAN: ${staff.panNumber}` : 'Document')}
                      </span>
                    </span>
                    <button
                      onClick={() => handleOpenDossier(staff)}
                      className="text-[11px] font-bold text-blue-700 hover:underline flex items-center space-x-0.5"
                    >
                      <Eye className="w-3 h-3 mr-0.5" />
                      <span>Dossier</span>
                    </button>
                  </div>
                </div>

                {/* Card Action Buttons (Edit, Delete, Dossier, Disburse) */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-1">
                    {hasRole('OWNER', 'PROJECT_MANAGER', 'ACCOUNTS_MANAGER') && (
                      <button
                        onClick={() => handleStartEdit(staff)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition"
                        title="Edit Staff & Salary Structure"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {hasRole('OWNER') && (
                      <button
                        onClick={() => handleStartDelete(staff)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Delete / Archive Staff Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenDossier(staff)}
                      className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition"
                      title="View Profile & Uploaded Documents"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {hasRole('OWNER', 'ACCOUNTS_MANAGER') && (
                    <button
                      onClick={() => {
                        setSelectedStaffForSalary(staff);
                        setSalaryForm({
                          staffId: staff.id,
                          monthYear: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                          disbursementDate: new Date().toISOString().split('T')[0],
                          basicSalary: String(staff.fixedSalary),
                          bonus: '0',
                          deductions: '0',
                          paymentMethod: staff.paymentMode,
                          referenceNo: '',
                          notes: `Salary for ${staff.name}`,
                        });
                        setShowSalaryModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/20 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                    >
                      <DollarSign className="w-3 h-3 text-amber-600" />
                      <span>Disburse</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          NEW TAB: INTERACTIVE MONTHLY ATTENDANCE MATRIX & LEAVE DEDUCTIONS
      ===================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Office Staff Monthly Attendance & Leave Register</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark daily working dates, future planned leave/absence, and view live auto-calculated Loss of Pay (LOP) deductions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-bold text-slate-600">Month:</span>
                <input
                  type="month"
                  value={matrixMonthYear}
                  onChange={(e) => setMatrixMonthYear(e.target.value)}
                  className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none"
                />
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Register</span>
              </button>
            </div>
          </div>

          {/* Interactive Legend & Instructions */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500 text-[11px]">Click any date cell to update:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-300">P - Present (8h)</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">HD - Half Day (4h)</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px] border border-blue-300">PL - Paid Leave (0 deduction)</span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-[10px] border border-rose-300">A - Absent (Excess LOP)</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px] border border-purple-300">H - Holiday / Sunday</span>
            </div>
            <span className="text-[10px] text-slate-400 italic">
              Note: Future dates can only be marked as Planned Leave or Absent.
            </span>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3 sticky left-0 bg-slate-900 z-10 min-w-[180px]">Staff Member</th>
                    <th className="p-3 min-w-[90px] text-right">Fixed CTC</th>
                    {Array.from({ length: matrixData?.daysInMonth || 31 }, (_, i) => i + 1).map((dayNum) => {
                      const [y, m] = (matrixMonthYear || '2026-10').split('-').map(Number);
                      const dayOfWeek = new Date(Date.UTC(y, m - 1, dayNum)).getUTCDay();
                      const isSunday = dayOfWeek === 0;
                      const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

                      return (
                        <th
                          key={dayNum}
                          className={`p-1.5 text-center min-w-[34px] border-l border-slate-800 ${
                            isSunday ? 'bg-amber-900/40 text-amber-300' : ''
                          }`}
                        >
                          <span className="block text-[11px] font-bold">{dayNum}</span>
                          <span className="block text-[8px] font-normal text-slate-400">{dayNames[dayOfWeek]}</span>
                        </th>
                      );
                    })}
                    <th className="p-3 text-center min-w-[70px] bg-slate-800">Present</th>
                    <th className="p-3 text-center min-w-[70px] bg-slate-800">Absent</th>
                    <th className="p-3 text-right min-w-[100px] bg-slate-800">Leave Deduction</th>
                    <th className="p-3 text-right min-w-[110px] bg-slate-800 text-amber-400">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={40} className="p-8 text-center text-slate-400">
                        {loadingMatrix ? 'Loading monthly calendar matrix...' : 'No office staff members found.'}
                      </td>
                    </tr>
                  ) : (
                    staffList.map((st) => {
                      const staffMatrix = matrixData?.matrix?.[st.id] || {};
                      const fixed = st.fixedSalary || 0;
                      const stdDays = st.standardWorkingDays || 26;
                      const allowedPaid = st.paidLeavesAllowed ?? 1;
                      const dailyRate = Math.round(fixed / stdDays);

                      let pCount = 0;
                      let hdCount = 0;
                      let plCount = 0;
                      let aCount = 0;

                      for (let d = 1; d <= (matrixData?.daysInMonth || 31); d++) {
                        const cell = staffMatrix[d];
                        if (cell?.status === 'PRESENT') pCount++;
                        else if (cell?.status === 'HALF_DAY') hdCount++;
                        else if (cell?.status === 'PAID_LEAVE') plCount++;
                        else if (cell?.status === 'ABSENT') aCount++;
                      }

                      const excessAbsence = Math.max(0, aCount - allowedPaid) + hdCount * 0.5;
                      const leaveDeduction = Math.round(excessAbsence * dailyRate);
                      const netPay = Math.max(0, fixed - leaveDeduction);

                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200">
                            <strong className="text-slate-900 font-bold block truncate max-w-[170px]">{st.name}</strong>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                              <span>{st.staffCode}</span>
                              <span>•</span>
                              <span className="truncate max-w-[90px]">{st.designation}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-slate-700">
                            {formatCurrency(fixed)}
                          </td>

                          {/* Daily Cells 1 to 31 */}
                          {Array.from({ length: matrixData?.daysInMonth || 31 }, (_, i) => i + 1).map((dayNum) => {
                            const [y, m] = (matrixMonthYear || '2026-10').split('-').map(Number);
                            const cellDate = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const isSunday = new Date(Date.UTC(y, m - 1, dayNum)).getUTCDay() === 0;
                            const cell = staffMatrix[dayNum];
                            const status = cell?.status;

                            let bg = isSunday ? 'bg-slate-50 text-slate-300' : 'bg-transparent text-slate-300';
                            let text = '—';

                            if (status === 'PRESENT') {
                              bg = 'bg-emerald-100 text-emerald-900 font-extrabold border border-emerald-300 shadow-sm';
                              text = 'P';
                            } else if (status === 'HALF_DAY') {
                              bg = 'bg-amber-100 text-amber-900 font-extrabold border border-amber-300 shadow-sm';
                              text = 'HD';
                            } else if (status === 'PAID_LEAVE') {
                              bg = 'bg-blue-100 text-blue-900 font-extrabold border border-blue-300 shadow-sm';
                              text = 'PL';
                            } else if (status === 'ABSENT') {
                              bg = 'bg-rose-100 text-rose-900 font-extrabold border border-rose-300 shadow-sm';
                              text = 'A';
                            } else if (status === 'HOLIDAY') {
                              bg = 'bg-purple-100 text-purple-900 font-extrabold border border-purple-300 shadow-sm';
                              text = 'H';
                            }

                            return (
                              <td
                                key={dayNum}
                                onClick={() => {
                                  setSelectedCell({
                                    staffId: st.id,
                                    staffName: st.name,
                                    dayNum,
                                    dateStr: cellDate,
                                    currentStatus: status || 'PRESENT',
                                    otHours: cell?.otHours || 0,
                                    notes: cell?.notes || '',
                                  });
                                  setShowCellModal(true);
                                }}
                                className={`p-1 text-center cursor-pointer border-l border-slate-100 hover:ring-2 hover:ring-amber-500 hover:z-20 transition select-none`}
                                title={`Click to set attendance for ${st.name} on ${cellDate}`}
                              >
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-[10px] ${bg}`}>
                                  {text}
                                </span>
                              </td>
                            );
                          })}

                          {/* Summary Columns */}
                          <td className="p-3 text-center font-mono font-bold text-emerald-700 bg-slate-50/50">
                            {pCount}d
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-rose-700 bg-slate-50/50">
                            {aCount}d
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-700 bg-slate-50/50">
                            {leaveDeduction > 0 ? `-${formatCurrency(leaveDeduction)}` : '₹0'}
                            {excessAbsence > 0 && (
                              <span className="block text-[9px] font-normal text-slate-400">({excessAbsence}d LOP)</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900 bg-amber-50/30 text-xs">
                            {formatCurrency(netPay)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: OFFICE OVERHEAD EXPENSES (RENT, BILLS, PANTRY, REPAIRS)
      ===================================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search expense by title, payee, voucher #..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Category:</span>
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="RENT">Office Rent</option>
                <option value="ELECTRICITY">Electricity & Power</option>
                <option value="INTERNET_PHONE">Internet & Telephone</option>
                <option value="OFFICE_SUPPLIES">Office Supplies & Stationery</option>
                <option value="PANTRY_BEVERAGES">Pantry, Tea & Refreshments</option>
                <option value="REPAIR_MAINTENANCE">Office Repair & Maintenance</option>
                <option value="SOFTWARE_SUBSCRIPTIONS">Software & ERP Subscriptions</option>
                <option value="LEGAL_PROFESSIONAL">Legal & CA Professional Fees</option>
                <option value="OTHER">Other Miscellaneous</option>
              </select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Voucher # & Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Title & Purpose</th>
                    <th className="p-3">Paid To (Payee)</th>
                    <th className="p-3">Period</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-medium">
                        <span className="font-bold text-slate-900 block">{exp.expenseNumber}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(exp.expenseDate)}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {exp.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-900 font-semibold block">{exp.title}</strong>
                        {exp.description && <span className="text-[11px] text-slate-500">{exp.description}</span>}
                      </td>
                      <td className="p-3 text-slate-800 font-medium">{exp.paidTo}</td>
                      <td className="p-3 text-slate-500">{exp.periodMonth || '-'}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            exp.paymentMethod === 'CASH'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {exp.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3 text-center">
                        {exp.receiptUrl ? (
                          <a
                            href={exp.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: SALARY DISBURSEMENT REGISTER & VOUCHERS
      {/* =====================================================================
          TAB 4: SALARY DISBURSEMENT REGISTER & ATTENDANCE PAYROLL
      ===================================================================== */}
      {activeTab === 'salaries' && (
        <div className="space-y-6">
          {/* Section 1: Attendance-Driven Monthly Staff Payroll Calculator */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Attendance-Driven Monthly Staff Payroll</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pro-rates fixed monthly salaries based on Present, Half-Days, Paid Leaves, and 1.5x Overtime hours.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Payroll Month:</span>
                <input
                  type="month"
                  value={payrollMonthYear}
                  onChange={(e) => setPayrollMonthYear(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Staff</span>
                <strong className="text-lg font-bold text-slate-900">
                  {payrollSummary?.summary?.totalStaff ?? staffList.length}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fixed Liability</span>
                <strong className="text-lg font-mono font-bold text-slate-800">
                  {formatCurrency(payrollSummary?.summary?.totalLiability ?? 0)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Calculated Net Payable</span>
                <strong className="text-lg font-mono font-bold text-amber-900">
                  {formatCurrency(payrollSummary?.summary?.totalCalculatedNet ?? 0)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Disbursed / Pending</span>
                <div className="flex items-center space-x-1 font-mono text-xs font-bold mt-0.5">
                  <span className="text-emerald-700">{formatCurrency(payrollSummary?.summary?.totalDisbursed ?? 0)}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-rose-600">{formatCurrency(payrollSummary?.summary?.totalPending ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Attendance Payroll Calculation Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role / Designation</th>
                    <th className="p-3 text-right">Fixed Monthly</th>
                    <th className="p-3 text-center">Attendance Breakdown</th>
                    <th className="p-3 text-right">Calculated Basic</th>
                    <th className="p-3 text-right">OT Pay (1.5x)</th>
                    <th className="p-3 text-right font-bold text-slate-900">Net Payable</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!payrollSummary?.records || payrollSummary.records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {loadingPayroll ? 'Calculating attendance payroll...' : 'No office staff records found for this period.'}
                      </td>
                    </tr>
                  ) : (
                    payrollSummary.records.map((rec: any) => (
                      <tr key={rec.staff.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <strong className="text-slate-900 font-semibold block">{rec.staff.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{rec.staff.staffCode}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-800 font-medium block">{rec.staff.designation}</span>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">
                            {rec.staff.roleCategory?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {formatCurrency(rec.fixedSalary)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1 text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200" title="Present Days">
                              P: {rec.presentDays}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Half Days">
                              HD: {rec.halfDays}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200" title="Paid Leaves">
                              PL: {rec.paidLeaveDays}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200" title="Absent / Unpaid">
                              A: {rec.absentDays}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 font-bold" title="Effective Payable Days">
                              {rec.effectiveDays}/{rec.daysInMonth}d
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-900 font-semibold">
                          {formatCurrency(rec.calculatedBasic)}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700">
                          +{formatCurrency(rec.calculatedOtPay)}
                          {rec.totalOtHours > 0 && (
                            <span className="text-[10px] text-slate-400 block font-normal">({rec.totalOtHours}h OT)</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                          {formatCurrency(rec.netPayable)}
                        </td>
                        <td className="p-3 text-center">
                          {rec.paymentStatus === 'PAID' ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                              ✓ Disbursed
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedStaffForSalary(rec.staff);
                                setSalaryForm({
                                  staffId: rec.staff.id,
                                  monthYear: payrollMonthYear,
                                  disbursementDate: new Date().toISOString().split('T')[0],
                                  basicSalary: String(rec.calculatedBasic),
                                  bonus: String(rec.calculatedOtPay),
                                  deductions: '0',
                                  paymentMethod: rec.staff.paymentMode || 'BANK_TRANSFER',
                                  referenceNo: '',
                                  notes: `Salary computed for ${rec.effectiveDays} effective days & ${rec.totalOtHours} OT hours for ${payrollMonthYear}`,
                                });
                                setShowSalaryModal(true);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              Disburse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Historical Salary Disbursement Register & Vouchers */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Historical Salary Disbursement Register</h3>
                <p className="text-xs text-slate-500">Official payment vouchers posted to General Ledger</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                Total Disbursed: {formatCurrency(salaryPayments.reduce((s, p) => s + (p.netPaid || 0), 0))}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Voucher #</th>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role / Designation</th>
                    <th className="p-3">Salary Month</th>
                    <th className="p-3">Paid Date</th>
                    <th className="p-3">Payment Channel</th>
                    <th className="p-3 text-right">Basic (₹)</th>
                    <th className="p-3 text-right">Bonus (₹)</th>
                    <th className="p-3 text-right">Deductions (₹)</th>
                    <th className="p-3 text-right font-extrabold text-slate-900">Net Paid (₹)</th>
                    <th className="p-3 text-center">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaryPayments.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        No salary disbursement vouchers posted yet.
                      </td>
                    </tr>
                  ) : (
                    salaryPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-amber-700">{p.voucherNo || (p as any).paymentNumber || 'VOUCHER'}</td>
                        <td className="p-3 font-semibold text-slate-900">
                          {p.staff?.name || 'Staff'}
                          <span className="text-[10px] text-slate-400 block font-mono">{p.staff?.staffCode}</span>
                        </td>
                        <td className="p-3 text-slate-600">{p.staff?.designation || '-'}</td>
                        <td className="p-3 font-medium text-slate-800">{p.monthYear}</td>
                        <td className="p-3 text-slate-500">{formatDate(p.disbursementDate)}</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.paymentMethod === 'CASH'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(p.basicSalary)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">+{formatCurrency(p.bonus)}</td>
                        <td className="p-3 text-right font-mono text-rose-600">-{formatCurrency(p.deductions)}</td>
                        <td className="p-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                          {formatCurrency(p.netPaid)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedVoucher(p);
                              setShowVoucherModal(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[11px] transition"
                          >
                            View Slip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: UNIFIED CASH & BANK LEDGER STREAM
      ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-400 font-medium">Channel:</span>
                <select
                  value={ledgerChannelFilter}
                  onChange={(e) => setLedgerChannelFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Channels (Cash & Bank)</option>
                  <option value="CASH">Cash in Hand Only</option>
                  <option value="BANK">Bank Account / RTGS / UPI Only</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-400 font-medium">Flow:</span>
                <select
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Flows (Inflow & Outflow)</option>
                  <option value="INCOME">Income / Collections Only</option>
                  <option value="EXPENSE">Expenses / Outflows Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportGoogleSheets}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1 hover:bg-emerald-100 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV for Sheets</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type & Stream</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Title / Description</th>
                    <th className="p-3">Party / Beneficiary</th>
                    <th className="p-3">Project</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3 text-right text-emerald-800">Inflow (+)</th>
                    <th className="p-3 text-right text-rose-800">Outflow (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No transactions recorded in the ledger yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-600">{formatDate(tx.date)}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center space-x-1 ${
                            tx.type === 'INCOME'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {tx.type === 'INCOME' ? (
                            <ArrowDownRight className="w-3 h-3 text-emerald-600 mr-0.5" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-rose-600 mr-0.5" />
                          )}
                          <span>{tx.type}</span>
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{tx.category}</td>
                      <td className="p-3 font-semibold text-slate-900">{tx.title}</td>
                      <td className="p-3 text-slate-700">{tx.party}</td>
                      <td className="p-3 text-slate-500 font-medium">{tx.projectName || 'Corporate'}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            tx.channel === 'CASH'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {tx.channel} ({tx.paymentMode})
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {tx.inflow > 0 ? `+${formatCurrency(tx.inflow)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700">
                        {tx.outflow > 0 ? `-${formatCurrency(tx.outflow)}` : '-'}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: ADD STAFF MEMBER & FIX SALARY STRUCTURE
      ===================================================================== */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">Add Staff Member & Fix Salary Structure</h2>
              </div>
              <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 mt-4">
              {/* Profile Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar / Ananya Sharma"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role Hierarchy Category *</label>
                  <select
                    value={staffForm.roleCategory}
                    onChange={(e) => setStaffForm({ ...staffForm, roleCategory: e.target.value as StaffRoleCategory })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  >
                    <option value="EXECUTIVE">Executive (Owner, Managing Director, Partner)</option>
                    <option value="MANAGEMENT">Management (Project Manager, Technical Lead)</option>
                    <option value="TECHNICAL">Technical (Site Engineer, Architect, QA/QC)</option>
                    <option value="ACCOUNTS_ADMIN">Accounts & Admin (Accountant, HR Manager)</option>
                    <option value="SUPPORT_STAFF">Support Staff (Office Boy, Cleaner, Driver, Security)</option>
                    <option value="SITE_OPS">Site Operations (Storekeeper, Supervisor)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Designation / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Architect, Office Boy, Accountant"
                    value={staffForm.designation}
                    onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value.replace(/\s+/g, '') })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="staff@apexbuild.com"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={staffForm.joiningDate}
                    onChange={(e) => setStaffForm({ ...staffForm, joiningDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Residential Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Street, locality, city, pincode"
                  value={staffForm.address}
                  onChange={(e) => setStaffForm({ ...staffForm, address: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              {/* SALARY STRUCTURE & BREAKDOWN BUILDER */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Calculator className="w-4 h-4 text-amber-600" />
                      <span>Salary Structure & Compensation (Indian Payroll Rules)</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Standard Indian compensation: 50% Basic, 20% HRA, 30% Allowance, 12% PF, 0.75% ESI.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoCalcSalary('new')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm flex items-center space-x-1 shrink-0"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Auto-Calculate Breakdown</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Fixed Monthly CTC (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 35000"
                      value={staffForm.fixedSalary}
                      onChange={(e) => setStaffForm({ ...staffForm, fixedSalary: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Basic Salary (50%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 17500"
                      value={staffForm.basicSalary}
                      onChange={(e) => setStaffForm({ ...staffForm, basicSalary: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">HRA (20%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 7000"
                      value={staffForm.hra}
                      onChange={(e) => setStaffForm({ ...staffForm, hra: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Allowances</label>
                    <input
                      type="number"
                      placeholder="e.g. 10500"
                      value={staffForm.allowances}
                      onChange={(e) => setStaffForm({ ...staffForm, allowances: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                </div>

                {/* PF, ESI, Taxes & Working Rules */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/50">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">PF Number / UAN</label>
                    <input
                      type="text"
                      placeholder="e.g. MH/BAN/12345/67"
                      value={staffForm.pfNumber}
                      onChange={(e) => setStaffForm({ ...staffForm, pfNumber: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Employee PF %</label>
                    <input
                      type="number"
                      value={staffForm.pfEmployeePercent}
                      onChange={(e) => setStaffForm({ ...staffForm, pfEmployeePercent: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">ESI IP Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 3123456789"
                      value={staffForm.esiNumber}
                      onChange={(e) => setStaffForm({ ...staffForm, esiNumber: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Professional Tax (₹)</label>
                    <input
                      type="number"
                      value={staffForm.professionalTax}
                      onChange={(e) => setStaffForm({ ...staffForm, professionalTax: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                {/* Standard Days & Leaves */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Std Working Days / Mo</label>
                    <input
                      type="number"
                      value={staffForm.standardWorkingDays}
                      onChange={(e) => setStaffForm({ ...staffForm, standardWorkingDays: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Allowed Paid Leaves / Mo</label>
                    <input
                      type="number"
                      value={staffForm.paidLeavesAllowed}
                      onChange={(e) => setStaffForm({ ...staffForm, paidLeavesAllowed: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">PAN Card Number</label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={staffForm.panNumber}
                      onChange={(e) => setStaffForm({ ...staffForm, panNumber: e.target.value.toUpperCase() })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">TDS Deduction (₹/mo)</label>
                    <input
                      type="number"
                      value={staffForm.tdsDeduction}
                      onChange={(e) => setStaffForm({ ...staffForm, tdsDeduction: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ID Document & Upload */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Identity Document & Verification</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">ID Type</label>
                    <select
                      value={staffForm.idDocumentType}
                      onChange={(e) => setStaffForm({ ...staffForm, idDocumentType: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    >
                      <option value="AADHAR">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="EMPLOYMENT_AGREEMENT">Employment Agreement</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">ID Document Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 1234 5678 9012"
                      value={staffForm.idDocumentNumber}
                      onChange={(e) => setStaffForm({ ...staffForm, idDocumentNumber: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Upload Document Scan</label>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'staffDoc')}
                      disabled={isUploadingDoc}
                      className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 hover:file:bg-slate-300"
                    />
                    {isUploadingDoc && <span className="text-[10px] text-amber-600 block mt-0.5">Uploading...</span>}
                    {staffForm.documentUrl && <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Uploaded: {staffForm.documentName || 'Document'}</span>}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Salary Payment Mode & Bank Account</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Payment Mode</label>
                    <select
                      value={staffForm.paymentMode}
                      onChange={(e) => setStaffForm({ ...staffForm, paymentMode: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CASH">Cash in Hand</option>
                      <option value="UPI">UPI Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC / SBI"
                      value={staffForm.bankName}
                      onChange={(e) => setStaffForm({ ...staffForm, bankName: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 5010023456789"
                      value={staffForm.bankAccountNo}
                      onChange={(e) => setStaffForm({ ...staffForm, bankAccountNo: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">IFSC / UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234 or name@upi"
                      value={staffForm.bankIfsc || staffForm.upiId}
                      onChange={(e) => setStaffForm({ ...staffForm, bankIfsc: e.target.value, upiId: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Staff...' : 'Save Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1.5: EDIT STAFF MEMBER & SALARY STRUCTURE
      ===================================================================== */}
      {showEditStaffModal && editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-amber-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Edit Staff Profile: {editingStaff.name}</h2>
                  <span className="font-mono text-[10px] text-slate-400 font-bold">{editingStaff.staffCode}</span>
                </div>
              </div>
              <button onClick={() => setShowEditStaffModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 mt-4">
              {/* Profile Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editStaffForm.name}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role Hierarchy Category *</label>
                  <select
                    value={editStaffForm.roleCategory}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, roleCategory: e.target.value as StaffRoleCategory })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  >
                    <option value="EXECUTIVE">Executive (Owner, Managing Director, Partner)</option>
                    <option value="MANAGEMENT">Management (Project Manager, Technical Lead)</option>
                    <option value="TECHNICAL">Technical (Site Engineer, Architect, QA/QC)</option>
                    <option value="ACCOUNTS_ADMIN">Accounts & Admin (Accountant, HR Manager)</option>
                    <option value="SUPPORT_STAFF">Support Staff (Office Boy, Cleaner, Driver, Security)</option>
                    <option value="SITE_OPS">Site Operations (Storekeeper, Supervisor)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Designation / Title *</label>
                  <input
                    type="text"
                    required
                    value={editStaffForm.designation}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, designation: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editStaffForm.phone}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, phone: e.target.value.replace(/\s+/g, '') })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={editStaffForm.email}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={editStaffForm.joiningDate}
                    onChange={(e) => setEditStaffForm({ ...editStaffForm, joiningDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Residential Address *</label>
                <textarea
                  rows={2}
                  required
                  value={editStaffForm.address}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, address: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              {/* SALARY STRUCTURE & BREAKDOWN BUILDER */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Calculator className="w-4 h-4 text-amber-600" />
                      <span>Update Salary Structure & PF/ESI Details</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Standard Indian compensation: 50% Basic, 20% HRA, 30% Allowance, 12% PF, 0.75% ESI.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAutoCalcSalary('edit')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm flex items-center space-x-1 shrink-0"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Auto-Calculate Breakdown</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Fixed Monthly CTC (₹) *</label>
                    <input
                      type="number"
                      required
                      value={editStaffForm.fixedSalary}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, fixedSalary: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Basic Salary (50%)</label>
                    <input
                      type="number"
                      value={editStaffForm.basicSalary}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, basicSalary: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">HRA (20%)</label>
                    <input
                      type="number"
                      value={editStaffForm.hra}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, hra: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">Allowances</label>
                    <input
                      type="number"
                      value={editStaffForm.allowances}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, allowances: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800"
                    />
                  </div>
                </div>

                {/* PF, ESI, Taxes & Working Rules */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/50">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">PF Number / UAN</label>
                    <input
                      type="text"
                      placeholder="e.g. MH/BAN/12345/67"
                      value={editStaffForm.pfNumber}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, pfNumber: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Employee PF %</label>
                    <input
                      type="number"
                      value={editStaffForm.pfEmployeePercent}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, pfEmployeePercent: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">ESI IP Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 3123456789"
                      value={editStaffForm.esiNumber}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, esiNumber: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Professional Tax (₹)</label>
                    <input
                      type="number"
                      value={editStaffForm.professionalTax}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, professionalTax: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>

                {/* Standard Days & Leaves */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Std Working Days / Mo</label>
                    <input
                      type="number"
                      value={editStaffForm.standardWorkingDays}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, standardWorkingDays: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Allowed Paid Leaves / Mo</label>
                    <input
                      type="number"
                      value={editStaffForm.paidLeavesAllowed}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, paidLeavesAllowed: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">PAN Card Number</label>
                    <input
                      type="text"
                      value={editStaffForm.panNumber}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, panNumber: e.target.value.toUpperCase() })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">TDS Deduction (₹/mo)</label>
                    <input
                      type="number"
                      value={editStaffForm.tdsDeduction}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, tdsDeduction: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ID Document & Upload */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Identity Document & Verification</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">ID Type</label>
                    <select
                      value={editStaffForm.idDocumentType}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, idDocumentType: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    >
                      <option value="AADHAR">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="EMPLOYMENT_AGREEMENT">Employment Agreement</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">ID Document Number</label>
                    <input
                      type="text"
                      value={editStaffForm.idDocumentNumber}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, idDocumentNumber: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Upload New Document Scan</label>
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, 'editStaffDoc')}
                      disabled={isUploadingDoc}
                      className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 hover:file:bg-slate-300"
                    />
                    {editStaffForm.documentUrl && (
                      <span className="text-[10px] text-emerald-600 block mt-0.5">
                        ✓ Current Document Available ({editStaffForm.documentName || 'Scan'})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Salary Payment Mode & Bank Account</span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Payment Mode</label>
                    <select
                      value={editStaffForm.paymentMode}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, paymentMode: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CASH">Cash in Hand</option>
                      <option value="UPI">UPI Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      value={editStaffForm.bankName}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, bankName: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Account Number</label>
                    <input
                      type="text"
                      value={editStaffForm.bankAccountNo}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, bankAccountNo: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">IFSC / UPI ID</label>
                    <input
                      type="text"
                      value={editStaffForm.bankIfsc || editStaffForm.upiId}
                      onChange={(e) => setEditStaffForm({ ...editStaffForm, bankIfsc: e.target.value, upiId: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditStaffModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1.6: DELETE STAFF CONFIRMATION DIALOG
      ===================================================================== */}
      {showDeleteConfirm && staffToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Archive / Delete Staff Member</h3>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong className="text-slate-900">{staffToDelete.name}</strong> ({staffToDelete.staffCode}) from the active staff directory?
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
              <div>Designation: <span className="font-bold text-slate-800">{staffToDelete.designation}</span></div>
              <div>Fixed Salary: <span className="font-mono font-bold text-slate-800">{formatCurrency(staffToDelete.fixedSalary)}</span></div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setStaffToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1.7: STAFF PROFILE & DOCUMENT DOSSIER
      ===================================================================== */}
      {showDossierModal && dossierStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-400 block">{dossierStaff.staffCode}</span>
                <h3 className="text-base font-bold text-slate-900">{dossierStaff.name}</h3>
                <span className="text-xs text-amber-600 font-semibold">{dossierStaff.designation}</span>
              </div>
              <button onClick={() => setShowDossierModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compensation Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Fixed Monthly CTC:</span>
                <strong className="font-mono font-bold text-slate-900">{formatCurrency(dossierStaff.fixedSalary)}</strong>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Basic / HRA / Allowance:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(dossierStaff.basicSalary || dossierStaff.fixedSalary * 0.5)} / {formatCurrency(dossierStaff.hra || dossierStaff.fixedSalary * 0.2)} / {formatCurrency(dossierStaff.allowances || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>PF Account / UAN:</span>
                <span className="font-mono font-bold text-blue-700">{dossierStaff.pfNumber || 'Not configured'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>ESI IP Number:</span>
                <span className="font-mono font-bold text-emerald-700">{dossierStaff.esiNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Standard Working Days / Leaves:</span>
                <span className="font-semibold text-slate-800">{dossierStaff.standardWorkingDays || 26}d std • {dossierStaff.paidLeavesAllowed ?? 1} paid leave/mo</span>
              </div>
            </div>

            {/* Document Card */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2 text-xs">
              <span className="font-bold text-blue-950 block">Uploaded Identity Documents</span>
              {dossierStaff.panNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">PAN Card:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {dossierStaff.panNumber}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-600">{dossierStaff.idDocumentType}:</span>
                <span className="font-mono font-bold text-slate-900">
                  {dossierStaff.idDocumentNumber || 'Verified'}
                </span>
              </div>

              {dossierStaff.documentUrl ? (
                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 truncate max-w-[200px]">
                    {dossierStaff.documentName || 'Document Scan File'}
                  </span>
                  <a
                    href={dossierStaff.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View / Download</span>
                  </a>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 block pt-1 italic">
                  No scan document file uploaded yet. Click Edit to upload.
                </span>
              )}
            </div>

            {/* Contact & Banking */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div>Phone: <strong className="text-slate-800">{dossierStaff.phone}</strong></div>
              {dossierStaff.email && <div>Email: <strong className="text-slate-800">{dossierStaff.email}</strong></div>}
              <div>Address: <span className="text-slate-700">{dossierStaff.address}</span></div>
              <div className="pt-1 border-t border-slate-200 text-[11px]">
                Payment: <strong className="text-slate-800">{dossierStaff.paymentMode}</strong> • {dossierStaff.bankName || 'A/C'} •••••{dossierStaff.bankAccountNo ? dossierStaff.bankAccountNo.slice(-4) : 'N/A'} {dossierStaff.bankIfsc ? `(${dossierStaff.bankIfsc})` : ''}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowDossierModal(false);
                  handleStartEdit(dossierStaff);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1"
              >
                <Edit className="w-3 h-3" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1.8: QUICK 1-CLICK CELL ATTENDANCE POPUP
      ===================================================================== */}
      {showCellModal && selectedCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedCell.staffName}</h3>
                <span className="text-xs text-amber-600 font-bold block">{selectedCell.dateStr} (Day {selectedCell.dayNum})</span>
              </div>
              <button onClick={() => setShowCellModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Future Date Indicator */}
            {new Date(selectedCell.dateStr) > new Date() && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                ℹ️ <strong>Future Date:</strong> Planned absence or leave can be recorded in advance. Present / Half-Day are blocked for future dates.
              </div>
            )}

            {/* Quick Status Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">Choose Status:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={new Date(selectedCell.dateStr) > new Date()}
                  onClick={() => handleSaveCellStatus('PRESENT', 0)}
                  className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs text-left transition disabled:opacity-40"
                >
                  <span className="block text-emerald-800">✓ Present</span>
                  <span className="text-[10px] text-emerald-600 font-normal">Full Day (8 hrs)</span>
                </button>

                <button
                  type="button"
                  disabled={new Date(selectedCell.dateStr) > new Date()}
                  onClick={() => handleSaveCellStatus('HALF_DAY', 0)}
                  className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs text-left transition disabled:opacity-40"
                >
                  <span className="block text-amber-800">◐ Half Day</span>
                  <span className="text-[10px] text-amber-600 font-normal">0.5 day (4 hrs)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCellStatus('PAID_LEAVE', 0, 'Planned / Approved Leave')}
                  className="p-2.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs text-left transition"
                >
                  <span className="block text-blue-800">★ Paid Leave</span>
                  <span className="text-[10px] text-blue-600 font-normal">No salary loss</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCellStatus('ABSENT', 0, 'Absent / Unpaid Leave')}
                  className="p-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold text-xs text-left transition"
                >
                  <span className="block text-rose-800">✕ Absent</span>
                  <span className="text-[10px] text-rose-600 font-normal">Loss of Pay (LOP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCellStatus('HOLIDAY', 0, 'Official Holiday / Off')}
                  className="col-span-2 p-2 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs text-center transition"
                >
                  🌴 Holiday / Weekly Off (Sunday)
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCellModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: RECORD OFFICE OVERHEAD EXPENSE (RENT, BILLS, PANTRY)
      ===================================================================== */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">Record Office Overhead Expense</h2>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as OfficeExpenseCategory })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                >
                  <option value="RENT">Office Rent</option>
                  <option value="ELECTRICITY">Electricity & Power Bill</option>
                  <option value="INTERNET_PHONE">Internet & Phone Bill</option>
                  <option value="OFFICE_SUPPLIES">Office Supplies & Stationery</option>
                  <option value="PANTRY_BEVERAGES">Pantry, Tea, Coffee & Refreshments</option>
                  <option value="REPAIR_MAINTENANCE">Office Repair & Maintenance</option>
                  <option value="SOFTWARE_SUBSCRIPTIONS">Software & ERP Cloud Subscriptions</option>
                  <option value="LEGAL_PROFESSIONAL">Legal & CA Professional Fees</option>
                  <option value="OTHER">Other Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Rent for October 2026 / BESCOM Power Bill"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Paid To (Vendor / Landlord) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Skyline Properties / BESCOM"
                    value={expenseForm.paidTo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 75000"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method *</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Account (NEFT / RTGS)</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reference / Bill / UTR #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-987123"
                    value={expenseForm.referenceNo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, referenceNo: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Upload Bill / Receipt</label>
                  <input
                    type="file"
                    onChange={(e) => handleFileUpload(e, 'expenseReceipt')}
                    disabled={isUploadingDoc}
                    className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 hover:file:bg-slate-300"
                  />
                  {expenseForm.receiptUrl && <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Uploaded</span>}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: DISBURSE SALARY (VOUCHER GENERATOR)
      ===================================================================== */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">Disburse Staff Salary Voucher</h2>
              </div>
              <button onClick={() => setShowSalaryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisburseSalary} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Staff Member *</label>
                <select
                  required
                  value={salaryForm.staffId}
                  onChange={(e) => {
                    const st = staffList.find((s) => s.id === e.target.value);
                    setSalaryForm({
                      ...salaryForm,
                      staffId: e.target.value,
                      basicSalary: st ? String(st.fixedSalary) : salaryForm.basicSalary,
                      paymentMethod: st?.paymentMode || 'BANK_TRANSFER',
                    });
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.staffCode} - {s.name} ({s.designation}) - ₹{s.fixedSalary}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Salary Month / Period *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. October 2026"
                    value={salaryForm.monthYear}
                    onChange={(e) => setSalaryForm({ ...salaryForm, monthYear: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={salaryForm.disbursementDate}
                    onChange={(e) => setSalaryForm({ ...salaryForm, disbursementDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Attendance Auto-Calculation Helper */}
              {(() => {
                const activePayrollRec = payrollSummary?.records?.find(
                  (r: any) => r.staff?.id === salaryForm.staffId
                );
                if (!activePayrollRec) return null;
                return (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold flex items-center space-x-1 text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Attendance Sync ({activePayrollRec.daysInMonth}d Month):</span>
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        {activePayrollRec.effectiveDays} effective days | {activePayrollRec.totalOtHours}h OT | Basic: ₹{activePayrollRec.calculatedBasic} | OT Pay: ₹{activePayrollRec.calculatedOtPay}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSalaryForm((prev) => ({
                          ...prev,
                          basicSalary: String(activePayrollRec.calculatedBasic),
                          bonus: String(activePayrollRec.calculatedOtPay),
                          notes: `Salary computed for ${activePayrollRec.effectiveDays} effective days & ${activePayrollRec.totalOtHours} OT hrs for ${salaryForm.monthYear}`,
                        }));
                      }}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] transition shrink-0 shadow-sm"
                    >
                      Sync Attendance Figures
                    </button>
                  </div>
                );
              })()}

              {/* Salary Breakdown: Basic + Bonus - Deductions */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Basic Salary (₹)</label>
                    <input
                      type="number"
                      required
                      value={salaryForm.basicSalary}
                      onChange={(e) => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Incentive / Bonus (₹)</label>
                    <input
                      type="number"
                      value={salaryForm.bonus}
                      onChange={(e) => setSalaryForm({ ...salaryForm, bonus: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Deductions (₹)</label>
                    <input
                      type="number"
                      value={salaryForm.deductions}
                      onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-rose-700"
                    />
                  </div>
                </div>

                {/* Net Payable Calculation */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Net Disbursed Amount:</span>
                  <strong className="text-base font-mono font-extrabold text-slate-900">
                    {formatCurrency(
                      Math.max(
                        0,
                        (Number(salaryForm.basicSalary) || 0) +
                          (Number(salaryForm.bonus) || 0) -
                          (Number(salaryForm.deductions) || 0)
                      )
                    )}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method *</label>
                  <select
                    value={salaryForm.paymentMethod}
                    onChange={(e) => setSalaryForm({ ...salaryForm, paymentMethod: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Account (NEFT/RTGS)</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-23489"
                    value={salaryForm.referenceNo}
                    onChange={(e) => setSalaryForm({ ...salaryForm, referenceNo: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Disbursing...' : 'Disburse & Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: PRINTABLE SALARY SLIP / VOUCHER VIEW
      ===================================================================== */}
      {showVoucherModal && selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-amber-600 block">{selectedVoucher.voucherNo}</span>
                <h3 className="text-base font-bold text-slate-900">Official Staff Salary Voucher</h3>
              </div>
              <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div>
                  <strong className="text-sm font-bold text-slate-900 block">{selectedVoucher.staff?.name}</strong>
                  <span className="text-slate-500">{selectedVoucher.staff?.designation} • {selectedVoucher.staff?.staffCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Salary Period</span>
                  <span className="font-bold text-slate-800">{selectedVoucher.monthYear}</span>
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Basic Fixed Salary:</span>
                  <span className="font-mono font-semibold">{formatCurrency(selectedVoucher.basicSalary)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Incentive / Bonus:</span>
                  <span className="font-mono font-semibold text-emerald-600">+{formatCurrency(selectedVoucher.bonus)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Deductions:</span>
                  <span className="font-mono font-semibold text-rose-600">-{formatCurrency(selectedVoucher.deductions)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                  <span>Net Disbursed:</span>
                  <span className="font-mono text-emerald-700">{formatCurrency(selectedVoucher.netPaid)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-[11px] text-slate-600">
                <div>Paid via: <span className="font-bold text-slate-800">{selectedVoucher.paymentMethod}</span></div>
                {selectedVoucher.referenceNo && <div>Reference / UTR #: <span className="font-mono font-bold text-slate-800">{selectedVoucher.referenceNo}</span></div>}
                <div>Disbursed Date: <span className="font-medium">{formatDate(selectedVoucher.disbursementDate)}</span></div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeManagement;

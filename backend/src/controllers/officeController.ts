import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { postBalancedJournalEntry, COA } from '../utils/accounting';
import { normalizeAttendanceDate, isFutureDate } from './labourController';
import { getTenantFilter } from '../utils/tenant';

// ======================================================================
// 1. Office Staff Management
// ======================================================================

export const getStaffList = async (req: Request, res: Response) => {
  try {
    const { roleCategory, isActive, search } = req.query;

    const where: any = { ...getTenantFilter(req) };
    if (roleCategory && typeof roleCategory === 'string') {
      where.roleCategory = roleCategory;
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    if (search && typeof search === 'string') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search } },
            { staffCode: { contains: search } },
            { phone: { contains: search } },
            { designation: { contains: search } },
          ],
        },
      ];
    }

    const staff = await prisma.officeStaff.findMany({
      where,
      include: {
        _count: { select: { salaryPayments: true } },
        salaryPayments: {
          take: 3,
          orderBy: { disbursementDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalStaff = staff.length;
    const activeStaff = staff.filter((s) => s.isActive).length;
    const totalMonthlySalaryLiability = staff
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + (s.fixedSalary || 0), 0);

    return res.json({
      success: true,
      staff,
      summary: {
        totalStaff,
        activeStaff,
        totalMonthlySalaryLiability,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    let {
      name,
      roleCategory,
      designation,
      phone,
      email,
      address,
      idDocumentType,
      idDocumentNumber,
      panNumber,
      documentUrl,
      documentName,
      documentsJson,
      photoUrl,
      joiningDate,
      fixedSalary,
      basicSalary,
      hra,
      allowances,
      pfNumber,
      pfEmployeePercent,
      pfEmployerPercent,
      esiNumber,
      esiPercent,
      professionalTax,
      tdsDeduction,
      standardWorkingDays,
      paidLeavesAllowed,
      paymentMode,
      bankName,
      bankAccountNo,
      bankIfsc,
      upiId,
      notes,
    } = req.body;

    if (!name || !designation || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, designation, phone, and address are required.',
      });
    }

    // Process uploaded files if multipart
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files['photo'] && files['photo'][0]) {
        photoUrl = `/uploads/${files['photo'][0].filename}`;
      }
      if (files['document'] && files['document'][0]) {
        documentUrl = `/uploads/${files['document'][0].filename}`;
        if (!documentName) {
          documentName = files['document'][0].originalname;
        }
      }
    }

    const gross = Number(fixedSalary) || 0;
    const basic = basicSalary !== undefined && basicSalary !== '' ? Number(basicSalary) : Math.round(gross * 0.5);
    const hraVal = hra !== undefined && hra !== '' ? Number(hra) : Math.round(gross * 0.2);
    const allowVal = allowances !== undefined && allowances !== '' ? Number(allowances) : Math.max(0, gross - basic - hraVal);

    // Auto-generate staff code: STF-001, STF-002, scoped by tenant
    const allStaff = await prisma.officeStaff.findMany({
      where: getTenantFilter(req),
      select: { staffCode: true }
    });
    let maxNum = 0;
    for (const s of allStaff) {
      if (s.staffCode && s.staffCode.startsWith('STF-')) {
        const num = parseInt(s.staffCode.replace('STF-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const staffCode = `STF-${String(maxNum + 1).padStart(3, '0')}`;
    const tenantId = req.user?.companyId || null;

    const cleanedPhone = phone ? String(phone).replace(/\s+/g, '').trim() : '';

    const staff = await prisma.officeStaff.create({
      data: {
        tenantId,
        staffCode,
        name: String(name).trim(),
        roleCategory: roleCategory || 'SUPPORT_STAFF',
        designation: String(designation).trim(),
        phone: cleanedPhone,
        email: email ? String(email).trim() : null,
        address: String(address).trim(),
        idDocumentType: idDocumentType || 'AADHAR',
        idDocumentNumber: idDocumentNumber ? String(idDocumentNumber).trim() : null,
        panNumber: panNumber ? String(panNumber).trim().toUpperCase() : null,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        documentsJson: documentsJson ? (typeof documentsJson === 'string' ? documentsJson : JSON.stringify(documentsJson)) : null,
        photoUrl: photoUrl || null,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        fixedSalary: gross,
        basicSalary: basic,
        hra: hraVal,
        allowances: allowVal,
        pfNumber: pfNumber ? String(pfNumber).trim() : null,
        pfEmployeePercent: pfEmployeePercent !== undefined && pfEmployeePercent !== '' ? Number(pfEmployeePercent) : (pfNumber ? 12 : 0),
        pfEmployerPercent: pfEmployerPercent !== undefined && pfEmployerPercent !== '' ? Number(pfEmployerPercent) : (pfNumber ? 12 : 0),
        esiNumber: esiNumber ? String(esiNumber).trim() : null,
        esiPercent: esiPercent !== undefined && esiPercent !== '' ? Number(esiPercent) : (esiNumber ? 0.75 : 0),
        professionalTax: professionalTax !== undefined && professionalTax !== '' ? Number(professionalTax) : 200,
        tdsDeduction: tdsDeduction !== undefined && tdsDeduction !== '' ? Number(tdsDeduction) : 0,
        standardWorkingDays: standardWorkingDays ? Number(standardWorkingDays) : 26,
        paidLeavesAllowed: paidLeavesAllowed !== undefined && paidLeavesAllowed !== '' ? Number(paidLeavesAllowed) : 1,
        paymentMode: paymentMode || 'BANK_TRANSFER',
        bankName: bankName ? String(bankName).trim() : null,
        bankAccountNo: bankAccountNo ? String(bankAccountNo).trim() : null,
        bankIfsc: bankIfsc ? String(bankIfsc).trim() : null,
        upiId: upiId ? String(upiId).trim() : null,
        notes: notes ? String(notes).trim() : null,
      },
    });

    await logAudit(req.user?.id, 'CREATE_STAFF', 'OFFICE_STAFF', staff.id, { staffCode, name, designation }, req.ip);

    return res.status(201).json({ success: true, staff });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStaff = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const data = req.body;

    const existing = await prisma.officeStaff.findFirst({
      where: { id, ...getTenantFilter(req) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Staff record not found.' });
    }

    let photoUrl = data.photoUrl !== undefined ? data.photoUrl : existing.photoUrl;
    let documentUrl = data.documentUrl !== undefined ? data.documentUrl : existing.documentUrl;
    let documentName = data.documentName !== undefined ? data.documentName : existing.documentName;

    // Process files if uploaded
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files['photo'] && files['photo'][0]) {
        photoUrl = `/uploads/${files['photo'][0].filename}`;
      }
      if (files['document'] && files['document'][0]) {
        documentUrl = `/uploads/${files['document'][0].filename}`;
        if (!documentName) {
          documentName = files['document'][0].originalname;
        }
      }
    }

    const gross = data.fixedSalary !== undefined && data.fixedSalary !== '' ? Number(data.fixedSalary) : existing.fixedSalary;
    const basic = data.basicSalary !== undefined && data.basicSalary !== '' ? Number(data.basicSalary) : existing.basicSalary;
    const hraVal = data.hra !== undefined && data.hra !== '' ? Number(data.hra) : existing.hra;
    const allowVal = data.allowances !== undefined && data.allowances !== '' ? Number(data.allowances) : existing.allowances;

    const updated = await prisma.officeStaff.update({
      where: { id: existing.id },
      data: {
        name: data.name !== undefined ? String(data.name).trim() : undefined,
        roleCategory: data.roleCategory !== undefined ? data.roleCategory : undefined,
        designation: data.designation !== undefined ? String(data.designation).trim() : undefined,
        phone: data.phone !== undefined ? String(data.phone).replace(/\s+/g, '').trim() : undefined,
        email: data.email !== undefined ? (data.email ? String(data.email).trim() : null) : undefined,
        address: data.address !== undefined ? String(data.address).trim() : undefined,
        idDocumentType: data.idDocumentType !== undefined ? data.idDocumentType : undefined,
        idDocumentNumber: data.idDocumentNumber !== undefined ? (data.idDocumentNumber ? String(data.idDocumentNumber).trim() : null) : undefined,
        panNumber: data.panNumber !== undefined ? (data.panNumber ? String(data.panNumber).trim().toUpperCase() : null) : undefined,
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        documentsJson: data.documentsJson !== undefined ? (typeof data.documentsJson === 'string' ? data.documentsJson : JSON.stringify(data.documentsJson)) : undefined,
        photoUrl: photoUrl || null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
        fixedSalary: gross,
        basicSalary: basic,
        hra: hraVal,
        allowances: allowVal,
        pfNumber: data.pfNumber !== undefined ? (data.pfNumber ? String(data.pfNumber).trim() : null) : undefined,
        pfEmployeePercent: data.pfEmployeePercent !== undefined && data.pfEmployeePercent !== '' ? Number(data.pfEmployeePercent) : undefined,
        pfEmployerPercent: data.pfEmployerPercent !== undefined && data.pfEmployerPercent !== '' ? Number(data.pfEmployerPercent) : undefined,
        esiNumber: data.esiNumber !== undefined ? (data.esiNumber ? String(data.esiNumber).trim() : null) : undefined,
        esiPercent: data.esiPercent !== undefined && data.esiPercent !== '' ? Number(data.esiPercent) : undefined,
        professionalTax: data.professionalTax !== undefined && data.professionalTax !== '' ? Number(data.professionalTax) : undefined,
        tdsDeduction: data.tdsDeduction !== undefined && data.tdsDeduction !== '' ? Number(data.tdsDeduction) : undefined,
        standardWorkingDays: data.standardWorkingDays !== undefined && data.standardWorkingDays !== '' ? Number(data.standardWorkingDays) : undefined,
        paidLeavesAllowed: data.paidLeavesAllowed !== undefined && data.paidLeavesAllowed !== '' ? Number(data.paidLeavesAllowed) : undefined,
        paymentMode: data.paymentMode !== undefined ? data.paymentMode : undefined,
        bankName: data.bankName !== undefined ? (data.bankName ? String(data.bankName).trim() : null) : undefined,
        bankAccountNo: data.bankAccountNo !== undefined ? (data.bankAccountNo ? String(data.bankAccountNo).trim() : null) : undefined,
        bankIfsc: data.bankIfsc !== undefined ? (data.bankIfsc ? String(data.bankIfsc).trim() : null) : undefined,
        upiId: data.upiId !== undefined ? (data.upiId ? String(data.upiId).trim() : null) : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
        notes: data.notes !== undefined ? (data.notes ? String(data.notes).trim() : null) : undefined,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_STAFF', 'OFFICE_STAFF', id, { name: updated.name }, req.ip);

    return res.json({ success: true, staff: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const staff = await prisma.officeStaff.findFirst({
      where: { id, ...getTenantFilter(req) },
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff record not found.' });
    }

    await prisma.officeStaff.delete({ where: { id: staff.id } });

    await logAudit(req.user?.id, 'DELETE_STAFF', 'OFFICE_STAFF', id, { name: staff.name, code: staff.staffCode }, req.ip);

    return res.json({ success: true, message: `Staff member ${staff.name} deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================================
// 2. Staff Payroll & Salary Disbursements
// ======================================================================

export const getSalaryPayments = async (req: Request, res: Response) => {
  try {
    const { staffId, monthYear, paymentMethod } = req.query;

    const where: any = {
      staff: { ...getTenantFilter(req) },
    };
    if (staffId && typeof staffId === 'string') where.staffId = staffId;
    if (monthYear && typeof monthYear === 'string') where.monthYear = monthYear;
    if (paymentMethod && typeof paymentMethod === 'string') where.paymentMethod = paymentMethod;

    const payments = await prisma.staffSalaryPayment.findMany({
      where,
      include: {
        staff: true,
      },
      orderBy: { disbursementDate: 'desc' },
    });

    const totalDisbursed = payments.reduce((sum, p) => sum + p.netPaid, 0);
    const cashDisbursed = payments
      .filter((p) => p.paymentMethod === 'CASH')
      .reduce((sum, p) => sum + p.netPaid, 0);
    const bankDisbursed = payments
      .filter((p) => p.paymentMethod !== 'CASH')
      .reduce((sum, p) => sum + p.netPaid, 0);

    return res.json({
      success: true,
      payments,
      summary: {
        totalDisbursed,
        cashDisbursed,
        bankDisbursed,
        count: payments.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const disburseSalary = async (req: Request, res: Response) => {
  try {
    const {
      staffId,
      monthYear,
      disbursementDate,
      basicSalary,
      bonus,
      deductions,
      paymentMethod,
      referenceNo,
      notes,
    } = req.body;

    if (!staffId || !monthYear || basicSalary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Staff member, month/year, and basic salary are required.',
      });
    }

    const staff = await prisma.officeStaff.findFirst({
      where: { id: staffId, ...getTenantFilter(req) },
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff record not found.' });
    }

    const basic = Number(basicSalary) || 0;
    const bon = Number(bonus) || 0;
    const ded = Number(deductions) || 0;
    const netPaid = Math.max(0, basic + bon - ded);
    const method = paymentMethod || staff.paymentMode || 'BANK_TRANSFER';

    const count = await prisma.staffSalaryPayment.count({
      where: { staff: { ...getTenantFilter(req) } },
    });
    const paymentNumber = `SAL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const tenantId = staff.tenantId || req.user?.companyId || null;

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.staffSalaryPayment.create({
        data: {
          paymentNumber,
          staffId,
          monthYear: String(monthYear).trim(),
          disbursementDate: disbursementDate ? new Date(disbursementDate) : new Date(),
          basicSalary: basic,
          bonus: bon,
          deductions: ded,
          netPaid,
          paymentMethod: method,
          referenceNo: referenceNo ? String(referenceNo).trim() : null,
          notes: notes ? String(notes).trim() : null,
          status: 'PAID',
        },
        include: { staff: true },
      });

      // Post Double-Entry Journal Entry
      const creditAccountCode = method === 'CASH' ? COA.CASH : COA.HDFC_BANK;
      await postBalancedJournalEntry({
        entryDate: created.disbursementDate,
        referenceType: 'WAGE_PAYMENT',
        referenceId: created.id,
        narration: `Monthly staff salary disbursed to ${staff.name} (${staff.designation}) for ${monthYear} via ${method}`,
        createdById: req.user?.id,
        tenantId,
        lines: [
          {
            accountCode: COA.ADMIN_EXPENSE, // Debit Salary Overhead Expense
            debit: netPaid,
            credit: 0,
          },
          {
            accountCode: creditAccountCode, // Credit Cash or Bank
            debit: 0,
            credit: netPaid,
          },
        ],
        tx,
      });

      return created;
    }, { timeout: 15000 });

    await logAudit(req.user?.id, 'DISBURSE_SALARY', 'STAFF_SALARY', payment.id, { staffName: staff.name, netPaid, paymentNumber }, req.ip);

    return res.status(201).json({ success: true, payment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSalaryPayment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { paymentMethod, referenceNo, notes, disbursementDate } = req.body;

    const existing = await prisma.staffSalaryPayment.findFirst({
      where: { id, staff: { ...getTenantFilter(req) } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Salary payment not found.' });
    }

    const updated = await prisma.staffSalaryPayment.update({
      where: { id },
      data: {
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existing.paymentMethod,
        referenceNo: referenceNo !== undefined ? referenceNo : existing.referenceNo,
        notes: notes !== undefined ? notes : existing.notes,
        disbursementDate: disbursementDate ? new Date(disbursementDate) : existing.disbursementDate,
      },
      include: { staff: true },
    });

    await logAudit(req.user?.id, 'UPDATE_SALARY_PAYMENT', 'STAFF_SALARY', id, { paymentNumber: updated.paymentNumber }, req.ip);

    return res.json({ success: true, payment: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSalaryPayment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const payment = await prisma.staffSalaryPayment.findFirst({
      where: { id, staff: { ...getTenantFilter(req) } },
      include: { staff: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Salary payment record not found.' });
    }

    await prisma.$transaction(async (tx) => {
      // Delete associated journal entry
      await tx.journalEntry.deleteMany({
        where: {
          referenceType: 'WAGE_PAYMENT',
          referenceId: id,
        },
      });

      await tx.staffSalaryPayment.delete({ where: { id } });
    });

    await logAudit(req.user?.id, 'DELETE_SALARY_PAYMENT', 'STAFF_SALARY', id, {
      staffName: (payment as any).staff?.name,
      paymentNumber: payment.paymentNumber,
      amount: payment.netPaid,
    }, req.ip);

    return res.json({ success: true, message: `Salary payment ${payment.paymentNumber} deleted and journal entry reversed.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ======================================================================
// 3. Office Expenses (Rent, Utilities, Supplies, Pantry, Software)
// ======================================================================

export const getOfficeExpenses = async (req: Request, res: Response) => {
  try {
    const { category, periodMonth, paymentMethod, startDate, endDate } = req.query;

    const where: any = { ...getTenantFilter(req) };
    if (category && typeof category === 'string') where.category = category;
    if (periodMonth && typeof periodMonth === 'string') where.periodMonth = periodMonth;
    if (paymentMethod && typeof paymentMethod === 'string') where.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate && typeof startDate === 'string') where.expenseDate.gte = new Date(startDate);
      if (endDate && typeof endDate === 'string') where.expenseDate.lte = new Date(endDate);
    }

    const expenses = await prisma.officeExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const cashExpenses = expenses
      .filter((e) => e.paymentMethod === 'CASH')
      .reduce((sum, e) => sum + e.amount, 0);
    const bankExpenses = expenses
      .filter((e) => e.paymentMethod !== 'CASH')
      .reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const byCategory: Record<string, number> = {};
    for (const exp of expenses) {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    }

    return res.json({
      success: true,
      expenses,
      summary: {
        totalAmount,
        cashExpenses,
        bankExpenses,
        byCategory,
        count: expenses.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createOfficeExpense = async (req: Request, res: Response) => {
  try {
    const {
      category,
      title,
      description,
      expenseDate,
      amount,
      paymentMethod,
      paidTo,
      referenceNo,
      periodMonth,
      receiptUrl,
    } = req.body;

    const expAmount = Number(amount);
    if (!category || !title || !paidTo || expAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Category, title, paidTo, and positive amount are required.',
      });
    }

    const count = await prisma.officeExpense.count({ where: getTenantFilter(req) });
    const expenseNumber = `OFF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const method = paymentMethod || 'BANK_TRANSFER';
    const tenantId = req.user?.companyId || null;

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.officeExpense.create({
        data: {
          tenantId,
          expenseNumber,
          category,
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          amount: expAmount,
          paymentMethod: method,
          paidTo: String(paidTo).trim(),
          referenceNo: referenceNo ? String(referenceNo).trim() : null,
          periodMonth: periodMonth ? String(periodMonth).trim() : null,
          receiptUrl: receiptUrl || null,
          status: 'PAID',
        },
      });

      // Post double-entry accounting
      const creditAccountCode = method === 'CASH' ? COA.CASH : COA.HDFC_BANK;
      await postBalancedJournalEntry({
        entryDate: created.expenseDate,
        referenceType: 'EXPENSE',
        referenceId: created.id,
        narration: `Office Expense [${category}]: ${title} paid to ${paidTo} via ${method}`,
        createdById: req.user?.id,
        tenantId,
        lines: [
          {
            accountCode: COA.ADMIN_EXPENSE, // Debit Office Overhead Expense
            debit: expAmount,
            credit: 0,
          },
          {
            accountCode: creditAccountCode, // Credit Cash or Bank Account
            debit: 0,
            credit: expAmount,
          },
        ],
        tx,
      });

      return created;
    }, { timeout: 15000 });

    await logAudit(req.user?.id, 'CREATE_OFFICE_EXPENSE', 'OFFICE_EXPENSE', expense.id, { expenseNumber, title, amount: expAmount }, req.ip);

    return res.status(201).json({ success: true, expense });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOfficeExpense = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const data = req.body;

    const existing = await prisma.officeExpense.findFirst({
      where: { id, ...getTenantFilter(req) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense record not found.' });
    }

    const updated = await prisma.officeExpense.update({
      where: { id: existing.id },
      data: {
        category: data.category !== undefined ? data.category : undefined,
        title: data.title !== undefined ? String(data.title).trim() : undefined,
        description: data.description !== undefined ? data.description : undefined,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        paymentMethod: data.paymentMethod !== undefined ? data.paymentMethod : undefined,
        paidTo: data.paidTo !== undefined ? String(data.paidTo).trim() : undefined,
        referenceNo: data.referenceNo !== undefined ? data.referenceNo : undefined,
        periodMonth: data.periodMonth !== undefined ? data.periodMonth : undefined,
        receiptUrl: data.receiptUrl !== undefined ? data.receiptUrl : undefined,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_OFFICE_EXPENSE', 'OFFICE_EXPENSE', id, { title: updated.title }, req.ip);

    return res.json({ success: true, expense: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOfficeExpense = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const exp = await prisma.officeExpense.findFirst({
      where: { id, ...getTenantFilter(req) },
    });
    if (!exp) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    await prisma.officeExpense.delete({ where: { id: exp.id } });

    await logAudit(req.user?.id, 'DELETE_OFFICE_EXPENSE', 'OFFICE_EXPENSE', id, { expenseNumber: exp.expenseNumber }, req.ip);

    return res.json({ success: true, message: `Expense ${exp.expenseNumber} deleted.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================================
// 4. Overall Corporate Financials & Combined Company Ledger
// ======================================================================

export const getCompanyOverallFinancials = async (req: Request, res: Response) => {
  try {
    const tenantFilter = getTenantFilter(req);

    // 1. Fetch all financial streams concurrently scoped by tenant
    const [
      projects,
      invoices,
      clientReceipts,
      supplierPayments,
      wagePayments,
      siteExpenses,
      officeExpenses,
      staffSalaries,
    ] = await Promise.all([
      prisma.project.findMany({
        where: tenantFilter,
        select: {
          id: true,
          code: true,
          name: true,
          contractValue: true,
          clientName: true,
        },
      }),
      prisma.clientInvoice.findMany({
        where: tenantFilter,
        select: {
          id: true,
          projectId: true,
          netInvoiceAmount: true,
          paidAmount: true,
          balanceDue: true,
        },
      }),
      prisma.clientReceipt.findMany({
        where: tenantFilter,
        include: {
          client: { select: { name: true } },
          project: { select: { id: true, code: true, name: true, clientName: true } },
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { receiptDate: 'desc' },
      }),
      prisma.supplierPayment.findMany({
        where: tenantFilter,
        include: {
          supplier: { select: { name: true } },
          invoice: { select: { invoiceNumber: true, purchaseOrder: { select: { poNumber: true } } } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.wagePayment.findMany({
        where: { project: { ...tenantFilter } },
        include: {
          worker: { select: { name: true, workerCode: true, trade: true } },
          project: { select: { name: true, code: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.expense.findMany({
        where: tenantFilter,
        include: {
          project: { select: { name: true, code: true } },
        },
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.officeExpense.findMany({
        where: tenantFilter,
        orderBy: { expenseDate: 'desc' },
      }),
      prisma.staffSalaryPayment.findMany({
        where: { staff: { ...tenantFilter } },
        include: {
          staff: { select: { name: true, staffCode: true, designation: true } },
        },
        orderBy: { disbursementDate: 'desc' },
      }),
    ]);

    // 2. Project Inflows (Client Receipts - Cash vs Bank)
    const totalRevenueBilled = invoices.reduce((sum, inv) => sum + inv.netInvoiceAmount, 0);
    const totalCollected = clientReceipts.reduce((sum, r) => sum + r.amount, 0);

    const cashReceived = clientReceipts
      .filter((r) => r.paymentMethod === 'CASH')
      .reduce((sum, r) => sum + r.amount, 0);

    const bankReceived = clientReceipts
      .filter((r) => r.paymentMethod !== 'CASH')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalOutstandingReceivables = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    // 3. Project Direct Outflows
    const totalSupplierPayments = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
    const cashSupplierPayments = supplierPayments
      .filter((p) => p.paymentMethod === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);
    const bankSupplierPayments = supplierPayments
      .filter((p) => p.paymentMethod !== 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalLabourWages = wagePayments.reduce((sum, w) => sum + (w.amount || 0), 0);
    const cashLabourWages = wagePayments
      .filter((w) => w.paymentMethod === 'CASH')
      .reduce((sum, w) => sum + (w.amount || 0), 0);
    const bankLabourWages = wagePayments
      .filter((w) => w.paymentMethod !== 'CASH')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    const totalSiteExpenses = siteExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const cashSiteExpenses = siteExpenses
      .filter((e) => e.paymentMethod === 'CASH')
      .reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const bankSiteExpenses = siteExpenses
      .filter((e) => e.paymentMethod !== 'CASH')
      .reduce((sum, e) => sum + (e.totalAmount || 0), 0);

    const totalProjectDirectCosts = totalSupplierPayments + totalLabourWages + totalSiteExpenses;

    // 4. Corporate Office Overheads
    const totalOfficeExpenses = officeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const cashOfficeExpenses = officeExpenses
      .filter((e) => e.paymentMethod === 'CASH')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const bankOfficeExpenses = officeExpenses
      .filter((e) => e.paymentMethod !== 'CASH')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalStaffSalaries = staffSalaries.reduce((sum, s) => sum + (s.netPaid || 0), 0);
    const cashStaffSalaries = staffSalaries
      .filter((s) => s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + (s.netPaid || 0), 0);
    const bankStaffSalaries = staffSalaries
      .filter((s) => s.paymentMethod !== 'CASH')
      .reduce((sum, s) => sum + (s.netPaid || 0), 0);

    const totalOfficeOverheads = totalOfficeExpenses + totalStaffSalaries;

    // 5. Total Outflows Combined
    const totalAllExpenses = totalProjectDirectCosts + totalOfficeOverheads;
    const totalCashOutflows =
      cashSupplierPayments + cashLabourWages + cashSiteExpenses + cashOfficeExpenses + cashStaffSalaries;
    const totalBankOutflows =
      bankSupplierPayments + bankLabourWages + bankSiteExpenses + bankOfficeExpenses + bankStaffSalaries;

    // 6. Net Profit & Margin
    const netProfitOnBilling = totalRevenueBilled - totalAllExpenses;
    const netProfitOnCash = totalCollected - totalAllExpenses;
    const profitMarginPercent =
      totalRevenueBilled > 0 ? Math.round((netProfitOnBilling / totalRevenueBilled) * 1000) / 10 : 0;

    // 7. Liquidity: Cash in Hand vs Bank Account
    const netCashInHand = Math.max(0, cashReceived - totalCashOutflows);
    const netBankAccountBalance = Math.max(0, bankReceived - totalBankOutflows);

    // 8. Project-by-Project Cash vs Bank Breakdown
    const projectBreakdown = projects.map((p) => {
      const pInvoices = invoices.filter((i) => i.projectId === p.id);
      const pReceipts = clientReceipts.filter((r) => r.projectId === p.id);
      const pWages = wagePayments.filter((w) => w.projectId === p.id);
      const pExpenses = siteExpenses.filter((e) => e.projectId === p.id);

      const billed = pInvoices.reduce((sum, i) => sum + i.netInvoiceAmount, 0);
      const collected = pReceipts.reduce((sum, r) => sum + r.amount, 0);
      const pCashCollected = pReceipts
        .filter((r) => r.paymentMethod === 'CASH')
        .reduce((sum, r) => sum + r.amount, 0);
      const pBankCollected = pReceipts
        .filter((r) => r.paymentMethod !== 'CASH')
        .reduce((sum, r) => sum + r.amount, 0);
      const balanceDue = pInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

      const pCosts =
        pWages.reduce((sum, w) => sum + (w.amount || 0), 0) +
        pExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

      const netMargin = billed > 0 ? billed - pCosts : collected - pCosts;

      return {
        id: p.id,
        projectId: p.id,
        code: p.code,
        projectCode: p.code,
        name: p.name,
        projectName: p.name,
        clientName: p.clientName,
        contractValue: p.contractValue,
        totalBilled: billed,
        billed,
        totalCollected: collected,
        receivedTotal: collected,
        cashCollected: pCashCollected,
        cashReceived: pCashCollected,
        bankCollected: pBankCollected,
        bankReceived: pBankCollected,
        balanceDue,
        outstandingReceivable: balanceDue,
        directCosts: pCosts,
        directCost: pCosts,
        netMargin,
        projectNetProfit: netMargin,
      };
    });

    // 9. Chronological Unified Transaction Ledger (Universal Cash & Bank Stream)
    const ledgerItems: any[] = [];

    // Client Inflows
    for (const r of clientReceipts) {
      ledgerItems.push({
        id: r.id,
        date: r.receiptDate,
        type: 'INCOME',
        category: 'CLIENT_PAYMENT',
        entityName: r.client?.name || r.project?.clientName || 'Client',
        party: r.client?.name || r.project?.clientName || 'Client',
        description: `Payment for ${r.project?.name || 'Project'} [${r.invoice?.invoiceNumber || r.receiptNumber}]`,
        title: `Payment for ${r.project?.name || 'Project'} [${r.invoice?.invoiceNumber || r.receiptNumber}]`,
        paymentMethod: r.paymentMethod,
        paymentMode: r.paymentMethod,
        channel: r.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
        isCash: r.paymentMethod === 'CASH',
        referenceNo: r.referenceNo || r.receiptNumber,
        inflow: r.amount,
        outflow: 0,
        projectName: r.project?.name || '—',
      });
    }

    // Supplier Outflows
    for (const sp of supplierPayments) {
      ledgerItems.push({
        id: sp.id,
        date: sp.paymentDate,
        type: 'EXPENSE',
        category: 'SUPPLIER_PAYMENT',
        entityName: sp.supplier?.name || 'Vendor',
        party: sp.supplier?.name || 'Vendor',
        description: `Vendor payment for invoice ${sp.invoice?.invoiceNumber || 'PO'}`,
        title: `Vendor payment for invoice ${sp.invoice?.invoiceNumber || 'PO'}`,
        paymentMethod: sp.paymentMethod,
        paymentMode: sp.paymentMethod,
        channel: sp.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
        isCash: sp.paymentMethod === 'CASH',
        referenceNo: sp.referenceNo || sp.paymentNumber,
        inflow: 0,
        outflow: sp.amount,
        projectName: 'Procurement',
      });
    }

    // Labour Wage Outflows
    for (const wp of wagePayments) {
      ledgerItems.push({
        id: wp.id,
        date: wp.paymentDate,
        type: 'EXPENSE',
        category: 'LABOUR_WAGE',
        entityName: wp.worker?.name || 'Worker',
        party: wp.worker?.name || 'Worker',
        description: `Labour wage payment to ${wp.worker?.name} (${wp.worker?.trade})`,
        title: `Labour wage payment to ${wp.worker?.name} (${wp.worker?.trade})`,
        paymentMethod: wp.paymentMethod,
        paymentMode: wp.paymentMethod,
        channel: wp.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
        isCash: wp.paymentMethod === 'CASH',
        referenceNo: wp.referenceNo || 'WAGE',
        inflow: 0,
        outflow: wp.amount,
        projectName: wp.project?.name || 'Site Labour',
      });
    }

    // Site Expense Outflows
    for (const se of siteExpenses) {
      ledgerItems.push({
        id: se.id,
        date: se.expenseDate,
        type: 'EXPENSE',
        category: 'SITE_EXPENSE',
        entityName: se.paidTo,
        party: se.paidTo,
        description: `Site expense [${se.category}]: ${se.description || se.category}`,
        title: `Site expense [${se.category}]: ${se.description || se.category}`,
        paymentMethod: se.paymentMethod,
        paymentMode: se.paymentMethod,
        channel: se.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
        isCash: se.paymentMethod === 'CASH',
        referenceNo: se.expenseNumber,
        inflow: 0,
        outflow: se.totalAmount,
        projectName: se.project?.name || 'Site Operations',
      });
    }

    // Office Overhead Outflows
    for (const oe of officeExpenses) {
      ledgerItems.push({
        id: oe.id,
        date: oe.expenseDate,
        type: 'EXPENSE',
        category: 'OFFICE_OVERHEAD',
        entityName: oe.paidTo,
        party: oe.paidTo,
        description: `Office Overhead [${oe.category}]: ${oe.title}`,
        title: `Office Overhead [${oe.category}]: ${oe.title}`,
        paymentMethod: oe.paymentMethod,
        paymentMode: oe.paymentMethod,
        channel: oe.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
        isCash: oe.paymentMethod === 'CASH',
        referenceNo: oe.expenseNumber,
        inflow: 0,
        outflow: oe.amount,
        projectName: 'Corporate HQ',
      });
    }

    // Staff Salary Outflows
    for (const ss of staffSalaries) {
      ledgerItems.push({
        id: ss.id,
        date: ss.disbursementDate,
        type: 'EXPENSE',
        category: 'STAFF_SALARY',
        entityName: ss.staff?.name || 'Staff',
        party: ss.staff?.name || 'Staff',
        description: `Salary for ${ss.staff?.name} (${ss.staff?.designation}) - ${ss.monthYear}`,
        title: `Salary for ${ss.staff?.name} (${ss.staff?.designation}) - ${ss.monthYear}`,
        paymentMethod: ss.paymentMethod,
        paymentMode: ss.paymentMethod,
        channel: ss.paymentMethod === 'CASH' ? 'CASH' : 'BANK',
        isCash: ss.paymentMethod === 'CASH',
        referenceNo: ss.paymentNumber,
        inflow: 0,
        outflow: ss.netPaid,
        projectName: 'Corporate HQ',
      });
    }

    // Sort chronologically descending
    ledgerItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const summary = {
      totalRevenue: totalRevenueBilled,
      totalRevenueBilled,
      totalCollected,
      totalCashReceived: cashReceived,
      cashReceived,
      totalBankReceived: bankReceived,
      bankReceived,
      totalOutstandingReceivables,
      totalProjectExpenses: totalProjectDirectCosts,
      totalProjectDirectCosts,
      totalOfficeExpenses,
      totalStaffSalaries,
      totalOverheads: totalOfficeOverheads,
      totalOfficeOverheads,
      totalCompanyExpenses: totalAllExpenses,
      totalAllExpenses,
      netProfit: netProfitOnBilling,
      netProfitOnBilling,
      netProfitOnCash,
      netProfitMargin: profitMarginPercent,
      profitMarginPercent,
      cashInHand: netCashInHand,
      netCashInHand,
      bankBalance: netBankAccountBalance,
      netBankAccountBalance,
      totalCashOutflow: totalCashOutflows,
      totalCashOutflows,
      totalBankOutflow: totalBankOutflows,
      totalBankOutflows,
    };

    return res.json({
      success: true,
      summary,
      financials: summary,
      projectBreakdown,
      ledgerStream: ledgerItems.slice(0, 200),
      unifiedLedger: ledgerItems.slice(0, 200),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ======================================================================
// 5. Office Staff Attendance & Attendance-Driven Payroll
// ======================================================================

export const getDailyStaffAttendance = async (req: Request, res: Response) => {
  try {
    const { date, roleCategory } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required.' });
    }

    const startOfDay = normalizeAttendanceDate(date as string);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);

    const whereStaff: any = { isActive: true, ...getTenantFilter(req) };
    if (roleCategory && typeof roleCategory === 'string' && roleCategory !== 'ALL') {
      whereStaff.roleCategory = roleCategory;
    }

    const [staff, attendances] = await Promise.all([
      prisma.officeStaff.findMany({
        where: whereStaff,
        orderBy: { staffCode: 'asc' },
      }),
      prisma.staffAttendance.findMany({
        where: {
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
          staff: { ...getTenantFilter(req) },
        },
        include: { staff: true },
        orderBy: { staff: { staffCode: 'asc' } },
      }),
    ]);

    return res.json({ success: true, staff, attendances });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveBulkStaffAttendance = async (req: Request, res: Response) => {
  try {
    const { date, records } = req.body;

    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Date and records array are required.' });
    }

    if (isFutureDate(date)) {
      const invalid = records.find(
        (r) => r.attendanceStatus === 'PRESENT' || r.attendanceStatus === 'HALF_DAY'
      );
      if (invalid) {
        return res.status(400).json({
          success: false,
          message: 'Future-date attendance cannot be marked as Present or Half-Day. Only planned Leave, Absence, or Holiday can be pre-approved.',
        });
      }
    }

    const attendanceDate = normalizeAttendanceDate(date);
    const windowStart = attendanceDate;
    const windowEnd = new Date(attendanceDate.getTime() + 24 * 3600 * 1000);

    const results = await prisma.$transaction(async (tx) => {
      const saved: any[] = [];

      for (const rec of records) {
        const staff = await tx.officeStaff.findFirst({
          where: { id: rec.staffId, ...getTenantFilter(req) },
        });
        if (!staff) continue;

        const regHours = rec.attendanceStatus === 'PRESENT' ? 8 : rec.attendanceStatus === 'HALF_DAY' ? 4 : 0;
        const otHours = Number(rec.overtimeHours) || 0;

        const existing = await tx.staffAttendance.findFirst({
          where: {
            staffId: rec.staffId,
            date: {
              gte: windowStart,
              lt: windowEnd,
            },
          },
        });

        let att;
        if (existing) {
          att = await tx.staffAttendance.update({
            where: { id: existing.id },
            data: {
              date: attendanceDate,
              attendanceStatus: rec.attendanceStatus,
              regularHours: regHours,
              overtimeHours: otHours,
              notes: rec.notes || null,
            },
          });
        } else {
          att = await tx.staffAttendance.create({
            data: {
              date: attendanceDate,
              staffId: rec.staffId,
              attendanceStatus: rec.attendanceStatus,
              regularHours: regHours,
              overtimeHours: otHours,
              notes: rec.notes || null,
            },
          });
        }

        saved.push(att);
      }

      return saved;
    });

    await logAudit(
      req.user?.id,
      'SAVE_BULK_STAFF_ATTENDANCE',
      'STAFF_ATTENDANCE',
      'OFFICE',
      { date, count: results.length },
      req.ip
    );

    return res.json({ success: true, count: results.length, attendances: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStaffPayrollSummary = async (req: Request, res: Response) => {
  try {
    const { monthYear } = req.query; // e.g. "2026-10" or "October 2026"

    let targetYear: number;
    let targetMonth: number; // 1-12

    if (monthYear && typeof monthYear === 'string') {
      if (monthYear.includes('-')) {
        const parts = monthYear.split('-');
        targetYear = parseInt(parts[0], 10);
        targetMonth = parseInt(parts[1], 10);
      } else {
        const d = new Date(monthYear + ' 1');
        if (!isNaN(d.getTime())) {
          targetYear = d.getFullYear();
          targetMonth = d.getMonth() + 1;
        } else {
          const now = new Date();
          targetYear = now.getFullYear();
          targetMonth = now.getMonth() + 1;
        }
      }
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0)); // next month 1st

    const [allStaff, attendances, payments] = await Promise.all([
      prisma.officeStaff.findMany({
        where: { isActive: true, ...getTenantFilter(req) },
        orderBy: { staffCode: 'asc' },
      }),
      prisma.staffAttendance.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
          staff: { ...getTenantFilter(req) },
        },
      }),
      prisma.staffSalaryPayment.findMany({
        where: {
          monthYear: { contains: monthStr },
          staff: { ...getTenantFilter(req) },
        },
      }),
    ]);

    const records = allStaff.map((s) => {
      const staffAtts = attendances.filter((a) => a.staffId === s.id);
      const payment = payments.find((p) => p.staffId === s.id);

      let presentDays = 0;
      let halfDays = 0;
      let paidLeaveDays = 0;
      let absentDays = 0;
      let totalOtHours = 0;

      for (const a of staffAtts) {
        if (a.attendanceStatus === 'PRESENT') {
          presentDays += 1;
        } else if (a.attendanceStatus === 'HALF_DAY') {
          halfDays += 1;
        } else if (a.attendanceStatus === 'PAID_LEAVE' || a.attendanceStatus === 'HOLIDAY') {
          paidLeaveDays += 1;
        } else if (a.attendanceStatus === 'ABSENT' || a.attendanceStatus === 'LEAVE') {
          absentDays += 1;
        }
        totalOtHours += a.overtimeHours || 0;
      }

      const standardDays = s.standardWorkingDays || 26;
      const allowedPaidLeaves = s.paidLeavesAllowed !== undefined ? s.paidLeavesAllowed : 1;
      const dailySalaryRate = (s.fixedSalary || 0) / standardDays;

      const hasAttendanceRecords = staffAtts.length > 0;
      const effectiveDays = hasAttendanceRecords
        ? presentDays + paidLeaveDays + halfDays * 0.5
        : standardDays;

      // Auto-calculated Loss of Pay (LOP) Leave Deduction:
      // Excess absent days exceeding allowed monthly paid leaves
      const excessAbsentDays = hasAttendanceRecords ? Math.max(0, absentDays - allowedPaidLeaves) + (halfDays * 0.5) : 0;
      const leaveDeduction = Math.round(excessAbsentDays * dailySalaryRate);

      // Salary structure breakdown
      const basicPay = s.basicSalary > 0 ? s.basicSalary : Math.round(s.fixedSalary * 0.5);
      const hraPay = s.hra > 0 ? s.hra : Math.round(s.fixedSalary * 0.2);
      const allowancesPay = s.allowances > 0 ? s.allowances : Math.max(0, s.fixedSalary - basicPay - hraPay);

      // Statutory deductions: PF (12% of basic), ESI (0.75% of gross), Professional Tax, TDS
      const employeePf = s.pfNumber ? Math.round(basicPay * ((s.pfEmployeePercent || 12) / 100)) : 0;
      const employerPf = s.pfNumber ? Math.round(basicPay * ((s.pfEmployerPercent || 12) / 100)) : 0;
      const employeeEsi = s.esiNumber ? Math.round(s.fixedSalary * ((s.esiPercent || 0.75) / 100)) : 0;
      const professionalTax = s.professionalTax || 0;
      const tdsDeduction = s.tdsDeduction || 0;

      const totalStatutoryDeductions = employeePf + employeeEsi + professionalTax + tdsDeduction;

      // Overtime calculation
      const hourlyRate = (s.fixedSalary || 0) / (standardDays * 8);
      const calculatedOtPay = Math.round(totalOtHours * hourlyRate * 1.5);

      const grossEarned = Math.max(0, s.fixedSalary - leaveDeduction) + calculatedOtPay;
      const bonus = payment ? payment.bonus : 0;
      const customDeductions = payment ? payment.deductions : 0;
      const totalAllDeductions = leaveDeduction + totalStatutoryDeductions + customDeductions;
      const netPayable = Math.max(0, grossEarned + bonus - totalStatutoryDeductions - customDeductions);

      return {
        staff: s,
        fixedSalary: s.fixedSalary || 0,
        basicSalary: basicPay,
        hra: hraPay,
        allowances: allowancesPay,
        standardWorkingDays: standardDays,
        paidLeavesAllowed: allowedPaidLeaves,
        daysInMonth,
        hasAttendanceRecords,
        totalRecordedDays: staffAtts.length,
        presentDays,
        halfDays,
        paidLeaveDays,
        absentDays,
        effectiveDays,
        excessAbsentDays,
        unpaidDays: Math.max(0, daysInMonth - effectiveDays),
        perDaySalary: Math.round(dailySalaryRate * 100) / 100,
        leaveDeduction,
        employeePf,
        employerPf,
        employeeEsi,
        professionalTax,
        tdsDeduction,
        totalStatutoryDeductions,
        totalOtHours,
        calculatedOtPay,
        grossSalary: grossEarned,
        bonus,
        deductions: totalAllDeductions,
        netPayable,
        paymentStatus: payment ? 'PAID' : 'PENDING',
        payment,
      };
    });

    const totalLiability = records.reduce((sum, r) => sum + r.fixedSalary, 0);
    const totalCalculatedNet = records.reduce((sum, r) => sum + r.netPayable, 0);
    const totalDisbursed = payments.reduce((sum, p) => sum + p.netPaid, 0);
    const totalPending = Math.max(0, totalCalculatedNet - totalDisbursed);
    const totalLeaveDeductions = records.reduce((sum, r) => sum + r.leaveDeduction, 0);
    const totalPfDeductions = records.reduce((sum, r) => sum + r.employeePf, 0);
    const totalEsiDeductions = records.reduce((sum, r) => sum + r.employeeEsi, 0);

    return res.json({
      success: true,
      monthYear: monthStr,
      daysInMonth,
      records,
      summary: {
        totalStaff: allStaff.length,
        totalLiability,
        totalCalculatedNet,
        totalDisbursed,
        totalPending,
        totalLeaveDeductions,
        totalPfDeductions,
        totalEsiDeductions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Monthly interactive Attendance Matrix for all Office Staff
 */
export const getStaffMonthlyAttendanceMatrix = async (req: Request, res: Response) => {
  try {
    const { monthYear } = req.query; // e.g. "2026-10"
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;

    if (monthYear && typeof monthYear === 'string') {
      const parts = monthYear.split('-');
      if (parts.length >= 2) {
        y = parseInt(parts[0], 10) || y;
        m = parseInt(parts[1], 10) || m;
      }
    }

    const daysInMonth = new Date(y, m, 0).getDate();
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

    const [allStaff, attendances] = await Promise.all([
      prisma.officeStaff.findMany({
        where: { isActive: true, ...getTenantFilter(req) },
        orderBy: { staffCode: 'asc' },
      }),
      prisma.staffAttendance.findMany({
        where: {
          date: { gte: startOfMonth, lt: endOfMonth },
          staff: { ...getTenantFilter(req) },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Build matrix: staffId -> { dayNumber: { status, otHours, notes, id } }
    const matrix: Record<string, Record<number, any>> = {};
    for (const st of allStaff) {
      matrix[st.id] = {};
    }

    for (const att of attendances) {
      const d = new Date(att.date);
      const dayNum = d.getUTCDate();
      if (matrix[att.staffId]) {
        matrix[att.staffId][dayNum] = {
          id: att.id,
          status: att.attendanceStatus,
          otHours: att.overtimeHours,
          notes: att.notes,
        };
      }
    }

    return res.json({
      success: true,
      monthYear: `${y}-${String(m).padStart(2, '0')}`,
      year: y,
      month: m,
      daysInMonth,
      allStaff,
      matrix,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 1-Click Update for a single staff attendance cell in the monthly calendar
 */
export const saveStaffAttendanceCell = async (req: Request, res: Response) => {
  try {
    const { staffId, date, attendanceStatus, overtimeHours, notes } = req.body;
    if (!staffId || !date || !attendanceStatus) {
      return res.status(400).json({ success: false, message: 'staffId, date, and attendanceStatus are required.' });
    }

    const staff = await prisma.officeStaff.findFirst({
      where: { id: staffId, ...getTenantFilter(req) },
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (isFutureDate(date) && (attendanceStatus === 'PRESENT' || attendanceStatus === 'HALF_DAY')) {
      return res.status(400).json({ success: false, message: 'Cannot mark Present or Half-Day in advance for future dates.' });
    }

    const attendanceDate = normalizeAttendanceDate(date);
    const windowStart = attendanceDate;
    const windowEnd = new Date(attendanceDate.getTime() + 24 * 3600 * 1000);

    const existing = await prisma.staffAttendance.findFirst({
      where: {
        staffId,
        date: { gte: windowStart, lt: windowEnd },
      },
    });

    const regHours = attendanceStatus === 'PRESENT' ? 8 : attendanceStatus === 'HALF_DAY' ? 4 : 0;
    let att;
    if (existing) {
      att = await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          attendanceStatus,
          regularHours: regHours,
          overtimeHours: Number(overtimeHours) || 0,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });
    } else {
      att = await prisma.staffAttendance.create({
        data: {
          staffId,
          date: attendanceDate,
          attendanceStatus,
          regularHours: regHours,
          overtimeHours: Number(overtimeHours) || 0,
          notes: notes || null,
        },
      });
    }

    return res.json({ success: true, attendance: att });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

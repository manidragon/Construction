import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getTenantFilter } from '../middleware/auth';

export const getExecutiveMetrics = async (req: Request, res: Response) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const tenantFilter = getTenantFilter(req);

    const projectWhere: any = { ...tenantFilter };
    if (projectId && typeof projectId === 'string') {
      projectWhere.id = projectId;
    }

    // 1. Projects Metrics
    const projects = await prisma.project.findMany({
      where: projectWhere,
      include: {
        sites: true,
        tasks: true,
        boqItems: true,
        clientInvoices: true,
        clientReceipts: true,
        expenses: true,
        labourAttendances: true,
        purchaseOrders: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
    });

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
    const planningProjects = projects.filter((p) => p.status === 'PLANNING').length;
    const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
    const onHoldProjects = projects.filter((p) => p.status === 'ON_HOLD').length;

    // Check delayed projects (end date past and status not completed)
    const now = new Date();
    const delayedProjects = projects.filter(
      (p) => p.status === 'ACTIVE' && new Date(p.plannedEndDate) < now
    ).length;

    // 2. Financial Aggregates
    const totalContractValue = projects.reduce((sum, p) => sum + p.contractValue, 0);
    const totalApprovedBudget = projects.reduce((sum, p) => sum + p.approvedBudget, 0);

    // Client Billing & Collections & Tax Compliance
    const clientInvoices = await prisma.clientInvoice.findMany({
      where: {
        ...tenantFilter,
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
    });
    const totalClientBilling = clientInvoices.reduce((sum, inv) => sum + inv.netInvoiceAmount, 0);

    const clientReceipts = await prisma.clientReceipt.findMany({
      where: {
        ...tenantFilter,
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
    });
    const totalMoneyReceived = clientReceipts.reduce((sum, rcp) => sum + rcp.amount, 0);
    const outstandingReceivables = Math.max(0, totalClientBilling - totalMoneyReceived);

    // MODULE 4 & MODULE 2: Tax Compliance & Internal GST Tax Liability Payable
    // Billed GST Tax Liability
    const totalBilledTaxLiability = clientInvoices.reduce((sum, inv) => sum + (inv.gstAmount || 0), 0);
    // Realized / Collected GST Tax Liability Payable (Proportional to cash collected on taxable bills)
    const totalCollectedTaxLiability = Math.round(
      clientInvoices.reduce((sum, inv) => {
        if (!inv.gstAmount || inv.gstAmount <= 0) return sum;
        const ratio = inv.netInvoiceAmount > 0 ? Math.min(1, (inv.paidAmount || 0) / inv.netInvoiceAmount) : 0;
        return sum + (inv.gstAmount * ratio);
      }, 0)
    );
    const pendingTaxLiability = Math.max(0, totalBilledTaxLiability - totalCollectedTaxLiability);

    // Leads & Quotations Metrics
    const leads = await prisma.lead.findMany({ where: { ...tenantFilter } });
    const totalLeads = leads.length;
    const leadsWon = leads.filter((l) => l.stage === 'LEAD_WON').length;
    const leadsLost = leads.filter((l) => l.stage === 'LEAD_LOST').length;
    const activeLeads = leads.filter((l) => l.stage !== 'LEAD_WON' && l.stage !== 'LEAD_LOST').length;
    const boqSharedLeads = leads.filter((l) => l.stage === 'BOQ_QUOTATION_SHARED').length;

    const quotations = await prisma.quotation.findMany({ where: { ...tenantFilter } });
    const totalQuotations = quotations.length;
    const totalQuotationValue = quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    const totalInternalTaxLiability = Math.round(quotations.reduce((sum, q) => sum + (q.gstAmount || 0), 0));

    // Supplier Payables
    const suppliers = await prisma.supplier.findMany({ where: { ...tenantFilter } });
    const supplierPayables = suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);

    // Direct Expenses
    const directExpenses = await prisma.expense.findMany({
      where: {
        ...tenantFilter,
        isPaid: true,
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
    });
    const totalExpenses = directExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

    // Labour Wages
    const labourAttendances = await prisma.labourAttendance.findMany({
      where: {
        ...(projectId ? { projectId: String(projectId) } : { project: { ...tenantFilter } }),
      },
    });
    const totalLabourCost = labourAttendances.reduce((sum, a) => sum + a.totalWageEarned, 0);

    // Material Purchases & Stock Valuation
    const stockBalances = await prisma.stockBalance.findMany({
      where: {
        warehouse: { ...tenantFilter },
      },
      include: { material: true },
    });
    const materialStockValue = stockBalances.reduce((sum, sb) => sum + (sb.totalValuation || 0), 0);

    // Material Purchases
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        ...tenantFilter,
        status: { not: 'CANCELLED' },
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
    });
    const totalMaterialsCost = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    // BOQ Actual Expenditure
    const boqItems = await prisma.bOQItem.findMany({
      where: {
        ...(projectId ? { projectId: String(projectId) } : { project: { ...tenantFilter } }),
      },
    });
    // Incurred site costs to date (Expenses + Labour + Materials). BOQ is tracking/reference only.
    const actualExpenditureToDate = totalExpenses + totalLabourCost + totalMaterialsCost;

    // 3. Operational Counts & Alerts
    const pendingRequisitions = await prisma.materialRequisition.count({
      where: { ...tenantFilter, status: 'PENDING' },
    });

    const pendingApprovalsCount =
      (await prisma.purchaseOrder.count({ where: { ...tenantFilter, status: 'DRAFT' } })) +
      (await prisma.expense.count({ where: { ...tenantFilter, status: 'PENDING' } })) +
      pendingRequisitions;

    const overdueTasksCount = await prisma.task.count({
      where: {
        ...tenantFilter,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
    });

    // Low stock items
    const materials = await prisma.material.findMany({
      where: { ...tenantFilter },
      include: { stockBalances: true },
    });
    const lowStockAlerts = materials.filter((m) => {
      const totalStock = m.stockBalances.reduce((acc, sb) => acc + sb.currentQty, 0);
      return totalStock <= m.minStockLevel;
    });

    // Role-specific operational counts
    const totalWorkersCount = await prisma.worker.count({
      where: {
        ...(projectId ? { projectId: String(projectId) } : { project: { ...tenantFilter } }),
      },
    });
    const totalTasksCount = await prisma.task.count({
      where: {
        ...(projectId ? { projectId: String(projectId) } : { project: { ...tenantFilter } }),
      },
    });
    const activeTasksCount = await prisma.task.count({
      where: {
        status: 'IN_PROGRESS',
        ...(projectId ? { projectId: String(projectId) } : { project: { ...tenantFilter } }),
      },
    });
    const completedTasksCount = await prisma.task.count({
      where: {
        status: 'COMPLETED',
        ...(projectId ? { projectId: String(projectId) } : { project: { ...tenantFilter } }),
      },
    });
    const totalDPRCount = await prisma.dailySiteReport.count({
      where: {
        ...(projectId ? { projectId: String(projectId) } : { project: { ...tenantFilter } }),
      },
    });
    const pendingPOCount = await prisma.purchaseOrder.count({
      where: {
        status: 'DRAFT',
        ...tenantFilter,
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
    });

    const pendingRequisitionsList = await prisma.materialRequisition.findMany({
      where: { status: 'PENDING', ...(projectId ? { projectId: String(projectId) } : {}) },
      include: {
        project: { select: { code: true, name: true } },
        requestedBy: { select: { name: true } },
        items: { include: { material: { select: { name: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 4. Project-wise Budget Utilization & Profitability
    const projectProfitability = projects.map((p) => {
      const pInvoices = p.clientInvoices.reduce((sum, inv) => sum + inv.netInvoiceAmount, 0);
      const pReceipts = p.clientReceipts.reduce((sum, r) => sum + r.amount, 0);
      const pBoqCost = p.boqItems.reduce((sum, b) => sum + (b.actualExpenditure || 0), 0);
      const pExpCost = p.expenses.reduce((sum, e) => sum + e.totalAmount, 0);
      const pMatCost = (p.purchaseOrders || []).reduce((sum, po) => sum + (po.totalAmount || 0), 0);
      const pLabCost = (p.labourAttendances || []).reduce((sum, att) => sum + (att.totalWageEarned || 0), 0);
      // Actual incurred site cost consists of direct expenses, labour wages, and POs. BOQ is reference only.
      const pActualCost = pExpCost + pMatCost + pLabCost;
      const pBudgetUtilization = p.approvedBudget > 0 ? (pActualCost / p.approvedBudget) * 100 : 0;
      
      // Realized / Projected Profit = (Billed Revenue if billed, else Contract Value) - Actual Cost
      const revenueBase = pInvoices > 0 ? pInvoices : p.contractValue;
      const estimatedProfit = revenueBase - pActualCost;
      const profitMarginPercent = revenueBase > 0 ? (estimatedProfit / revenueBase) * 100 : 0;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        contractValue: p.contractValue,
        approvedBudget: p.approvedBudget,
        actualCost: pActualCost,
        materialsCost: pMatCost,
        labourCost: pLabCost,
        expensesCost: pExpCost,
        budgetUtilization: Math.round(pBudgetUtilization * 10) / 10,
        billedAmount: pInvoices,
        receivedAmount: pReceipts,
        outstandingAmount: Math.max(0, pInvoices - pReceipts),
        completionPercent: p.completionPercent,
        estimatedProfit,
        profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
      };
    });

    // 5. Monthly Cash Flow (Trailing 6 Months Trend) calculated dynamically from actual tenant records
    const salaryPayments = await prisma.staffSalaryPayment.findMany({
      where: {
        staff: { ...tenantFilter },
        status: 'PAID',
      },
    });

    const cashFlowTrend = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;

      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      // Inflow: Sum of client receipts in this month for this tenant
      const monthInflow = clientReceipts
        .filter((r) => {
          const rDate = new Date(r.receiptDate || r.createdAt);
          return rDate >= startOfMonth && rDate <= endOfMonth;
        })
        .reduce((sum, r) => sum + r.amount, 0);

      // Outflow: Direct site expenses + salary disbursements in this month for this tenant
      const monthDirectExpenses = directExpenses
        .filter((e) => {
          const eDate = new Date(e.expenseDate || e.createdAt);
          return eDate >= startOfMonth && eDate <= endOfMonth;
        })
        .reduce((sum, e) => sum + e.totalAmount, 0);

      const monthSalaryPayments = salaryPayments
        .filter((s) => {
          const sDate = new Date(s.disbursementDate || s.createdAt);
          return sDate >= startOfMonth && sDate <= endOfMonth;
        })
        .reduce((sum, s) => sum + s.netPaid, 0);

      const monthOutflow = monthDirectExpenses + monthSalaryPayments;
      const net = monthInflow - monthOutflow;

      cashFlowTrend.push({
        month: monthLabel,
        inflow: Math.round(monthInflow),
        outflow: Math.round(monthOutflow),
        net: Math.round(net),
      });
    }

    // 6. Upcoming Deadlines (scoped to tenant projects)
    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
        dueDate: { gte: now },
        project: { ...tenantFilter },
        ...(projectId ? { projectId: String(projectId) } : {}),
      },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    // 7. Recent Audit Activities (strictly scoped to logged-in constructor/tenant)
    const auditWhere: any = {};
    if (tenantFilter.tenantId) {
      auditWhere.OR = [
        { tenantId: tenantFilter.tenantId },
        { user: { companyId: tenantFilter.tenantId } },
      ];
    }

    const recentActivities = await prisma.auditLog.findMany({
      where: auditWhere,
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return res.json({
      success: true,
      summary: {
        totalProjects,
        activeProjects,
        planningProjects,
        completedProjects,
        onHoldProjects,
        delayedProjects,
        totalContractValue,
        totalApprovedBudget,
        actualExpenditureToDate,
        totalClientBilling,
        totalMoneyReceived,
        outstandingReceivables,
        supplierPayables,
        labourLiabilities: 0,
        materialStockValue,
        // MODULE 4 & MODULE 2: Tax Compliance & Lead/Quotation Metrics
        totalCollectedTaxLiability,
        totalBilledTaxLiability,
        pendingTaxLiability,
        totalQuotationValue,
        totalInternalTaxLiability,
        totalMaterialsCount: materials.length,
        totalLabourCost,
        totalExpenses,
        totalMaterialsCost,
        totalSuppliersCount: suppliers.length,
        totalWorkersCount,
        totalTasksCount,
        activeTasksCount,
        completedTasksCount,
        totalDPRCount,
        totalPOCount: purchaseOrders.length,
        pendingPOCount,
        leadsSummary: {
          totalLeads,
          activeLeads,
          leadsWon,
          leadsLost,
          boqSharedLeads,
        },
        quotationsSummary: {
          totalQuotations,
          totalValue: totalQuotationValue,
          totalGstLiability: totalInternalTaxLiability,
        },
        pendingRequisitions,
        pendingApprovalsCount,
        overdueTasksCount,
        lowStockAlertsCount: lowStockAlerts.length,
      },
      lowStockAlerts: lowStockAlerts.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        minStockLevel: m.minStockLevel,
        currentStock: m.stockBalances.reduce((a, b) => a + b.currentQty, 0),
      })),
      pendingRequisitionsList,
      projectProfitability,
      cashFlowTrend,
      upcomingDeadlines,
      recentActivities,
    });
  } catch (error: any) {
    console.error('Executive Metrics Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

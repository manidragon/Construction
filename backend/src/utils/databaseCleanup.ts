import prisma from './prisma';

export interface DatabaseCleanupSummary {
  deleted: Record<string, number>;
  totalDeletedRows: number;
  preserved: {
    companies: number;
    users: number;
    accountsResetToZero: number;
    dropdownOptions: number;
    saasTransactions: number;
    supportTickets: number;
  };
}

/**
 * Deletes all operational, project, CRM, real-estate plot, billing, inventory,
 * procurement, labour, equipment, office, and log records across the database
 * inside a single transaction while preserving all Tenant (Company) and User accounts.
 */
export async function clearOperationalDataKeepTenants(): Promise<DatabaseCleanupSummary> {
  return prisma.$transaction(
    async (tx) => {
      const deleted: Record<string, number> = {};

      const wipe = async (label: string, fn: () => Promise<{ count: number }>) => {
        const res = await fn();
        deleted[label] = res.count;
      };

      // 1. Documents, Real Estate Plots & Plot History
      await wipe('DocumentAttachment', () => tx.documentAttachment.deleteMany());
      await wipe('PlotBookingHistory', () => tx.plotBookingHistory.deleteMany());
      await wipe('Plot', () => tx.plot.deleteMany());
      await wipe('PlotBatch', () => tx.plotBatch.deleteMany());

      // 2. Tasks & Daily Site Reports (DPR)
      await wipe('TaskComment', () => tx.taskComment.deleteMany());
      await wipe('DPRLabourEntry', () => tx.dPRLabourEntry.deleteMany());
      await wipe('DPRMaterialEntry', () => tx.dPRMaterialEntry.deleteMany());
      await wipe('DPREquipmentEntry', () => tx.dPREquipmentEntry.deleteMany());
      await wipe('DPRPhoto', () => tx.dPRPhoto.deleteMany());
      await wipe('DailySiteReport', () => tx.dailySiteReport.deleteMany());

      // 3. Equipment
      await wipe('EquipmentLog', () => tx.equipmentLog.deleteMany());
      await wipe('EquipmentMaintenance', () => tx.equipmentMaintenance.deleteMany());
      await wipe('EquipmentAsset', () => tx.equipmentAsset.deleteMany());

      // 4. Petty Cash & Expenses
      await wipe('PettyCashTransaction', () => tx.pettyCashTransaction.deleteMany());
      await wipe('PettyCashAccount', () => tx.pettyCashAccount.deleteMany());
      await wipe('Expense', () => tx.expense.deleteMany());

      // 5. Double-Entry Journals (keep Chart of Accounts structure, zero balances below)
      await wipe('JournalLine', () => tx.journalLine.deleteMany());
      await wipe('JournalEntry', () => tx.journalEntry.deleteMany());

      // 6. Client Billing & Receipts
      await wipe('ClientReceipt', () => tx.clientReceipt.deleteMany());
      await wipe('InvoiceItem', () => tx.invoiceItem.deleteMany());
      await wipe('ClientInvoice', () => tx.clientInvoice.deleteMany());

      // 7. Procurement & Suppliers
      await wipe('SupplierPayment', () => tx.supplierPayment.deleteMany());
      await wipe('SupplierInvoice', () => tx.supplierInvoice.deleteMany());
      await wipe('GRNItem', () => tx.gRNItem.deleteMany());
      await wipe('GoodsReceiptNote', () => tx.goodsReceiptNote.deleteMany());
      await wipe('POLineItem', () => tx.pOLineItem.deleteMany());
      await wipe('PurchaseOrder', () => tx.purchaseOrder.deleteMany());

      // 8. Requisitions, Materials & Inventory
      await wipe('RequisitionItem', () => tx.requisitionItem.deleteMany());
      await wipe('MaterialRequisition', () => tx.materialRequisition.deleteMany());
      await wipe('StockLedger', () => tx.stockLedger.deleteMany());
      await wipe('StockBalance', () => tx.stockBalance.deleteMany());
      await wipe('Warehouse', () => tx.warehouse.deleteMany());
      await wipe('Material', () => tx.material.deleteMany());
      await wipe('Supplier', () => tx.supplier.deleteMany());

      // 9. Labour & Subcontractors
      await wipe('LabourAttendance', () => tx.labourAttendance.deleteMany());
      await wipe('WorkerAdvance', () => tx.workerAdvance.deleteMany());
      await wipe('WagePayment', () => tx.wagePayment.deleteMany());
      await wipe('ProjectWorker', () => tx.projectWorker.deleteMany());
      await wipe('Worker', () => tx.worker.deleteMany());
      await wipe('Subcontractor', () => tx.subcontractor.deleteMany());

      // 10. Office Staff & Overheads
      await wipe('StaffAttendance', () => tx.staffAttendance.deleteMany());
      await wipe('StaffSalaryPayment', () => tx.staffSalaryPayment.deleteMany());
      await wipe('OfficeStaff', () => tx.officeStaff.deleteMany());
      await wipe('OfficeExpense', () => tx.officeExpense.deleteMany());

      // 11. Project Children & Quotations
      await wipe('Task', () => tx.task.deleteMany());
      await wipe('BOQItem', () => tx.bOQItem.deleteMany());
      await wipe('BudgetRevision', () => tx.budgetRevision.deleteMany());
      await wipe('ContractChangeOrder', () => tx.contractChangeOrder.deleteMany());
      await wipe('Phase', () => tx.phase.deleteMany());
      await wipe('Site', () => tx.site.deleteMany());
      await wipe('ProjectMember', () => tx.projectMember.deleteMany());
      await wipe('QuotationItem', () => tx.quotationItem.deleteMany());
      await wipe('Quotation', () => tx.quotation.deleteMany());

      // 12. Projects, Leads & Clients
      await wipe('Project', () => tx.project.deleteMany());
      await wipe('Lead', () => tx.lead.deleteMany());
      await wipe('Client', () => tx.client.deleteMany());

      // 13. Logs, Notifications & Recycle Bin
      await wipe('WhatsAppLog', () => tx.whatsAppLog.deleteMany());
      await wipe('ActivityLog', () => tx.activityLog.deleteMany());
      await wipe('RecycleBinItem', () => tx.recycleBinItem.deleteMany());
      await wipe('Notification', () => tx.notification.deleteMany());
      await wipe('AuditLog', () => tx.auditLog.deleteMany());

      // 14. Reset Chart of Accounts balances to zero while keeping account definitions
      const accountsReset = await tx.account.updateMany({
        data: { currentBalance: 0 },
      });

      const [companies, users, dropdownOptions, saasTransactions, supportTickets] = await Promise.all([
        tx.company.count(),
        tx.user.count(),
        tx.dropdownOption.count(),
        tx.saaSTransaction.count(),
        tx.supportTicket.count(),
      ]);

      const totalDeletedRows = Object.values(deleted).reduce((sum, n) => sum + n, 0);

      return {
        deleted,
        totalDeletedRows,
        preserved: {
          companies,
          users,
          accountsResetToZero: accountsReset.count,
          dropdownOptions,
          saasTransactions,
          supportTickets,
        },
      };
    },
    { timeout: 30000 }
  );
}

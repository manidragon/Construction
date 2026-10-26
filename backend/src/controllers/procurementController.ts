import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';
import { postBalancedJournalEntry, COA } from '../utils/accounting';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { purchaseOrders: true, invoices: true, payments: true },
        },
        invoices: {
          where: { balanceDue: { gt: 0 } },
          select: { id: true, balanceDue: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = suppliers.map((s) => {
      const openInvoicesSum = s.invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
      // Ensure currentBalance accurately reflects unpaid invoices if any are open
      const currentPayable = openInvoicesSum > 0 ? Math.max(openInvoicesSum, s.currentBalance) : s.currentBalance;
      return {
        ...s,
        currentBalance: Math.round(currentPayable * 100) / 100,
        unpaidInvoicesCount: s.invoices.length,
        unpaidInvoicesSum: openInvoicesSum,
      };
    });

    return res.json({ success: true, suppliers: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { code, name, contactPerson, phone, email, address, city, gstin, pan, paymentTerms, bankName, bankAccountNo, bankIfsc, openingBalance } = req.body;

    if (!code || !name || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Code, name, phone, and address are required.' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name,
        contactPerson,
        phone,
        email,
        address,
        city: city || 'Bengaluru',
        gstin,
        pan,
        paymentTerms: paymentTerms || 'Net 30 Days',
        bankName,
        bankAccountNo,
        bankIfsc,
        openingBalance: Number(openingBalance) || 0,
        currentBalance: Number(openingBalance) || 0,
      },
    });

    await logAudit(req.user?.id, 'CREATE_SUPPLIER', 'SUPPLIER', supplier.id, { code, name }, req.ip);

    return res.status(201).json({ success: true, supplier });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { code, name, contactPerson, phone, email, address, city, gstin, pan, paymentTerms, bankName, bankAccountNo, bankIfsc, openingBalance } = req.body;

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        code: code !== undefined ? String(code).trim() : existing.code,
        name: name !== undefined ? String(name).trim() : existing.name,
        contactPerson: contactPerson !== undefined ? (contactPerson ? String(contactPerson).trim() : null) : existing.contactPerson,
        phone: phone !== undefined ? String(phone).trim() : existing.phone,
        email: email !== undefined ? (email ? String(email).trim() : null) : existing.email,
        address: address !== undefined ? String(address).trim() : existing.address,
        city: city !== undefined ? String(city).trim() : existing.city,
        gstin: gstin !== undefined ? (gstin ? String(gstin).trim() : null) : existing.gstin,
        pan: pan !== undefined ? (pan ? String(pan).trim() : null) : existing.pan,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : existing.paymentTerms,
        bankName: bankName !== undefined ? (bankName ? String(bankName).trim() : null) : existing.bankName,
        bankAccountNo: bankAccountNo !== undefined ? (bankAccountNo ? String(bankAccountNo).trim() : null) : existing.bankAccountNo,
        bankIfsc: bankIfsc !== undefined ? (bankIfsc ? String(bankIfsc).trim() : null) : existing.bankIfsc,
        openingBalance: openingBalance !== undefined ? Number(openingBalance) : existing.openingBalance,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_SUPPLIER', 'SUPPLIER', id, { name: updated.name }, req.ip);

    return res.json({ success: true, supplier: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true, invoices: true, payments: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    if (existing._count.purchaseOrders > 0 || existing._count.invoices > 0 || existing._count.payments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier with active records (${existing._count.purchaseOrders} POs, ${existing._count.invoices} invoices, ${existing._count.payments} payments).`,
      });
    }

    await prisma.supplier.delete({ where: { id } });
    await logAudit(req.user?.id, 'DELETE_SUPPLIER', 'SUPPLIER', id, { name: existing.name }, req.ip);

    return res.json({ success: true, message: `Supplier ${existing.name} deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const { projectId, status } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;
    if (status && typeof status === 'string') where.status = status;

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        project: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, code: true, name: true, phone: true, gstin: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        items: {
          include: {
            material: { select: { code: true, name: true, unit: true } },
          },
        },
        grns: true,
        invoices: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, purchaseOrders: pos });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { projectId, supplierId, deliveryDueDate, termsConditions, freightCharges, items } = req.body;

    if (!projectId || !supplierId || !deliveryDueDate || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Project, supplier, delivery date, and items are required.' });
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let totalTax = 0;

    const lineItemsData = items.map((it: any) => {
      const qty = Number(it.orderQty);
      const price = Number(it.unitPrice);
      const taxRate = it.taxPercent !== undefined && it.taxPercent !== '' ? Number(it.taxPercent) : 18.0;
      const lineSubtotal = qty * price;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      totalTax += lineTax;

      return {
        materialId: it.materialId,
        orderQty: qty,
        unitPrice: price,
        taxPercent: taxRate,
        taxAmount: lineTax,
        totalAmount: lineTotal,
      };
    });

    const freight = Number(freightCharges) || 0;
    const totalAmount = subtotal + totalTax + freight;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId,
        supplierId,
        deliveryDueDate: new Date(deliveryDueDate),
        status: 'APPROVED',
        subtotal,
        taxAmount: totalTax,
        freightCharges: freight,
        totalAmount,
        termsConditions,
        createdById: req.user!.id,
        approvedById: req.user?.role === 'OWNER' ? req.user.id : null,
        items: {
          create: lineItemsData,
        },
      },
      include: { items: true },
    });

    await logAudit(req.user?.id, 'CREATE_PO', 'PURCHASE_ORDER', po.id, { poNumber, totalAmount }, req.ip);

    return res.status(201).json({ success: true, purchaseOrder: po });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { supplierId, deliveryDueDate, termsConditions, freightCharges, items } = req.body;

    const existingPO: any = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, grns: true },
    });

    if (!existingPO) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    let subtotal = 0;
    let totalTax = 0;

    const lineItemsData = (items && Array.isArray(items) && items.length > 0 ? items : existingPO.items).map((it: any) => {
      const qty = Number(it.orderQty);
      const price = Number(it.unitPrice);
      const taxRate = it.taxPercent !== undefined && it.taxPercent !== '' ? Number(it.taxPercent) : 0;
      const lineSubtotal = qty * price;
      const lineTax = (lineSubtotal * taxRate) / 100;
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      totalTax += lineTax;

      return {
        materialId: it.materialId,
        orderQty: qty,
        unitPrice: price,
        taxPercent: taxRate,
        taxAmount: lineTax,
        totalAmount: lineTotal,
      };
    });

    const freight = freightCharges !== undefined ? Number(freightCharges) : existingPO.freightCharges;
    const totalAmount = subtotal + totalTax + freight;

    const updatedPO = await prisma.$transaction(async (tx) => {
      // If new items were provided, replace POLineItems
      if (items && Array.isArray(items) && items.length > 0) {
        await tx.pOLineItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        await tx.pOLineItem.createMany({
          data: lineItemsData.map((li: any) => ({
            ...li,
            purchaseOrderId: id,
          })),
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: supplierId || existingPO.supplierId,
          deliveryDueDate: deliveryDueDate ? new Date(deliveryDueDate) : existingPO.deliveryDueDate,
          termsConditions: termsConditions !== undefined ? termsConditions : existingPO.termsConditions,
          freightCharges: freight,
          subtotal,
          taxAmount: totalTax,
          totalAmount,
        },
        include: {
          project: { select: { id: true, code: true, name: true } },
          supplier: { select: { id: true, code: true, name: true, phone: true, gstin: true } },
          items: {
            include: { material: { select: { code: true, name: true, unit: true } } },
          },
        },
      });
    });

    await logAudit(req.user?.id, 'UPDATE_PO', 'PURCHASE_ORDER', id, { totalAmount }, req.ip);

    return res.json({ success: true, purchaseOrder: updatedPO });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const po: any = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { grns: true, invoices: true },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    if (po.grns && po.grns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete PO ${po.poNumber} because goods have already been received via ${po.grns.length} GRN(s). Please remove linked GRNs first.`,
      });
    }

    if (po.invoices && po.invoices.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete PO ${po.poNumber} because supplier invoices are linked to it.`,
      });
    }

    await prisma.$transaction([
      prisma.pOLineItem.deleteMany({ where: { purchaseOrderId: id } }),
      prisma.purchaseOrder.delete({ where: { id } }),
    ]);

    await logAudit(req.user?.id, 'DELETE_PO', 'PURCHASE_ORDER', id, { poNumber: po.poNumber }, req.ip);

    return res.json({ success: true, message: `Purchase Order ${po.poNumber} deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getGoodsReceiptNotes = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    const where: any = {};
    if (projectId && typeof projectId === 'string') where.projectId = projectId;

    const grns = await prisma.goodsReceiptNote.findMany({
      where,
      include: {
        purchaseOrder: {
          select: { poNumber: true, supplier: { select: { name: true } } },
        },
        warehouse: { select: { code: true, name: true } },
        project: { select: { code: true, name: true } },
        receivedBy: { select: { name: true } },
        items: {
          include: {
            material: { select: { code: true, name: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, grns });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Record Goods Receipt Note (GRN)
 * Physically moves received goods into warehouse, updates weighted average cost and stock balances.
 */
export const createGoodsReceiptNote = async (req: Request, res: Response) => {
  try {
    const { purchaseOrderId, warehouseId, deliveryNoteNo, vehicleNo, remarks, items } = req.body;

    if (!purchaseOrderId || !warehouseId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'PO, warehouse, and receipt items are required.' });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true, supplier: true },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    const count = await prisma.goodsReceiptNote.count();
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const grn = await prisma.$transaction(async (tx) => {
      const createdGrn = await tx.goodsReceiptNote.create({
        data: {
          grnNumber,
          purchaseOrderId,
          projectId: po.projectId,
          warehouseId,
          deliveryNoteNo,
          vehicleNo,
          receivedById: req.user!.id,
          remarks,
          status: 'VERIFIED',
          items: {
            create: items.map((it: any) => ({
              poLineItemId: it.poLineItemId || null,
              materialId: it.materialId,
              receivedQty: Number(it.receivedQty),
              acceptedQty: Number(it.acceptedQty),
              rejectedQty: Number(it.rejectedQty) || 0,
              remarks: it.remarks || null,
            })),
          },
        },
        include: { items: true },
      });

      // Update PO items receivedQty
      for (const it of items) {
        if (it.poLineItemId) {
          await tx.pOLineItem.update({
            where: { id: it.poLineItemId },
            data: { receivedQty: { increment: Number(it.acceptedQty) } },
          });
        }

        // Find unit purchase price from PO line item or standard price
        const poLine = po.items.find((pli) => pli.materialId === it.materialId);
        const unitPrice = poLine ? poLine.unitPrice : 0;
        const acceptedQty = Number(it.acceptedQty);

        if (acceptedQty > 0) {
          // Inward into destination warehouse
          let balance = await tx.stockBalance.findUnique({
            where: {
              warehouseId_materialId: {
                warehouseId,
                materialId: it.materialId,
              },
            },
          });

          if (!balance) {
            balance = await tx.stockBalance.create({
              data: {
                warehouseId,
                materialId: it.materialId,
                currentQty: 0,
                avgUnitCost: unitPrice,
                totalValuation: 0,
              },
            });
          }

          const existingVal = balance.currentQty * balance.avgUnitCost;
          const incomingVal = acceptedQty * unitPrice;
          const newQty = balance.currentQty + acceptedQty;
          const newAvgCost = newQty > 0 ? (existingVal + incomingVal) / newQty : unitPrice;

          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              currentQty: newQty,
              avgUnitCost: newAvgCost,
              totalValuation: newQty * newAvgCost,
            },
          });

          // Create stock ledger entry
          const ledgerCount = await tx.stockLedger.count();
          const txnNumber = `STK-${new Date().getFullYear()}-${String(ledgerCount + 1).padStart(5, '0')}`;

          const material = await tx.material.findUnique({ where: { id: it.materialId } });

          await tx.stockLedger.create({
            data: {
              txnNumber,
              txnType: 'PURCHASE_RECEIPT',
              materialId: it.materialId,
              qty: acceptedQty,
              unit: material?.unit || 'NOS',
              unitRate: unitPrice,
              totalValue: incomingVal,
              destWarehouseId: warehouseId,
              projectId: po.projectId,
              referenceNo: grnNumber,
              remarks: `Received against ${po.poNumber} from ${po.supplier.name}`,
              responsibleBy: req.user?.name || 'Storekeeper',
            },
          });
        }
      }

      return createdGrn;
    });

    await logAudit(req.user?.id, 'CREATE_GRN', 'GOODS_RECEIPT_NOTE', grn.id, { grnNumber }, req.ip);

    return res.status(201).json({ success: true, grn });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSupplierInvoices = async (req: Request, res: Response) => {
  try {
    const { supplierId, status } = req.query;

    const where: any = {};
    if (supplierId && typeof supplierId === 'string') where.supplierId = supplierId;
    if (status && typeof status === 'string') where.status = status;

    const invoices = await prisma.supplierInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, code: true, name: true, gstin: true } },
        purchaseOrder: { select: { poNumber: true, projectId: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, invoices });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSupplierInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber, supplierId, purchaseOrderId, invoiceDate, dueDate, subtotal, taxAmount } = req.body;

    if (!invoiceNumber || !supplierId || !invoiceDate || !dueDate || subtotal === undefined) {
      return res.status(400).json({ success: false, message: 'Invoice number, supplier, dates, and subtotal are required.' });
    }

    // Duplicate check
    const existing = await prisma.supplierInvoice.findFirst({
      where: { invoiceNumber, supplierId },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Duplicate Invoice! Invoice number '${invoiceNumber}' from this supplier is already registered.`,
      });
    }

    const sub = Number(subtotal);
    const tax = Number(taxAmount) || 0;
    const total = sub + tax;

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.supplierInvoice.create({
        data: {
          invoiceNumber,
          supplierId,
          purchaseOrderId: purchaseOrderId || null,
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          subtotal: sub,
          taxAmount: tax,
          totalAmount: total,
          paidAmount: 0,
          balanceDue: total,
          status: 'UNPAID',
        },
      });

      // Update supplier current payable balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: { currentBalance: { increment: total } },
      });

      return created;
    });

    // Auto post balanced double entry:
    // Dr. Direct Material / Project Cost: sub
    // Dr. Input GST 18%: tax
    // Cr. Accounts Payable: total
    try {
      const po = purchaseOrderId ? await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } }) : null;
      await postBalancedJournalEntry({
        entryDate: new Date(invoiceDate),
        referenceType: 'SUPPLIER_INVOICE',
        referenceId: invoice.id,
        narration: `Supplier bill booked #${invoiceNumber} for purchase`,
        lines: [
          { accountCode: COA.DIRECT_MATERIAL_COST, debit: sub, credit: 0, projectId: po?.projectId },
          { accountCode: COA.INPUT_GST_18, debit: tax, credit: 0, projectId: po?.projectId },
          { accountCode: COA.ACCOUNTS_PAYABLE, debit: 0, credit: total, projectId: po?.projectId },
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for supplier invoice:', jeErr);
    }

    await logAudit(req.user?.id, 'CREATE_SUPPLIER_INVOICE', 'SUPPLIER_INVOICE', invoice.id, { invoiceNumber, total }, req.ip);

    return res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const recordSupplierPayment = async (req: Request, res: Response) => {
  try {
    const { supplierId, invoiceId, paymentDate, amount, paymentMethod, referenceNo, notes } = req.body;

    const paymentAmount = Number(amount);
    if (!supplierId || paymentAmount <= 0 || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Supplier, payment amount (> 0), and payment method are required.' });
    }

    const count = await prisma.supplierPayment.count();
    const paymentNumber = `PMT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const payment = await prisma.$transaction(async (tx) => {
      let resolvedInvoiceId = invoiceId || null;

      if (resolvedInvoiceId) {
        const inv = await tx.supplierInvoice.findUnique({ where: { id: resolvedInvoiceId } });
        if (inv) {
          const newPaid = inv.paidAmount + paymentAmount;
          const newBal = Math.max(0, inv.totalAmount - newPaid);
          const newStatus = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';

          await tx.supplierInvoice.update({
            where: { id: resolvedInvoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: newBal,
              status: newStatus,
            },
          });
        }
      } else {
        // Automatically allocate payment to supplier's open unpaid invoices (FIFO)
        const openInvoices = await tx.supplierInvoice.findMany({
          where: { supplierId, balanceDue: { gt: 0 } },
          orderBy: { invoiceDate: 'asc' },
        });

        let remaining = paymentAmount;
        for (const inv of openInvoices) {
          if (remaining <= 0) break;
          const apply = Math.min(remaining, inv.balanceDue);
          const newPaid = inv.paidAmount + apply;
          const newBal = Math.max(0, inv.totalAmount - newPaid);
          const newStatus = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';

          await tx.supplierInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              balanceDue: newBal,
              status: newStatus,
            },
          });

          if (!resolvedInvoiceId) {
            resolvedInvoiceId = inv.id;
          }
          remaining -= apply;
        }
      }

      const pmt = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId,
          invoiceId: resolvedInvoiceId,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: paymentAmount,
          paymentMethod,
          referenceNo,
          notes,
        },
      });

      // Reduce supplier outstanding balance
      await tx.supplier.update({
        where: { id: supplierId },
        data: { currentBalance: { decrement: paymentAmount } },
      });

      return pmt;
    });

    // Auto post balanced journal entry:
    // Dr. Accounts Payable: paymentAmount
    // Cr. Bank / Cash: paymentAmount
    try {
      const bankCode = paymentMethod === 'CASH' ? COA.CASH : COA.HDFC_BANK;
      await postBalancedJournalEntry({
        entryDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceType: 'SUPPLIER_PAYMENT',
        referenceId: payment.id,
        narration: `Payment voucher ${paymentNumber} settled to supplier. Ref: ${referenceNo || 'Direct'}`,
        lines: [
          { accountCode: COA.ACCOUNTS_PAYABLE, debit: paymentAmount, credit: 0 },
          { accountCode: bankCode, debit: 0, credit: paymentAmount },
        ],
        createdById: req.user?.id,
      });
    } catch (jeErr) {
      console.error('Auto journal error for supplier payment:', jeErr);
    }

    await logAudit(req.user?.id, 'SUPPLIER_PAYMENT', 'SUPPLIER_PAYMENT', payment.id, { paymentNumber, amount: paymentAmount }, req.ip);

    return res.status(201).json({ success: true, payment });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGoodsReceiptNote = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { deliveryNoteNo, vehicleNo, remarks } = req.body;

    const existing = await prisma.goodsReceiptNote.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Goods Receipt Note not found' });
    }

    const updated = await prisma.goodsReceiptNote.update({
      where: { id },
      data: {
        deliveryNoteNo: deliveryNoteNo !== undefined ? deliveryNoteNo : existing.deliveryNoteNo,
        vehicleNo: vehicleNo !== undefined ? vehicleNo : existing.vehicleNo,
        remarks: remarks !== undefined ? remarks : existing.remarks,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_GRN', 'GOODS_RECEIPT_NOTE', id, { grnNumber: updated.grnNumber }, req.ip);
    return res.json({ success: true, grn: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGoodsReceiptNote = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const grn = await prisma.goodsReceiptNote.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!grn) {
      return res.status(404).json({ success: false, message: 'Goods Receipt Note not found' });
    }

    // Rollback stock quantities from warehouse stock balances
    await prisma.$transaction(async (tx) => {
      for (const item of grn.items) {
        if (item.acceptedQty > 0) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              warehouseId_materialId: {
                warehouseId: grn.warehouseId,
                materialId: item.materialId,
              },
            },
          });

          if (balance) {
            const newQty = Math.max(0, balance.currentQty - item.acceptedQty);
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: {
                currentQty: newQty,
                totalValuation: newQty * balance.avgUnitCost,
              },
            });
          }
        }
      }

      // Delete stock ledger entries referencing this GRN
      await tx.stockLedger.deleteMany({
        where: { referenceNo: grn.grnNumber },
      });

      // Delete GRN items & GRN
      await tx.gRNItem.deleteMany({ where: { grnId: id } });
      await tx.goodsReceiptNote.delete({ where: { id } });
    });

    await logAudit(req.user?.id, 'DELETE_GRN', 'GOODS_RECEIPT_NOTE', id, { grnNumber: grn.grnNumber }, req.ip);
    return res.json({ success: true, message: `GRN ${grn.grnNumber} deleted and stock balances reconciled successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSupplierInvoice = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { invoiceDate, dueDate, status } = req.body;

    const existing = await prisma.supplierInvoice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier invoice not found' });
    }

    const updated = await prisma.supplierInvoice.update({
      where: { id },
      data: {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : existing.invoiceDate,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        status: status || existing.status,
      },
    });

    await logAudit(req.user?.id, 'UPDATE_SUPPLIER_INVOICE', 'SUPPLIER_INVOICE', id, { invoiceNumber: updated.invoiceNumber }, req.ip);
    return res.json({ success: true, invoice: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSupplierInvoice = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.supplierInvoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier invoice not found' });
    }

    if (existing.paidAmount > 0 || (existing.payments && existing.payments.length > 0)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete invoice ${existing.invoiceNumber} with payments recorded against it. Remove payments first.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      // Revert supplier balance
      await tx.supplier.update({
        where: { id: existing.supplierId },
        data: { currentBalance: { decrement: existing.totalAmount } },
      });

      // Remove journal entries
      await tx.journalEntry.deleteMany({
        where: { referenceType: 'SUPPLIER_INVOICE', referenceId: id },
      });

      await tx.supplierInvoice.delete({ where: { id } });
    });

    await logAudit(req.user?.id, 'DELETE_SUPPLIER_INVOICE', 'SUPPLIER_INVOICE', id, { invoiceNumber: existing.invoiceNumber }, req.ip);
    return res.json({ success: true, message: `Supplier Invoice ${existing.invoiceNumber} deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSupplierPayment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const pmt = await prisma.supplierPayment.findUnique({
      where: { id },
    });

    if (!pmt) {
      return res.status(404).json({ success: false, message: 'Supplier payment not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Restore invoice balance if linked
      if (pmt.invoiceId) {
        const inv = await tx.supplierInvoice.findUnique({ where: { id: pmt.invoiceId } });
        if (inv) {
          const newPaid = Math.max(0, inv.paidAmount - pmt.amount);
          const newBal = Math.max(0, inv.totalAmount - newPaid);
          const newStatus = newPaid === 0 ? 'UNPAID' : 'PARTIALLY_PAID';

          await tx.supplierInvoice.update({
            where: { id: pmt.invoiceId },
            data: {
              paidAmount: newPaid,
              balanceDue: newBal,
              status: newStatus,
            },
          });
        }
      }

      // Re-add payment amount to supplier's current balance
      await tx.supplier.update({
        where: { id: pmt.supplierId },
        data: { currentBalance: { increment: pmt.amount } },
      });

      // Remove journal entry
      await tx.journalEntry.deleteMany({
        where: { referenceType: 'SUPPLIER_PAYMENT', referenceId: id },
      });

      await tx.supplierPayment.delete({ where: { id } });
    });

    await logAudit(req.user?.id, 'DELETE_SUPPLIER_PAYMENT', 'SUPPLIER_PAYMENT', id, { paymentNumber: pmt.paymentNumber }, req.ip);
    return res.json({ success: true, message: `Supplier payment ${pmt.paymentNumber} deleted and balance restored.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


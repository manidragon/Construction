import prisma from './prisma';

/**
 * Creates a balanced double-entry journal entry and updates ledger account balances.
 * Guarantees that Total Debits === Total Credits.
 */
export interface JournalLineInput {
  accountCode: string;
  debit: number;
  credit: number;
  projectId?: string;
}

export async function postBalancedJournalEntry({
  entryDate,
  referenceType,
  referenceId,
  narration,
  lines,
  createdById,
  tx,
}: {
  entryDate?: Date;
  referenceType: string;
  referenceId?: string;
  narration: string;
  lines: JournalLineInput[];
  createdById?: string;
  tx?: any;
}) {
  // Validate total debits equal total credits within 0.01 tolerance
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Accounting Error: Journal entry is unbalanced! Total Debit (₹${totalDebit.toFixed(2)}) != Total Credit (₹${totalCredit.toFixed(2)})`
    );
  }

  // Generate unique entry number using either tx or prisma
  const client = tx || prisma;
  const entryCount = await client.journalEntry.count();
  const entryNumber = `JE-${new Date().getFullYear()}-${String(entryCount + 1).padStart(5, '0')}-${Date.now().toString().slice(-4)}`;

  const executeEntry = async (txClient: any) => {
    const journalEntry = await txClient.journalEntry.create({
      data: {
        entryNumber,
        entryDate: entryDate || new Date(),
        referenceType,
        referenceId,
        narration,
        isPosted: true,
        createdById,
      },
    });

    for (const line of lines) {
      if (line.debit === 0 && line.credit === 0) continue;

      let account = await txClient.account.findUnique({
        where: { code: line.accountCode },
      });

      if (!account) {
        // Create standard account if missing
        account = await txClient.account.create({
          data: {
            code: line.accountCode,
            name: line.accountCode.replace(/_/g, ' '),
            type: determineAccountType(line.accountCode),
            subType: 'GENERAL',
            currentBalance: 0,
          },
        });
      }

      // Create journal line
      await txClient.journalLine.create({
        data: {
          journalEntryId: journalEntry.id,
          accountId: account.id,
          debit: line.debit,
          credit: line.credit,
          projectId: line.projectId,
        },
      });

      // Update account balance based on normal balance rules:
      // ASSET & EXPENSE normal balance is DEBIT (+ debit, - credit)
      // LIABILITY, EQUITY, REVENUE normal balance is CREDIT (+ credit, - debit)
      let balanceDelta = 0;
      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        balanceDelta = line.debit - line.credit;
      } else {
        balanceDelta = line.credit - line.debit;
      }

      await txClient.account.update({
        where: { id: account.id },
        data: {
          currentBalance: { increment: balanceDelta },
        },
      });
    }

    return journalEntry;
  };

  // If already inside an existing transaction, execute directly on tx to avoid nested SQLite lock timeouts
  if (tx) {
    return await executeEntry(tx);
  }

  // Otherwise create a standalone transaction with a safe 15s timeout
  return await prisma.$transaction(async (innerTx) => {
    return await executeEntry(innerTx);
  }, { timeout: 15000 });
}

function determineAccountType(code: string): string {
  if (code.startsWith('1')) return 'ASSET';
  if (code.startsWith('2')) return 'LIABILITY';
  if (code.startsWith('3')) return 'EQUITY';
  if (code.startsWith('4')) return 'REVENUE';
  if (code.startsWith('5')) return 'EXPENSE';
  return 'EXPENSE';
}

/**
 * Common Chart of Accounts Codes
 */
export const COA = {
  // 1xxx Assets
  CASH: '1010',
  PETTY_CASH: '1020',
  HDFC_BANK: '1030',
  ACCOUNTS_RECEIVABLE: '1100',
  RETENTION_RECEIVABLE: '1150',
  INVENTORY_STORES: '1200',
  EQUIPMENT_ASSET: '1500',
  INPUT_GST_18: '1300',

  // 2xxx Liabilities
  ACCOUNTS_PAYABLE: '2010',
  LABOUR_WAGES_PAYABLE: '2020',
  RETENTION_PAYABLE: '2050',
  OUTPUT_GST_18: '2200',
  TDS_PAYABLE: '2250',

  // 3xxx Equity
  SHARE_CAPITAL: '3010',
  RETAINED_EARNINGS: '3020',

  // 4xxx Revenue
  CONTRACT_REVENUE: '4010',

  // 5xxx Direct Project Costs & Expenses
  DIRECT_MATERIAL_COST: '5010',
  DIRECT_LABOUR_COST: '5020',
  EQUIPMENT_HIRE_COST: '5030',
  SUBCONTRACTOR_COST: '5040',
  SITE_TRANSPORT_FUEL: '5110',
  SITE_OVERHEAD_EXPENSE: '5120',
  ADMIN_EXPENSE: '5200',
};

import prisma from '../utils/prisma';
import { extractDateFromPrompt } from '../utils/dateParser';

export interface AIActionResponse {
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

const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
};

const formatDateStr = (d: Date | string | null | undefined): string => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ============================================================================
// 1. CONCEPTUAL KNOWLEDGE BASE & DEFINITIONS (CONSTRUCTION, INTERIOR & FINANCE)
// ============================================================================

export function getConstructionConceptAnswer(lower: string): AIActionResponse | null {
  // 1. Difference between BOQ and Quotation
  if (
    (lower.includes('difference') || lower.includes('vs') || lower.includes('compare') || lower.includes('distinguish')) &&
    (lower.includes('boq') || lower.includes('bill of quantit')) &&
    (lower.includes('quotation') || lower.includes('quote') || lower.includes('proposal'))
  ) {
    return {
      message:
        `📐 **Crucial Distinction: Client Quotation vs. Internal BOQ (Company Purpose)**\n\n` +
        `In construction, contracting, and interior fit-out management, **Client Quotation** and **Internal BOQ** serve two distinct stakeholders and operational workflows:\n\n` +
        `| Key Dimension | 📄 Client Quotation (Sales & Commercials) | 🏗️ Internal BOQ (Site Engineering & Costing) |\n` +
        `| :--- | :--- | :--- |\n` +
        `| **Primary Audience** | **The Client / Employer / Property Owner** | **Company Management, Estimators & Site Engineers** |\n` +
        `| **Purpose** | Commercial sales proposal, formal bid, contract award sign-off | Internal budget control, material takeoff, task tracking |\n` +
        `| **Pricing Basis** | **Client Selling Rates** (includes company markup & profit margins) | **Internal Purchase/Cost Rates** (bare material, labour, plant) |\n` +
        `| **Milestones & Payment** | Linked to **Billing Milestones** (e.g. 20% advance, 30% plastering) | Linked directly to **Site Tasks & Activity Execution** |\n` +
        `| **Visibility** | Sent to client via WhatsApp / Email PDF proposal | Strictly internal company confidential document |\n` +
        `| **Taxes & Compliance** | Shows GST (Exclusive 18% or Inclusive) and client payment terms | Tracks tax input credit (ITC) and net company liability |\n` +
        `| **ERP Location** | **Sales & Client Commercials > Client Quotations** | **Site Engineering & Ops > Internal BOQ (Company)** |\n\n` +
        `### 💡 Key Takeaway for Your Team:\n` +
        `• **Never send an internal BOQ to a client** — it exposes your raw supplier purchase costs and profit margins.\n` +
        `• **Always generate a Client Quotation** for negotiations, approvals, and contract agreements.\n` +
        `• Once a project starts, the **Internal BOQ is linked to project tasks** so daily site progress and material consumption can be monitored against estimated budgets.`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'How to create a Client Quotation?',
        'How to connect internal BOQ to project tasks?',
        'Show all recent client quotations',
        'Show active leads in sales pipeline',
      ],
    };
  }

  // 2. What is a Quotation?
  if (
    (lower.includes('what is') || lower.includes('explain') || lower.includes('meaning of') || lower.includes('define')) &&
    (lower.includes('quotation') || lower.includes('client quote') || lower.includes('commercial proposal')) &&
    !lower.includes('boq')
  ) {
    return {
      message:
        `📄 **What is a Client Quotation in Construction & Interior Fit-Out?**\n\n` +
        `A **Client Quotation** is a formal commercial document submitted to a prospective client or project owner detailing the agreed scope of work, selling rates, and contract payment terms.\n\n` +
        `### Key Components of a Construction Quotation:\n` +
        `1. **Area & Room Breakdown:** Scope segregated by functional zones (e.g., Living Room, Modular Kitchen, Master Bedroom, Civil Work, Electrical).\n` +
        `2. **Specifications:** Detailed material grades (e.g., 19mm BWR Marine Plywood, 1mm Acrylic Laminate, Concealed Hafele hardware).\n` +
        `3. **Client Selling Rates:** Unit rates that include procurement cost, direct labour, transport, site overheads, and target profit margin.\n` +
        `4. **Tax Structure (GST 18%):** Explicitly stated as **Exclusive** (+18% added at billing) or **Inclusive** (18% embedded in rates).\n` +
        `5. **Payment Schedule Milestones:** Advance booking percentage, structural completion, MEP sign-off, and final handover.\n` +
        `6. **Validity & Terms:** Validity duration (typically 15-30 days due to fluctuating raw material prices) and penalty clauses.\n\n` +
        `💡 *In ApexBuild ERP, manage client proposals under **Sales & Client Commercials > Client Quotations**.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'How to create a Client Quotation?',
        'What is the difference between BOQ and quotation?',
        'Show pending quotations',
      ],
    };
  }

  // 3. What is a BOQ?
  if (
    (lower.includes('what is') || lower.includes('explain') || lower.includes('meaning of') || lower.includes('define')) &&
    (lower.includes('boq') || lower.includes('bill of quantit'))
  ) {
    return {
      message:
        `🏗️ **What is a BOQ (Bill of Quantities)?**\n\n` +
        `A **Bill of Quantities (BOQ)** is an exhaustive engineering and quantity surveying document that itemizes all materials, labour trades, equipment, and subcontractor activities required to complete a project.\n\n` +
        `### Structure of an Internal Company BOQ:\n` +
        `• **Item Code & Cost Classification:** (e.g., \`CIV-01\` Concrete M25, \`CARP-03\` Wardrobe carcasses).\n` +
        `• **Unit of Measurement:** SQFT, RFT, CUM (m³), MT (Metric Ton), or Lumpsum (LS).\n` +
        `• **Estimated Quantity:** Precise takeoff calculated from architectural, structural, and MEP working drawings.\n` +
        `• **Internal Unit Cost:** The contractor's true internal procurement and fabrication cost.\n` +
        `• **Task Linkage:** In ApexBuild ERP, every BOQ item is tied directly to project site tasks, enabling real-time cost-to-complete and variance tracking.\n\n` +
        `💡 *Access and manage internal costing under **Site Engineering & Ops > Internal BOQ (Company)**.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'What is the difference between BOQ and quotation?',
        'How to connect internal BOQ to project tasks?',
        'Show BOQ for Bakery project',
      ],
    };
  }

  // 4. RA Bills (Running Account Bills)
  if (
    lower.includes('ra bill') ||
    lower.includes('running account bill') ||
    lower.includes('running bill') ||
    (lower.includes('what is') && lower.includes('milestone invoice'))
  ) {
    return {
      message:
        `📄 **What is an RA Bill (Running Account Bill)?**\n\n` +
        `An **RA Bill (Running Account Bill)** is an interim, milestone-based progress invoice issued by a contractor to a client during the construction lifecycle.\n\n` +
        `### Standard RA Billing Lifecycle:\n` +
        `1. **Joint Site Measurement:** Contractor and client's Project Management Consultant (PMC) measure physical work executed up to date.\n` +
        `2. **Gross Certified Value:** Cumulative value of work completed under the contract.\n` +
        `3. **Deductions:**\n` +
        `   • **Retention Money:** Usually **5%** withheld for defect liability period (DLP).\n` +
        `   • **Mobilization Advance Recovery:** Pro-rata deduction to amortize initial advances.\n` +
        `   • **TDS (Tax Deducted at Source):** **1%** (Individual/HUF) or **2%** (Company) under Section 194C.\n` +
        `4. **Net Payable Amount:** Gross amount minus deductions, plus applicable GST (18%).\n\n` +
        `💡 *In ApexBuild ERP, create and manage RA Bills under **Accounts & Billing > Client Invoices & RA Bills**.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'What is retention money?',
        'What is TDS under Section 194C?',
        'What is the balance due amount of clients?',
      ],
    };
  }

  // 5. Retention Money
  if (lower.includes('retention') || lower.includes('retention money') || lower.includes('defect liability')) {
    return {
      message:
        `🛡️ **What is Retention Money in Construction Contracts?**\n\n` +
        `**Retention Money** is a security deposit withheld by the employer/client from each contractor's interim payment (RA Bill), typically **5% of certified work**.\n\n` +
        `### Purpose & Release Workflow:\n` +
        `• **Safeguard:** Ensures the contractor rectifies any structural defects, poor craftsmanship, or plumbing/electrical failures.\n` +
        `• **Defect Liability Period (DLP):** Typically lasts **12 months** post Virtual Completion Certificate (VCC).\n` +
        `• **Release Schedule:** Usually 50% released upon Handover / Occupancy Certificate, and the remaining 50% released at the end of the 12-month DLP.\n\n` +
        `💡 *In ApexBuild ERP, every invoice automatically calculates and tracks retention balances.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'What is an RA Bill?',
        'How to create an invoice in ERP?',
        'What is the balance due amount of clients?',
      ],
    };
  }

  // 6. TDS on Contractors (Section 194C)
  if (lower.includes('tds') || lower.includes('section 194c') || lower.includes('tax deducted at source')) {
    return {
      message:
        `🏛️ **TDS Deductions on Construction & Interior Works (Section 194C)**\n\n` +
        `Under Indian Income Tax Law, clients deducting payments to contractors/subcontractors must withhold TDS under **Section 194C**:\n\n` +
        `• **1% TDS:** When the contractor is an **Individual or HUF (Sole Proprietorship)**.\n` +
        `• **2% TDS:** When the contractor is a **Company, Partnership Firm, or LLP**.\n` +
        `• **Threshold:** Single contract > ₹30,000, or aggregate billings exceeding ₹1,00,000 in a financial year.\n` +
        `• **Form 16A:** The client issues Form 16A quarterly, which your accountant credits against annual corporate income tax.\n\n` +
        `💡 *ApexBuild ERP accounts for TDS deductions automatically in every invoice calculation.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'What is an RA Bill?',
        'What are the total payments received today?',
        'Export ledger to Google Sheets',
      ],
    };
  }

  // 7. DPR (Daily Progress Report)
  if (
    (lower.includes('what is') || lower.includes('explain') || lower.includes('meaning')) &&
    (lower.includes('dpr') || lower.includes('daily progress report'))
  ) {
    return {
      message:
        `📋 **What is a DPR (Daily Progress Report)?**\n\n` +
        `A **Daily Progress Report (DPR)** is a mandatory daily operational log maintained by site engineers, supervisors, and project managers to record on-site activities.\n\n` +
        `### Core Elements Logged in a DPR:\n` +
        `1. **Work Completed Today:** Activity description (e.g. 450 sqft tile laying, 1st coat putty in living room).\n` +
        `2. **Manpower Deployment:** Headcount by trade (Masons, Carpenters, Electricians, Helpers).\n` +
        `3. **Weather & Site Conditions:** Rain, power outages, material stockouts affecting critical path.\n` +
        `4. **Material Inflow & Consumption:** Cement bags unloaded, steel rebar consumed.\n` +
        `5. **Site Geo-Tagged Photos:** Visual evidence of work quality and safety compliance.\n\n` +
        `💡 *In ApexBuild ERP, log and view daily reports under **Site Engineering & Ops > Daily Site Reports (DPR)**.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'How to submit a Daily Progress Report (DPR)?',
        'Show today DPR reports',
        'Who is absent today among workers?',
      ],
    };
  }

  // 8. Labour Muster Roll & Daily Attendance
  if (lower.includes('what is muster') || lower.includes('muster roll definition') || lower.includes('what is labour muster')) {
    return {
      message:
        `👷 **What is a Labour Muster Roll?**\n\n` +
        `A **Labour Muster Roll** is the official statutory and financial attendance register maintained at the construction site for daily-wage, skilled, and unskilled construction workers.\n\n` +
        `### Functions of the Muster Roll:\n` +
        `• **Attendance Status:** Present (P), Absent (A), Half-Day (HD).\n` +
        `• **Trade Classification:** Mason, Carpenter, Barbender, Electrician, Plumber, Painter, Helper.\n` +
        `• **Overtime Tracking:** Normal 8-hour shift vs. overtime hours (paid at 1.5x regular wage rate).\n` +
        `• **Wage Liability:** Calculates weekly or daily cash wage payables and advances disbursed.\n\n` +
        `💡 *In ApexBuild ERP, access the live muster roll under **Workforce & Muster > Labour Muster Roll**.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'How to mark worker attendance in muster roll?',
        'Who is absent today in greenfield?',
        'Add a worker named Ramesh to Greenfield',
      ],
    };
  }

  // 9. LOP (Loss of Pay) / Office Staff Leave Deduction
  if (
    lower.includes('loss of pay') ||
    lower.includes('lop') ||
    (lower.includes('leave') && lower.includes('deduction') && (lower.includes('formula') || lower.includes('how')))
  ) {
    return {
      message:
        `📋 **Office Staff Attendance & Leave Deduction (LOP) Architecture**\n\n` +
        `In ApexBuild ERP, salaried office staff compensation is calculated with a strict statutory formula:\n\n` +
        `1. **Standard Monthly Working Days:** By default **26 days** (excludes 4 Sunday off-days).\n` +
        `2. **Daily Salary Rate:**\n` +
        `   $$\\text{Daily Rate} = \\frac{\\text{Fixed Monthly CTC}}{\\text{Standard Working Days (26)}}$$\n` +
        `3. **Paid Leaves Allowed:** Each staff member receives **1 or 2 paid leaves** per month (Casual/Medical) without salary reduction.\n` +
        `4. **Excess Absent Calculation:**\n` +
        `   $$\\text{Excess Absences} = \\max(0, \\text{Absent Days} - \\text{Paid Leaves}) + (\\text{Half Days} \\times 0.5)$$\n` +
        `5. **Automatic Salary Deduction:**\n` +
        `   $$\\text{Leave Deduction} = \\text{Excess Absences} \\times \\text{Daily Rate}$$\n\n` +
        `### 💡 Practical Example:\n` +
        `• Staff Fixed CTC: **₹30,000 / month**\n` +
        `• Daily Rate: ₹30,000 ÷ 26 = **₹1,154 / day**\n` +
        `• If Absent 3 days with 1 paid leave allowed: Unpaid Excess = 3 - 1 = **2 days**\n` +
        `• Leave Deduction: 2 × ₹1,154 = **₹2,308**\n` +
        `• Net Pay: ₹30,000 - ₹2,308 - PF (₹1,800) - PT (₹200) = **₹25,692**`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'Show all office staff salary structure and PF',
        'Show all staff PF and ESI contributions',
        'Who is on leave today in office staff?',
      ],
    };
  }

  // 10. Scope Variations & Change Orders
  if (lower.includes('variation') || lower.includes('change order') || lower.includes('scope change')) {
    return {
      message:
        `🔄 **What are Variations and Change Orders in Construction?**\n\n` +
        `A **Variation (or Change Order)** is any alteration to the contractual scope of work, including additions, omissions, or substitutions from the original approved quotation or tender drawings.\n\n` +
        `### Industry Best Practice for Variations:\n` +
        `1. **Variation Order Request (VOR):** Raised before work begins on site.\n` +
        `2. **Rate Approval:** Rate must be signed off by the client in writing; never execute variations verbally.\n` +
        `3. **Billing Integration:** Billed separately as an extra milestone or supplemental RA Bill.\n\n` +
        `💡 *ApexBuild ERP maintains a dedicated register for variations and change orders to eliminate billing disputes.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'Show scope variations and change orders for Bakery',
        'What is an RA Bill?',
        'What is the difference between BOQ and quotation?',
      ],
    };
  }

  // 11. Multi-Tenancy & Free Trial
  if (lower.includes('multi tenan') || lower.includes('how do trial') || lower.includes('trial period')) {
    return {
      message:
        `🏢 **Multi-Tenancy & Trial Management in ApexBuild ERP**\n\n` +
        `ApexBuild ERP provides enterprise-grade **multi-tenancy isolation**:\n\n` +
        `• **Data Isolation:** Every company operates within an isolated tenant partition identified by a unique \`tenantId\`. One company can never access another company's projects, finances, or leads.\n` +
        `• **14-Day Free Trial:** New signups receive full access to all features (Quotations, Projects, BOQ, Muster, Billing, Payroll, WhatsApp).\n` +
        `• **Super Admin Portal:** Accessible at \`/superadmin\` for team administrators to view system health, activate accounts, change plans, or grant 14-day trial extensions.\n` +
        `• **Roles & RBAC:** SUPER_ADMIN, TENANT_ADMIN (Company Owner), PROJECT_MANAGER, SITE_ENGINEER, ACCOUNTS_MANAGER, and STAFF.`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'How many days left in my trial?',
        'How to extend trial as super admin?',
        'How to configure WhatsApp Cloud API?',
      ],
    };
  }

  // 12. WhatsApp Meta Cloud API Integration
  if (
    (lower.includes('what is whatsapp') || lower.includes('whatsapp cloud api') || lower.includes('meta cloud api')) &&
    !lower.includes('how to') &&
    !lower.includes('how do i') &&
    !lower.includes('how can i') &&
    !lower.includes('steps to') &&
    !lower.includes('configure')
  ) {
    return {
      message:
        `💬 **WhatsApp Meta Cloud API Integration**\n\n` +
        `ApexBuild ERP integrates directly with Meta Cloud WhatsApp Business Platform to automate outbound communications:\n\n` +
        `1. **Quotation Dispatch:** 1-click sharing of commercial proposals directly to client WhatsApp.\n` +
        `2. **Daily Site DPRs:** Automated daily summary sent to property owners with progress percentage.\n` +
        `3. **Payment Reminders:** Automated alerts for pending RA bills and milestone dues.\n` +
        `4. **Worker Task Assignment:** Instant WhatsApp notifications to site engineers and supervisors.\n\n` +
        `💡 *Configure your credentials in **Settings > Company Profile / WhatsApp Configuration**.*`,
      actionTaken: 'CONCEPT_EXPLANATION',
      suggestedPrompts: [
        'How to configure WhatsApp Cloud API?',
        'Share update with Project Manager on WhatsApp',
        'Show recent client quotations',
      ],
    };
  }

  return null;
}

// ============================================================================
// 2. OPERATIONAL "HOW-TO" WORKFLOW GUIDES
// ============================================================================

export function getERPWorkflowHowToGuide(lower: string): AIActionResponse | null {
  // Only trigger if user is asking "how to", "how do i", "how can i", "steps to", "guide to"
  const isHowTo =
    lower.includes('how to') ||
    lower.includes('how do i') ||
    lower.includes('how can i') ||
    lower.includes('how does one') ||
    lower.includes('steps to') ||
    lower.includes('guide to') ||
    lower.includes('procedure to') ||
    lower.includes('where do i create') ||
    lower.includes('where to create') ||
    lower.includes('how should i');

  if (!isHowTo) return null;

  // 1. How to create a Client Quotation
  if (lower.includes('quotation') || lower.includes('quote') || lower.includes('proposal')) {
    return {
      message:
        `📋 **How to Create & Dispatch a Client Quotation in ApexBuild ERP**\n\n` +
        `Follow these simple steps to build a professional client proposal:\n\n` +
        `1. **Navigate:** Open the left navigation sidebar and click **Sales & Client Commercials > Client Quotations**.\n` +
        `2. **Initiate:** Click the **"+ New Quotation"** button at the top right.\n` +
        `3. **Select Client/Lead:** Choose an active client lead from the dropdown (or enter a new client's name, phone, and site address).\n` +
        `4. **Select Project Type:** Choose from *Residential Interior, Commercial Fitout, Full Villa Construction,* or *Renovation*.\n` +
        `5. **Set GST Mode:** Toggle between **EXCLUSIVE (+18%)** or **INCLUSIVE (18%)**.\n` +
        `6. **Add Line Items:** Enter scope items by room/area (e.g. Living Room TV Unit, Master Bed Wardrobe, False Ceiling), unit (SQFT, RFT, NOS), quantity, and client selling rate.\n` +
        `7. **Set Terms & Milestones:** Define payment milestone schedule (e.g., 20% advance, 40% woodwork, 30% finishes, 10% handover).\n` +
        `8. **Save & Dispatch:** Click **"Save Quotation"**. Once saved, use **"Share on WhatsApp"** or **"Download PDF"** to deliver directly to the client.`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'Show all recent client quotations',
        'What is the difference between BOQ and quotation?',
        'Show active leads in sales pipeline',
      ],
    };
  }

  // 2. How to manage Leads & Convert Lead to Project
  if (lower.includes('lead') || lower.includes('pipeline') || lower.includes('inquiry')) {
    return {
      message:
        `📈 **How to Manage Leads & Convert a Won Lead to a Project**\n\n` +
        `1. **Access Pipeline:** Go to **Sales & Client Commercials > Leads & Pipeline**.\n` +
        `2. **Create New Inquiry:** Click **"+ Add Lead"**, input client contact details, site address, project type, and budget bracket.\n` +
        `3. **Track Pipeline Progression:** Advance lead cards through the 7 stages:\n` +
        `   \`New Inquiry\` ➔ \`Site Visit Scheduled\` ➔ \`Site Measurement\` ➔ \`Design Concept\` ➔ \`Quotation Shared\` ➔ \`Negotiation\` ➔ \`Lead Won\`.\n` +
        `4. **Convert to Project:** Once the lead is in **"Lead Won"** status, click the **"✓ Convert to Project"** button.\n` +
        `5. **Automatic Setup:** The ERP automatically creates a new project under **Projects & Sites**, links the client, and brings over site specifications for project execution.`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'Show all active leads in sales pipeline',
        'How to create a Client Quotation?',
        'How many projects are active today?',
      ],
    };
  }

  // 3. How to create Internal BOQ and connect to Tasks
  if (lower.includes('boq') || lower.includes('bill of quantit') || lower.includes('task link')) {
    return {
      message:
        `🏗️ **How to Create Internal BOQ & Connect it to Project Tasks**\n\n` +
        `1. **Create BOQ Items:** Go to **Site Engineering & Ops > Internal BOQ (Company)**, select your project, and click **"+ Add BOQ Item"**.\n` +
        `2. **Input Costing Data:** Enter Item Code (e.g. \`CIV-01\`), Description, Unit (SQFT, RFT, CUM), Estimated Quantity, and Internal Unit Cost Rate.\n` +
        `3. **Navigate to Tasks:** Open **Site Engineering & Ops > Tasks & Milestones**.\n` +
        `4. **Link BOQ Item to Task:** Click **"+ Add Task"** or edit an existing task. In the **"Linked BOQ Item"** dropdown, select the corresponding BOQ line item.\n` +
        `5. **Automated Tracking:** As site engineers update task progress or log DPR completions, the ERP automatically aggregates actual consumed quantities and flags cost variances!`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'Show BOQ for Bakery project',
        'What is the difference between BOQ and quotation?',
        'How to submit a Daily Progress Report (DPR)?',
      ],
    };
  }

  // 4. How to log Daily Progress Report (DPR)
  if (lower.includes('dpr') || lower.includes('daily report') || lower.includes('progress report') || lower.includes('site report')) {
    return {
      message:
        `📋 **How to Submit a Daily Site Progress Report (DPR)**\n\n` +
        `1. **Navigate:** Go to **Site Engineering & Ops > Daily Site Reports (DPR)**.\n` +
        `2. **Select Context:** Choose the active Project and the Report Date.\n` +
        `3. **Log Work Executed:** Describe structural, interior, or MEP activities completed during the shift.\n` +
        `4. **Log Manpower On Site:** Enter the count of Masons, Carpenters, Electricians, Plumbers, and Helpers present.\n` +
        `5. **Record Environmental Factors:** Specify weather (Sunny, Rain delay, Power outage) and any safety observations.\n` +
        `6. **Attach Visuals:** Upload site photos for client transparency.\n` +
        `7. **Submit:** Click **"Save Daily Report"**. A formatted update is ready to be shared with the client or owner via WhatsApp!`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'Show today DPR reports',
        'Who is absent today in greenfield?',
        'How to connect internal BOQ to project tasks?',
      ],
    };
  }

  // 5. How to generate Client Invoices / RA Bills
  if (lower.includes('invoice') || lower.includes('ra bill') || lower.includes('bill client') || lower.includes('billing')) {
    return {
      message:
        `📄 **How to Generate a Client RA Bill / Invoice**\n\n` +
        `1. **Navigate:** Go to **Accounts & Billing > Client Invoices & RA Bills**.\n` +
        `2. **New Bill:** Click the **"+ New RA Bill"** button.\n` +
        `3. **Select Project & Client:** Choose the project and billing milestone.\n` +
        `4. **Enter Certified Work Amount:** Input the gross certified work value.\n` +
        `5. **Automated Deductions:** The system automatically calculates:\n` +
        `   • Retention deduction (**5%** for DLP)\n` +
        `   • TDS (**2%** for Company / 1% for Individual)\n` +
        `   • GST (**18%**)\n` +
        `6. **Review Net Payable:** Review the final net receivable amount and due date.\n` +
        `7. **Approve & Dispatch:** Click **"Create Invoice"**. You can print PDF tax invoices or send payment reminders directly to the client.`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'What is the balance due amount of clients?',
        'What is retention money?',
        'What are all the payments received and paid today?',
      ],
    };
  }

  // 6. How to disburse Staff Salary
  if (lower.includes('salary') || lower.includes('payroll') || lower.includes('pay staff') || lower.includes('disburse')) {
    return {
      message:
        `💰 **How to Disburse Monthly Office Staff Payroll**\n\n` +
        `1. **Navigate:** Go to **Workforce & Muster > Office Staff & Payroll**.\n` +
        `2. **Review Attendance:** System automatically pulls the staff member's working days (26 days standard) and absent count.\n` +
        `3. **Automatic LOP Deduction:** Unpaid leaves beyond allowed paid leave are automatically deducted: \`LOP = Excess Days × (Fixed Salary / 26)\`.\n` +
        `4. **Statutory Deductions:** Employee PF (12% of Basic) and ESI (0.75% of Gross) are auto-computed.\n` +
        `5. **Disburse:** Click **"Disburse Salary"**, choose payment mode (Bank Transfer or Cash), enter transaction UTR, and confirm.\n` +
        `6. **Pay Slip:** Generates an itemized pay slip with CTC, allowances, deductions, and net take-home.`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'Show all office staff salary structure and PF',
        'How are leave deductions calculated for office staff?',
        'What is cash in hand and bank balance?',
      ],
    };
  }

  // 7. How to add Worker to Site Muster
  if (lower.includes('worker') || lower.includes('labour') || lower.includes('muster')) {
    return {
      message:
        `👷 **How to Add a Worker to the Site Muster Roll**\n\n` +
        `You have two quick ways to add workers:\n\n` +
        `• **Option 1 (Right in this AI Chat!):** Type: \`Add a carpenter named Ramesh to Greenfield at daily rate 850\`. The interactive registration card will appear instantly!\n` +
        `• **Option 2 (Via Web Portal):**\n` +
        `  1. Go to **Workforce & Muster > Labour Muster Roll**.\n` +
        `  2. Click **"+ Add Worker"**.\n` +
        `  3. Input Full Name, Trade (Mason, Carpenter, Helper, etc.), Daily Wage Rate, Overtime Hourly Rate, and assigned Project.\n` +
        `  4. Click **"Save Worker"** to immediately include them in the daily attendance sheet.`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'Add a worker named Ramesh to Greenfield',
        'Who is absent today in greenfield?',
        'How to mark worker attendance in muster roll?',
      ],
    };
  }

  // 8. How to configure WhatsApp Cloud API
  if (lower.includes('whatsapp') || lower.includes('meta') || lower.includes('gateway')) {
    return {
      message:
        `💬 **How to Configure WhatsApp Meta Cloud API Gateway**\n\n` +
        `1. **Open Settings:** Click the **Settings** gear icon in the left sidebar.\n` +
        `2. **Locate WhatsApp Configuration:** Scroll to the **WhatsApp Business API Gateway** section.\n` +
        `3. **Input Meta Credentials:**\n` +
        `   • **Meta Phone Number ID:** Found in your Meta Developer App dashboard.\n` +
        `   • **WhatsApp Business Account ID (WABA ID):** Available in WhatsApp Business Manager.\n` +
        `   • **Permanent Bearer Access Token:** Generate a system user token with \`whatsapp_business_messaging\` permissions.\n` +
        `4. **Save & Test:** Click **"Save WhatsApp Settings"** and then **"Test Live Handshake"**.\n` +
        `5. **Ready!** Your ERP can now dispatch quotation PDFs, DPR alerts, and payment reminders with 1 click.`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'Show recent client quotations',
        'Share update with Project Manager on WhatsApp',
        'How many days left in my trial?',
      ],
    };
  }

  // 9. How to extend trial as Super Admin
  if (lower.includes('trial') || lower.includes('super admin') || lower.includes('tenant') || lower.includes('company')) {
    return {
      message:
        `👑 **How to Manage Companies & Extend Trials (Super Admin)**\n\n` +
        `1. **Log In as Super Admin:** Sign in using your Super Admin credentials (\`superadmin@apexbuild.com\`).\n` +
        `2. **Open Super Admin Console:** Click the **Super Admin** link or navigate to \`/superadmin\`.\n` +
        `3. **View Tenant Companies:** Review the list of all registered construction and interior businesses, their trial countdowns, and active user counts.\n` +
        `4. **Extend Trial:** Click the **"Extend Trial (+14 Days)"** button next to any tenant company.\n` +
        `5. **Upgrade Plan:** Switch companies between \`FREE_TRIAL\`, \`STARTER\`, \`PRO\`, and \`ENTERPRISE\` plans as needed.`,
      actionTaken: 'HOW_TO_GUIDE',
      suggestedPrompts: [
        'How many days left in my trial?',
        'How to configure WhatsApp Cloud API?',
        'What is the difference between BOQ and quotation?',
      ],
    };
  }

  return null;
}

// ============================================================================
// 3. CONVERSATIONAL GREETINGS & CAPABILITY OVERVIEW
// ============================================================================

export function getConversationalResponse(lower: string): AIActionResponse | null {
  const isGreeting =
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'hey' ||
    lower === 'greetings' ||
    lower === 'good morning' ||
    lower === 'good afternoon' ||
    lower === 'good evening' ||
    lower.startsWith('hi ') ||
    lower.startsWith('hello ') ||
    lower.startsWith('hey ');

  const isCapabilities =
    lower.includes('what can you do') ||
    lower.includes('who are you') ||
    lower.includes('your capabilities') ||
    lower.includes('help me') ||
    lower.includes('command list') ||
    lower.includes('how to use this chatbot') ||
    lower === 'help' ||
    lower === 'menu' ||
    lower === 'commands';

  if (!isGreeting && !isCapabilities) return null;

  return {
    message:
      `👋 **Hello! I am your ApexBuild AI Construction & Interior ERP Copilot.**\n\n` +
      `I am deeply connected to your live company database and can answer questions or execute workflow actions across all modules:\n\n` +
      `### 1. 💼 Sales, Leads & Commercials\n` +
      `• *"Show all active leads in sales pipeline"* (stages, budget brackets, conversion rates)\n` +
      `• *"Show all recent client quotations"* (proposals, GST modes, total contract values)\n` +
      `• *"What is the difference between BOQ and quotation?"* (client proposal vs internal costing)\n\n` +
      `### 2. 🏗️ Site Engineering & Operations\n` +
      `• *"How many projects are active today?"* (progress %, contract values, direct costs)\n` +
      `• *"Show BOQ budget and variance for Bakery"* (cost codes, estimated vs actual)\n` +
      `• *"Show today DPR reports"* (work executed, manpower headcount by trade)\n` +
      `• *"How to connect internal BOQ to project tasks?"* (step-by-step workflow guide)\n\n` +
      `### 3. 👷 Workforce & Labour Muster\n` +
      `• *"Who is absent today in greenfield?"* (present/absent workers, overtime)\n` +
      `• *"Add a carpenter named Ramesh to Greenfield"* (instant interactive worker registration)\n` +
      `• *"Show office staff salary structure and PF"* (Basic 50%, HRA 20%, PF 12%, ESI 0.75%, LOP deductions)\n\n` +
      `### 4. 💰 Accounts, Billing & Treasury\n` +
      `• *"What is the balance due amount of clients?"* (outstanding RA bills, retention)\n` +
      `• *"What are all the payments received and paid today?"* (collections, wages, supplier payments)\n` +
      `• *"What is cash in hand and bank balance?"* (live treasury balance sheet)\n` +
      `• *"Export ledger to Google Sheets CSV"* (1-click spreadsheet export)\n\n` +
      `💬 *Simply ask any question or tap a prompt below to get started!*`,
    actionTaken: 'ASSISTANT_INTRO',
    suggestedPrompts: [
      'What is the difference between BOQ and quotation?',
      'Show all recent client quotations',
      'Show active leads in sales pipeline',
      'How many projects are active today?',
      'What is the balance due amount of clients?',
    ],
  };
}

// ============================================================================
// 4. CLIENT QUOTATIONS DOMAIN INTELLIGENCE
// ============================================================================

export async function handleQuotationQuery(cleanPrompt: string, user?: any): Promise<AIActionResponse | null> {
  const lower = cleanPrompt.toLowerCase();
  const isQuotQuery =
    (lower.includes('quotation') || lower.includes('quote') || lower.includes('commercial proposal')) &&
    !lower.includes('how to') &&
    !lower.includes('difference') &&
    !lower.includes('vs') &&
    !lower.includes('what is');

  if (!isQuotQuery) return null;

  const tenantFilter = user?.companyId ? { tenantId: user.companyId } : {};

  const quotations = await prisma.quotation.findMany({
    where: tenantFilter,
    include: {
      lead: true,
      project: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (quotations.length === 0) {
    return {
      message:
        `📄 **Client Quotations & Commercial Proposals**\n\n` +
        `No client quotations have been created yet.\n\n` +
        `• To create a quotation, go to **Sales & Client Commercials > Client Quotations** and click **"+ New Quotation"**.\n` +
        `• Or ask me: *"How to create a Client Quotation?"* for a step-by-step walkthrough.`,
      actionTaken: 'QUOTATION_LIST_QUERY',
      suggestedPrompts: [
        'How to create a Client Quotation?',
        'What is the difference between BOQ and quotation?',
        'Show active leads in sales pipeline',
      ],
    };
  }

  // Check if user is asking about a specific client or quotation number
  const matched = quotations.find(
    (q) =>
      lower.includes(q.quotationNumber.toLowerCase()) ||
      lower.includes(q.clientName.toLowerCase()) ||
      (q.clientPhone && lower.includes(q.clientPhone))
  );

  if (matched) {
    let msg = `📄 **Client Quotation Details: ${matched.quotationNumber}**\n\n`;
    msg += `• **Client Name:** **${matched.clientName}** (${matched.clientPhone})\n`;
    msg += `• **Site Address:** ${matched.siteAddress}\n`;
    msg += `• **Project Type:** ${matched.projectType.replace(/_/g, ' ')}\n`;
    msg += `• **Proposal Status:** **${matched.status}**\n`;
    msg += `• **Created Date:** ${formatDateStr(matched.createdAt)} | **Valid Until:** ${formatDateStr(matched.validUntil)}\n\n`;

    msg += `### 💰 Commercial Scope & Pricing Breakdown\n`;
    msg += `| Area / Room | Scope Description | Unit | Qty | Selling Rate | Line Total |\n`;
    msg += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    matched.items.forEach((item) => {
      msg += `| **${item.areaRoom}** | ${item.workDescription} | ${item.unit} | ${item.quantity} | ${formatINR(item.rate)} | **${formatINR(item.totalAmount)}** |\n`;
    });

    msg += `\n📊 **Commercial Summary:**\n`;
    msg += `• **Subtotal (Base Selling Price):** **${formatINR(matched.subtotal)}**\n`;
    msg += `• **GST Tax Mode:** **${matched.gstMode}** (${matched.gstPercent}% = ${formatINR(matched.gstAmount)})\n`;
    msg += `• **Total Payable by Client:** **${formatINR(matched.totalAmount)}**\n`;

    if (matched.penaltyTerms) {
      msg += `• **Terms & Conditions:** ${matched.penaltyTerms}\n`;
    }

    const shareText = encodeURIComponent(
      `Hello ${matched.clientName},\n\n` +
      `Here is your commercial quotation ${matched.quotationNumber} from ApexBuild Construction & Interiors.\n` +
      `• Project Type: ${matched.projectType.replace(/_/g, ' ')}\n` +
      `• Total Amount: ${formatINR(matched.totalAmount)}\n` +
      `• Validity: ${formatDateStr(matched.validUntil)}\n\n` +
      `Please let us know if you have any questions.`
    );

    return {
      message: msg,
      actionTaken: 'QUOTATION_DETAIL_QUERY',
      data: matched,
      shareableUrls: {
        whatsapp: `https://wa.me/${matched.clientPhone ? matched.clientPhone.replace(/\D/g, '') : ''}?text=${shareText}`,
      },
      suggestedPrompts: [
        'Show all recent client quotations',
        'How to create a Client Quotation?',
        'What is the difference between BOQ and quotation?',
      ],
    };
  }

  // General quotation register summary
  const totalValue = quotations.reduce((s, q) => s + (q.totalAmount || 0), 0);
  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
  const sharedCount = quotations.filter((q) => q.status === 'SHARED').length;
  const acceptedCount = quotations.filter((q) => q.status === 'ACCEPTED').length;

  let msg = `📄 **Client Quotations & Commercial Proposals Register**\n`;
  msg += `Found **${quotations.length} total client quotations** valued at **${formatINR(totalValue)}**:\n\n`;

  quotations.slice(0, 8).forEach((q, idx) => {
    msg += `### 📄 ${idx + 1}. ${q.clientName} — ${formatINR(q.totalAmount)} [\`${q.quotationNumber}\`]\n`;
    msg += `• **Status:** **${q.status}**  |  **GST Mode:** ${q.gstMode} (${q.gstPercent}%)\n`;
    msg += `• **Scope:** ${q.projectType.replace(/_/g, ' ')} (${q.items.length} line items)\n`;
    msg += `• **Base Subtotal:** ${formatINR(q.subtotal)}  |  **Valid Until:** ${formatDateStr(q.validUntil)}\n\n`;
  });

  msg += `📊 **Summary:** Drafts: **${draftCount}** • Shared: **${sharedCount}** • Accepted: **${acceptedCount}** • Total: **${formatINR(totalValue)}**`;

  return {
    message: msg,
    actionTaken: 'QUOTATION_LIST_QUERY',
    suggestedPrompts: [
      `Show quotation ${quotations[0].quotationNumber}`,
      'How to create a Client Quotation?',
      'What is the difference between BOQ and quotation?',
      'Show active leads in sales pipeline',
    ],
  };
}

// ============================================================================
// 5. LEADS & SALES PIPELINE DOMAIN INTELLIGENCE
// ============================================================================

export async function handleLeadQuery(cleanPrompt: string, user?: any): Promise<AIActionResponse | null> {
  const lower = cleanPrompt.toLowerCase();
  const isLeadQuery =
    (lower.includes('lead') || lower.includes('pipeline') || lower.includes('inquiry') || lower.includes('inquiries')) &&
    !lower.includes('how to') &&
    !lower.includes('what is') &&
    !lower.includes('got a') &&
    !lower.includes('have to add') &&
    !lower.includes('want to add') &&
    !lower.includes('add lead') &&
    !lower.includes('create lead') &&
    !lower.includes('register lead') &&
    !lower.includes('new lead');

  if (!isLeadQuery) return null;

  const tenantFilter = user?.companyId ? { tenantId: user.companyId } : {};

  const leads = await prisma.lead.findMany({
    where: tenantFilter,
    include: {
      quotations: true,
      convertedProject: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (leads.length === 0) {
    return {
      message:
        `📈 **Sales Leads & Client Inquiries Pipeline**\n\n` +
        `No sales leads are registered yet.\n\n` +
        `• Would you like to add a lead? Type: *"Add a new lead"* or click below.\n` +
        `• Or ask me: *"How to manage leads in pipeline?"* for step-by-step guidance.`,
      actionTaken: 'LEAD_LIST_QUERY',
      suggestedPrompts: [
        'Yes, fill the new lead form',
        'How to manage leads in pipeline?',
        'How many projects are active today?',
      ],
    };
  }

  // Check if asking about a specific lead name or number
  const matched = leads.find(
    (l) =>
      lower.includes(l.leadNumber.toLowerCase()) ||
      lower.includes(l.clientName.toLowerCase()) ||
      lower.includes(l.contactNumber)
  );

  if (matched) {
    let msg = `👤 **Lead Profile: ${matched.clientName}** [\`${matched.leadNumber}\`]\n\n`;
    msg += `• **Contact Phone:** ${matched.contactNumber} ${matched.email ? `| **Email:** ${matched.email}` : ''}\n`;
    msg += `• **Site Address:** ${matched.siteAddress} (${matched.city || 'City'})\n`;
    msg += `• **Project Type:** ${matched.projectType.replace(/_/g, ' ')}\n`;
    msg += `• **Estimated Budget Range:** **${matched.budgetRange.replace(/_/g, ' ')}**\n`;
    msg += `• **Lead Source:** ${matched.source.replace(/_/g, ' ')}\n`;
    msg += `• **Current Pipeline Stage:** **${matched.stage.replace(/_/g, ' ')}**\n`;
    msg += `• **Registered Date:** ${formatDateStr(matched.createdAt)}\n\n`;

    if (matched.convertedProject) {
      msg += `✅ **Converted to Active Project:** [\`${matched.convertedProject.code}\`] **${matched.convertedProject.name}**\n\n`;
    }

    if (matched.quotations.length > 0) {
      msg += `### 📄 Associated Client Quotations (${matched.quotations.length}):\n`;
      matched.quotations.forEach((q) => {
        msg += `• **${q.quotationNumber}**: ${formatINR(q.totalAmount)} (${q.status})\n`;
      });
      msg += `\n`;
    }

    if (matched.siteVisitNotes) {
      msg += `• **Site Visit Notes:** ${matched.siteVisitNotes}\n`;
    }

    return {
      message: msg,
      actionTaken: 'LEAD_DETAIL_QUERY',
      data: matched,
      suggestedPrompts: [
        'Show all active leads in sales pipeline',
        'How to convert lead to project?',
        'How to create a Client Quotation?',
      ],
    };
  }

  // General pipeline summary with clean card-based layout
  const stagesCount: Record<string, number> = {};
  leads.forEach((l) => {
    stagesCount[l.stage] = (stagesCount[l.stage] || 0) + 1;
  });

  const wonCount = stagesCount['LEAD_WON'] || 0;
  const winRate = Math.round((wonCount / leads.length) * 100);

  let msg = `📈 **Sales Leads & Client Inquiries Pipeline Register**\n`;
  msg += `Currently tracking **${leads.length} active leads** (${wonCount} won, **${winRate}% conversion rate**):\n\n`;

  leads.slice(0, 8).forEach((l, idx) => {
    const stageBadge = l.stage === 'LEAD_WON' ? '✓ WON / CONVERTED' : l.stage.replace(/_/g, ' ');
    msg += `### 📋 ${idx + 1}. ${l.clientName} [\`${l.leadNumber}\`]\n`;
    msg += `• **Stage:** **${stageBadge}**  |  **Budget:** ${l.budgetRange.replace(/_/g, ' ')}\n`;
    msg += `• **Project Type:** ${l.projectType.replace(/_/g, ' ')}\n`;
    msg += `• **Contact:** ${l.contactNumber}  |  **Site:** ${l.siteAddress} (${l.city || 'City'})\n\n`;
  });

  msg += `📊 **Pipeline Stages:** ` + Object.entries(stagesCount).map(([stg, cnt]) => `${stg.replace(/_/g, ' ')}: **${cnt}**`).join(' • ');

  return {
    message: msg,
    actionTaken: 'LEAD_LIST_QUERY',
    suggestedPrompts: [
      `Show details of lead ${leads[0].leadNumber}`,
      'How to convert lead to project?',
      'Show all recent client quotations',
      'What is the difference between BOQ and quotation?',
    ],
  };
}

// ============================================================================
// 6. MULTI-TENANCY & TRIAL PERIOD INTELLIGENCE
// ============================================================================

export async function handleTenantQuery(cleanPrompt: string, user?: any): Promise<AIActionResponse | null> {
  const lower = cleanPrompt.toLowerCase();
  const isTenantQuery =
    lower.includes('trial') ||
    lower.includes('subscription') ||
    lower.includes('plan type') ||
    lower.includes('days left') ||
    lower.includes('tenant') ||
    lower.includes('super admin stats');

  if (!isTenantQuery) return null;

  if (user?.role === 'SUPER_ADMIN' || lower.includes('super admin stats')) {
    const [companies, totalUsers, totalProjects] = await Promise.all([
      prisma.company.findMany({ include: { users: true, projects: true } }),
      prisma.user.count(),
      prisma.project.count(),
    ]);

    let msg = `👑 **ApexBuild Enterprise Super Admin Console Overview**\n\n`;
    msg += `• **Total Tenant Companies:** **${companies.length}**\n`;
    msg += `• **Total System Users:** **${totalUsers}**\n`;
    msg += `• **Total Projects Managed:** **${totalProjects}**\n\n`;

    msg += `### 🏢 Active Company Tenants:\n`;
    msg += `| Code | Company Name | Plan | Status | Users | Projects | Trial End Date |\n`;
    msg += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    companies.forEach((c) => {
      msg += `| \`${c.code}\` | **${c.name}** | ${c.planType} | ${c.status} | ${c.users.length} | ${c.projects.length} | ${formatDateStr(c.trialEndDate)} |\n`;
    });

    return {
      message: msg,
      actionTaken: 'SUPER_ADMIN_STATS',
      suggestedPrompts: [
        'How to extend trial as super admin?',
        'How many projects are active today?',
        'Show all active leads in sales pipeline',
      ],
    };
  }

  // Tenant-specific trial query
  const companyId = user?.companyId;
  let company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
  if (!company) {
    company = await prisma.company.findFirst();
  }

  if (company) {
    let daysLeft = 14;
    if (company.trialEndDate) {
      const now = new Date();
      const end = new Date(company.trialEndDate);
      daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    let msg = `🏢 **Company Subscription & Trial Status: ${company.name}**\n\n`;
    msg += `• **Company Code:** \`${company.code}\`\n`;
    msg += `• **Current Plan:** **${company.planType}**\n`;
    msg += `• **Account Status:** **${company.status}**\n`;
    msg += `• **Trial Expiry Date:** ${formatDateStr(company.trialEndDate)}\n`;
    msg += `• ⏳ **Days Remaining in Trial:** **${daysLeft} Days**\n\n`;

    if (company.status === 'TRIAL' || company.planType === 'FREE_TRIAL') {
      msg += `💡 *You have full access to all ERP modules during your 14-day trial period. To upgrade or extend your trial, contact your team administrator or visit the **Super Admin** portal.*`;
    }

    return {
      message: msg,
      actionTaken: 'TENANT_TRIAL_STATUS',
      suggestedPrompts: [
        'How to configure WhatsApp Cloud API?',
        'How many projects are active today?',
        'Show all recent client quotations',
      ],
    };
  }

  return null;
}

// ============================================================================
// 7. SMART MULTI-ENTITY SEMANTIC SEARCH (NO CASH-IN-HAND DEFAULT DUMP!)
// ============================================================================

export async function searchEntitiesFallback(cleanPrompt: string, user?: any): Promise<AIActionResponse> {
  const lower = cleanPrompt.toLowerCase();
  const tenantFilter = user?.companyId ? { tenantId: user.companyId } : {};

  // Extract candidate search tokens (alphanumeric words >= 3 letters, skipping stop words)
  const stopWords = new Set([
    'what', 'which', 'where', 'when', 'who', 'how', 'show', 'tell', 'give', 'list',
    'view', 'find', 'check', 'the', 'this', 'that', 'with', 'from', 'about', 'and',
    'for', 'are', 'is', 'was', 'were', 'have', 'has', 'had', 'been', 'can', 'could',
    'will', 'would', 'should', 'today', 'date', 'rate', 'data', 'details', 'detail',
    'info', 'information', 'summary', 'report', 'please', 'thanks', 'thank',
  ]);

  const tokens = lower
    .split(/[\s,?.!;:()"\']+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  // 1. Search in Projects
  const allProjects = await prisma.project.findMany({
    include: { clientInvoices: true, clientReceipts: true, workers: { where: { isActive: true } }, tasks: true },
  });

  const matchedProject = allProjects.find((p) => {
    const pName = p.name.toLowerCase();
    const pCode = p.code.toLowerCase();
    const pClient = (p.clientName || '').toLowerCase();
    return tokens.some((t) => pName.includes(t) || pCode.includes(t) || pClient.includes(t));
  });

  if (matchedProject) {
    const billed = matchedProject.clientInvoices.reduce((s, i) => s + (i.netInvoiceAmount || 0), 0);
    const collected = matchedProject.clientReceipts.reduce((s, r) => s + (r.amount || 0), 0);
    const due = matchedProject.clientInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0);

    return {
      message:
        `🏗️ **Project Found: ${matchedProject.name}** [\`${matchedProject.code}\`]\n\n` +
        `• **Client:** ${matchedProject.clientName || 'Direct Client'}\n` +
        `• **Status:** **${matchedProject.status}** (${matchedProject.completionPercent || 0}% progress)\n` +
        `• **Contract Value:** ${formatINR(matchedProject.contractValue)} | **Approved Budget:** ${formatINR(matchedProject.approvedBudget)}\n` +
        `• **Billed:** ${formatINR(billed)} | **Collected:** ${formatINR(collected)} | **Due:** **${formatINR(due)}**\n` +
        `• **Active On-Site Workforce:** ${matchedProject.workers.length} workers\n` +
        `• **Completed Tasks:** ${matchedProject.tasks.filter((t) => t.status === 'COMPLETED').length} / ${matchedProject.tasks.length}\n\n` +
        `💡 *What would you like to inspect next for this project?*`,
      actionTaken: 'ENTITY_SEARCH_PROJECT',
      suggestedPrompts: [
        `Show BOQ for ${matchedProject.name}`,
        `Show DPR report for ${matchedProject.name}`,
        `What is the balance due amount of ${matchedProject.name}?`,
      ],
    };
  }

  // 2. Search in Leads
  const allLeads = await prisma.lead.findMany({
    where: tenantFilter,
    include: { quotations: true, convertedProject: true },
  });

  const matchedLead = allLeads.find((l) => {
    const lName = l.clientName.toLowerCase();
    const lNum = l.leadNumber.toLowerCase();
    const lAddr = l.siteAddress.toLowerCase();
    return tokens.some((t) => lName.includes(t) || lNum.includes(t) || lAddr.includes(t));
  });

  if (matchedLead) {
    return {
      message:
        `👤 **Client Lead Found: ${matchedLead.clientName}** [\`${matchedLead.leadNumber}\`]\n\n` +
        `• **Contact:** ${matchedLead.contactNumber} ${matchedLead.email ? `(${matchedLead.email})` : ''}\n` +
        `• **Site Address:** ${matchedLead.siteAddress}\n` +
        `• **Project Scope:** ${matchedLead.projectType.replace(/_/g, ' ')}\n` +
        `• **Budget:** ${matchedLead.budgetRange.replace(/_/g, ' ')}\n` +
        `• **Current Stage:** **${matchedLead.stage.replace(/_/g, ' ')}**\n` +
        (matchedLead.convertedProject ? `• **Converted Project:** [${matchedLead.convertedProject.code}] ${matchedLead.convertedProject.name}\n` : '') +
        (matchedLead.quotations.length > 0 ? `• **Quotations Raised:** ${matchedLead.quotations.length} proposals\n` : ''),
      actionTaken: 'ENTITY_SEARCH_LEAD',
      suggestedPrompts: [
        'How to convert lead to project?',
        'How to create a Client Quotation?',
        'Show all active leads in sales pipeline',
      ],
    };
  }

  // 3. Search in Quotations
  const allQuotations = await prisma.quotation.findMany({
    where: tenantFilter,
    include: { items: true },
  });

  const matchedQuot = allQuotations.find((q) => {
    const qNum = q.quotationNumber.toLowerCase();
    const qClient = q.clientName.toLowerCase();
    return tokens.some((t) => qNum.includes(t) || qClient.includes(t));
  });

  if (matchedQuot) {
    return {
      message:
        `📄 **Client Quotation Found: ${matchedQuot.quotationNumber}**\n\n` +
        `• **Client Name:** **${matchedQuot.clientName}** (${matchedQuot.clientPhone})\n` +
        `• **Project Type:** ${matchedQuot.projectType.replace(/_/g, ' ')}\n` +
        `• **Total Amount:** **${formatINR(matchedQuot.totalAmount)}** (GST: ${matchedQuot.gstMode})\n` +
        `• **Status:** **${matchedQuot.status}**\n` +
        `• **Line Items:** ${matchedQuot.items.length} items configured`,
      actionTaken: 'ENTITY_SEARCH_QUOTATION',
      suggestedPrompts: [
        `Show quotation ${matchedQuot.quotationNumber}`,
        'Show all recent client quotations',
        'What is the difference between BOQ and quotation?',
      ],
    };
  }

  // 4. Search in Workers
  const allWorkers = await prisma.worker.findMany({
    where: { isActive: true },
    include: { project: true },
  });

  const matchedWorker = allWorkers.find((w) => {
    const wName = (w.name || '').toLowerCase();
    const wCode = (w.workerCode || '').toLowerCase();
    const wTrade = (w.trade || '').toLowerCase();
    return tokens.some((t) => wName.includes(t) || wCode.includes(t) || wTrade === t);
  });

  if (matchedWorker) {
    return {
      message:
        `👷 **Site Worker Found: ${matchedWorker.name}** [\`${matchedWorker.workerCode}\`]\n\n` +
        `• **Trade:** **${matchedWorker.trade}** (${matchedWorker.skillLevel})\n` +
        `• **Assigned Project:** ${matchedWorker.project?.name || 'Central Labour Pool'}\n` +
        `• **Daily Wage Rate:** ${formatINR(matchedWorker.dailyWageRate)} / day\n` +
        `• **Overtime Rate:** ${formatINR(matchedWorker.overtimeHourlyRate)} / hr\n` +
        `• **Phone:** ${matchedWorker.phone || 'N/A'} | **Payment Mode:** ${matchedWorker.paymentMethod}`,
      actionTaken: 'ENTITY_SEARCH_WORKER',
      suggestedPrompts: [
        `Who is absent today in ${matchedWorker.project?.name || 'project'}?`,
        'How to mark worker attendance in muster roll?',
        'Show all office staff salary structure and PF',
      ],
    };
  }

  // 5. Search in Office Staff
  const allStaff = await prisma.officeStaff.findMany({
    where: { isActive: true },
  });

  const matchedStaff = allStaff.find((s) => {
    const sName = s.name.toLowerCase();
    const sCode = s.staffCode.toLowerCase();
    const sDesig = s.designation.toLowerCase();
    return tokens.some((t) => sName.includes(t) || sCode.includes(t) || sDesig.includes(t));
  });

  if (matchedStaff) {
    const fixed = matchedStaff.fixedSalary || 0;
    const basic = matchedStaff.basicSalary || Math.round(fixed * 0.5);
    const pf = Math.round(basic * ((matchedStaff.pfEmployeePercent ?? 12) / 100));

    return {
      message:
        `👤 **Office Staff Found: ${matchedStaff.name}** [\`${matchedStaff.staffCode}\`]\n\n` +
        `• **Designation:** ${matchedStaff.designation} (${matchedStaff.roleCategory.replace(/_/g, ' ')})\n` +
        `• **Monthly CTC:** **${formatINR(fixed)}** (Basic: ${formatINR(basic)})\n` +
        `• **PF Contribution:** ${formatINR(pf)} / month\n` +
        `• **Standard Working Days:** ${matchedStaff.standardWorkingDays || 26} days\n` +
        `• **Paid Leaves Allowed:** ${matchedStaff.paidLeavesAllowed ?? 1} day(s) / month`,
      actionTaken: 'ENTITY_SEARCH_STAFF',
      suggestedPrompts: [
        `What is the salary of ${matchedStaff.name}?`,
        'How are leave deductions calculated for office staff?',
        'Show all staff PF and ESI contributions',
      ],
    };
  }

  // 6. If no entity matched at all, provide a high-value, intelligent ERP Navigation Guide!
  // NEVER dump cash-in-hand ₹0!
  return {
    message:
      `🤖 **ApexBuild AI ERP Copilot**\n\n` +
      `I couldn't locate a specific record matching *"${cleanPrompt.slice(0, 80)}"*, but here is how I can assist you across your ERP:\n\n` +
      `### 🔍 Common Inquiries & Actions You Can Ask Me:\n` +
      `• **Commercial & Proposals:** *"What is the difference between BOQ and quotation?"* or *"Show all recent client quotations"*\n` +
      `• **Sales Pipeline:** *"Show all active leads in sales pipeline"* or *"How to convert lead to project?"*\n` +
      `• **Project Execution:** *"How many projects are active today?"* or *"Show BOQ budget and variance for Bakery"*\n` +
      `• **Workforce & Wages:** *"Who is absent today in greenfield?"* or *"Add a worker named Ramesh to Greenfield"*\n` +
      `• **Office HR & Payroll:** *"Show all office staff salary structure and PF"* or *"How are leave deductions calculated?"*\n` +
      `• **Billing & Collections:** *"What is the balance due amount of clients?"* or *"What are all the payments received and paid today?"*\n\n` +
      `💡 *Select a suggested prompt below or rephrase your request!*`,
    actionTaken: 'INTELLIGENT_HELP_GUIDE',
    suggestedPrompts: [
      'What is the difference between BOQ and quotation?',
      'Show all recent client quotations',
      'Show active leads in sales pipeline',
      'How many projects are active today?',
      'What is the balance due amount of clients?',
      'Show all office staff salary structure and PF',
    ],
  };
}

// ============================================================================
// 8. UNIVERSAL GEMINI-GRADE DEEP ERP REASONING ENGINE ENTRY POINT
// ============================================================================

export async function queryUniversalERPEngine(cleanPrompt: string, user?: any): Promise<AIActionResponse> {
  const lower = cleanPrompt.trim().toLowerCase();

  // 1. Check Conceptual Knowledge Base (Definitions, Differences, Industry Explanations)
  const conceptAnswer = getConstructionConceptAnswer(lower);
  if (conceptAnswer) return conceptAnswer;

  // 2. Check Operational Workflow How-To Guides
  const howToAnswer = getERPWorkflowHowToGuide(lower);
  if (howToAnswer) return howToAnswer;

  // 3. Check Conversational Greetings & Capabilities
  const convoAnswer = getConversationalResponse(lower);
  if (convoAnswer) return convoAnswer;

  // 4. Check Client Quotations Queries
  const quotAnswer = await handleQuotationQuery(cleanPrompt, user);
  if (quotAnswer) return quotAnswer;

  // 5. Check Leads & Sales Pipeline Queries
  const leadAnswer = await handleLeadQuery(cleanPrompt, user);
  if (leadAnswer) return leadAnswer;

  // 6. Check Multi-Tenancy & Trial Queries
  const tenantAnswer = await handleTenantQuery(cleanPrompt, user);
  if (tenantAnswer) return tenantAnswer;

  // 7. Check Office Staff & Payroll Queries
  const isStaffSalaryQuery =
    lower.includes('staff') ||
    lower.includes('salary') ||
    lower.includes('pf') ||
    lower.includes('esi') ||
    lower.includes('provident fund') ||
    lower.includes('basic') ||
    lower.includes('hra') ||
    lower.includes('allowance') ||
    lower.includes('leave deduction') ||
    lower.includes('loss of pay') ||
    lower.includes('lop') ||
    lower.includes('office boy') ||
    lower.includes('cleaner') ||
    lower.includes('employee') ||
    lower.includes('working dates');

  if (isStaffSalaryQuery) {
    const allStaff = await prisma.officeStaff.findMany({
      where: { isActive: true },
      include: {
        salaryPayments: {
          orderBy: { disbursementDate: 'desc' },
          take: 3,
        },
      },
      orderBy: { staffCode: 'asc' },
    });

    const matchedStaff = allStaff.find(
      (s) =>
        lower.includes(s.name.toLowerCase()) ||
        lower.includes(s.staffCode.toLowerCase()) ||
        (s.phone && lower.includes(s.phone))
    );

    if (matchedStaff) {
      const fixed = matchedStaff.fixedSalary || 0;
      const basic = matchedStaff.basicSalary || Math.round(fixed * 0.5);
      const hra = matchedStaff.hra || Math.round(fixed * 0.2);
      const allowances = matchedStaff.allowances || Math.max(0, fixed - basic - hra);
      const stdDays = matchedStaff.standardWorkingDays || 26;
      const dailyRate = Math.round(fixed / stdDays);
      const paidLeaves = matchedStaff.paidLeavesAllowed ?? 1;

      const pfEmp = Math.round(basic * ((matchedStaff.pfEmployeePercent ?? 12) / 100));
      const pfEmpr = Math.round(basic * ((matchedStaff.pfEmployerPercent ?? 12) / 100));
      const esiEmp = Math.round(fixed * ((matchedStaff.esiPercent ?? 0.75) / 100));
      const pt = matchedStaff.professionalTax ?? 200;
      const tds = matchedStaff.tdsDeduction ?? 0;
      const totalStatutoryDeductions = pfEmp + esiEmp + pt + tds;
      const netEstimate = Math.max(0, fixed - totalStatutoryDeductions);

      let msg = `👤 **Staff Profile & Compensation Structure: ${matchedStaff.name}** [${matchedStaff.staffCode}]\n\n`;
      msg += `• **Designation:** ${matchedStaff.designation} (${matchedStaff.roleCategory.replace(/_/g, ' ')})\n`;
      msg += `• **Phone:** ${matchedStaff.phone} | **Joining Date:** ${formatDateStr(matchedStaff.joiningDate)}\n`;
      msg += `• **Payment Mode:** ${matchedStaff.paymentMode} ${matchedStaff.bankAccountNo ? `(A/C: ••••${matchedStaff.bankAccountNo.slice(-4)})` : ''}\n\n`;

      msg += `### 💰 Fixed Salary Breakdown (Monthly CTC: **${formatINR(fixed)}**)\n`;
      msg += `| Component | Monthly Amount | Calculation Basis |\n`;
      msg += `| :--- | :--- | :--- |\n`;
      msg += `| **Basic Salary** | **${formatINR(basic)}** | Standard 50% of Fixed CTC |\n`;
      msg += `| **House Rent Allowance (HRA)** | **${formatINR(hra)}** | 20% of Fixed CTC |\n`;
      msg += `| **Special / Other Allowances** | **${formatINR(allowances)}** | Balance flexible allowance |\n`;
      msg += `| **Gross Fixed Monthly** | **${formatINR(fixed)}** | Total Monthly Liability |\n\n`;

      msg += `### 🏛️ Statutory PF, ESI & Tax Profile\n`;
      msg += `• **PF Account / UAN:** ${matchedStaff.pfNumber || 'Not Configured (Optional)'}\n`;
      msg += `  └ Employee PF (12% of Basic): **${formatINR(pfEmp)}** | Employer PF (12%): **${formatINR(pfEmpr)}**\n`;
      msg += `• **ESI IP Number:** ${matchedStaff.esiNumber || 'Not Applicable'}\n`;
      msg += `  └ Employee ESI (0.75% of Gross): **${formatINR(esiEmp)}**\n`;
      msg += `• **Professional Tax (PT):** ${formatINR(pt)} / month\n`;
      msg += `• **TDS Deduction:** ${formatINR(tds)} / month\n`;
      msg += `• **Estimated Take-Home (Zero Unpaid Leave):** **${formatINR(netEstimate)}**\n\n`;

      msg += `### 📅 Working Dates & Leave Deductions Formula\n`;
      msg += `• **Standard Working Days:** **${stdDays} days / month**\n`;
      msg += `• **Per-Day Salary Rate:** ${formatINR(fixed)} ÷ ${stdDays} = **${formatINR(dailyRate)} / day**\n`;
      msg += `• **Allowed Paid Leaves (Casual/Medical):** **${paidLeaves} day(s) / month**\n`;
      msg += `• **Leave Deduction Formula (Loss of Pay / LOP):**\n`;
      msg += `  \`Leave Deduction = Math.max(0, Absent Days - ${paidLeaves}) × ${formatINR(dailyRate)}\`\n`;

      return {
        message: msg,
        actionTaken: 'STAFF_SALARY_DETAIL',
        data: matchedStaff,
        suggestedPrompts: [
          'Show all staff PF and ESI contributions',
          'How are leave deductions calculated for office staff?',
          'What are all the payments received and paid today?',
        ],
      };
    }

    // Staff PF/ESI overview
    if (lower.includes('pf') || lower.includes('esi') || lower.includes('provident')) {
      let msg = `🏛️ **Office Staff Statutory PF & ESI Register**\n\n`;
      msg += `| Staff Code | Name | Designation | Monthly CTC | Basic (50%) | PF Number | Employee PF (12%) | ESI Number |\n`;
      msg += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

      let totalPf = 0;
      let totalEsi = 0;

      for (const st of allStaff) {
        const ctc = st.fixedSalary || 0;
        const basic = st.basicSalary || Math.round(ctc * 0.5);
        const pf = Math.round(basic * ((st.pfEmployeePercent ?? 12) / 100));
        const esi = Math.round(ctc * ((st.esiPercent ?? 0.75) / 100));
        totalPf += pf;
        totalEsi += esi;

        msg += `| \`${st.staffCode}\` | **${st.name}** | ${st.designation} | ${formatINR(ctc)} | ${formatINR(basic)} | ${st.pfNumber || '—'} | ${formatINR(pf)} | ${st.esiNumber || '—'} |\n`;
      }

      msg += `\n💰 **Monthly Statutory Totals:**\n`;
      msg += `• **Total Employee PF Contribution:** **${formatINR(totalPf)}**\n`;
      msg += `• **Total Employee ESI Contribution:** **${formatINR(totalEsi)}**\n`;
      msg += `• **Total Active Office Staff:** ${allStaff.length} employees\n`;

      return {
        message: msg,
        actionTaken: 'STAFF_PF_ESI_REGISTER',
        suggestedPrompts: [
          'How are leave deductions calculated for office staff?',
          'Show all office staff salary structure and PF',
          'What are the total company expenses this month?',
        ],
      };
    }

    // Staff Directory Table
    let msg = `🏢 **ApexBuild Office Staff Directory & Fixed Salary Structure**\n\n`;
    msg += `| Code | Name | Role Category | Designation | Monthly CTC | Basic (50%) | Working Days | Paid Leaves |\n`;
    msg += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    let totalFixedLiability = 0;
    for (const st of allStaff) {
      const fixed = st.fixedSalary || 0;
      const basic = st.basicSalary || Math.round(fixed * 0.5);
      totalFixedLiability += fixed;
      msg += `| \`${st.staffCode}\` | **${st.name}** | ${st.roleCategory} | ${st.designation} | ${formatINR(fixed)} | ${formatINR(basic)} | ${st.standardWorkingDays || 26}d | ${st.paidLeavesAllowed ?? 1}d |\n`;
    }

    msg += `\n📊 **Office Payroll Summary:**\n`;
    msg += `• **Total Active Staff:** ${allStaff.length} employees\n`;
    msg += `• **Total Fixed Monthly Salary Commitment:** **${formatINR(totalFixedLiability)}**\n`;
    msg += `• **Statutory Coverage:** PF (12%), ESI (0.75%), Professional Tax (₹200/mo)\n`;

    return {
      message: msg,
      actionTaken: 'STAFF_LIST_QUERY',
      suggestedPrompts: [
        allStaff[0] ? `What is the salary of ${allStaff[0].name}?` : 'Show all staff PF and ESI contributions',
        'How are leave deductions calculated for office staff?',
        'What are all the payments received and paid today?',
      ],
    };
  }

  // 8. Check Projects & Cost Queries (ONLY if explicitly about projects/budget, NOT concept questions!)
  const isProjectSpecificQuery =
    (lower.includes('project') ||
      lower.includes('projects') ||
      lower.includes('site cost') ||
      lower.includes('completion percent') ||
      lower.includes('contract value')) &&
    !lower.includes('how to') &&
    !lower.includes('difference') &&
    !lower.includes('vs');

  if (isProjectSpecificQuery) {
    const projects = await prisma.project.findMany({
      include: {
        clientInvoices: true,
        clientReceipts: true,
        expenses: true,
        workers: { where: { isActive: true } },
        tasks: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const matched = projects.find(
      (p) =>
        lower.includes(p.name.toLowerCase()) ||
        lower.includes(p.code.toLowerCase()) ||
        (p.clientName && lower.includes(p.clientName.toLowerCase()))
    );

    if (matched) {
      const billed = matched.clientInvoices.reduce((s, i) => s + (i.netInvoiceAmount || 0), 0);
      const collected = matched.clientReceipts.reduce((s, r) => s + (r.amount || 0), 0);
      const balanceDue = matched.clientInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
      const directExpenses = matched.expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
      const netProfit = collected - directExpenses;
      const profitMargin = collected > 0 ? Math.round((netProfit / collected) * 100) : 0;

      let msg = `🏗️ **Comprehensive Project Financial Track: ${matched.name}** [\`${matched.code}\`]\n\n`;
      msg += `• **Client:** ${matched.clientName || 'Direct Client'}\n`;
      msg += `• **Execution Status:** **${matched.status}** (${matched.completionPercent || 0}% completed)\n`;
      msg += `• **Contract Value:** ${formatINR(matched.contractValue)} | **Approved Budget:** ${formatINR(matched.approvedBudget)}\n\n`;

      msg += `### 💰 Commercial & Collections Position\n`;
      msg += `| Metric | Realized Value | Performance Notes |\n`;
      msg += `| :--- | :--- | :--- |\n`;
      msg += `| **Total Billed (Invoices)** | **${formatINR(billed)}** | ${matched.clientInvoices.length} invoices raised |\n`;
      msg += `| **Total Collected (Cash/Bank)** | **${formatINR(collected)}** | ${matched.clientReceipts.length} payment receipts |\n`;
      msg += `| **Outstanding Balance Due** | **${formatINR(balanceDue)}** | ${balanceDue > 0 ? '⚠️ Pending recovery' : '✓ Fully settled'} |\n`;
      msg += `| **Direct Site Expenses** | **${formatINR(directExpenses)}** | Materials, labour & local spend |\n`;
      msg += `| **Realized Net Project Margin** | **${formatINR(netProfit)}** | **${profitMargin}% Margin on Collections** |\n\n`;

      msg += `### 👷 On-Site Operations\n`;
      msg += `• **Active Workforce:** ${matched.workers.length} registered workers\n`;
      msg += `• **Site Task Milestones:** ${matched.tasks.filter((t) => t.status === 'COMPLETED').length} / ${matched.tasks.length} tasks completed\n`;

      return {
        message: msg,
        actionTaken: 'PROJECT_FINANCIAL_QUERY',
        data: matched,
        suggestedPrompts: [
          `What is the balance due amount of the client ${matched.name}?`,
          `Show BOQ for ${matched.name}`,
          'What are all the payments received and paid today?',
        ],
      };
    }

    // Projects summary table
    let msg = `🏗️ **ApexBuild All Active Construction Projects Performance**\n\n`;
    msg += `| Code | Project Name | Client | Contract Value | Total Billed | Collected | Direct Expenses | Net Margin |\n`;
    msg += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    let totalContract = 0;
    let totalBilledAll = 0;
    let totalCollectedAll = 0;
    let totalExpAll = 0;

    for (const p of projects) {
      const b = p.clientInvoices.reduce((s, i) => s + (i.netInvoiceAmount || 0), 0);
      const c = p.clientReceipts.reduce((s, r) => s + (r.amount || 0), 0);
      const e = p.expenses.reduce((s, exp) => s + (exp.totalAmount || 0), 0);
      const margin = c - e;

      totalContract += p.contractValue || 0;
      totalBilledAll += b;
      totalCollectedAll += c;
      totalExpAll += e;

      msg += `| \`${p.code}\` | **${p.name}** | ${p.clientName || '—'} | ${formatINR(p.contractValue)} | ${formatINR(b)} | ${formatINR(c)} | ${formatINR(e)} | **${formatINR(margin)}** |\n`;
    }

    msg += `\n📊 **Portfolio Totals:**\n`;
    msg += `• **Total Portfolio Contract Value:** **${formatINR(totalContract)}**\n`;
    msg += `• **Total Invoiced:** **${formatINR(totalBilledAll)}** | **Total Realized Collections:** **${formatINR(totalCollectedAll)}**\n`;
    msg += `• **Total Project Direct Costs:** **${formatINR(totalExpAll)}**\n`;
    msg += `• **Net Portfolio Operating Profit:** **${formatINR(totalCollectedAll - totalExpAll)}**\n`;

    return {
      message: msg,
      actionTaken: 'PROJECTS_SUMMARY_QUERY',
      suggestedPrompts: [
        projects[0] ? `Tell me financial details of ${projects[0].name}` : 'How many projects are active today?',
        'What is the balance due amount of clients?',
        'Show all recent client quotations',
      ],
    };
  }

  // 9. Materials & Inventory Query
  const isInventoryQuery =
    (lower.includes('material') ||
      lower.includes('inventory') ||
      lower.includes('cement') ||
      lower.includes('steel') ||
      lower.includes('stock') ||
      lower.includes('warehouse') ||
      lower.includes('supplier') ||
      lower.includes('purchase order') ||
      lower.includes('grn')) &&
    !lower.includes('how to');

  if (isInventoryQuery) {
    const materials = await prisma.material.findMany({
      include: { stockBalances: true },
      orderBy: { name: 'asc' },
    });

    let msg = `📦 **Construction Materials & Inventory Stock Register**\n\n`;
    msg += `| Material Name | Code | Unit | Current Stock | Reorder Level | Unit Price | Total Valuation | Status |\n`;
    msg += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    let totalValuation = 0;
    let lowStockCount = 0;

    for (const mat of materials) {
      const stock = mat.stockBalances.reduce((s, b) => s + (b.currentQty || 0), 0);
      const minStock = mat.minStockLevel || 0;
      const price = mat.standardPrice || 0;
      const val = stock * price;
      totalValuation += val;

      const isLow = stock <= minStock;
      if (isLow) lowStockCount++;
      const statusBadge = isLow ? '⚠️ LOW STOCK' : '✓ ADEQUATE';

      msg += `| **${mat.name}** | \`${mat.code}\` | ${mat.unit} | **${stock}** | ${minStock} | ${formatINR(price)} | ${formatINR(val)} | ${statusBadge} |\n`;
    }

    msg += `\n📊 **Inventory Health:**\n`;
    msg += `• **Total Stock Valuation:** **${formatINR(totalValuation)}**\n`;
    msg += `• **Low Stock Alerts:** ${lowStockCount} items need procurement PO\n`;

    return {
      message: msg,
      actionTaken: 'INVENTORY_STOCK_QUERY',
      suggestedPrompts: [
        'How many projects are active today?',
        'What is the balance due amount of clients?',
        'Show all recent client quotations',
      ],
    };
  }

  // 10. Intelligent Multi-Entity Semantic Search Fallback
  // Searches Projects, Leads, Quotations, Workers, Staff, Tasks, Materials
  // If nothing matches, returns an authoritative ERP Command Guide.
  // NEVER dumps Cash in Hand: ₹0!
  return await searchEntitiesFallback(cleanPrompt, user);
}

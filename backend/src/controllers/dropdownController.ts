import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/responseHelper';

/**
 * Standard System Default Dropdown Categories & Options
 */
export const DEFAULT_DROPDOWN_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  LeadSource: [
    { label: 'Website / SEO', value: 'WEBSITE' },
    { label: 'Instagram / Meta Ads', value: 'INSTAGRAM' },
    { label: 'Client Referral', value: 'REFERRAL' },
    { label: 'Architect Referral', value: 'ARCHITECT_REFERRAL' },
    { label: 'Walk-in Inquiry', value: 'WALKIN' },
    { label: 'Google Local Ads', value: 'GOOGLE_ADS' },
    { label: 'Property Expo', value: 'PROPERTY_EXPO' },
    { label: 'Cold Outreach', value: 'COLD_OUTREACH' },
    { label: 'Other', value: 'OTHER' },
  ],
  ServiceType: [
    { label: 'Full Villa Construction', value: 'FULL_VILLA_CONSTRUCTION' },
    { label: 'Residential Interior', value: 'RESIDENTIAL_INTERIOR' },
    { label: 'Commercial Fitout', value: 'COMMERCIAL_FITOUT' },
    { label: 'Renovation & Remodeling', value: 'RENOVATION' },
    { label: 'Modular Kitchen & Wardrobe', value: 'MODULAR_KITCHEN' },
    { label: 'Civil Contracting & Shell', value: 'CIVIL_CONTRACTING' },
    { label: 'Turnkey Architecture & Build', value: 'TURNKEY_BUILD' },
  ],
  AreaRoom: [
    { label: 'Living Room', value: 'Living Room' },
    { label: 'Master Bedroom', value: 'Master Bedroom' },
    { label: 'Guest Bedroom', value: 'Guest Bedroom' },
    { label: 'Kids Bedroom', value: 'Kids Bedroom' },
    { label: 'Kitchen Modular Units', value: 'Kitchen Modular Units' },
    { label: 'Dining & Crockery Unit', value: 'Dining & Crockery Unit' },
    { label: 'Foyer / Entryway', value: 'Foyer / Entryway' },
    { label: 'Civil Work', value: 'Civil Work' },
    { label: 'Electrical & Automation', value: 'Electrical & Automation' },
    { label: 'Plumbing & Sanitaryware', value: 'Plumbing & Sanitaryware' },
    { label: 'False Ceiling & Lighting', value: 'False Ceiling & Lighting' },
    { label: 'Painting & Wall Treatment', value: 'Painting & Wall Treatment' },
    { label: 'Flooring & Tiling', value: 'Flooring & Tiling' },
    { label: 'Balcony / Deck', value: 'Balcony / Deck' },
    { label: 'Home Automation & Security', value: 'Home Automation & Security' },
    { label: 'HVAC & Air Conditioning', value: 'HVAC & Air Conditioning' },
    { label: 'Structural Steel & Fabrication', value: 'Structural Steel & Fabrication' },
    { label: 'Roofing & Waterproofing', value: 'Roofing & Waterproofing' },
    { label: 'Landscaping & Exterior', value: 'Landscaping & Exterior' },
    { label: 'Pooja Room & Sacred Space', value: 'Pooja Room & Sacred Space' },
  ],
  TaskPriority: [
    { label: 'Low', value: 'LOW' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'High', value: 'HIGH' },
    { label: 'Urgent / Critical', value: 'URGENT' },
  ],
  ProjectStatus: [
    { label: 'Planning', value: 'PLANNING' },
    { label: 'Active / Execution', value: 'ACTIVE' },
    { label: 'On Hold', value: 'ON_HOLD' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ],
  WorkerRole: [
    { label: 'Mason', value: 'MASON' },
    { label: 'Helper / Labour', value: 'HELPER' },
    { label: 'Carpenter', value: 'CARPENTER' },
    { label: 'Bar Bender / Steel Fixer', value: 'BARBENDER' },
    { label: 'Electrician', value: 'ELECTRICIAN' },
    { label: 'Plumber', value: 'PLUMBER' },
    { label: 'Painter', value: 'PAINTER' },
    { label: 'Welder / Fabricator', value: 'WELDER' },
    { label: 'Heavy Equipment Operator', value: 'OPERATOR' },
    { label: 'Site Supervisor / Foreman', value: 'SUPERVISOR' },
  ],
  ExpenseCategory: [
    { label: 'Office Rent & Lease', value: 'RENT' },
    { label: 'Electricity & Water Utility', value: 'ELECTRICITY_WATER' },
    { label: 'Internet, Software & Subscriptions', value: 'SOFTWARE_SUBSCRIPTION' },
    { label: 'Pantry, Office Supplies & Courier', value: 'OFFICE_SUPPLIES_PANTRY' },
    { label: 'Legal, Audit & Professional Fees', value: 'LEGAL_AUDIT' },
    { label: 'Travel, Fuel & Site Conveyance', value: 'TRAVEL_CONVEYANCE' },
    { label: 'Equipment & Tool Repairs', value: 'REPAIRS_MAINTENANCE' },
    { label: 'Marketing & Advertisements', value: 'MARKETING_ADS' },
    { label: 'Miscellaneous Overheads', value: 'MISC' },
  ],
  TaskStatus: [
    { label: 'Not Started', value: 'NOT_STARTED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Delayed', value: 'DELAYED' },
    { label: 'On Hold', value: 'ON_HOLD' },
  ],
  AttendanceStatus: [
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent', value: 'ABSENT' },
    { label: 'Half-Day', value: 'HALF_DAY' },
    { label: 'On-Site / Field Visit', value: 'ON_SITE' },
    { label: 'Approved Leave', value: 'LEAVE' },
    { label: 'Paid Holiday', value: 'HOLIDAY' },
  ],
};

/**
 * Get company ID for the active session
 */
const resolveTenantId = async (req: Request): Promise<string> => {
  if (req.user?.companyId) return req.user.companyId;
  const company = await prisma.company.findFirst();
  return company?.id || 'default-company';
};

/**
 * GET /api/dropdowns
 * Returns dropdown options for a specific category or all categories
 */
export const getDropdownOptions = async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    const category = req.query.category as string | undefined;

    const where: any = { tenantId, isActive: true };
    if (category) {
      where.category = category;
    }

    const customOptions = await prisma.dropdownOption.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { label: 'asc' }],
    });

    if (category) {
      // Merge system defaults for this category with custom options from DB
      const systemDefaults = (DEFAULT_DROPDOWN_OPTIONS[category] || []).map((opt, idx) => ({
        id: `sys-${category}-${opt.value}`,
        tenantId,
        category,
        label: opt.label,
        value: opt.value,
        isCustom: false,
        orderIndex: idx,
        isActive: true,
      }));

      // Find DB overrides or new custom options
      const customValues = new Set(customOptions.map((o) => o.value.toUpperCase()));
      const merged = [
        ...systemDefaults.filter((sys) => !customValues.has(sys.value.toUpperCase())),
        ...customOptions,
      ];

      return sendSuccess(res, {
        message: `Fetched ${merged.length} options for category "${category}"`,
        entity: 'Dropdown',
        whatsappStatus: 'Skipped',
        data: merged,
      });
    }

    // If no category specified, return grouped map of all categories
    const allCategories = Array.from(
      new Set([
        ...Object.keys(DEFAULT_DROPDOWN_OPTIONS),
        ...customOptions.map((c) => c.category),
      ])
    );

    const grouped: Record<string, any[]> = {};
    for (const cat of allCategories) {
      const defaults = (DEFAULT_DROPDOWN_OPTIONS[cat] || []).map((opt, idx) => ({
        id: `sys-${cat}-${opt.value}`,
        tenantId,
        category: cat,
        label: opt.label,
        value: opt.value,
        isCustom: false,
        orderIndex: idx,
        isActive: true,
      }));

      const catCustom = customOptions.filter((o) => o.category === cat);
      const customSet = new Set(catCustom.map((c) => c.value.toUpperCase()));
      grouped[cat] = [
        ...defaults.filter((d) => !customSet.has(d.value.toUpperCase())),
        ...catCustom,
      ];
    }

    return sendSuccess(res, {
      message: `Fetched dropdown options across ${allCategories.length} categories`,
      entity: 'Dropdown',
      whatsappStatus: 'Skipped',
      data: grouped,
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to retrieve dropdown options',
      entity: 'Dropdown',
      errors: [error.message],
      statusCode: 500,
    });
  }
};

/**
 * POST /api/dropdowns
 * Add a new dropdown entry to the database instantly for the tenant account
 */
export const createDropdownOption = async (req: Request, res: Response) => {
  try {
    const tenantId = await resolveTenantId(req);
    const { category, label, value } = req.body;

    if (!category || !label) {
      return sendError(res, {
        message: 'Category and label are required to create a new dropdown option.',
        entity: 'Dropdown',
        errors: ['Missing required fields: category, label'],
        statusCode: 400,
      });
    }

    const cleanLabel = String(label).trim();
    const cleanCategory = String(category).trim();
    // Default value if not specified: uppercase with underscores
    const cleanValue = (value ? String(value).trim() : cleanLabel.toUpperCase().replace(/[^A-Z0-9]/g, '_')) || 'CUSTOM_OPTION';

    // Check if exists for this tenant and category
    const existing = await prisma.dropdownOption.findFirst({
      where: {
        tenantId,
        category: cleanCategory,
        value: cleanValue,
      },
    });

    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.dropdownOption.update({
          where: { id: existing.id },
          data: { isActive: true, label: cleanLabel },
        });
        return sendSuccess(res, {
          message: `Option "${cleanLabel}" reactivated for category "${cleanCategory}"`,
          entity: 'Dropdown',
          whatsappStatus: 'Skipped',
          data: reactivated,
        });
      }
      return sendSuccess(res, {
        message: `Option "${cleanLabel}" already exists in category "${cleanCategory}"`,
        entity: 'Dropdown',
        whatsappStatus: 'Skipped',
        data: existing,
      });
    }

    const option = await prisma.dropdownOption.create({
      data: {
        tenantId,
        category: cleanCategory,
        label: cleanLabel,
        value: cleanValue,
        isCustom: true,
        isActive: true,
      },
    });

    // Record activity log
    try {
      await prisma.activityLog.create({
        data: {
          tenantId,
          userId: req.user?.id || null,
          userName: req.user?.name || 'User',
          entityType: 'Dropdown',
          entityId: option.id,
          entityTitle: `${cleanCategory} - ${cleanLabel}`,
          action: 'CREATE',
          fromStatus: null,
          toStatus: cleanValue,
          message: `New dropdown option "${cleanLabel}" created under category "${cleanCategory}".`,
        },
      });
    } catch (e) {}

    return sendSuccess(res, {
      message: `Option "${cleanLabel}" added to "${cleanCategory}" successfully.`,
      entity: 'Dropdown',
      whatsappStatus: 'Skipped',
      data: option,
      statusCode: 201,
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to create dropdown option',
      entity: 'Dropdown',
      errors: [error.message],
      statusCode: 500,
    });
  }
};

/**
 * DELETE /api/dropdowns/:id
 * Remove or deactivate a custom dropdown option
 */
export const deleteDropdownOption = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const tenantId = await resolveTenantId(req);

    const existing = await prisma.dropdownOption.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return sendError(res, {
        message: 'Dropdown option not found or cannot be modified.',
        entity: 'Dropdown',
        errors: [`Option with id ${id} does not exist in this tenant account`],
        statusCode: 404,
      });
    }

    await prisma.dropdownOption.delete({ where: { id } });

    return sendSuccess(res, {
      message: `Option "${existing.label}" deleted successfully.`,
      entity: 'Dropdown',
      whatsappStatus: 'Skipped',
      data: { id },
    });
  } catch (error: any) {
    return sendError(res, {
      message: 'Failed to delete dropdown option',
      entity: 'Dropdown',
      errors: [error.message],
      statusCode: 500,
    });
  }
};

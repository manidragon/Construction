import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { logAudit } from '../middleware/auth';

const ALLOWED_STAFF_ROLES = [
  'PROJECT_MANAGER',
  'SITE_ENGINEER',
  'ACCOUNTS_MANAGER',
  'PURCHASE_MANAGER',
  'STOREKEEPER',
  'HR_MANAGER',
  'AUDITOR',
  'STAFF',
];

/**
 * GET /api/company/team
 * Retrieve all team members & staff logins belonging strictly to the logged-in constructor
 */
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const callerCompanyId = req.user?.companyId;
    if (!callerCompanyId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const where: any = {};
    if (req.user?.role === 'SUPER_ADMIN') {
      const queryCompanyId = req.query.companyId as string;
      if (queryCompanyId) where.companyId = queryCompanyId;
    } else {
      where.companyId = callerCompanyId;
    }

    const team = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        designation: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignedProjects: {
          select: {
            id: true,
            roleTitle: true,
            project: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            dprPrepared: true,
            purchaseOrdersMade: true,
            expensesEntered: true,
            taskAssignments: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    return res.json({ success: true, team });
  } catch (error: any) {
    console.error('Error fetching company team members:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/company/team
 * Constructor Owner creates a new staff login credential (PM, Site Engineer, HR, Accounts Manager)
 */
export const createTeamMember = async (req: Request, res: Response) => {
  try {
    const callerCompanyId = req.user?.companyId;
    if (!callerCompanyId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const {
      name,
      email,
      password,
      role,
      designation,
      phone,
      assignedProjectIds = [],
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Staff name, email, initial password, and role are required.',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanRole = String(role).trim().toUpperCase();
    if (!ALLOWED_STAFF_ROLES.includes(cleanRole) && cleanRole !== 'TENANT_ADMIN') {
      return res.status(400).json({
        success: false,
        message: `Invalid role '${cleanRole}'. Permitted staff roles: ${ALLOWED_STAFF_ROLES.join(', ')}`,
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if email already exists anywhere on the platform
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A user account with email "${normalizedEmail}" already exists. Please choose a unique email.`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        companyId: callerCompanyId,
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
        phone: phone ? String(phone).trim() : null,
        role: cleanRole,
        designation: designation ? String(designation).trim() : cleanRole.replace(/_/g, ' '),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        designation: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Assign to requested projects if any
    if (Array.isArray(assignedProjectIds) && assignedProjectIds.length > 0) {
      // Ensure assigned projects belong strictly to this tenant
      const verifiedProjects = await prisma.project.findMany({
        where: {
          id: { in: assignedProjectIds },
          tenantId: callerCompanyId,
        },
        select: { id: true },
      });

      for (const prj of verifiedProjects) {
        await prisma.projectMember.create({
          data: {
            projectId: prj.id,
            userId: newUser.id,
            roleTitle: newUser.designation || newUser.role.replace(/_/g, ' '),
          },
        }).catch(() => {});
      }
    }

    await logAudit(
      req.user!.id,
      'CREATE_TEAM_MEMBER',
      'USER',
      newUser.id,
      { name: newUser.name, email: newUser.email, role: newUser.role },
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: `Staff login account for ${newUser.name} (${newUser.role}) created successfully.`,
      user: newUser,
    });
  } catch (error: any) {
    console.error('Error creating team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/company/team/:id
 * Update staff details, designation, role or assigned projects
 */
export const updateTeamMember = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const callerCompanyId = req.user?.companyId;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { assignedProjects: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    // Cross-tenant boundary check: Constructor A cannot modify Constructor B's staff
    if (req.user?.role !== 'SUPER_ADMIN' && targetUser.companyId !== callerCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not have permission to modify staff from another company.',
      });
    }

    const {
      name,
      role,
      designation,
      phone,
      isActive,
      assignedProjectIds,
    } = req.body;

    // Safety checks: An owner cannot demote or deactivate themselves
    if (targetUser.id === req.user?.id) {
      if (isActive === false) {
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
      }
      if (role && role !== targetUser.role && (targetUser.role === 'OWNER' || targetUser.role === 'TENANT_ADMIN')) {
        return res.status(400).json({ success: false, message: 'You cannot change your own administrator role.' });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (designation !== undefined) updateData.designation = String(designation).trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (role !== undefined) {
      const cleanRole = String(role).trim().toUpperCase();
      if (!ALLOWED_STAFF_ROLES.includes(cleanRole) && cleanRole !== 'TENANT_ADMIN' && cleanRole !== 'OWNER') {
        return res.status(400).json({ success: false, message: `Invalid role '${cleanRole}'.` });
      }
      updateData.role = cleanRole;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        designation: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Update assigned projects if passed
    if (Array.isArray(assignedProjectIds)) {
      // Remove previous memberships
      await prisma.projectMember.deleteMany({
        where: { userId: id },
      });

      // Verify and re-assign
      const verifiedProjects = await prisma.project.findMany({
        where: {
          id: { in: assignedProjectIds },
          tenantId: targetUser.companyId,
        },
        select: { id: true },
      });

      for (const prj of verifiedProjects) {
        await prisma.projectMember.create({
          data: {
            projectId: prj.id,
            userId: id,
            roleTitle: updatedUser.designation || updatedUser.role.replace(/_/g, ' '),
          },
        }).catch(() => {});
      }
    }

    await logAudit(
      req.user!.id,
      'UPDATE_TEAM_MEMBER',
      'USER',
      id,
      { updateData, assignedProjectCount: assignedProjectIds?.length },
      req.ip
    );

    return res.json({
      success: true,
      message: `Staff profile for ${updatedUser.name} updated successfully.`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/company/team/:id/reset-password
 * Constructor Owner resets a staff member's password directly
 */
export const resetTeamMemberPassword = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { newPassword } = req.body;
    const callerCompanyId = req.user?.companyId;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, companyId: true, role: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    // Cross-tenant security check
    if (req.user?.role !== 'SUPER_ADMIN' && targetUser.companyId !== callerCompanyId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Cannot reset password for a user from another company.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAudit(
      req.user!.id,
      'RESET_STAFF_PASSWORD',
      'USER',
      id,
      { targetEmail: targetUser.email },
      req.ip
    );

    return res.json({
      success: true,
      message: `Password for ${targetUser.name} (${targetUser.email}) has been successfully updated.`,
    });
  } catch (error: any) {
    console.error('Error resetting team member password:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/company/team/:id/status
 * Toggle active / suspended status for a staff login
 */
export const toggleTeamMemberStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const callerCompanyId = req.user?.companyId;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, isActive: true, companyId: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && targetUser.companyId !== callerCompanyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    if (targetUser.id === req.user?.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const nextStatus = !targetUser.isActive;

    await prisma.user.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    await logAudit(
      req.user!.id,
      nextStatus ? 'ACTIVATE_STAFF' : 'DEACTIVATE_STAFF',
      'USER',
      id,
      { email: targetUser.email, isActive: nextStatus },
      req.ip
    );

    return res.json({
      success: true,
      message: `Staff account ${targetUser.name} is now ${nextStatus ? 'ACTIVE' : 'SUSPENDED'}.`,
      isActive: nextStatus,
    });
  } catch (error: any) {
    console.error('Error toggling staff status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/company/team/:id
 * Delete or safely deactivate a staff member if historical transactions exist
 */
export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const callerCompanyId = req.user?.companyId;

    const targetUser: any = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            dprPrepared: true,
            purchaseOrdersMade: true,
            expensesEntered: true,
            taskAssignments: true,
          },
        },
      },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    if (req.user?.role !== 'SUPER_ADMIN' && targetUser.companyId !== callerCompanyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    if (targetUser.id === req.user?.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const linkedRecordsCount =
      (targetUser._count?.dprPrepared || 0) +
      (targetUser._count?.purchaseOrdersMade || 0) +
      (targetUser._count?.expensesEntered || 0) +
      (targetUser._count?.taskAssignments || 0);

    if (linkedRecordsCount > 0) {
      // Staff member has historical transactions (DPRs, POs, Expenses, Tasks)
      // Deactivate instead of deleting to preserve financial & audit history
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit(
        req.user!.id,
        'SAFE_DEACTIVATE_STAFF',
        'USER',
        id,
        { email: targetUser.email, reason: 'Has historical operational records' },
        req.ip
      );

      return res.json({
        success: true,
        deactivated: true,
        message: `${targetUser.name} has ${linkedRecordsCount} historical project entries (DPRs/POs/Expenses/Tasks). Their login has been deactivated to preserve audit trails.`,
      });
    }

    // Unlink project memberships and delete clean
    await prisma.projectMember.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    await logAudit(
      req.user!.id,
      'DELETE_TEAM_MEMBER',
      'USER',
      id,
      { email: targetUser.email, name: targetUser.name },
      req.ip
    );

    return res.json({
      success: true,
      message: `Staff member ${targetUser.name} has been permanently deleted.`,
    });
  } catch (error: any) {
    console.error('Error deleting team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

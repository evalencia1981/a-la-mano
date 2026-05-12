import 'server-only';
import {
  db,
  profiles,
  tenantInvitations,
  tenantMembers,
  type NewTenantInvitation,
  type NewTenantMember,
  type TenantInvitation,
  type TenantMember,
} from '@evalencia-stack/db';
import { and, eq } from 'drizzle-orm';

export interface MemberWithProfile {
  member: TenantMember;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export const memberRepository = {
  async listByTenant(tenantId: string): Promise<MemberWithProfile[]> {
    const rows = await db
      .select({
        member: tenantMembers,
        email: profiles.email,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(tenantMembers)
      .innerJoin(profiles, eq(profiles.id, tenantMembers.userId))
      .where(eq(tenantMembers.tenantId, tenantId));
    return rows;
  },

  async findMembership(tenantId: string, userId: string): Promise<TenantMember | null> {
    const [row] = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
      .limit(1);
    return row ?? null;
  },

  async addMember(data: NewTenantMember): Promise<TenantMember> {
    const [row] = await db.insert(tenantMembers).values(data).returning();
    if (!row) throw new Error('No se pudo crear la membership.');
    return row;
  },

  async updateRole(tenantId: string, userId: string, role: string): Promise<TenantMember> {
    const [row] = await db
      .update(tenantMembers)
      .set({ role })
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
      .returning();
    if (!row) throw new Error('Membership no encontrada.');
    return row;
  },

  async removeMember(tenantId: string, userId: string): Promise<void> {
    await db
      .delete(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)));
  },

  async createInvitation(data: NewTenantInvitation): Promise<TenantInvitation> {
    const [row] = await db.insert(tenantInvitations).values(data).returning();
    if (!row) throw new Error('No se pudo crear la invitación.');
    return row;
  },

  async findInvitationByToken(token: string): Promise<TenantInvitation | null> {
    const [row] = await db
      .select()
      .from(tenantInvitations)
      .where(eq(tenantInvitations.token, token))
      .limit(1);
    return row ?? null;
  },

  async markInvitationAccepted(id: string): Promise<void> {
    await db
      .update(tenantInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(tenantInvitations.id, id));
  },

  async listInvitations(tenantId: string): Promise<TenantInvitation[]> {
    return db.select().from(tenantInvitations).where(eq(tenantInvitations.tenantId, tenantId));
  },
};

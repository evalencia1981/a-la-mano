import 'server-only';
import { auditLog, db, type AuditEntry, type NewAuditEntry } from '@evalencia-stack/db';
import { desc, eq } from 'drizzle-orm';

export const auditRepository = {
  async insert(entry: NewAuditEntry): Promise<AuditEntry> {
    const [row] = await db.insert(auditLog).values(entry).returning();
    if (!row) throw new Error('No se pudo escribir audit log.');
    return row;
  },

  async listByTenant(tenantId: string, limit = 100): Promise<AuditEntry[]> {
    return db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, tenantId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  },
};

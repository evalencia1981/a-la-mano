import 'server-only';
import { db, profiles, type Profile } from '@evalencia-stack/db';
import { eq } from 'drizzle-orm';

export const userRepository = {
  async findById(id: string): Promise<Profile | null> {
    const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return row ?? null;
  },

  async findByEmail(email: string): Promise<Profile | null> {
    const [row] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    return row ?? null;
  },

  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
    const [row] = await db.update(profiles).set(data).where(eq(profiles.id, id)).returning();
    if (!row) throw new Error('Profile no encontrado.');
    return row;
  },
};

import { Card, CardContent } from '@/components/ui/card';
import { db, tenants } from '@a-la-mano/db';
import { desc } from 'drizzle-orm';

export const metadata = { title: 'Platform · Tenants' };

export default async function PlatformTenantsPage() {
  const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{rows.length} comunidades.</p>
      </header>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-secondary)] text-left text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Slug</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2 text-[var(--color-text-secondary)]">{t.slug}</td>
                  <td className="px-4 py-2">{t.type}</td>
                  <td className="px-4 py-2">{t.status}</td>
                  <td className="px-4 py-2 text-xs text-[var(--color-text-secondary)]">
                    {new Date(t.createdAt).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

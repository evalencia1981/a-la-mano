import { SettingsNav } from './settings-nav';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function SettingsLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  return (
    <div className="flex gap-8">
      <SettingsNav tenantSlug={tenantSlug} />
      <div className="flex-1 max-w-3xl">{children}</div>
    </div>
  );
}

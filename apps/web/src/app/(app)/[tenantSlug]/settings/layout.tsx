import { SettingsNav } from './settings-nav';

interface Props {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}

export default async function SettingsLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
      <SettingsNav tenantSlug={tenantSlug} />
      <div className="min-w-0 flex-1 lg:max-w-3xl">{children}</div>
    </div>
  );
}

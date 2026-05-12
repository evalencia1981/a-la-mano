/**
 * Layout para pantallas de autenticación. Centra el contenido sin
 * navegación — el user todavía no eligió tenant.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

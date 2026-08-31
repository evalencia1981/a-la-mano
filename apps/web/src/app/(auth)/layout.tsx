/**
 * Layout para pantallas de autenticación. Centra el contenido sin
 * navegación — el user todavía no eligió tenant.
 *
 * El degradado de color ya viene de `body::before` en `globals.css`, así
 * que acá no hace falta fondo propio: la tarjeta de vidrio del formulario
 * se apoya directamente sobre él.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

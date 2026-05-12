import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Para sumar una mono opcional (ej. para mostrar code), instalar el paquete
// `geist` y exponer `GeistMono.variable` acá: { variable: '--font-geist-mono' }.

export const metadata: Metadata = {
  title: {
    default: 'evalencia-stack',
    template: '%s · evalencia-stack',
  },
  description: 'Starter SaaS multi-tenant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

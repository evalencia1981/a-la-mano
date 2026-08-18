import type { Metadata } from 'next';
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google';
import './globals.css';

/*
 * Dos voces tipográficas:
 *  - Bricolage Grotesque para nombres y títulos. Tiene rarezas propias
 *    (terminaciones cortadas, ancho variable) que le dan carácter sin
 *    perder legibilidad a tamaño grande.
 *  - Public Sans para texto corrido y datos. Neutra y muy legible en
 *    pantallas chicas, que es donde se usa el directorio.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['500', '600', '700'],
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'A la Mano',
    template: '%s · A la Mano',
  },
  description: 'Directorio privado de servicios para tu comunidad.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bricolage.variable} ${publicSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

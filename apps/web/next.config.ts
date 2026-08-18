import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ESLint corre por separado con `pnpm lint` — no lo metemos en `next build`
  // porque el resolver legacy no respeta los exports de workspace packages.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Transpile workspace packages para que Next pueda resolver TS source.
  transpilePackages: ['@a-la-mano/db'],
};

export default nextConfig;

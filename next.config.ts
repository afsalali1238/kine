import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: { optimizePackageImports: ['@react-three/drei', 'lucide-react'] },
};

export default nextConfig;

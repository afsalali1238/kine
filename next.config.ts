import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: { optimizePackageImports: ['@react-three/drei', 'lucide-react'] },
  // The body meshes are named after their own digest, so a repeat visit — which is what a
  // daily exercise session actually is — should not refetch 1.2 MB over a phone connection.
  // The procedural skin set is unhashed and small, so it revalidates instead.
  async headers() {
    return [
      {
        source: '/models/:file(body-[a-z]+\\.[a-f0-9]+\\.glb)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/models/:file(skin-\\w+\\.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;

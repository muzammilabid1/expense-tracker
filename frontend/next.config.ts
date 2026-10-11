import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep Turbopack scoped to this app; the repository also has a backend lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

import nextConfig from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextConfig,
  ...nextTypescript,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default config;

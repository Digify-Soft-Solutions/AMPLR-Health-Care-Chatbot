/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_OUTPUT_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  ...(isExport ? { output: 'export', distDir: 'dist' } : {}),
};

export default nextConfig;

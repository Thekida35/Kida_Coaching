/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

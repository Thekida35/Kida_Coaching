/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pas de config ESLint dans le projet : la vérification des types (tsc) suffit au build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

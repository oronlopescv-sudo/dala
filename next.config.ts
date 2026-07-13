import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Desabilitar Turbopack para debug
    turbopack: false,
  },
  // Otimizações de build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
};

export default nextConfig;

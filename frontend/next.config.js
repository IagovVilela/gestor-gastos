/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Configurações para melhorar hot reload no Windows
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Configura polling para detectar mudanças no Windows
      config.watchOptions = {
        poll: 1000, // Verifica mudanças a cada 1 segundo
        aggregateTimeout: 300, // Aguarda 300ms antes de recompilar
        ignored: /node_modules/,
      };
    }
    return config;
  },
  // Configurações de cache e performance
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;


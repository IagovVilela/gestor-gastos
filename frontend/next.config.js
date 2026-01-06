/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone', // Desabilitado para usar server.js customizado
  eslint: {
    // Permite que o build continue mesmo com warnings do ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite que o build continue mesmo com erros de tipo (não recomendado, mas pode ajudar)
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.railway.app',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
        pathname: '/uploads/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Configurações para melhorar hot reload no Windows (apenas em desenvolvimento)
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


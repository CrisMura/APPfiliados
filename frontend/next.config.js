/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['http2.mlstatic.com', 'mlstatic.com', 'http://http2.mlstatic.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mlstatic.com',
      },
    ],
  },
  // Configuración de SEO
  meta: {
    title: 'DealRadar - Las mejores ofertas de MercadoLibre',
    description: 'Descubre los mejores descuentos en tecnología, hogar, herramientas y más en MercadoLibre',
  },
};

module.exports = nextConfig;


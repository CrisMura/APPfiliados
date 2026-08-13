/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
    remotePatterns: [],
  },
  // Configuración de SEO
  meta: {
    title: 'RadarOfertas - Las mejores ofertas',
    description: 'Descubre los mejores descuentos en tecnología, hogar, herramientas y más. Ofertas cargadas manualmente.',
  },
};

module.exports = nextConfig;


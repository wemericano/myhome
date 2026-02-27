/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/stock_ai.html', destination: '/stock_ai', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
    ];
  },
};

module.exports = nextConfig;

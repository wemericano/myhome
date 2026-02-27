/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      { source: '/stock_ai.html', destination: '/stock_ai', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
    ];
  },
  async rewrites() {
    // NAS Docker: Go API는 myhome 컨테이너로 프록시
    return [
      { source: '/api/institutional', destination: 'http://myhome:8080/api/institutional' },
      { source: '/api/health', destination: 'http://myhome:8080/api/health' },
    ];
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
      {
        source: '/Account/:path*',
        destination: 'http://localhost:5000/Account/:path*',
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/notes/:path*',
        destination: `${backendUrl}/notes/:path*`, // Proxy backend notes API
      },
      {
        source: '/api/notes',
        destination: `${backendUrl}/notes`, // Proxy backend notes API
      },
    ];
  },
};

export default nextConfig;

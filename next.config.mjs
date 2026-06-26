/** @type {import('next').NextConfig} */

// The frontend talks to the AWS backend through lib/api.ts using
// NEXT_PUBLIC_API_BASE_URL. In production, requests go directly to AWS.
//
// For local development you can optionally proxy "/api/*" to a backend by
// setting API_PROXY_TARGET (e.g. http://127.0.0.1:8000), which avoids CORS
// while iterating locally.
const proxyTarget = process.env.API_PROXY_TARGET;

const nextConfig = {
  async rewrites() {
    if (!proxyTarget) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

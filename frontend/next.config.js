/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'img.shopstyle-cdn.com' },
      { protocol: 'https', hostname: 'cdn.shopstyle-cdn.com' },
      { protocol: 'https', hostname: 'images.cettire.com' },
      { protocol: 'https', hostname: '*.cettire.com' },
      { protocol: 'https', hostname: 'yoox.akamaized.net' },
      { protocol: 'https', hostname: '*.yoox.net' },
      { protocol: 'https', hostname: '*.net-a-porter.com' },
      { protocol: 'https', hostname: '*.shopify.com' },
      { protocol: 'https', hostname: '*.shopifycdn.com' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

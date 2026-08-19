import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * The app is served at thefinance.ir/mag.
   *
   * basePath is inlined at build time and cannot be changed without a rebuild,
   * so it is set from the start — retrofitting it means touching every link
   * and route.
   */
  basePath: '/mag',

  reactStrictMode: true,

  images: {
    /**
     * Both hosts are allowed.
     *
     * Existing media lives at thefinance.ir/wp-content/uploads/... and those
     * URLs must never change — moving them would break Google Images indexing
     * and every external hotlink. nginx proxies that path to the CMS host.
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'thefinance.ir', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'wp.thefinance.ir', pathname: '/wp-content/uploads/**' },
    ],
  },

  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;

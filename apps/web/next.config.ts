import type { NextConfig } from "next";

const mediaOrigin =
  process.env.NEXT_PUBLIC_WORDPRESS_MEDIA_ORIGIN ?? "https://thefinance.ir";

const nextConfig: NextConfig = {
  basePath: "/mag",
  trailingSlash: true,
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
  images: mediaOrigin
    ? {
        remotePatterns: [
          {
            protocol: new URL(mediaOrigin).protocol.replace(":", "") as
              | "http"
              | "https",
            hostname: new URL(mediaOrigin).hostname,
            pathname: "/mag/wp-content/uploads/**",
          },
        ],
      }
    : undefined,
};

export default nextConfig;

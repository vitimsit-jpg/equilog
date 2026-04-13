/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { instrumentationHook: process.env.NODE_ENV === "production" },
  async redirects() {
    return [
      { source: "/", destination: "/dashboard", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thvxjsvyazkcyuwecqhu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

let exportedConfig = nextConfig;

if (process.env.NODE_ENV === "production") {
  const { withSentryConfig } = await import("@sentry/nextjs");
  exportedConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    hideSourceMaps: true,
    disableLogger: true,
    tunnelRoute: undefined,
  });
}

export default exportedConfig;

/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@civic-lens/types", "@civic-lens/utils"]
};

export default nextConfig;

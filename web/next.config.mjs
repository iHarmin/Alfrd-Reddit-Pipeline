/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    if (isServer) {
      config.output.chunkFilename = "[name].js";
    }
    return config;
  },
};

export default nextConfig;

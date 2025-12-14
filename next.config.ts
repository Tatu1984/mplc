import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Disabled React Compiler for standalone version
  // reactCompiler: true,

  // Use standalone output only for Docker (set via env var)
  ...(process.env.DOCKER_BUILD === 'true' && { output: 'standalone' }),

  turbopack: {
    root: path.resolve(__dirname),
  },

  // Ensure API routes work correctly in production
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3005', 'localhost:3000'],
    },
  },
};

export default nextConfig;

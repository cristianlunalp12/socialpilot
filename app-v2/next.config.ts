import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  // La app vive en una subcarpeta del repositorio: fija aquí la raíz del proyecto.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

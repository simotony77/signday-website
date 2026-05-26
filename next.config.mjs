import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project so Next doesn't get confused by
  // stray package-lock.json files higher up the tree (e.g. in the home dir).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

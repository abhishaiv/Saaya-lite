import { execFileSync } from "node:child_process";

function gitBuildValue(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const versionName =
  process.env.SAAYA_VERSION_NAME ??
  gitBuildValue(["rev-parse", "--short", "HEAD"]);
const versionCode =
  process.env.SAAYA_VERSION_CODE ??
  gitBuildValue(["rev-list", "--count", "HEAD"]);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SAAYA_VERSION_CODE: versionCode,
    NEXT_PUBLIC_SAAYA_VERSION_NAME: versionName,
  },
  reactStrictMode: true,
};

export default nextConfig;

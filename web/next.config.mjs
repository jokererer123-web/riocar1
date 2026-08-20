/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async redirects() {
    return [{ source: "/", destination: "/ky", permanent: false }];
  },
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === "1";
const repositoryBase = process.env.GITHUB_ACTIONS ? "/riocar1" : "";

const nextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        basePath: repositoryBase,
        assetPrefix: repositoryBase,
        trailingSlash: true,
      }
    : {
        async redirects() {
          return [{ source: "/", destination: "/ky", permanent: false }];
        },
      }),
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;

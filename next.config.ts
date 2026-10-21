import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The Observatory is the front door; the original Hello World page lives at /hello.
      // Not permanent, so browsers don't cache it if the home page changes again.
      { source: "/", destination: "/observatory", permanent: false },
    ];
  },
};

export default nextConfig;

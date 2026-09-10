import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Body assets are regenerated as a whole (never patched in place), and a
  // stale cached copy of the old placeholder GLBs rendered a broken body in
  // the wild. Serve them uncacheable so every client always gets the current
  // bytes; the app additionally versions URLs via ASSET_VERSION.
  async headers() {
    return [
      {
        source: "/models/:asset*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

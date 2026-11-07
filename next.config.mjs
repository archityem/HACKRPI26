/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tests run their own server with a separate build folder so they never collide with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;

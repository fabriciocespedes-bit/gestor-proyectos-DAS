/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@projectos/core'],
  // Los datos vienen de Supabase (cliente JS + Edge Functions), no de un backend propio.
};
export default nextConfig;

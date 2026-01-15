/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Allow listing remote hosts for Next.js Image component via env var
    // Set NEXT_IMAGE_DOMAINS to a comma-separated list (e.g. "framerusercontent.com,ucarecdn.com")
    unoptimized: true,
    domains: process.env.NEXT_IMAGE_DOMAINS
      ? process.env.NEXT_IMAGE_DOMAINS.split(',').map((d) => d.trim())
      : [
          'framerusercontent.com',
          'ucarecdn.com',
          'res.cloudinary.com',
          'dl.airtableusercontent.com',
          'images.ctfassets.net',
          'images.unsplash.com',
          'cdn.sanity.io',
        ],
  },
 
}

export default nextConfig
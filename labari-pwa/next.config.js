/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // static export -> deployable to GitHub Pages, matches labarimedia.com pattern
  images: {
    unoptimized: true, // GitHub Pages can't run Next's image optimizer server-side
  },
  trailingSlash: true, // GitHub Pages serves /path/index.html; avoids 404s on nested routes
  // If deploying to a project page (username.github.io/labari-pwa) rather than a custom
  // domain at the root, uncomment and set basePath/assetPrefix to match the repo name:
  // basePath: '/labari-pwa',
  // assetPrefix: '/labari-pwa/',
};

module.exports = nextConfig;

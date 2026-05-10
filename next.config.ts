import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@react-pdf/renderer'],
  // Otimização de bundle - tree-shake imports de bibliotecas grandes
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-toast',
    ],
    // Cache do client-side router por mais tempo (UX mais fluida)
    staleTimes: {
      dynamic: 30,   // 30s para páginas dinâmicas
      static: 180,   // 3min para páginas estáticas
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "graph.facebook.com",
      },
    ],
  },
  // Compressão habilitada por padrão, mas explícito para clareza
  compress: true,
  // Remove "Powered by Next.js" header (pequena economia)
  poweredByHeader: false,
};

export default nextConfig;

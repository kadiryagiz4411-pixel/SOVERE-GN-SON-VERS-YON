import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // Provide empty-string fallbacks for every VITE_ env var so that the build
  // never crashes when variables are not set in the Vercel project settings.
  define: {
    'import.meta.env.VITE_SUPABASE_URL':         JSON.stringify(process.env.VITE_SUPABASE_URL         ?? ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY':    JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY    ?? ''),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''),
    'import.meta.env.VITE_OPENAI_API_KEY':        JSON.stringify(process.env.VITE_OPENAI_API_KEY       ?? ''),
    'import.meta.env.VITE_LEMONSQUEEZY_STORE_URL': JSON.stringify(process.env.VITE_LEMONSQUEEZY_STORE_URL ?? ''),
    'import.meta.env.VITE_EDGE_CV_FUNCTION':      JSON.stringify(process.env.VITE_EDGE_CV_FUNCTION     ?? 'sovereign'),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "Sovereign - AI Career Strategy",
        short_name: "Sovereign",
        description: "Get hired globally with AI-powered strategy. Optimize for ATS, predict your acceptance rate, and land your dream job 3x faster.",
        theme_color: "#7c3aed",
        background_color: "#0f0f23",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    // Raise the warning threshold to 1 MiB so the large Dashboard chunk doesn't
    // emit noise (it's already code-split; the warning is informational only).
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split only the heaviest third-party libs into their own cacheable
        // chunks. Do NOT add a catch-all 'vendor' bucket — that creates a
        // single giant chunk. Let Rollup auto-split the rest.
        manualChunks: (id) => {
          if (id.includes('jspdf'))         return 'jspdf';
          if (id.includes('jszip'))         return 'jszip';
          if (id.includes('html2canvas'))   return 'html2canvas';
          if (id.includes('framer-motion')) return 'framer-motion';
          if (id.includes('recharts'))      return 'recharts';
          if (id.includes('purify'))        return 'purify';
        },
      },
    },
  },
}));

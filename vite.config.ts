import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => ({
  plugins: [react(), nodePolyfills()],
  define: {
    // In production builds, DEV_BYPASS is always false.
    ...(mode === 'production' ? {
      'import.meta.env.DEV': JSON.stringify(false),
      '__DEV_BYPASS__': JSON.stringify(false),
    } : {
      '__DEV_BYPASS__': JSON.stringify(true),
    }),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'sonner',
      'clsx',
      'tailwind-merge',
      'mapbox-gl',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process',
    ],
    exclude: ['wagmi', 'connectkit', 'viem'],
  },
  server: {
    host: true,
    port: 5173,
  },
}))
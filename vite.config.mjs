import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  
  return {
    // Build optimization for production
    build: {
      outDir: "dist",
      chunkSizeWarningLimit: 2000,
      // Source maps for production debugging (can be disabled for smaller builds)
      sourcemap: isProduction ? 'hidden' : true,
      // Minification
      minify: isProduction ? 'esbuild' : false,
      // Asset optimization
      assetsDir: 'assets',
      // Rollup options for chunk splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['@headlessui/react', '@heroicons/react'],
            'vendor-auth': ['@supabase/supabase-js'],
            'vendor-ws': ['socket.io-client'],
            // Page chunks
            'page-marketplace': ['./src/pages/marketplace-homepage/index.jsx'],
            'page-ai-assistant': ['./src/pages/ai-shopping-assistant/index.jsx'],
            'page-auth': ['./src/pages/login/index.jsx', './src/pages/register/index.jsx']
          },
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const extType = info[info.length - 1];
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/\.(css)$/i.test(assetInfo.name)) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      // Target modern browsers for production
      target: isProduction ? 'es2020' : 'modules',
    },

    plugins: [
      tsconfigPaths(), 
      react({
        // React optimization for production
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: isProduction ? [
            ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
          ] : []
        }
      }), 
      tagger()
    ],

    // Development server configuration
    server: {
      port: 4028,
      host: "0.0.0.0",
      strictPort: true,
      allowedHosts: ['.amazonaws.com', '.builtwithrocket.new'],
      // Enable HMR for better development experience
      hmr: {
        overlay: true
      }
    },

    // Preview server configuration (for testing production builds locally)
    preview: {
      port: 4029,
      host: "0.0.0.0",
      strictPort: true,
    },

    // Environment variable configuration
    envPrefix: 'VITE_',

    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@pages': resolve(__dirname, './src/pages'),
        '@utils': resolve(__dirname, './src/utils'),
        '@styles': resolve(__dirname, './src/styles'),
        '@contexts': resolve(__dirname, './src/contexts'),
        '@services': resolve(__dirname, './src/services')
      }
    },

    // CSS configuration
    css: {
      // PostCSS configuration is handled by postcss.config.js
      // Enable CSS source maps in development
      devSourcemap: !isProduction,
      // CSS optimization
      postcss: './postcss.config.js'
    },

    // Optimization options
    optimizeDeps: {
      // Pre-bundle these dependencies
      include: [
        'react',
        'react-dom',
        '@supabase/supabase-js',
        'socket.io-client'
      ],
      // Exclude from pre-bundling
      exclude: []
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    }
  };
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Development: use local proxy
  // Production: API calls go directly to the backend domain
  const isDev = mode === 'development';
  
  return {
    server: isDev ? {
      host: "::",
      port: 8081,
      allowedHosts: ["meddollina-frontent.onrender.com"],
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    } : undefined,
    define: {
      // Set the backend API URL based on environment
      __API_URL__: JSON.stringify(
        isDev ? 'http://localhost:5000' : process.env.VITE_API_URL || 'https://meddollina-backend.onrender.com'
      )
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        }
      }
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

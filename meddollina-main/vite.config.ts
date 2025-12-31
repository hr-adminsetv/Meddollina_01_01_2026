import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  
  return {
    server: {
      host: "::",
      port: 5001,
      allowedHosts: ["meddollina-frontent.onrender.com"],
    },
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

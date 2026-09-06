import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = Number(env.VITE_FRONTEND_PORT || env.PORT || 8080);

  return {
    server: {
      host: "::",
      port: frontendPort,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three') || id.includes('@react-three')) return 'three-vendor';
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
              if (id.includes('lucide-react') || id.includes('recharts') || id.includes('@radix-ui')) return 'ui-vendor';
              return 'vendor';
            }
          }
        }
      }
    }
  };
});

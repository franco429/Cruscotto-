import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      '@shared': path.resolve(__dirname, '..', 'shared-types'),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
    },
  },
  // Configurazione per i file statici
  publicDir: "public",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist", // dentro client/
    emptyOutDir: true,
  },
});

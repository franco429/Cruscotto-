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
    // TAC Security: CWE-615 - Rimozione commenti sospetti dal bundle
    sourcemap: false, // Disabilita sourcemaps in produzione
    minify: 'terser', // Usa terser per minificazione avanzata
    terserOptions: {
      compress: {
        drop_console: true, // Rimuove console.log in produzione
        drop_debugger: true, // Rimuove debugger
      },
      format: {
        comments: false, // Rimuove TUTTI i commenti dal bundle finale
        preamble: '', // Rimuove eventuali commenti iniziali
      },
    },
  },
});

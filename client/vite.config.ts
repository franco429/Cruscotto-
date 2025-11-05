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
        passes: 3, // Multipli passaggi di compressione per minificazione ottimale
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Rimuove funzioni pure
        unsafe: false, // Sicuro per produzione
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_symbols: false,
        unsafe_proto: false,
        unsafe_regexp: false,
      },
      format: {
        comments: false, // Rimuove TUTTI i commenti dal bundle finale
        preamble: '', // Rimuove eventuali commenti iniziali
        ascii_only: true, // Usa solo caratteri ASCII (evita problemi encoding)
        beautify: false, // Nessuna formattazione
        braces: true, // Mantiene parentesi graffe per compatibilità
        wrap_iife: false, // Non wrappare IIFE
        wrap_func_args: true, // Wrappa argomenti funzione per compressione
      },
      mangle: {
        toplevel: true, // Mangle anche nomi top-level
        safari10: true, // Compatibilità Safari 10+
        keep_classnames: false, // Non preservare nomi classi
        keep_fnames: false, // Non preservare nomi funzioni
      },
    },
    // Aumenta il limite delle dimensioni dei chunk per evitare warning
    chunkSizeWarningLimit: 1000,
    // Ottimizza la divisione dei chunk
    rollupOptions: {
      output: {
        manualChunks: undefined, // Lascia a Vite la gestione automatica
        // Assicura che non ci siano commenti negli output
        banner: '',
        footer: '',
        intro: '',
        outro: '',
      },
    },
  },
});

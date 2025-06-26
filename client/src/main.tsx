import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/hooks/use-auth";
import { ThemeProvider } from "../src/hooks/use-theme";
import { queryClient } from "../src/lib/queryClient";
import App from "./App";
import "./index.css";
import { SessionActivityMonitor } from "./components/session-activity-monitor";

// Componente avvolgente che gestisce l'autenticazione e la sessione
function AppWithAuth() {
  return (
    <AuthProvider>
      <SessionActivityMonitor />
      <App />
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AppWithAuth />
    </ThemeProvider>
  </QueryClientProvider>
);

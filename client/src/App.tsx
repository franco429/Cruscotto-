import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "../src/components/ui/toaster";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { ErrorBoundary } from "./components/error-boundary";
import { ConnectionStatus } from "./components/network-error";
import NotFound from "../src/pages/not-found";
import HomePage from "../src/pages/home-page";
import PublicHomePage from "../src/pages/public-home-page";
import AuthPage from "../src/pages/auth-page";
import DocumentPage from "../src/pages/document-page";
import UsersPage from "../src/pages/users-page";
import AuditLogsPage from "../src/pages/audit-logs-page";
import SettingsPage from "../src/pages/settings-page";
import CompanyCodesPage from "../src/pages/company-codes-page";
import ObsoletePage from "../src/pages/obsolete-page";
import SupportPage from "../src/pages/support-page";
import AboutPage from "../src/pages/about-page";
import ResetPasswordPage from "../src/pages/reset-password-page";
import ClientsPage from "../src/pages/clients-page";
import BackupPage from "../src/pages/backup-page";
import PrivacyPage from "./pages/privacy-page";
import TermsPage from "./pages/terms-page";
import CookiePage from "./pages/cookie-page";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth } from "./hooks/use-auth";

// Componente per gestire dinamicamente la home page basata sull'autenticazione
function HomeRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se l'utente è autenticato, mostra la HomePage, altrimenti PublicHomePage
  return user ? <HomePage /> : <PublicHomePage />;
}

function Router() {
  return (
    <Switch>
      {/* Dynamic home route based on authentication */}
      <Route path="/" component={HomeRouter} />

      {/* Protected routes */}
      <ProtectedRoute path="/dashboard" component={HomePage} />
      <ProtectedRoute path="/documents/:id" component={DocumentPage} />
      <ProtectedRoute path="/users" component={UsersPage} adminOnly={true} />
      <ProtectedRoute
        path="/clients"
        component={ClientsPage}
        adminOnly={true}
      />
      <ProtectedRoute
        path="/audit-logs"
        component={AuditLogsPage}
        adminOnly={true}
      />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/company-codes" component={CompanyCodesPage} />
      <ProtectedRoute path="/home-page" component={HomePage} />
      <ProtectedRoute
        path="/obsolete"
        component={ObsoletePage}
        adminOnly={true}
      />
      <ProtectedRoute path="/backup" component={BackupPage} adminOnly={true} />

      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/assistenza" component={SupportPage} />
      <Route path="/chi-siamo" component={AboutPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/cookie" component={CookiePage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <ConnectionStatus />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;

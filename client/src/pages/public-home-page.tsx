import React from "react";
import Footer from "../components/footer";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import {
  Shield,
  FileText,
  Calendar,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  Lock,
  Eye,
  Cloud
} from "lucide-react";

export default function PublicHomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img
                src="/logo/logo sgi.jpg"
                alt="Logo SGI"
                className="h-8 w-8 object-cover"
              />
              <span className="font-bold text-xl text-slate-900 dark:text-white">
                Pannello di Controllo SGI
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/privacy"
                className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors text-sm"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors text-sm"
              >
                Terms of Service
              </a>
              <Link href="/auth">
                <Button className="bg-primary hover:bg-primary/90">
                  Accedi
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-20 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
                Gestione Documenti ISO
                <span className="block text-primary">Professionale</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Soluzione completa per la gestione dei documenti ISO, con controllo delle revisioni,
                tracciamento delle scadenze e monitoraggio della conformità. Integrazione nativa con Google Drive.
              </p>

              <div className="flex justify-center mb-12">
                <Link href="/auth">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-3">
                    Inizia Ora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white/50 dark:bg-slate-800/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Caratteristiche Principali
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Tutto quello che serve per una gestione efficiente dei documenti ISO
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <FileText className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Gestione Documenti
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Organizzazione completa dei documenti ISO con versioning automatico e controllo delle revisioni.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <Calendar className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Tracciamento Scadenze
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Monitoraggio automatico delle scadenze con notifiche e alert personalizzabili.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <Cloud className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Integrazione Google Drive
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Sincronizzazione automatica con Google Drive per accesso sicuro e backup cloud.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Dashboard Analitiche
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Report dettagliati e statistiche per monitorare lo stato di conformità dell'organizzazione.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <Users className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Gestione Utenti
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Sistema di ruoli e permessi per amministratori, editor e visualizzatori.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Sicurezza Avanzata
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Crittografia end-to-end, autenticazione sicura e controlli di accesso rigorosi.
                </p>
              </div>
            </div>
          </div>
        </section>



        {/* Privacy & Security Section */}
        <section className="py-16 bg-white/50 dark:bg-slate-800/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Privacy e Sicurezza
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                La tua privacy è la nostra priorità
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="text-center">
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Accesso Sicuro
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Autenticazione avanzata con crittografia end-to-end per proteggere i tuoi dati.
                </p>
              </div>

              <div className="text-center">
                <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Trasparenza Totale
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Accesso in sola lettura a Google Drive, nessun dato condiviso con terze parti.
                </p>
              </div>

              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  Conformità GDPR
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Completamente conforme al Regolamento Generale sulla Protezione dei Dati.
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <a
                href="/privacy"
                className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Leggi la nostra Privacy Policy
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

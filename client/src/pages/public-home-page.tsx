import React, { useState } from "react";
import Footer from "../components/footer";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import { useSEO } from "../hooks/use-seo";
import {
  Shield,
  FileText,
  Calendar,
  BarChart3,
  Users,
  CheckCircle,
  ArrowRight,
  Lock,
  Cloud,
  Download,
  Sparkles,
  Monitor,
  Layout,
  SlidersHorizontal,
  FolderKanban,
  Menu,
  X
} from "lucide-react";
import { motion } from "framer-motion";

export default function PublicHomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // SEO configuration per la homepage
  useSEO({
    title: "Pannello di Controllo SGI - Gestione Documentale Aziendale",
    description: "Sistema completo per la gestione documentale aziendale con integrazione Google Drive, backup automatici e sicurezza avanzata. Gestisci i tuoi documenti in modo sicuro e efficiente.",
    canonicalUrl: "https://cruscotto-sgi.com/"
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 24, scale: 0.92 },
    visible: (index = 0) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, delay: index * 0.2 }
    })
  };

  const fadeInRightToLeft = {
    hidden: { opacity: 0, x: 40, scale: 0.96 },
    visible: (index = 0) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.8, delay: index * 0.22 }
    })
  };

  const fadeInAlbum = {
    hidden: { opacity: 0, y: 28, scale: 0.95 },
    visible: (index = 0) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.75, delay: index * 0.18 }
    })
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A]">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/80 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-18 lg:h-20">
            {/* Logo e Titolo - Estrema Sinistra */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <img
                src="/logo/logo sgi.jpg"
                alt="Logo SGI"
                className="h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-cover"
              />
              <span className="hidden md:inline font-bold text-base lg:text-xl 2xl:text-2xl text-white whitespace-nowrap">
                Pannello di Controllo SGI
              </span>
            </div>

            {/* Desktop Navigation - Estrema Destra */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
              <a
                href="#home"
                className="text-slate-300 hover:text-primary transition-colors text-sm lg:text-base whitespace-nowrap"
              >
                Home
              </a>
              <a
                href="#funzionalita"
                className="text-slate-300 hover:text-primary transition-colors text-sm lg:text-base whitespace-nowrap"
              >
                Funzionalita
              </a>
              <a
                href="#documenti"
                className="text-slate-300 hover:text-primary transition-colors text-sm lg:text-base whitespace-nowrap"
              >
                Documenti
              </a>
              <a
                href="#contatti"
                className="text-slate-300 hover:text-primary transition-colors text-sm lg:text-base whitespace-nowrap"
              >
                Contatti
              </a>
            </div>

            {/* Mobile Menu Button - Estrema Destra */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-slate-300 hover:text-primary transition-colors"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800 bg-slate-950">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <a
                  href="#home"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-primary hover:bg-slate-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </a>
                <a
                  href="#funzionalita"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-primary hover:bg-slate-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Funzionalita
                </a>
                <a
                  href="#documenti"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-primary hover:bg-slate-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Documenti
                </a>
                <a
                  href="#contatti"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-primary hover:bg-slate-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contatti
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section id="home" className="py-8 sm:py-12 lg:py-16 xl:py-20 2xl:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-12 2xl:gap-14 mb-10 lg:mb-12 xl:mb-14 items-center">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-white leading-tight mt-4">
                  La tua conformita
                  <span className="block text-primary mt-3 mb-5">semplificata.</span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-slate-300 mt-6 leading-relaxed max-w-2xl">
                  Pannello di controllo per la gestione documentale ISO con revisioni tracciate,
                  scadenze monitorate e collaborazioni sicure. Un flusso unico, moderno e
                  perfettamente aderente agli standard.
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4 mt-8 sm:mt-10">
                  <Link href="/auth">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-base sm:text-lg px-6 sm:px-8 py-3">
                      Inizia Ora
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <a
                    href="#documenti"
                    className="inline-flex items-center text-sm sm:text-base text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    Scopri di piu
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full" />
                <div className="relative bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
                  <div className="bg-gradient-to-br from-slate-900 to-blue-900/40">
                    <img
                      src="/hero-iso.svg"
                      alt="Illustrazione gestione documentale ISO"
                      className="w-full h-full object-cover max-h-[420px] sm:max-h-[520px] lg:max-h-[560px] xl:max-h-[620px] 2xl:max-h-[680px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="funzionalita" className="py-12 sm:py-14 lg:py-16 xl:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4">
                Perche Scegliere Pannello SGI?
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
                Efficienza, sicurezza e aderenza agli standard ISO in un solo flusso.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 xl:gap-8 items-start"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {[
                {
                  icon: <FileText className="h-10 w-10 text-primary mb-4" />,
                  title: "Gestione Documenti Centralizzata",
                  text: "Tieni tutto in ordine con versioning, audit trail e workflow approvativi."
                },
                {
                  icon: <CheckCircle className="h-10 w-10 text-primary mb-4" />,
                  title: "Conformita ISO Semplificata",
                  text: "Riduci gli sforzi di compliance con checklist e controlli automatici."
                },
                {
                  icon: <Users className="h-10 w-10 text-primary mb-4" />,
                  title: "Collaborazione Intuitiva",
                  text: "Condivisione sicura, ruoli avanzati e notifiche intelligenti."
                },
                {
                  icon: <BarChart3 className="h-10 w-10 text-primary mb-4" />,
                  title: "Reportistica Dettagliata",
                  text: "Dashboard chiare per KPI, scadenze e tracciabilita completa."
                }
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  custom={index}
                  variants={fadeInUp}
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className={`bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 xl:p-7 shadow-lg transition-colors hover:border-primary/60 hover:shadow-2xl ${
                    index === 1
                      ? "lg:mt-8 xl:mt-10"
                      : index === 2
                        ? "lg:mt-16 xl:mt-20"
                        : index === 3
                          ? "lg:mt-24 xl:mt-28"
                          : "lg:mt-0"
                  }`}
                >
                  {item.icon}
                  <h3 className="text-base sm:text-lg xl:text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm sm:text-base text-slate-300">{item.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="py-12 sm:py-14 lg:py-16 xl:py-20 bg-slate-950/60 border-y border-slate-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center mb-10 sm:mb-12 lg:mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3">
                Pannello SGI: Funzionalita Avanzate
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
                Scopri le caratteristiche che rendono il controllo documentale piu intelligente.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 xl:gap-8"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {[
                {
                  icon: <Shield className="h-10 w-10 text-primary mb-4" />,
                  title: "Sicurezza dei Dati Avanzata",
                  text: "Crittografia, backup automatici e controllo accessi granulari."
                },
                {
                  icon: <Sparkles className="h-10 w-10 text-primary mb-4" />,
                  title: "Intelligenza Artificiale Integrata",
                  text: "Suggerimenti smart per classificare e trovare documenti in pochi click."
                },
                {
                  icon: <Cloud className="h-10 w-10 text-primary mb-4" />,
                  title: "Scalabilita Aziendale",
                  text: "Gestisci team e repository senza limiti, anche multi-sede."
                },
                {
                  icon: <Calendar className="h-10 w-10 text-primary mb-4" />,
                  title: "Velocita di Caricamento Ottimizzata",
                  text: "Automazioni e template per aggiornamenti rapidi e senza attriti."
                }
              ].map((item, index, items) => (
                <motion.div
                  key={item.title}
                  custom={items.length - 1 - index}
                  variants={fadeInRightToLeft}
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 xl:p-7 shadow-lg transition-colors hover:border-primary/60 hover:shadow-2xl"
                >
                  {item.icon}
                  <h3 className="text-base sm:text-lg xl:text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm sm:text-base text-slate-300">{item.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="documenti" className="py-12 sm:py-14 lg:py-16 xl:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 sm:mb-5">
                Approfondimenti su D.Lgs. 231/01 e il MOG
              </h2>
              <p className="text-base sm:text-lg text-slate-300 mt-2 max-w-2xl mx-auto">
                Un supporto concreto per prevenzione, controllo e responsabilita organizzativa.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] mt-6 sm:mt-8 lg:mt-10 gap-8 xl:gap-10 items-start">
              <motion.div
                className="space-y-6 text-slate-300"
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                {[
                  {
                    title: "Contesto Normativo e D.Lgs. 231/01",
                    text:
                      "Le aziende devono adottare modelli organizzativi efficaci per prevenire reati e tutelare gli amministratori. Pannello SGI aiuta a dimostrare controlli costanti e monitoraggi puntuali."
                  },
                  {
                    title: "Il Modello di Organizzazione e Gestione (MOG)",
                    text:
                      "Struttura e aggiorna le procedure, assegna responsabilita e centralizza la documentazione per mantenere il MOG sempre aggiornato e verificabile."
                  },
                  {
                    title: "La Prova dell'Efficacia del MOG",
                    text:
                      "Tracciabilita, approvazioni e audit trail offrono evidenze solide per verifiche e controlli esterni."
                  },
                  {
                    title: "Meccanismo di Esclusione",
                    text:
                      "Registra le azioni dell’Organismo di Vigilanza e dimostra l’adozione di misure efficaci in caso di contestazioni."
                  }
                ].map((item) => (
                  <motion.div key={item.title} variants={fadeInUp}>
                    <h3 className="text-base sm:text-lg xl:text-xl font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-sm sm:text-base leading-relaxed">{item.text}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 xl:p-7 shadow-lg"
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                <div className="flex items-center justify-center h-32 sm:h-36 lg:h-40 rounded-xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-slate-800 mb-6">
                  <FileText className="h-12 w-12 sm:h-14 sm:w-14 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg xl:text-xl font-semibold text-white mb-2">
                  Scarica il PDF Completo
                </h3>
                <p className="text-sm sm:text-base text-slate-300 mb-6">
                  Documento ufficiale con linee guida, esempi e best practice per il MOG.
                </p>
                <a
                  href="/downloads/3.0_MOG%20FACCIAMO%20CHIAREZZA_Rev.0_2025-07-04.pdf"
                  download="3.0_MOG FACCIAMO CHIAREZZA_Rev.0_2025-07-04.pdf"
                  className="inline-flex items-center justify-center w-full rounded-lg bg-primary hover:bg-primary/90 text-white font-medium py-2.5 text-sm sm:text-base transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Scarica il PDF Completo
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-14 lg:py-16 xl:py-20 bg-slate-950/60 border-y border-slate-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3">
                Vedi Pannello SGI in Azione
              </h2>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
                Anteprime delle principali schermate operative del pannello.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 sm:gap-6 xl:gap-8"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {[
                {
                  title: "Dashboard intuitiva",
                  imageSrc: "/img/Screenshot 2026-01-21 alle 23.59.38.png",
                  icon: <Monitor className="h-10 w-10 text-primary" />
                },
                {
                  title: "Editor collaborativo",
                  imageSrc: "/img/Screenshot 2026-01-22 alle 00.11.05.png",
                  icon: <Layout className="h-10 w-10 text-primary" />
                },
                {
                  title: "Workflow approvazioni",
                  imageSrc: "/img/Screenshot 2026-01-22 alle 00.12.59.png",
                  icon: <FolderKanban className="h-10 w-10 text-primary" />
                },
                {
                  title: "Reportistica avanzata",
                  imageSrc: "/img/Screenshot 2026-01-22 alle 00.01.07.png",
                  icon: <BarChart3 className="h-10 w-10 text-primary" />
                },
                {
                  title: "Configurazioni flessibili",
                  imageSrc: "/img/Screenshot 2026-01-22 alle 00.00.19.png",
                  icon: <SlidersHorizontal className="h-10 w-10 text-primary" />
                },
                {
                  title: "Controlli granulari",
                  imageSrc: "/img/Screenshot 2026-01-21 alle 23.53.37.png",
                  icon: <Lock className="h-10 w-10 text-primary" />
                }
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  custom={index}
                  variants={fadeInAlbum}
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="group bg-slate-900/70 border border-slate-800 rounded-2xl shadow-lg transition-colors hover:border-primary/60 hover:shadow-2xl"
                >
                  <div className="p-4 sm:p-5 xl:p-6">
                    <div className="relative h-40 sm:h-44 lg:h-48 xl:h-52 2xl:h-56 mb-4">
                      <div className="absolute inset-0 rounded-xl bg-slate-800/70 rotate-2 translate-x-1 translate-y-1 transition-transform duration-300 group-hover:rotate-3" />
                      <div className="absolute inset-0 rounded-xl bg-slate-800/60 -rotate-2 -translate-x-1 translate-y-0.5 transition-transform duration-300 group-hover:-rotate-3" />
                      <div className="relative h-full rounded-xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900/50 flex items-center justify-center">
                        {item.imageSrc ? (
                          <img
                            src={item.imageSrc}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          item.icon
                        )}
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-slate-200 font-medium">{item.title}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="contatti" className="py-12 sm:py-14 lg:py-16 xl:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <motion.div
              className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 xl:p-12 text-center shadow-2xl"
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3">
                Pronto a trasformare la tua gestione documentale?
              </h2>
              <p className="text-base sm:text-lg text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
                Unisciti alle aziende che hanno scelto Pannello SGI per l'eccellenza operativa.
              </p>
              <Link href="/auth?tab=register">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-base sm:text-lg px-6 sm:px-8 py-3">
                  Registrati Ora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import {
  FileText,
  Facebook,
  Instagram,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t mt-auto">
      <div className="container py-6 xs:py-8 sm:py-10 md:py-12 px-3 xs:px-4 sm:px-6 md:px-8 mx-auto">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Company Info */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2">
              <img
                src="/logo/logo sgi.jpg"
                alt="Logo SGI"
                className="h-8 w-8 sm:h-10 sm:w-10 object-cover"
                width="40"
                height="40"
              />
              <span className="font-bold text-base sm:text-lg md:text-xl">
                Pannello SGI
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              Soluzione completa per la gestione dei documenti ISO, con
              controllo delle revisioni, tracciamento delle scadenze e
              monitoraggio della conformità.
            </p>
            <div className="flex space-x-3 sm:space-x-4">
              <a
                href="https://www.facebook.com/?locale=it_IT"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-primary h-4 w-4"
                  asChild
                >
                  <Facebook className="h-3 w-3" />
                </Button>
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-primary h-4 w-4"
                  asChild
                >
                  <Instagram className="h-3 w-3" />
                </Button>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-base sm:text-lg">
              Collegamenti Rapidi
            </h3>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a
                  href="/"
                  className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors text-xs sm:text-sm"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/settings"
                  className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors text-xs sm:text-sm"
                >
                  Impostazioni
                </a>
              </li>
              <li>
                <a
                  href="/obsolete"
                  className="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors text-xs sm:text-sm"
                >
                  Documenti Obsoleti
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3 sm:space-y-4 xs:col-span-2 md:col-span-1">
            <h3 className="font-semibold text-base sm:text-lg">Contatti</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start space-x-2 sm:space-x-3 text-xs sm:text-sm">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-400">
                  60044 Fabriano (AN), Italia
                </span>
              </li>
              <li className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">
                  +39 3351375593 / +39 3791341270
                </span>
              </li>
              <li className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">
                  isodocs178@gmail.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-4 sm:my-6 md:my-8" />

        <div className="flex flex-col xs:flex-row justify-between items-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <p>© {currentYear} Pannello SGI. Tutti i diritti riservati.</p>
          <div className="flex space-x-4 sm:space-x-6 mt-3 xs:mt-0">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Cookie
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

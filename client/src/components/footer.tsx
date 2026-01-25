import {
  FileText,
  Facebook,
  Instagram,
  MapPin,
  Phone,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  // Mutation per eliminare tutti i documenti
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/documents/delete-all");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Documenti eliminati",
        description: data.message || `Eliminati ${data.deleted} documenti con successo.`,
      });
      // Invalida tutte le query relative ai documenti per aggiornare le tabelle
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/obsolete"] });
      setShowDeleteAllDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore eliminazione",
        description: error.message || "Impossibile eliminare i documenti.",
        variant: "destructive",
      });
      setShowDeleteAllDialog(false);
    },
  });

  const handleDeleteAllClick = () => {
    setShowDeleteAllDialog(true);
  };

  const confirmDeleteAll = () => {
    deleteAllMutation.mutate();
  };

  const cancelDeleteAll = () => {
    setShowDeleteAllDialog(false);
  };

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t mt-auto">
      <div className="py-6 xs:py-8 sm:py-10 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 2xl:gap-16">
          {/* Company Info */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center">
              <img
                src="/logo/logo sgi.jpg"
                alt="Logo SGI"
                className="h-8 w-8 sm:h-10 sm:w-10 object-cover mr-2"
                width="40"
                height="40"
              />
              <span className="font-bold text-base sm:text-lg md:text-xl">
                Pannello di Controllo SGI
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              Soluzione completa per la gestione dei documenti ISO, con
              controllo delle revisioni, tracciamento delle scadenze e
              monitoraggio della conformità.
            </p>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <a
                href="https://www.facebook.com/?locale=it_IT"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-primary h-8 w-8 p-0"
                  asChild
                >
                  <span className="inline-flex items-center justify-center">
                    <Facebook className="h-4 w-4" />
                  </span>
                </Button>
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-primary h-8 w-8 p-0"
                  asChild
                >
                  <span className="inline-flex items-center justify-center">
                    <Instagram className="h-4 w-4" />
                  </span>
                </Button>
              </a>
              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteAllClick}
                  aria-label="Elimina tutti i documenti"
                  className="hover:text-destructive h-8 w-8 p-0 inline-flex items-center justify-center"
                  title="Elimina tutti i documenti"
                  disabled={deleteAllMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-black dark:text-white" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 sm:space-y-4 lg:ml-24 xl:ml-28 2xl:ml-32">
            <h3 className="font-semibold text-base sm:text-lg">
              Collegamenti Rapidi
            </h3>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a
                  href="/dashboard"
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
                info@pannellodicontrollosgi.com
                </span>
              </li>
               </ul>
          </div>
        </div>

        <Separator className="my-4 sm:my-6 md:my-8" />

        <div className="flex flex-col xs:flex-row justify-between items-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <p>© {currentYear} Pannello di Controllo SGI. Tutti i diritti riservati.</p>
          <div className="flex space-x-4 sm:space-x-6 mt-3 xs:mt-0">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="/cookie" className="hover:text-primary transition-colors">
              Cookie
            </a>
          </div>
        </div>
      </div>

      {/* Alert Dialog per conferma eliminazione tutti i documenti */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Conferma eliminazione totale
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <span className="font-semibold text-destructive text-base block mb-2">
                Attenzione! Questa azione è irreversibile.
              </span>
              Sei sicuro di voler eliminare <strong>TUTTI</strong> i documenti presenti?
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Questa operazione eliminerà permanentemente tutti i documenti della Tabella ,
                 per recuperarli cliccare il bottone blu "Sincronizza Google Drive".
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteAll}>
              No, annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              disabled={deleteAllMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAllMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Eliminazione...
                </>
              ) : (
                "Sì, elimina tutto"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </footer>
  );
}

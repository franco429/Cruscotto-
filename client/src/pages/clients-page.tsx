import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ClientDocument as Client } from "../../../shared-types/client";
import { useToast } from "../hooks/use-toast";
import HeaderBar from "../components/header-bar";
import Footer from "../components/footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  FolderOpen, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings,
  Cloud,
  Loader2,
  Link2,
  Check
} from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<{id: string, name: string} | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);

  const {
    data: clients,
    isLoading,
    isError,
    refetch: refetchClients,
  } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Trova il client dell'utente corrente
  const currentClient = clients && clients.length > 0 ? clients[0] : null;
  const hasGoogleDriveFolder = currentClient?.driveFolderId;

  // Mutation per aggiornare il folder ID del client
  const updateClientFolderMutation = useMutation({
    mutationFn: async ({ folderId, folderName }: { folderId: string; folderName: string }) => {
      const res = await apiRequest("PUT", `/api/clients/${currentClient?.legacyId}/folder`, {
        driveFolderId: folderId,
        folderName: folderName,
      });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cartella configurata",
        description: `Cartella "${variables.folderName}" configurata con successo`,
      });
      
      // Avvia automaticamente la sincronizzazione
      startAutomaticSync();
    },
    onError: (error: Error) => {
      toast({
        title: "Errore configurazione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per la sincronizzazione manuale
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync", {
        userId: user?.legacyId
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronizzazione completata",
        description: "I documenti sono stati sincronizzati con successo",
      });
      setTimeout(() => {
        setLocation("/home-page?fromSync=true");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore sincronizzazione",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSyncing(false);
    }
  });

  // Funzione per estrarre il Folder ID da un URL Google Drive
  const extractFolderIdFromUrl = (url: string): { folderId: string | null; folderName: string } => {
    // Pulisci l'URL
    const cleanUrl = url.trim();
    
    // Pattern per URL Google Drive:
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
    // https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const patterns = [
      /folders\/([a-zA-Z0-9_-]+)/,  // Standard folder URL
      /^([a-zA-Z0-9_-]{25,})$/,      // Just the ID itself
    ];
    
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        return {
          folderId: match[1],
          folderName: "Cartella da URL" // Nome generico, non possiamo recuperarlo dall'URL
        };
      }
    }
    
    return { folderId: null, folderName: "" };
  };

  // Gestisci l'input manuale dell'URL
  const handleManualUrlSubmit = async () => {
    if (!manualUrl.trim()) {
      toast({
        title: "URL mancante",
        description: "Inserisci l'URL della cartella Google Drive",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingUrl(true);
    
    const { folderId, folderName } = extractFolderIdFromUrl(manualUrl);
    
    if (!folderId) {
      setIsValidatingUrl(false);
      toast({
        title: "URL non valido",
        description: "L'URL inserito non sembra essere una cartella Google Drive valida. Assicurati di copiare l'URL completo dalla barra degli indirizzi.",
        variant: "destructive",
      });
      return;
    }

    // Validazione formato Folder ID (28-44 caratteri alfanumerici, underscore e trattini)
    if (folderId.length < 20 || folderId.length > 50) {
      setIsValidatingUrl(false);
      toast({
        title: "ID cartella non valido",
        description: "L'ID della cartella estratto non ha un formato valido",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "URL valido!",
      description: `Folder ID estratto: ${folderId.substring(0, 10)}...`,
    });

    // Usa la stessa funzione del picker per salvare
    handleFolderSelected(folderId, folderName);
    
    // Pulisci l'input
    setManualUrl("");
    setIsValidatingUrl(false);
  };

  const handleFolderSelected = (folderId: string, folderName: string) => {
    setSelectedFolder({ id: folderId, name: folderName });
    
    if (currentClient) {
      updateClientFolderMutation.mutate({ folderId, folderName });
    } else {
      toast({
        title: "Errore",
        description: "Client non trovato",
        variant: "destructive",
      });
    }
  };

  // Funzione per avviare l'autorizzazione OAuth Google Drive
  const handleGoogleDriveAuth = async (clientId: number) => {
    try {
      const res = await apiRequest("GET", `/api/google/auth-url/${clientId}`);
      const data = await res.json();
      
      const popup = window.open(
        data.url,
        "google-auth",
        "width=500,height=600,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        toast({
          title: "Errore Apertura Popup",
          description: "Impossibile aprire la finestra di autorizzazione. Controlla se il browser la sta bloccando.",
          variant: "destructive",
        });
        return;
      }

      // Polling per verificare quando il popup viene chiuso
      const timer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            
            toast({
              title: "Autorizzazione completata!",
              description: "Google Drive connesso con successo. Ora puoi sincronizzare i documenti.",
            });

            // Ricarica i dati del client
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
          }
        } catch (error) {
          // Ignora errori di accesso cross-origin
        }
      }, 1000);

      // Timeout di sicurezza dopo 5 minuti
      setTimeout(() => {
        clearInterval(timer);
        try {
          if (!popup.closed) {
            popup.close();
          }
        } catch (error) {
          // Ignora errori
        }
      }, 300000);

    } catch (error) {
      console.error("Errore autorizzazione Google Drive:", error);
      toast({
        title: "Errore Autorizzazione",
        description: "Impossibile avviare l'autorizzazione Google Drive",
        variant: "destructive",
      });
    }
  };

  const startAutomaticSync = async () => {
    // Controlla se abbiamo tutti i requisiti per la sincronizzazione
    if (!currentClient?.driveFolderId) {
      toast({
        title: "Configurazione incompleta",
        description: "Seleziona prima una cartella da Google Drive",
        variant: "destructive",
      });
      return;
    }

    // Se non abbiamo i token OAuth, avvisa che è necessaria l'autorizzazione
    if (!currentClient.google?.refreshToken) {
      toast({
        title: "Autorizzazione necessaria",
        description: "Clicca su 'Seleziona Cartella' per completare l'autorizzazione",
        variant: "destructive",
      });
      return;
    }

    // Se abbiamo tutto, avvia la sincronizzazione
    setIsSyncing(true);
    
    toast({
      title: "Avvio sincronizzazione",
      description: "Sincronizzazione dei documenti in corso...",
    });

    // Attendi un momento per permettere al backend di processare la configurazione
    setTimeout(() => {
      syncMutation.mutate();
    }, 1500);
  };

  const handleManualSync = () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    syncMutation.mutate();
  };

  const getConnectionStatus = () => {
    if (!currentClient) return { status: 'no-client', text: 'Nessun client configurato', variant: 'destructive' as const };
    if (!hasGoogleDriveFolder) return { status: 'no-folder', text: 'Cartella non configurata', variant: 'secondary' as const };
    
    // Controlla se ha anche i token OAuth (necessari per sincronizzazione)
    const hasOAuthTokens = currentClient.google?.refreshToken;
    if (!hasOAuthTokens) return { status: 'needs-auth', text: 'Richiesta autorizzazione', variant: 'secondary' as const };
    
    return { status: 'connected', text: 'Completamente connesso', variant: 'default' as const };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar user={user} />

      <main className="flex-1 container mx-auto py-8 px-4 max-w-4xl">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Configurazione Google Drive
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Collega la tua cartella Google Drive per sincronizzare automaticamente i tuoi documenti
            </p>
          </div>

          {/* Status Card */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Cloud className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Stato Connessione</CardTitle>
                    <CardDescription>
                      Stato attuale della connessione Google Drive
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={connectionStatus.variant} className="px-3 py-1">
                  {connectionStatus.text}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Caricamento...</span>
                </div>
              ) : isError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
                  <p className="text-destructive font-medium">Errore nel caricamento dei dati</p>
                  <Button 
                    variant="outline" 
                    className="mt-3"
                    onClick={() => refetchClients()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Riprova
                  </Button>
                </div>
              ) : !currentClient ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Nessun client configurato</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contatta il supporto per configurare il tuo account
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Client Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Azienda</p>
                      <p className="font-semibold">{currentClient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Data creazione</p>
                      <p className="font-semibold">
                        {format(new Date(currentClient.createdAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>

                  {/* Google Drive Folder Info */}
                  {hasGoogleDriveFolder ? (
                    <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-green-800">Cartella Configurata</h3>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-green-700">ID Cartella</p>
                          <p className="text-sm bg-green-100 p-2 rounded font-mono break-all text-gray-900">
                            {currentClient.driveFolderId}
                          </p>
                        </div>
                        {selectedFolder && (
                          <div>
                            <p className="text-sm font-medium text-green-700">Nome Cartella</p>
                            <p className="text-sm text-green-800 font-medium">{selectedFolder.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <h3 className="font-semibold text-yellow-800">Cartella Non Configurata</h3>
                      </div>
                      <p className="text-sm text-yellow-700 mb-4">
                        Per iniziare a sincronizzare i tuoi documenti, seleziona una cartella dal tuo Google Drive.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Card */}
          {currentClient && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl">Azioni Rapide</CardTitle>
                <CardDescription>
                  Gestisci la connessione e la sincronizzazione dei documenti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Folder Selection - Manual URL Input */}
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                          <Link2 className="h-5 w-5" />
                          Configura la Cartella Google Drive
                        </h4>
                        <p className="text-sm text-blue-800">
                          Metodo semplice e affidabile per collegare la tua cartella Google Drive.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-blue-800 pl-7">
                      <p className="font-medium">Come ottenere l'URL:</p>
                      <ol className="list-decimal list-inside space-y-1 pl-2">
                        <li>Apri <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-900">Google Drive</a> in una nuova scheda</li>
                        <li>Vai alla cartella che vuoi sincronizzare</li>
                        <li>Copia l'URL dalla barra degli indirizzi del browser</li>
                        <li>Incolla l'URL qui sotto e clicca Conferma</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="folder-url" className="text-base font-semibold">
                      URL Cartella Google Drive
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="folder-url"
                        type="text"
                        placeholder="https://drive.google.com/drive/folders/..."
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isValidatingUrl && !updateClientFolderMutation.isPending) {
                            handleManualUrlSubmit();
                          }
                        }}
                        disabled={isValidatingUrl || updateClientFolderMutation.isPending}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleManualUrlSubmit}
                        disabled={isValidatingUrl || updateClientFolderMutation.isPending || !manualUrl.trim()}
                        className="px-6"
                      >
                        {isValidatingUrl || updateClientFolderMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifica...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Conferma
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Esempio: https://drive.google.com/drive/folders/1ABC...XYZ
                    </p>
                  </div>

                  {/* Autorizzazione OAuth necessaria */}
                  {hasGoogleDriveFolder && connectionStatus.status === 'needs-auth' && (
                    <div className="pt-3 border-t border-yellow-200 bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900">Autorizzazione Richiesta</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Per sincronizzare i documenti, devi autorizzare l'accesso al tuo Google Drive
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleGoogleDriveAuth(currentClient.legacyId)}
                        variant="outline"
                        className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                      >
                        <Cloud className="h-4 w-4 mr-2" />
                        Autorizza Google Drive
                      </Button>
                    </div>
                  )}
                </div>

                {/* Manual Sync Section */}
                <div className="pt-4 border-t space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sincronizzazione Manuale
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Forza la sincronizzazione dei documenti dalla cartella configurata
                  </p>
                  <Button
                    onClick={handleManualSync}
                    disabled={!hasGoogleDriveFolder || isSyncing || connectionStatus.status !== 'connected'}
                    variant="outline"
                    className="w-full"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sincronizzazione...
                      </>
                    ) : connectionStatus.status !== 'connected' ? (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {connectionStatus.status === 'needs-auth' ? 'Autorizzazione necessaria' : 'Configura prima'}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sincronizza Ora
                      </>
                    )}
                  </Button>
                </div>

                {/* Navigate to Documents */}
                {connectionStatus.status === 'connected' && (
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => setLocation("/home-page")}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Vai ai Documenti
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Card */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Come Funziona</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex flex-col items-center text-center space-y-2 p-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">1</div>
                  <h4 className="font-semibold">Copia URL Cartella</h4>
                  <p className="text-muted-foreground">
                    Vai su Google Drive, apri la cartella desiderata e copia l'URL dalla barra degli indirizzi
                  </p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">2</div>
                  <h4 className="font-semibold">Incolla e Conferma</h4>
                  <p className="text-muted-foreground">
                    Incolla l'URL nel campo "Incolla URL" e clicca su Conferma per configurare la cartella
                  </p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">3</div>
                  <h4 className="font-semibold">Autorizza e Sincronizza</h4>
                  <p className="text-muted-foreground">
                    Autorizza l'accesso a Google Drive e avvia la sincronizzazione dei documenti
                  </p>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 p-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">4</div>
                  <h4 className="font-semibold">Gestisci</h4>
                  <p className="text-muted-foreground">
                    Accedi alla dashboard per visualizzare e gestire tutti i tuoi documenti
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Plus, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import { format } from "date-fns";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import * as React from "react";

// Schema per la gestione del client
const clientSchema = z.object({
  name: z.string().min(1, "Il nome del cliente è obbligatorio"),
  driveFolderId: z
    .string()
    .min(1, "L'ID della cartella Google Drive è obbligatorio"),
});

type ClientFormValues = z.infer<typeof clientSchema>;

// Funzione per estrarre l'ID della cartella da un URL di Google Drive
function extractFolderIdFromUrl(url: string): string | null {
  // Pattern per gli URL di Google Drive
  const patterns = [
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:\?[^\s]*)?/,
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?my-drive\/([a-zA-Z0-9_-]+)(?:\?[^\s]*)?/,
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(?:&[^\s]*)?/,
  ];

  // Prova tutti i pattern e restituisci il primo match
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Se è già un ID senza URL, restituisci l'input originale
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return null;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    data: clients,
    isLoading,
    isError,
  } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Form per la modifica di un client
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      driveFolderId: "",
    },
  });

  // Gestisce l'apertura del form di modifica
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      driveFolderId: client.driveFolderId,
    });
    setEditDialogOpen(true);
  };

  // Chiude il form e resetta i valori
  const handleCloseForm = () => {
    setEditDialogOpen(false);
    setEditingClient(null);
    form.reset({
      name: "",
      driveFolderId: "",
    });
  };

  // Mutation per aggiornare un client esistente
  const updateMutation = useMutation({
    mutationFn: async ({
      legacyId,
      data,
    }: {
      legacyId: number;
      data: ClientFormValues;
    }) => {
      const res = await apiRequest("PUT", `/api/clients/${legacyId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client aggiornato",
        description: "Il client è stato aggiornato con successo.",
      });
      handleCloseForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Aggiornamento fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Gestisce l'invio del form (solo aggiornamento)
  const onSubmit = (values: ClientFormValues) => {
    if (!editingClient) {
      toast({
        title: "Errore",
        description: "Nessun client selezionato per la modifica.",
        variant: "destructive",
      });
      return;
    }

    // Estrai l'ID della cartella se è stato inserito un URL
    const extractedId = extractFolderIdFromUrl(values.driveFolderId);

    if (!extractedId) {
      toast({
        title: "URL non valido",
        description: "L'URL o l'ID della cartella Google Drive non è valido.",
        variant: "destructive",
      });
      return;
    }

    // Aggiorna il valore nel form con l'ID estratto
    const dataToSubmit = {
      ...values,
      driveFolderId: extractedId,
    };

    updateMutation.mutate({ legacyId: editingClient.legacyId, data: dataToSubmit });
  };

  const connectGoogleDrive = async (clientId: number) => {
    setIsConnecting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_GOOGLE_URL;
      if (!baseUrl) {
        toast({
          title: "Errore",
          description: "Variabile d'ambiente VITE_API_GOOGLE_URL non configurata",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }
      const res = await fetch(`${baseUrl}/api/google/auth-url/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      window.open(data.url, "_blank");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile connettersi a Google Drive",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "GOOGLE_DRIVE_CONNECTED") {
        // Mostra messaggio di sincronizzazione in corso
        toast({
          title: "Connessione completata",
          description: "Connessione Google Drive completata! Sincronizzazione in corso...",
        });
        
        // Avvia polling per verificare quando la sync è completata
        startSyncPolling();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Funzione per polling dello stato della sincronizzazione
  const startSyncPolling = () => {
    let attempts = 0;
    const maxAttempts = 60; // Massimo 5 minuti (60 * 5 secondi)
    
    const checkSyncStatus = async () => {
      try {
        // Verifica lo stato della sincronizzazione
        const response = await apiRequest("GET", "/api/sync/status");
        
        if (response.ok) {
          const syncStatus = await response.json();
          
          // Se ci sono documenti, la sync è probabilmente completata
          if (syncStatus.hasDocuments && syncStatus.documentCount > 0) {
            toast({
              title: "Sincronizzazione completata",
              description: `${syncStatus.documentCount} documenti sincronizzati con successo!`,
            });
            
            // Reindirizza alla home page con parametro per indicare la provenienza
            setTimeout(() => {
              window.location.href = "/?fromDrive=true";
            }, 1000);
            return;
          }
        }
        
        // Se non ci sono ancora documenti, continua il polling
        attempts++;
        if (attempts < maxAttempts) {
          // Aggiorna il messaggio di toast con il progresso
          toast({
            title: "Sincronizzazione in corso",
            description: `Attendere... Tentativo ${attempts}/${maxAttempts}`,
          });
          
          // Riprova tra 5 secondi
          setTimeout(checkSyncStatus, 5000);
        } else {
          // Timeout raggiunto, reindirizza comunque
          toast({
            title: "Sincronizzazione in corso",
            description: "Reindirizzamento alla home page. I documenti appariranno presto.",
          });
          
          setTimeout(() => {
            window.location.href = "/?fromDrive=true";
          }, 1000);
        }
      } catch (error) {
        console.error("Errore durante il polling della sincronizzazione:", error);
        
        // In caso di errore, reindirizza dopo un breve delay
        setTimeout(() => {
          window.location.href = "/?fromDrive=true";
        }, 2000);
      }
    };
    
    // Avvia il polling dopo 2 secondi per dare tempo alla sync di iniziare
    setTimeout(checkSyncStatus, 2000);
  };

  // Formatta la data
  const formatDate = (dateString: string | Date) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar user={user} />

      <main className="flex-1 container mx-auto py-8 px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Gestione Cartella Google Drive
            </h1>
            <p className="text-muted-foreground mt-2">
              Modifica i dettagli della tua cartella Google Drive associata
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>La tua Cartella Google Drive</CardTitle>
            <CardDescription>
              Dettagli della cartella Google Drive associata al tuo account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                <p className="mt-2 text-muted-foreground">
                  Caricamento cartella Google Drive...
                </p>
              </div>
            ) : isError ? (
              <div className="py-10 text-center">
                <p className="text-destructive">
                  Si è verificato un errore durante il caricamento della
                  cartella
                </p>
              </div>
            ) : !clients || clients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">
                  Nessuna cartella Google Drive associata al tuo account
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Cartella</TableHead>
                    <TableHead>ID Cartella Google Drive</TableHead>
                    <TableHead>Data Creazione</TableHead>
                    <TableHead>Ultima Modifica</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.legacyId}>
                      <TableCell className="font-medium">
                        {client.name}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs overflow-hidden text-ellipsis">
                          {client.driveFolderId}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(client.createdAt)}</TableCell>
                      <TableCell>{formatDate(client.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          onClick={() => connectGoogleDrive(client.legacyId)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2"></div>
                              Connessione...
                            </>
                          ) : (
                            "Collega Drive"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Modifica Cartella Google Drive
              </DialogTitle>
              <DialogDescription>
                Modifica i dettagli della tua cartella Google Drive associata.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nome della Cartella Google Drive
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Inserisci il nome della tua cartella Google Drive"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driveFolderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID o URL della Cartella Google Drive</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Incolla l'URL o l'ID della cartella di Google Drive"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Puoi incollare l'intero URL della cartella di Google
                        Drive.
                        <br />
                        Esempio URL:
                        https://drive.google.com/drive/folders/ABCDEF123456
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseForm}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Salvataggio..." : "Aggiorna"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}

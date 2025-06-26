// --- START OF FILE company-codes-page.tsx ---

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { Plus, Trash2, Edit, Check, X, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import HeaderBar from "@/components/header-bar";
import Footer from "@/components/footer";
import { useAuth } from "../hooks/use-auth";

// Tipo di dato che riceviamo dall'API
type CompanyCode = {
  id: number;
  code: string;
  role: string;
  usageLimit: number;
  usageCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

// Schema Zod per la validazione del form
const companyCodeSchema = z.object({
  code: z.string().min(4, "Il codice deve contenere almeno 4 caratteri"),
  role: z.string(),
  usageLimit: z.coerce.number().int().min(1, "Il limite di utilizzo deve essere almeno 1"),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type CompanyCodeFormValues = z.infer<typeof companyCodeSchema>;

const CODES_PER_PAGE = 10;

export default function CompanyCodesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCode, setEditingCode] = useState<CompanyCode | null>(null);

  // Query aggiornata per la paginazione
  const companiesQuery = useQuery({
    queryKey: ["/api/company-codes", currentPage],
    queryFn: () =>
      apiRequest("GET", `/api/company-codes?page=${currentPage}&limit=${CODES_PER_PAGE}`)
        .then(res => res.json()) as Promise<{ data: CompanyCode[]; total: number }>,
    placeholderData: { data: [], total: 0 }
  });
  
  const { data: { data: companyCodes = [], total: totalCodes = 0 } = {} } = companiesQuery;
  const totalPages = Math.ceil(totalCodes / CODES_PER_PAGE);
  const isLoading = companiesQuery.isLoading;

  // Mutation per la generazione in blocco
  const bulkCreateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/company-codes/bulk-generate"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/company-codes"] });
      setCurrentPage(1);
      toast({
        title: "Operazione completata",
        description: "30 nuovi codici aziendali sono stati generati con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di generazione",
        description: `Non è stato possibile generare i codici: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per l'aggiornamento
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CompanyCodeFormValues> }) =>
      apiRequest("PATCH", `/api/company-codes/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-codes", currentPage] });
      toast({ title: "Codice aggiornato", description: "Il codice aziendale è stato aggiornato con successo." });
      setEditingCode(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di aggiornamento",
        description: `Non è stato possibile aggiornare il codice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation per l'eliminazione
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/company-codes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-codes", currentPage] });
      toast({ title: "Codice eliminato", description: "Il codice aziendale è stato eliminato con successo." });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di eliminazione",
        description: `Non è stato possibile eliminare il codice: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Setup del form
  const form = useForm<CompanyCodeFormValues>({
    resolver: zodResolver(companyCodeSchema),
    defaultValues: {
      code: "",
      role: "viewer",
      usageLimit: 1,
      expiresAt: null,
      isActive: true,
    },
  });
  
  // Funzione per popolare il form quando si apre il modale di modifica
  const handleEditCode = (code: CompanyCode) => {
    setEditingCode(code);
    form.reset({
      code: code.code,
      role: code.role,
      usageLimit: code.usageLimit,
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().split("T")[0] : null,
      isActive: code.isActive,
    });
  };
  
  // Gestione invio form (solo per modifica)
  const onSubmit = (values: CompanyCodeFormValues) => {
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: values });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  // Funzione per renderizzare il modale di modifica
  const renderEditDialog = () => (
    <Dialog open={!!editingCode} onOpenChange={open => !open && setEditingCode(null)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifica codice aziendale</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice aziendale</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo associato</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="usageLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite utilizzi</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data di scadenza (opzionale)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5"><FormLabel>Attivo</FormLabel></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingCode(null)}>Annulla</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvataggio..." : "Aggiorna codice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <HeaderBar user={user} />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestione Codici Aziendali</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Genera, gestisci e monitora i codici di registrazione.
              </p>
            </div>
            <Button onClick={() => bulkCreateMutation.mutate()} disabled={bulkCreateMutation.isPending} className="w-full md:w-auto">
              {bulkCreateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Genera 30 codici
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Elenco Codici</CardTitle>
              <CardDescription>
                {totalCodes > 0
                  ? `Mostrando pagina ${currentPage} di ${totalPages} (${totalCodes} codici totali).`
                  : "Nessun codice aziendale presente nel sistema."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: CODES_PER_PAGE / 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : companyCodes.length === 0 ? (
                <div className="text-center py-16">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nessun codice da mostrare</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Inizia generando un nuovo set di codici.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => bulkCreateMutation.mutate()}
                    disabled={bulkCreateMutation.isPending}
                  >
                     {bulkCreateMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Plus className="mr-2 h-4 w-4" />)}
                     Genera i primi codici
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codice</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Utilizzi</TableHead>
                        <TableHead>Scadenza</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="hidden md:table-cell">Creato il</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {companyCodes.map((code: CompanyCode) => (
                            <TableRow key={code.id}>
                                <TableCell className="font-medium">{code.code}</TableCell>
                                <TableCell>
                                  <Badge variant={code.role === 'superadmin' ? 'default' : 'secondary'}>{code.role.charAt(0).toUpperCase() + code.role.slice(1)}</Badge>
                                </TableCell>
                                <TableCell>{code.usageCount} / {code.usageLimit}</TableCell>
                                <TableCell>{formatDate(code.expiresAt)}</TableCell>
                                <TableCell>
                                  {code.isActive ? (
                                    <Badge variant="outline" className="border-green-600 text-green-700"><Check className="h-3 w-3 mr-1" />Attivo</Badge>
                                  ) : (
                                    <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Disattivato</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{formatDate(code.createdAt)}</TableCell>
                                <TableCell className="text-right space-x-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditCode(code)}><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(code.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {totalPages > 1 && (
              <CardFooter className="flex items-center justify-between border-t px-6 py-4">
                <div className="text-xs text-muted-foreground">
                  Pagina {currentPage} di {totalPages}
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                   <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                   <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />Precedente</Button>
                   <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Successivo<ChevronRight className="h-4 w-4 ml-1 sm:ml-2" /></Button>
                   <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </main>

      <Footer />
      {renderEditDialog()}
    </div>
  );
}
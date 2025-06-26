import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserDocument as User } from "../../../shared-types/schema";
import { useToast } from "../hooks/use-toast";
import HeaderBar from "../components/header-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Loader2,
  Users,
  ShieldAlert,
  Shield,
  Plus,
  UserPlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
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


const passwordRequirements = [
  {
    label: "Minimo 8 caratteri",
    test: (v: string) => v.length >= 8,
  },
  {
    label: "Almeno 1 lettera maiuscola",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    label: "Almeno 1 lettera minuscola",
    test: (v: string) => /[a-z]/.test(v),
  },
  {
    label: "Almeno 1 numero",
    test: (v: string) => /[0-9]/.test(v),
  },
  {
    label: "Almeno 1 carattere speciale (@$!%?&)",
    test: (v: string) => /[@$!%?&]/.test(v),
  },
];

const newUserSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z
    .string()
    .min(8, "La password deve contenere almeno 8 caratteri")
    .regex(/[A-Z]/, "Deve contenere almeno una lettera maiuscola")
    .regex(/[a-z]/, "Deve contenere almeno una lettera minuscola")
    .regex(/[0-9]/, "Deve contenere almeno un numero")
    .regex(/[@$!%?&]/, "Deve contenere almeno un carattere speciale (@$!%?&)")
    ,
  role: z.enum(["admin", "viewer"], {
    required_error: "Seleziona un ruolo",
  }),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;


interface PaginatedUsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;


  const { data: paginatedData, isLoading } = useQuery<PaginatedUsersResponse>({
    queryKey: ["/api/users", currentPage],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users?page=${currentPage}&limit=${usersPerPage}`);
      return await res.json();
    },
  });

  const users = paginatedData?.users || [];
  const totalUsers = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 0;

 
  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "viewer",
    },
  });

  // Mutation per aggiornare il ruolo di un utente
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      legacyId,
      role,
    }: {
      legacyId: number;
      role: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/users/${legacyId}/role`, {
        role,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Ruolo aggiornato",
        description: "Il ruolo dell'utente è stato aggiornato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Aggiornamento fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  
  const deleteUserMutation = useMutation({
    mutationFn: async (legacyId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${legacyId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Utente eliminato",
        description: "L'utente è stato eliminato con successo.",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Eliminazione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation per creare un nuovo utente
  const createUserMutation = useMutation({
    mutationFn: async (data: NewUserFormValues) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Utente creato",
        description: "Il nuovo utente è stato creato con successo.",
      });
      form.reset();
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Creazione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

 
  const handleRoleChange = (legacyId: number, role: string) => {
    updateRoleMutation.mutate({ legacyId, role });
  };

  
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

 
  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.legacyId);
    }
  };

  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  
  const onSubmit = (values: NewUserFormValues) => {
    createUserMutation.mutate(values);
  };

  // Stato per mostrare/nascondere la password
  const [showPassword, setShowPassword] = useState(false);
  // Stato per la password digitata (per la checklist live)
  const [passwordValue, setPasswordValue] = useState("");

  // Redirect non-admin users
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <HeaderBar user={user} />

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                  <ShieldAlert className="mr-2 h-5 w-5" />
                  Accesso negato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300">
                  Non hai i permessi necessari per accedere a questa pagina.
                  Solo gli amministratori possono gestire gli utenti del
                  sistema.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <HeaderBar user={user} />

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Gestione Utenti
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Visualizza e gestisci gli utenti del sistema
            </p>
          </div>

          {/* Users table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Utenti del Sistema
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
                    {totalUsers} utenti registrati
                  </div>
                  <Dialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex items-center w-full sm:w-auto">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Nuovo Utente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crea Nuovo Utente</DialogTitle>
                        <DialogDescription>
                          Inserisci i dati per creare un nuovo utente nel
                          sistema.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="esempio@email.com"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      placeholder="Almeno 8 caratteri, 1 maiuscola, 1 minuscola, 1 numero, 1 speciale"
                                      {...field}
                                      value={field.value}
                                      onChange={e => {
                                        field.onChange(e);
                                        setPasswordValue(e.target.value);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      tabIndex={-1}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                      onClick={() => setShowPassword(v => !v)}
                                      aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                                    >
                                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                  </div>
                                </FormControl>
                                {/* Checklist requisiti password */}
                                <ul className="mt-2 space-y-1 text-xs">
                                  {passwordRequirements.map((req, idx) => (
                                    <li key={idx} className={req.test(passwordValue) ? "text-green-600 flex items-center" : "text-red-500 flex items-center"}>
                                      {req.test(passwordValue) ? (
                                        <span className="mr-1">✔️</span>
                                      ) : (
                                        <span className="mr-1">❌</span>
                                      )}
                                      {req.label}
                                    </li>
                                  ))}
                                </ul>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ruolo</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleziona un ruolo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="viewer">
                                      Visualizzatore
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Gli amministratori hanno accesso completo al
                                  sistema.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button
                              type="submit"
                              disabled={createUserMutation.isPending}
                              className="mt-4"
                            >
                              {createUserMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Crea Utente
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : users && users.length > 0 ? (
                <>
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[600px] md:min-w-0 w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="w-[130px]">Ruolo</TableHead>
                          <TableHead className="w-[180px]">
                            Data Registrazione
                          </TableHead>
                          <TableHead className="w-[200px]">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((usr) => (
                          <TableRow key={usr.legacyId}>
                            <TableCell className="font-mono">
                              {usr.legacyId}
                            </TableCell>
                            <TableCell>{usr.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  usr.role === "admin" ? "default" : "outline"
                                }
                                className="capitalize"
                              >
                                {usr.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {usr.createdAt
                                ? format(
                                    new Date(usr.createdAt),
                                    "dd/MM/yyyy HH:mm"
                                  )
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Select
                                  defaultValue={usr.role}
                                  onValueChange={(value) =>
                                    handleRoleChange(usr.legacyId, value)
                                  }
                                  disabled={
                                    usr.legacyId === user?.legacyId ||
                                    updateRoleMutation.isPending
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Ruolo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="viewer">
                                      Visualizzatore
                                    </SelectItem>
                                    <SelectItem value="admin">
                                      Amministratore
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {/*  Pulsante elimina */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(usr)}
                                  disabled={
                                    usr.legacyId === user?.legacyId ||
                                    deleteUserMutation.isPending
                                  }
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Paginazione responsive */}
                  {totalPages > 1 && (
                    <div className="flex flex-col md:flex-row items-center justify-between mt-6 gap-2">
                      <div className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-left">
                        Pagina {currentPage} di {totalPages} ({totalUsers} utenti totali)
                      </div>
                      <div className="flex flex-wrap items-center gap-2 justify-center md:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Precedente
                        </Button>
                        <div className="flex flex-wrap items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Successiva
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Nessun utente trovato
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/*  Dialog di conferma eliminazione */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare l'utente{" "}
              <strong>{userToDelete?.email}</strong>? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Elimina Utente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

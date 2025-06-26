import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { UserDocument as User } from "../../../server/shared-types/schema";
import { getQueryFn, apiRequest, queryClient, resetCSRFToken } from "../lib/queryClient";
import { useToast } from "./use-toast";
import { z } from "zod";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

const loginSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(1, "La password è obbligatoria"),
  remember: z.boolean().optional().default(false),
});

const registerSchema = z
  .object({
    email: z.string().email("Inserisci un indirizzo email valido"),
    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri")
      .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
      .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola")
      .regex(/\d/, "La password deve contenere almeno un numero")
      .regex(/[@$!%*?&]/, "La password deve contenere almeno un carattere speciale (@$!%*?&)"),
    confirmPassword: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri"),
    clientName: z.string().min(2, "Il nome dell'azienda è obbligatorio"),
    driveFolderUrl: z.string().url("Inserisci un URL valido per la cartella Google Drive"),
    companyCode: z.string().min(1, "Il codice aziendale è obbligatorio"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Devi accettare i termini e le condizioni",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non corrispondono",
    path: ["confirmPassword"],
  });

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const refetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Rimuoviamo il refetchInterval fisso - ora lo gestiamo dinamicamente
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60 * 1000, // 5 minuti di stale time
    gcTime: 10 * 60 * 1000, // 10 minuti di cache time
  });

  // Gestione intelligente del refetch basata sull'attività utente
  useEffect(() => {
    if (!user) {
      // Se non c'è utente, non serve refetch
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
        refetchIntervalRef.current = null;
      }
      return;
    }

    // Eventi per rilevare l'attività utente
    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Aggiungi listener per l'attività utente
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Funzione per determinare se fare refetch
    const shouldRefetch = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // Se l'utente è stato attivo negli ultimi 5 minuti, non serve refetch
      if (timeSinceLastActivity < 5 * 60 * 1000) {
        return false;
      }
      
      // Se l'utente è inattivo da più di 5 minuti, facciamo refetch ogni 10 minuti
      return true;
    };

    // Imposta refetch intelligente ogni 10 minuti
    refetchIntervalRef.current = setInterval(() => {
      if (shouldRefetch()) {
        refetch();
      }
    }, 10 * 60 * 1000); // 10 minuti

    return () => {
      // Cleanup
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, [user, refetch]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (data) => {
      // Forza un refresh della query dell'utente
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Imposta i dati dell'utente
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Accesso effettuato",
        description: `Bentornato, ${data.email}!`,
        duration: 2000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Accesso fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const { confirmPassword, ...registerData } = credentials;
      const res = await apiRequest("POST", "/api/register/admin", registerData);
      return await res.json();
    },
    onSuccess: (response) => {
      
      if (response && response.user) {
        queryClient.setQueryData(["/api/user"], response.user);
        toast({
          title: "Registrazione completata",
          description: `Benvenuto, ${response.user.email}!`,
        });
      } else {
        toast({
          title: "Registrazione completata",
          description: "Benvenuto!",
        });
      }
     
    },
    onError: (error: Error) => {
      toast({
        title: "Registrazione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      resetCSRFToken();
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Disconnessione effettuata",
        description: "Sei stato disconnesso con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnessione fallita",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

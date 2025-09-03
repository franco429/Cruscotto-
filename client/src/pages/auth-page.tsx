import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import {
  AlertCircle,
  FileText,
  Lock,
  Mail,
  KeyRound,
  Building,
  Link as LinkIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import AuthNavbar from "../components/auth-navbar";
import Footer from "../components/footer";
import LoadingSpinner from "../components/loading-spinner";
import SimpleFileUpload from "../components/simple-file-upload";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(1, "La password è obbligatoria"),
  remember: z.boolean().default(false),
});

const registerAdminSchema = z
  .object({
    email: z.string().email("Inserisci un indirizzo email valido"),
    password: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri")
      .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
      .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola")
      .regex(/\d/, "La password deve contenere almeno un numero")
      .regex(
        /[@$!%*?&]/,
        "La password deve contenere almeno un carattere speciale (@$!%*?&)"
      ),
    confirmPassword: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri"),
    clientName: z.string().min(2, "Il nome dell'azienda è obbligatorio"),
    driveFolderUrl: z
      .string()
      .url("Inserisci un URL valido per la cartella Google Drive")
      .optional()
      .or(z.literal("")),
    localFiles: z.any().optional(),
    companyCode: z.string().min(1, "Il codice aziendale è obbligatorio"),
    acceptTerms: z.boolean().refine((val) => val, {
      message: "Devi accettare i termini e le condizioni",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      // Almeno uno tra driveFolderUrl e localFiles deve essere presente
      return (
        (data.driveFolderUrl && data.driveFolderUrl !== "") ||
        (data.localFiles && data.localFiles.length > 0)
      );
    },
    {
      message:
        "Devi inserire l'URL della cartella Google Drive oppure caricare una cartella locale di documenti",
      path: ["driveFolderUrl"],
    }
  );

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterAdminFormValues = z.infer<typeof registerAdminSchema>;

export default function AuthPage() {
  const [tabValue, setTabValue] = useState("login");
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  //  Ref per prevenire richieste multiple
  const isSubmittingRef = useRef(false);

  const [_, setLocation] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  useEffect(() => {
    if (user && !isLoading) {
      setLoadingMessage("Reindirizzamento in corso...");
      setShowLoadingSpinner(true);
      const redirectTimeout = setTimeout(() => setLocation("/"), 1000);
      return () => clearTimeout(redirectTimeout);
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    const registrationPending = registerMutation.isPending;
    const loginPending = loginMutation.isPending;

    if (registrationPending) {
      setLoadingMessage("Creazione account in corso...");
      setShowLoadingSpinner(true);
    } else if (loginPending) {
      setLoadingMessage("Accesso in corso...");
      setShowLoadingSpinner(true);
    } else {
      setShowLoadingSpinner(false);
    }
  }, [registerMutation.isPending, loginMutation.isPending]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const registerForm = useForm<
    RegisterAdminFormValues & { localFiles?: FileList }
  >({
    resolver: zodResolver(registerAdminSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      clientName: "",
      driveFolderUrl: "",
      localFiles: undefined,
      companyCode: "",
      acceptTerms: false,
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    if (isSubmittingRef.current) {
      return;
    }
    
    isSubmittingRef.current = true;
    
    loginMutation.mutate(values, {
      onSettled: () => {
        //  Reset del flag quando la richiesta è completata (successo o errore)
        isSubmittingRef.current = false;
      }
    });
  };
  const onRegisterSubmit = (
    values: RegisterAdminFormValues & { localFiles?: FileList }
  ) => {
    // Se ci sono file locali, prepara FormData
    if (values.localFiles && values.localFiles.length > 0) {
      const formData = new FormData();
      Object.entries(values).forEach(([key, val]) => {
        if (key === "localFiles" && val instanceof FileList) {
          Array.from(val).forEach((file) => {
            formData.append("localFiles", file);
          });
        } else {
          formData.append(key, val as any);
        }
      });
      registerMutation.mutate(formData as any);
    } else {
      // Assicurati che driveFolderUrl sia una stringa vuota se undefined
      const cleanedValues = {
        ...values,
        driveFolderUrl: values.driveFolderUrl || ""
      };
      registerMutation.mutate(cleanedValues as any);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {showLoadingSpinner && <LoadingSpinner message={loadingMessage} />}
      <AuthNavbar />
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-slate-900">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <Tabs
                value={tabValue}
                onValueChange={setTabValue}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Accedi</TabsTrigger>
                  <TabsTrigger value="register">Registrati</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <h1 className="text-2xl font-bold text-center mb-6">
                    Gestione Documenti ISO
                  </h1>
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="tua@email.com"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* ✅ MODIFICA: Campo password del LOGIN aggiornato con l'occhio */}
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type={showLoginPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-10 pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowLoginPassword((prev) => !prev)
                                  }
                                  className="absolute right-3 top-1/2 -translate-y-1/2 h-fit w-fit p-1 text-muted-foreground hover:text-primary"
                                >
                                  {showLoginPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between">
                        <FormField
                          control={loginForm.control}
                          name="remember"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Ricordami
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <Button
                          variant="link"
                          className="text-sm font-medium text-primary hover:text-primary/90 p-0 h-auto"
                          onClick={() => setLocation("/reset-password")}
                        >
                          Password dimenticata?
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending
                          ? "Accesso in corso..."
                          : "Accedi"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <h1 className="text-2xl font-bold text-center mb-6">
                    Crea il tuo Account Aziendale
                  </h1>
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>La tua Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="admin@tua-azienda.com"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* ✅ MODIFICA: Campo password della REGISTRAZIONE aggiornato con l'occhio */}
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type={
                                    showRegisterPassword ? "text" : "password"
                                  }
                                  placeholder="Minimo 8 caratteri con maiuscola, minuscola, numero e carattere speciale"
                                  className="pl-10 pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowRegisterPassword((prev) => !prev)
                                  }
                                  className="absolute right-3 top-1/2 -translate-y-1/2 h-fit w-fit p-1 text-muted-foreground hover:text-primary"
                                >
                                  {showRegisterPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Deve contenere almeno 8 caratteri, una maiuscola,
                              una minuscola, un numero e un carattere speciale
                              (@$!%*?&)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* ✅ MODIFICA: Campo CONFERMA password della REGISTRAZIONE aggiornato con l'occhio */}
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Conferma Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  placeholder="Ripeti la password"
                                  className="pl-10 pr-10"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowConfirmPassword((prev) => !prev)
                                  }
                                  className="absolute right-3 top-1/2 -translate-y-1/2 h-fit w-fit p-1 text-muted-foreground hover:text-primary"
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff size={18} />
                                  ) : (
                                    <Eye size={18} />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="clientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Azienda</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="Es: Rossi S.r.l."
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/*  Caricamento cartella locale semplice */}
                      <FormField
                        control={registerForm.control}
                        name="localFiles"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Carica Documenti per Configurazione Iniziale (opzionale)
                            </FormLabel>
                            <FormControl>
                              <SimpleFileUpload
                                onFilesSelected={(files: any[]) => {
                                  // Converti i file in FileList per compatibilità
                                  const dataTransfer = new DataTransfer();
                                  files.forEach((file: any) => dataTransfer.items.add(file));
                                  field.onChange(dataTransfer.files);
                                }}
                                accept={[".xlsx", ".xls", ".docx", ".pdf", ".ods", ".csv"]}
                                maxFiles={1000}
                                disabled={registerMutation.isPending}
                              />
                            </FormControl>
                            <FormDescription>
                              📋 <strong>WORKFLOW:</strong> I documenti saranno caricati sul server. 
                              Dopo la registrazione, dalla dashboard potrai <strong>"Aggiorna documenti locali"</strong> 
                              e installare il <strong>Local Opener</strong> per aprire i file direttamente dal tuo Google Drive locale.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="driveFolderUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Cartella Google Drive</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <LinkIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="https://drive.google.com/drive/folders/..."
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Link alla cartella principale dei documenti.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="companyCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Codice Aziendale</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="Inserisci il codice fornito"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Codice monouso per attivare la registrazione.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="acceptTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0 pt-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Accetto i termini e le condizioni
                              </FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full mt-6"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending
                          ? "Registrazione in corso..."
                          : "Crea Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Colonna destra - Hero condizionale */}
        <div className="flex-1 bg-primary p-6 lg:p-10 text-primary-foreground hidden lg:flex">
          {tabValue === "login" ? (
            // Sezione destra per LOGIN (compatta)
            <div className="flex flex-col justify-center items-center space-y-6 w-full max-w-md mx-auto">
              {/* Header centrato */}
              <div className="text-center w-full">
                <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                  Gestione Documenti ISO
                </h1>
                <p className="text-base lg:text-lg opacity-90 mb-6 leading-relaxed">
                  Gestisci, organizza e monitora i tuoi documenti ISO nel rispetto delle normative
                </p>
              </div>
              
              {/* Features semplificate */}
              <div className="space-y-4 w-full">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
                  <div className="bg-primary-foreground text-primary rounded-full p-2">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Tracciamento Completo</h3>
                    <p className="text-sm opacity-90">
                      Mantieni traccia dello stato e delle revisioni dei documenti
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
                  <div className="bg-primary-foreground text-primary rounded-full p-2">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Avvisi Automatici</h3>
                    <p className="text-sm opacity-90">
                      Ricevi notifiche sui documenti in scadenza
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Box informativo compatto */}
              <div className="w-full p-4 bg-primary-foreground/10 rounded-lg border border-primary-foreground/20">
                <h4 className="font-semibold text-lg mb-3 text-center">Vantaggi del Sistema</h4>
                <div className="space-y-2 text-sm opacity-90">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                    <span>Accesso sicuro e protetto</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                    <span>Dashboard personalizzata</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                    <span>Sincronizzazione Google Drive</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Sezione destra per REGISTRAZIONE (completamente ridisegnata)
            <div className="flex flex-col justify-start items-center space-y-8 w-full max-w-2xl mx-auto pt-16">
              {/* Header centrato */}
              <div className="text-center w-full">
                <h1 className="text-2xl lg:text-2xl xl:text-4xl font-bold mb-4 lg:mb-6 leading-tight">
                  Inizia la tua Trasformazione Digitale
                </h1>
                <p className="text-lg lg:text-xl opacity-90 mb-8 leading-relaxed max-w-lg mx-auto">
                  Unisciti alle aziende che hanno già scelto la gestione intelligente dei documenti ISO
                </p>
              </div>
              
              {/* Features grid responsive */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
                  <div className="bg-primary-foreground text-primary rounded-full p-3">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Tracciamento Completo</h3>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Sistema di versioning avanzato per documenti e revisioni
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
                  <div className="bg-primary-foreground text-primary rounded-full p-3">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Avvisi Automatici</h3>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Notifiche tempestive su scadenze e aggiornamenti normativi
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
                  <div className="bg-primary-foreground text-primary rounded-full p-3">
                    <Building size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Gestione Aziendale</h3>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Organizzazione per reparti con controlli di accesso granulari
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
                  <div className="bg-primary-foreground text-primary rounded-full p-3">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Sicurezza Avanzata</h3>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Crittografia end-to-end e backup automatici per i tuoi dati
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Box finale migliorato */}
              <div className="w-full max-w-lg  p-6 lg:p-8 bg-primary-foreground/10 rounded-xl border border-primary-foreground/20 backdrop-blur-sm pt-12 mt-10">
                <h4 className="font-semibold text-xl mb-4 text-center">Perché scegliere il nostro sistema?</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm opacity-90">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    <span>Conformità automatica ISO</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    <span>Integrazione Google Drive</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    <span>Dashboard personalizzabili</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    <span>Supporto tecnico 24/7</span>
                  </div>
                  <div className="flex items-center space-x-2 lg:col-span-2">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    <span>Aggiornamenti continui e nuove funzionalità</span>
                  </div>
                </div>
              </div>
              {/* Box aggiuntivo per riempire lo spazio sottostante */}
              <div className="w-full max-w-lg p-6 lg:p-8 bg-primary-foreground/10 rounded-xl border border-primary-foreground/20 mt-6">
                <h4 className="font-semibold text-lg mb-3 text-center">Cosa otterrai subito</h4>
                <p className="text-sm opacity-90 leading-relaxed text-center">
                  Attiva il tuo account e centralizza i documenti in un unico posto, monitora scadenze
                  e revisioni e collabora con il team in sicurezza. Potrai configurare reparti,
                  permessi e notifiche per adattare il sistema alle esigenze della tua azienda.
                </p>
              </div>
              <div className="text-center mb-8">
                <h1 className="text-3xl xs:text-4xl sm:text-5xl font-bold text-primary-foreground mb-4">
                  Pannello di Controllo SGI
                </h1>
                <p className="text-lg xs:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
                  Unisciti alle aziende che hanno già scelto la gestione intelligente dei documenti ISO
                </p>
                {/* Privacy Policy Link - Richiesto da Google Cloud Console */}
                <div className="mt-4 flex items-center justify-center">
                  <a
                    href="/privacy"
                    className="inline-flex items-center text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors underline decoration-dotted underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Norme sulla Privacy
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

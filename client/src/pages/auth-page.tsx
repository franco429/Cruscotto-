import { useEffect, useState } from "react";
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
      .regex(/[@$!%*?&]/, "La password deve contenere almeno un carattere speciale (@$!%*?&)"),
    confirmPassword: z
      .string()
      .min(8, "La password deve contenere almeno 8 caratteri"),
    clientName: z.string().min(2, "Il nome dell'azienda è obbligatorio"),
    driveFolderUrl: z
      .string()
      .url("Inserisci un URL valido per la cartella Google Drive"),
    companyCode: z.string().min(1, "Il codice aziendale è obbligatorio"),
    acceptTerms: z.boolean().refine((val) => val, {
      message: "Devi accettare i termini e le condizioni",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterAdminFormValues = z.infer<typeof registerAdminSchema>;

export default function AuthPage() {
  const [tabValue, setTabValue] = useState("login");
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const registerForm = useForm<RegisterAdminFormValues>({
    resolver: zodResolver(registerAdminSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      clientName: "",
      driveFolderUrl: "",
      companyCode: "",
      acceptTerms: false,
    },
  });

  const onLoginSubmit = (values: LoginFormValues) =>
    loginMutation.mutate(values);
  const onRegisterSubmit = (values: RegisterAdminFormValues) =>
    registerMutation.mutate(values);

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
                              Deve contenere almeno 8 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale (@$!%*?&)
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

        {/* Colonna destra - Hero (invariata) */}
        <div className="flex-1 bg-primary p-10 text-primary-foreground flex-col justify-center items-center space-y-6 lg:space-y-10 hidden lg:flex">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-bold mb-4">Gestione Documenti ISO</h1>
            <p className="mb-6 text-lg opacity-90">
              Gestisci, organizza e monitora i tuoi documenti ISO nel rispetto
              delle normative
            </p>
            <div className="flex flex-col space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-primary-foreground text-primary rounded-full p-1 mt-0.5">
                  <FileText size={16} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Tracciamento completo</h3>
                  <p className="text-sm opacity-90">
                    Mantieni traccia dello stato e delle revisioni dei documenti
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-primary-foreground text-primary rounded-full p-1 mt-0.5">
                  <AlertCircle size={16} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Avvisi automatici</h3>
                  <p className="text-sm opacity-90">
                    Ricevi notifiche sui documenti in scadenza
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import AuthNavbar from '../components/auth-navbar';
import Footer from '../components/footer';
import { useAuth } from '../hooks/use-auth';
import ResetPasswordModal from '../components/reset-password-modal';
import { apiRequest } from "../lib/queryClient";

// Schema per il form di richiesta email
const requestEmailSchema = z.object({
  email: z.string().email('Inserisci un indirizzo email valido'),
});

type RequestEmailFormValues = z.infer<typeof requestEmailSchema>;

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const [, params] = useRoute('/reset-password');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tokenData, setTokenData] = useState<{
    data: string;
    expires: string;
    signature: string;
  } | null>(null);

  // Redirect se l'utente è già autenticato
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  // Check if we have token parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const data = searchParams.get('data');
    const expires = searchParams.get('expires');
    const signature = searchParams.get('signature');

    if (data && expires && signature) {
      setTokenData({ data, expires, signature });
      setIsModalOpen(true);
    }
  }, [location, window.location.search]);

  // Form setup per richiesta email
  const emailForm = useForm<RequestEmailFormValues>({
    resolver: zodResolver(requestEmailSchema),
    defaultValues: {
      email: '',
    },
  });

  // Handle email request submission
  const onEmailSubmit = async (values: RequestEmailFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiRequest('POST', '/api/forgot-password', values);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore durante l\'invio dell\'email');
      }

      setIsSuccess(true);
      toast({
        title: 'Email inviata',
        description: 'Se l\'indirizzo email è registrato, riceverai un link per reimpostare la password.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'invio dell\'email');
      toast({
        title: 'Errore',
        description: err instanceof Error ? err.message : 'Errore durante l\'invio dell\'email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se l'utente è già loggato, reindirizza a home
  if (user) {
    return null; // Non renderizzare nulla mentre reindirizza
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AuthNavbar />
        
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Recupera Password
              </CardTitle>
              <CardDescription className="text-center">
                Inserisci il tuo indirizzo email per ricevere un link di recupero
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {error ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errore</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                  <div className="mt-4">
                    <Link href="/auth">
                      <Button variant="outline" className="mt-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Torna al login
                      </Button>
                    </Link>
                  </div>
                </Alert>
              ) : isSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <h3 className="text-lg font-medium">Email inviata con successo</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.
                  </p>
                  <Link href="/auth">
                    <Button className="mt-4 w-full">
                      Vai al login
                    </Button>
                  </Link>
                </div>
              ) : (
                // Form per richiesta email
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
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
                                autoComplete="email"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        'Invia link di recupero'
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-center">
              <div className="text-sm text-gray-600">
                <Link href="/auth" className="text-primary hover:underline">
                  Torna al login
                </Link>
              </div>
            </CardFooter>
          </Card>
        </main>
        
        <Footer />
      </div>

      {/* Modale per reset password */}
      <ResetPasswordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTokenData(null);
          // Rimuovi i parametri dall'URL
          window.history.replaceState({}, document.title, '/reset-password');
        }}
        tokenData={tokenData || undefined}
      />
    </>
  );
}

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';

// Schema per la validazione della password con tutti i requisiti
const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno 1 lettera maiuscola')
    .regex(/[a-z]/, 'La password deve contenere almeno 1 lettera minuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno 1 numero')
    .regex(/[@$!%*?&]/, 'La password deve contenere almeno 1 carattere speciale (@$!%*?&)'),
  confirmPassword: z.string()
    .min(8, 'La password deve essere di almeno 8 caratteri'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Le password non coincidono',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData?: {
    data: string;
    expires: string;
    signature: string;
  };
}

export default function ResetPasswordModal({ isOpen, onClose, tokenData }: ResetPasswordModalProps) {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<{ userId: number; action: string; } | null>(null);
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form setup per reset password
  const passwordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Verifica il link quando il modale si apre
  useEffect(() => {
    if (isOpen && tokenData) {
      setIsVerifyingLink(true);
      setError(null);
      
      apiRequest('POST', '/api/verify-reset-link', tokenData)
        .then(res => res.json())
        .then(result => {
          if (!result.success) {
            setError(result.message || 'Link non valido o scaduto');
          } else {
            setLinkData(result.data);
          }
          setIsVerifyingLink(false);
        })
        .catch(err => {
          setError('Errore durante la verifica del link');
          setIsVerifyingLink(false);
        });
    }
  }, [isOpen, tokenData]);

  // Reset del form quando il modale si chiude
  useEffect(() => {
    if (!isOpen) {
      passwordForm.reset();
      setIsSuccess(false);
      setError(null);
      setLinkData(null);
      setIsVerifyingLink(false);
    }
  }, [isOpen, passwordForm]);

  // Handle password reset submission
  const onPasswordSubmit = async (values: ResetPasswordFormValues) => {
    if (!linkData) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiRequest(
        'POST',
        '/api/reset-password',
        {
          userId: linkData.userId,
          password: values.password,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Errore durante il reset della password');
      }

      setIsSuccess(true);
      toast({
        title: 'Password reimpostata',
        description: 'La tua password è stata reimpostata con successo.',
      });

     
      setTimeout(() => {
        onClose();
        window.location.href = '/auth';
      }, 2000);
    } catch (err) {
      
      setError(err instanceof Error ? err.message : 'Errore durante il reset della password');
      toast({
        title: 'Errore',
        description: err instanceof Error ? err.message : 'Errore durante il reset della password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per validare la password in tempo reale
  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@$!%*?&]/.test(password),
    };

    return requirements;
  };

  const password = passwordForm.watch('password');
  const passwordRequirements = validatePassword(password);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reimposta Password</DialogTitle>
          <DialogDescription>
            Inserisci la tua nuova password rispettando tutti i requisiti di sicurezza.
          </DialogDescription>
        </DialogHeader>

        {isVerifyingLink ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-gray-600">Verifica del link in corso...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <h3 className="text-lg font-medium">Password reimpostata con successo!</h3>
            <p className="text-sm text-gray-600 mt-1">
              Verrai reindirizzato alla pagina di login tra pochi secondi...
            </p>
          </div>
        ) : (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuova Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conferma Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Requisiti password */}
              {password && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Requisiti password:</p>
                  <div className="space-y-1 text-sm">
                    <div className={`flex items-center ${passwordRequirements.length ? 'text-green-600' : 'text-red-600'}`}>
                      <CheckCircle className={`h-4 w-4 mr-2 ${passwordRequirements.length ? 'text-green-600' : 'text-red-600'}`} />
                      Almeno 8 caratteri
                    </div>
                    <div className={`flex items-center ${passwordRequirements.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                      <CheckCircle className={`h-4 w-4 mr-2 ${passwordRequirements.uppercase ? 'text-green-600' : 'text-red-600'}`} />
                      Almeno 1 lettera maiuscola
                    </div>
                    <div className={`flex items-center ${passwordRequirements.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                      <CheckCircle className={`h-4 w-4 mr-2 ${passwordRequirements.lowercase ? 'text-green-600' : 'text-red-600'}`} />
                      Almeno 1 lettera minuscola
                    </div>
                    <div className={`flex items-center ${passwordRequirements.number ? 'text-green-600' : 'text-red-600'}`}>
                      <CheckCircle className={`h-4 w-4 mr-2 ${passwordRequirements.number ? 'text-green-600' : 'text-red-600'}`} />
                      Almeno 1 numero
                    </div>
                    <div className={`flex items-center ${passwordRequirements.special ? 'text-green-600' : 'text-red-600'}`}>
                      <CheckCircle className={`h-4 w-4 mr-2 ${passwordRequirements.special ? 'text-green-600' : 'text-red-600'}`} />
                      Almeno 1 carattere speciale (@$!%*?&)
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annulla
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Elaborazione...
                    </>
                  ) : (
                    'Reimposta Password'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
} 
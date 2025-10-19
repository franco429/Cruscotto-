import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/queryClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Shield, Loader2, ArrowLeft, Key } from "lucide-react";

interface MFALoginVerifyProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function MFALoginVerify({ onBack, onSuccess }: MFALoginVerifyProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError("Inserisci un codice");
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      setError("Il codice deve essere di 6 cifre");
      return;
    }

    try {
      setIsVerifying(true);
      setError("");

      await apiRequest("POST", "/api/mfa/verify", {
        token: code,
        useBackupCode: useBackupCode,
      });

      // Login completato con successo
      onSuccess();
    } catch (error: any) {
      setError(error.message || (useBackupCode ? "Backup code non valido" : "Codice non valido"));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          Verifica Autenticazione
        </CardTitle>
        <CardDescription className="text-center">
          {useBackupCode
            ? "Inserisci uno dei tuoi backup codes"
            : "Inserisci il codice dall'app authenticator"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {useBackupCode ? "Backup Code" : "Codice MFA"}
            </Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode={useBackupCode ? "text" : "numeric"}
              pattern={useBackupCode ? undefined : "[0-9]*"}
              maxLength={useBackupCode ? 9 : 6}
              placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
              value={code}
              onChange={(e) => {
                const value = useBackupCode 
                  ? e.target.value.toUpperCase()
                  : e.target.value.replace(/\D/g, '');
                setCode(value);
                setError("");
              }}
              className={`text-center ${useBackupCode ? 'text-xl' : 'text-2xl'} tracking-widest font-mono`}
              autoFocus
              disabled={isVerifying}
            />
            <p className="text-xs text-slate-500 text-center">
              {useBackupCode
                ? "Formato: XXXX-XXXX"
                : "Codice a 6 cifre che cambia ogni 30 secondi"}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isVerifying || !code || (!useBackupCode && code.length !== 6)}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifica in corso...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Verifica e Accedi
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Oppure
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode("");
              setError("");
            }}
            disabled={isVerifying}
          >
            {useBackupCode ? (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Usa Codice Authenticator
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Usa Backup Code
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
            disabled={isVerifying}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna al Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


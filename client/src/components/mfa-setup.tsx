import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "./ui/alert";
import { Shield, ShieldCheck, ShieldOff, Key, Copy, Check, Loader2, AlertTriangle, Download } from "lucide-react";
import { Separator } from "./ui/separator";

interface MFAStatus {
  mfaEnabled: boolean;
  mfaAvailable: boolean;
  backupCodesCount: number;
  backupCodesLow: boolean;
}

export default function MFASetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Stati principali
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Stati per setup MFA
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Stati per disable MFA
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  
  // Stati per regenerate backup codes
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  
  // Stati UI
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<number[]>([]);

  // Carica stato MFA
  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("GET", "/api/mfa/status");
      const data = await response.json();
      setMfaStatus(data);
    } catch (error: any) {
      console.error("Errore caricamento MFA:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare lo stato MFA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Inizia setup MFA
  const handleStartSetup = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/mfa/setup");
      const data = await response.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setSetupStep('qr');
      setShowSetupDialog(true);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile avviare il setup MFA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verifica codice e attiva MFA
  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Codice non valido",
        description: "Inserisci un codice a 6 cifre",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsVerifying(true);
      await apiRequest("POST", "/api/mfa/enable", { token: verificationCode });
      toast({
        title: "MFA Attivato!",
        description: "L'autenticazione a due fattori è stata abilitata con successo",
      });
      setSetupStep('backup');
    } catch (error: any) {
      toast({
        title: "Codice non valido",
        description: error.message || "Il codice inserito non è corretto. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Completa setup
  const handleCompleteSetup = () => {
    setShowSetupDialog(false);
    setSetupStep('qr');
    setVerificationCode("");
    setQrCode("");
    setSecret("");
    setBackupCodes([]);
    loadMFAStatus();
  };

  // Disabilita MFA
  const handleDisableMFA = async () => {
    if (!disablePassword) {
      toast({
        title: "Password richiesta",
        description: "Inserisci la tua password per disabilitare MFA",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDisabling(true);
      await apiRequest("POST", "/api/mfa/disable", { password: disablePassword });
      toast({
        title: "MFA Disabilitato",
        description: "L'autenticazione a due fattori è stata disabilitata",
      });
      setShowDisableDialog(false);
      setDisablePassword("");
      loadMFAStatus();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Password non valida",
        variant: "destructive",
      });
    } finally {
      setIsDisabling(false);
    }
  };

  // Rigenera backup codes
  const handleRegenerateBackupCodes = async () => {
    if (!regeneratePassword) {
      toast({
        title: "Password richiesta",
        description: "Inserisci la tua password per rigenerare i backup codes",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRegenerating(true);
      const response = await apiRequest("POST", "/api/mfa/regenerate-backup-codes", { password: regeneratePassword });
      const data = await response.json();
      setNewBackupCodes(data.backupCodes);
      toast({
        title: "Backup Codes Rigenerati",
        description: "I vecchi backup codes sono stati invalidati. Salva i nuovi codici in un luogo sicuro.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Password non valida",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Copia negli appunti
  const copyToClipboard = async (text: string, type: 'secret' | 'code', index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else if (index !== undefined) {
        setCopiedCodes([...copiedCodes, index]);
        setTimeout(() => {
          setCopiedCodes(copiedCodes.filter(i => i !== index));
        }, 2000);
      }
      toast({
        title: "Copiato!",
        description: "Copiato negli appunti",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare negli appunti",
        variant: "destructive",
      });
    }
  };

  // Download backup codes
  const downloadBackupCodes = (codes: string[]) => {
    const text = `SGI Cruscotto - Backup Codes MFA\n\nData: ${new Date().toLocaleString()}\nUtente: ${user?.email}\n\n${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nATTENZIONE: Conserva questi codici in un luogo sicuro!\nOgni codice può essere usato una sola volta.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mfa-backup-codes-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mfaStatus?.mfaAvailable) {
    return (
      <Alert>
        <ShieldOff className="h-4 w-4" />
        <AlertTitle>MFA Non Disponibile</AlertTitle>
        <AlertDescription>
          L'autenticazione a due fattori è disponibile solo per amministratori e super-admin.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stato MFA */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {mfaStatus.mfaEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <Shield className="h-5 w-5 text-slate-400 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                {mfaStatus.mfaEnabled ? "MFA Abilitato" : "MFA Non Abilitato"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {mfaStatus.mfaEnabled
                  ? "Il tuo account è protetto con autenticazione a due fattori"
                  : "Aggiungi un ulteriore livello di sicurezza al tuo account"}
              </p>
              {mfaStatus.mfaEnabled && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Backup codes rimanenti: <span className={mfaStatus.backupCodesLow ? "text-orange-600 font-medium" : ""}>{mfaStatus.backupCodesCount}</span>
                  {mfaStatus.backupCodesLow && " ⚠️"}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {!mfaStatus.mfaEnabled ? (
              <Button
                onClick={handleStartSetup}
                size="sm"
                className="text-xs"
              >
                <Shield className="h-3 w-3 mr-2" />
                Abilita MFA
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setShowRegenerateDialog(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Key className="h-3 w-3 mr-2" />
                  Rigenera Backup Codes
                </Button>
                <Button
                  onClick={() => setShowDisableDialog(true)}
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                >
                  <ShieldOff className="h-3 w-3 mr-2" />
                  Disabilita MFA
                </Button>
              </>
            )}
          </div>
        </div>

        {mfaStatus.mfaEnabled && mfaStatus.backupCodesLow && (
          <Alert className="mt-4" variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Pochi Backup Codes Rimasti</AlertTitle>
            <AlertDescription>
              Ti rimangono solo {mfaStatus.backupCodesCount} backup codes. Considera di rigenerarli.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Informazioni MFA */}
      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
        <p className="font-medium">Come funziona l'MFA:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Scansiona il QR code con un'app authenticator (Google Authenticator, Microsoft Authenticator, Authy)</li>
          <li>Ad ogni login ti verrà richiesto un codice a 6 cifre dall'app</li>
          <li>I backup codes ti permettono di accedere se perdi il telefono</li>
          <li>Ogni backup code può essere usato una sola volta</li>
        </ul>
      </div>

      {/* Dialog Setup MFA */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {setupStep === 'qr' && "Configura Autenticazione a Due Fattori"}
              {setupStep === 'verify' && "Verifica Codice MFA"}
              {setupStep === 'backup' && "Salva i Backup Codes"}
            </DialogTitle>
            <DialogDescription>
              {setupStep === 'qr' && "Scansiona il QR code con la tua app authenticator"}
              {setupStep === 'verify' && "Inserisci il codice a 6 cifre dall'app per verificare"}
              {setupStep === 'backup' && "Salva questi codici in un luogo sicuro!"}
            </DialogDescription>
          </DialogHeader>

          {setupStep === 'qr' && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                {qrCode && <img src={qrCode} alt="QR Code MFA" className="w-64 h-64" />}
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Secret Key (se non puoi scansionare il QR code)</Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    onClick={() => copyToClipboard(secret, 'secret')}
                    variant="outline"
                    size="sm"
                  >
                    {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription className="text-xs">
                  Una volta chiusa questa finestra, non potrai più vedere il QR code o il secret key.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setSetupStep('verify')}
                className="w-full"
              >
                Ho Scansionato il QR Code
              </Button>
            </div>
          )}

          {setupStep === 'verify' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Codice di Verifica</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  Inserisci il codice a 6 cifre mostrato nell'app authenticator
                </p>
              </div>

              <Button
                onClick={handleVerifyAndEnable}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  "Verifica e Attiva MFA"
                )}
              </Button>
            </div>
          )}

          {setupStep === 'backup' && (
            <div className="space-y-4">
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Salva questi codici!</AlertTitle>
                <AlertDescription className="text-xs">
                  Questi backup codes ti permetteranno di accedere se perdi il telefono.
                  Ogni codice può essere usato UNA SOLA VOLTA.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded border"
                  >
                    <span className="font-mono text-sm">{code}</span>
                    <Button
                      onClick={() => copyToClipboard(code, 'code', index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      {copiedCodes.includes(index) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => downloadBackupCodes(backupCodes)}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Scarica Backup Codes
              </Button>

              <DialogFooter>
                <Button onClick={handleCompleteSetup} className="w-full">
                  Ho Salvato i Codici - Completa Setup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Disable MFA */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disabilita Autenticazione a Due Fattori</DialogTitle>
            <DialogDescription>
              Inserisci la tua password per confermare la disabilitazione di MFA
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Attenzione</AlertTitle>
            <AlertDescription className="text-xs">
              Disabilitando MFA, il tuo account sarà meno sicuro. Tutti i backup codes verranno invalidati.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disablePassword">Password</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Inserisci la tua password"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisableDialog(false);
                  setDisablePassword("");
                }}
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisableMFA}
                disabled={!disablePassword || isDisabling}
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabilitazione...
                  </>
                ) : (
                  "Disabilita MFA"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Regenerate Backup Codes */}
      <Dialog open={showRegenerateDialog} onOpenChange={(open) => {
        setShowRegenerateDialog(open);
        if (!open) {
          setRegeneratePassword("");
          setNewBackupCodes([]);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rigenera Backup Codes</DialogTitle>
            <DialogDescription>
              {newBackupCodes.length === 0
                ? "Inserisci la tua password per generare nuovi backup codes"
                : "Salva i nuovi backup codes in un luogo sicuro"}
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes.length === 0 ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attenzione</AlertTitle>
                <AlertDescription className="text-xs">
                  I vecchi backup codes verranno invalidati e non saranno più utilizzabili.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="regeneratePassword">Password</Label>
                <Input
                  id="regeneratePassword"
                  type="password"
                  value={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.value)}
                  placeholder="Inserisci la tua password"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    setRegeneratePassword("");
                  }}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleRegenerateBackupCodes}
                  disabled={!regeneratePassword || isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generazione...
                    </>
                  ) : (
                    "Rigenera Codici"
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Backup Codes Rigenerati</AlertTitle>
                <AlertDescription className="text-xs">
                  Salva questi nuovi codici. I vecchi non sono più validi.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {newBackupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 rounded border"
                  >
                    <span className="font-mono text-sm">{code}</span>
                    <Button
                      onClick={() => copyToClipboard(code, 'code', index)}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      {copiedCodes.includes(index) ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => downloadBackupCodes(newBackupCodes)}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Scarica Backup Codes
              </Button>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    setRegeneratePassword("");
                    setNewBackupCodes([]);
                    loadMFAStatus();
                  }}
                  className="w-full"
                >
                  Ho Salvato i Nuovi Codici
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


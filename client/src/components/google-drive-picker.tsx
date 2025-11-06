import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { Loader2, FolderOpen } from 'lucide-react';
import { apiRequest } from '../lib/queryClient';

interface GoogleDrivePickerProps {
  onFolderSelected: (folderId: string, folderName: string) => void;
  disabled?: boolean;
  buttonText?: string;
  requiresBackendAuth?: boolean;
  onAuthRequired?: () => void;
  onPickerClosed?: () => void;
  clientId?: number; // Aggiunto per recuperare access token dal backend
}

export interface GoogleDrivePickerRef {
  onBackendAuthComplete: () => void;
  setLoading: (loading: boolean) => void;
  openPickerAfterAuth: () => void;
  resetToReady: () => void; // Nuovo metodo per resettare lo stato
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const GoogleDrivePicker = forwardRef<GoogleDrivePickerRef, GoogleDrivePickerProps>(({ 
  onFolderSelected, 
  disabled = false,
  buttonText = "Seleziona Cartella da Drive",
  requiresBackendAuth = false,
  onAuthRequired,
  onPickerClosed,
  clientId
}, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const accessTokenRef = useRef<string | null>(null);
  const { toast } = useToast();

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const DEVELOPER_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

  // Funzione per ottenere access token dal backend
  const getAccessTokenFromBackend = async (forceRefresh = false): Promise<string | null> => {
    if (!clientId) {
      console.error('❌ Client ID non fornito al GoogleDrivePicker');
      return null;
    }

    try {
      const url = forceRefresh 
        ? `/api/google/access-token/${clientId}?refresh=true`
        : `/api/google/access-token/${clientId}`;
      
      const response = await apiRequest('GET', url);
      const data = await response.json();
      
      if (data.access_token) {
        return data.access_token;
      } else if (data.requiresAuth) {
        return null;
      } else {
        throw new Error(data.error || 'Errore sconosciuto');
      }
    } catch (error) {
      // Non mostrare toast di errore qui per evitare spam, lasciamo che il fallback gestisca
      return null;
    }
  };

  useImperativeHandle(ref, () => ({
    onBackendAuthComplete: () => {
      setIsLoading(false);
      toast({
        title: 'Autorizzazione completata',
        description: 'Ora puoi selezionare la cartella Google Drive',
      });
    },
    setLoading: (loading: boolean) => {
      setIsLoading(loading);
    },
    resetToReady: () => {
      setIsLoading(false);
      accessTokenRef.current = null; // Reset del token cache
    },
    openPickerAfterAuth: async () => {
      // Apre automaticamente il picker usando access token dal backend
      if (!isApiReady) {
        toast({
          title: 'Errore',
          description: 'Google APIs non ancora caricate',
          variant: 'destructive'
        });
        return;
      }
      
      setIsLoading(true);
      
      toast({
        title: 'Apertura Google Picker',
        description: 'Preparazione della selezione cartella...',
      });
      
      // Prova prima a ottenere l'access token dal backend (con force refresh dopo auth)
      const backendAccessToken = await getAccessTokenFromBackend(true);
      
      if (backendAccessToken) {
        // Usa il token dal backend - non serve autorizzazione frontend
        accessTokenRef.current = backendAccessToken;
        
        toast({
          title: 'Token recuperato',
          description: 'Apertura Google Picker con autorizzazione esistente...',
        });
        
        // Piccolo delay per mostrare il messaggio
        setTimeout(() => {
          openPicker(backendAccessToken);
        }, 300);
        return;
      }
      
      // Fallback: se non c'è token dal backend, usa Google Identity Services
      
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            console.error('Errore OAuth durante apertura picker:', response.error);
            
            // Se fallisce senza prompt, riprova con prompt
            const fallbackTokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              callback: (fallbackResponse: any) => {
                if (fallbackResponse.error) {
                  console.error('Errore OAuth anche con prompt:', fallbackResponse.error);
                  toast({
                    title: 'Errore di Autorizzazione',
                    description: 'Impossibile accedere a Google Drive',
                    variant: 'destructive'
                  });
                  setIsLoading(false);
                  onPickerClosed?.(); // Notifica che il picker non è riuscito ad aprirsi
                  return;
                }
                
                accessTokenRef.current = fallbackResponse.access_token;
                openPicker(fallbackResponse.access_token);
              }
            });
            
            fallbackTokenClient.requestAccessToken({ prompt: 'consent' });
            return;
          }
          
          // Apre il picker con il token ottenuto dal fallback
          accessTokenRef.current = response.access_token;
          openPicker(response.access_token);
        }
      });

      // Prima prova senza prompt (usa la sessione esistente)
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }));

  // useEffect per resettare lo stato quando l'autorizzazione backend è completata
  useEffect(() => {
    // Quando requiresBackendAuth cambia da true a false, significa che l'autorizzazione è stata completata
    // e dobbiamo resettare il loading state per permettere l'uso normale del picker
    if (!requiresBackendAuth && isLoading) {
      // Reset immediato senza delay per migliore UX
      setIsLoading(false);
      accessTokenRef.current = null; // Reset del token cache per forzare il refresh
      
      // Notifica l'utente che può procedere
      toast({
        title: 'Pronto per la selezione',
        description: 'Clicca nuovamente per selezionare la cartella',
      });
    }
  }, [requiresBackendAuth, isLoading, toast]);

  useEffect(() => {
    // Carica gli script Google necessari
    const loadGoogleAPIs = async () => {
      try {
        // Carica Google Identity Services
        if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
          const gsiScript = document.createElement('script');
          gsiScript.src = 'https://accounts.google.com/gsi/client';
          gsiScript.async = true;
          gsiScript.defer = true;
          document.head.appendChild(gsiScript);
        }

        // Carica Google APIs
        if (!document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
          const gapiScript = document.createElement('script');
          gapiScript.src = 'https://apis.google.com/js/api.js';
          gapiScript.async = true;
          gapiScript.defer = true;
          document.head.appendChild(gapiScript);
        }

        // Attendi che gli script siano caricati
        await new Promise<void>((resolve) => {
          const checkAPIs = () => {
            if (window.gapi && window.google) {
              resolve();
            } else {
              setTimeout(checkAPIs, 100);
            }
          };
          checkAPIs();
        });

        // Inizializza gapi
        await new Promise<void>((resolve) => {
          window.gapi.load('picker', () => {
            setIsApiReady(true);
            resolve();
          });
        });
      } catch (error) {
        console.error('Errore caricamento Google APIs:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare le API di Google Drive',
          variant: 'destructive'
        });
      }
    };

    loadGoogleAPIs();
  }, [toast]);

  const createPickerView = (viewIdOrNull?: any) => {
    const view = viewIdOrNull
      ? new window.google.picker.DocsView(viewIdOrNull)
      : new window.google.picker.DocsView();
    
    return view
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMode(window.google.picker.DocsViewMode.GRID);
  };

  const openPicker = (accessToken: string) => {
    if (!window.google || !window.google.picker) {
      toast({
        title: 'Errore',
        description: 'Google Picker non è disponibile',
        variant: 'destructive'
      });
      return;
    }

    const builder = new window.google.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(DEVELOPER_KEY)
      .setTitle('Seleziona Cartella Google Drive')
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN, false)
      .enableFeature(window.google.picker.Feature.SUPPORT_TEAM_DRIVES)
      .addView(createPickerView(window.google.picker.ViewId.FOLDERS))
      .addView(createPickerView(window.google.picker.ViewId.RECENT))
      .addView(createPickerView(window.google.picker.ViewId.DOCS))
      .addView(createPickerView(window.google.picker.ViewId.SHARED_WITH_ME))
      .setCallback(pickerCallback);

    const picker = builder.build();
    picker.setVisible(true);
    setIsLoading(false);
  };

  const pickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      
      // Verifica che sia una cartella
      if (doc.mimeType === 'application/vnd.google-apps.folder') {
        onFolderSelected(doc.id, doc.name);
        toast({
          title: 'Cartella selezionata',
          description: `Cartella "${doc.name}" selezionata con successo`,
        });
      } else {
        toast({
          title: 'Selezione non valida',
          description: 'Per favore seleziona una cartella, non un file',
          variant: 'destructive'
        });
      }
      setIsLoading(false);
      onPickerClosed?.(); // Notifica che il picker è stato chiuso
    } else if (data.action === window.google.picker.Action.CANCEL) {
      setIsLoading(false);
      onPickerClosed?.(); // Notifica che il picker è stato chiuso/cancellato
    }
  };

  const handleAuthAndOpen = async () => {
    if (!isApiReady || disabled) return;
    
    // Se richiede autorizzazione backend e non è disponibile la callback, avvia l'autorizzazione backend
    if (requiresBackendAuth && onAuthRequired) {
      setIsLoading(true);
      
      toast({
        title: 'Autorizzazione in corso',
        description: 'Completando l\'autorizzazione con Google Drive...',
      });
      
      // Chiama la callback per avviare l'autorizzazione backend
      onAuthRequired();
      
      // Il loading verrà fermato quando l'autorizzazione backend è completata
      return;
    }
    
    setIsLoading(true);

    try {
      // Prima prova a ottenere l'access token dal backend se disponibile
      if (!requiresBackendAuth) {
        const backendAccessToken = await getAccessTokenFromBackend(true);
        
        if (backendAccessToken) {
          // Usa il token dal backend - non serve autorizzazione frontend
          accessTokenRef.current = backendAccessToken;
          
          toast({
            title: 'Connessione riuscita',
            description: 'Apertura Google Picker con token esistente...',
          });
          
          setTimeout(() => {
            openPicker(backendAccessToken);
          }, 500); // Breve ritardo per mostrare il messaggio
          return;
        } else {
          console.log('⚠️ Nessun token backend disponibile, procedendo con OAuth frontend');
        }
      } else {
        console.log('🔄 Richiesta autorizzazione backend in corso, saltando tentativo token backend');
      }
      
      // Fallback: se non c'è token dal backend, usa Google Identity Services  
      if (!accessTokenRef.current) {
        // Inizializza il token client
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              console.error('Errore OAuth:', response.error);
              toast({
                title: 'Errore di Autorizzazione',
                description: 'Impossibile accedere a Google Drive',
                variant: 'destructive'
              });
              setIsLoading(false);
              return;
            }
            
            // Ritarda leggermente l'apertura del picker per permettere il completamento delle operazioni backend
            toast({
              title: 'Connessione riuscita',
              description: 'Apertura Google Picker...',
            });
            
            setTimeout(() => {
              accessTokenRef.current = response.access_token;
              openPicker(response.access_token);
            }, 1500); // Ritardo di 1.5 secondi per permettere il completamento dell'autorizzazione
          }
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        openPicker(accessTokenRef.current);
      }
    } catch (error) {
      console.error('Errore durante l\'autenticazione:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile connettersi a Google Drive',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAuthAndOpen}
      disabled={disabled || isLoading || !isApiReady}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {requiresBackendAuth && onAuthRequired ? 'Autorizzazione in corso...' : 'Apertura Google Picker...'}
        </>
      ) : (
        <>
          <FolderOpen className="h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
});

GoogleDrivePicker.displayName = 'GoogleDrivePicker';

export default GoogleDrivePicker;

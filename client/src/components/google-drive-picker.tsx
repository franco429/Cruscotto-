import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { Loader2, FolderOpen } from 'lucide-react';

interface GoogleDrivePickerProps {
  onFolderSelected: (folderId: string, folderName: string) => void;
  disabled?: boolean;
  buttonText?: string;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export default function GoogleDrivePicker({ 
  onFolderSelected, 
  disabled = false,
  buttonText = "Seleziona Cartella da Drive"
}: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const accessTokenRef = useRef<string | null>(null);
  const { toast } = useToast();

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const DEVELOPER_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

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
    } else if (data.action === window.google.picker.Action.CANCEL) {
      setIsLoading(false);
    }
  };

  const handleAuthAndOpen = async () => {
    if (!isApiReady || disabled) return;
    
    setIsLoading(true);

    try {
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
            
            accessTokenRef.current = response.access_token;
            openPicker(response.access_token);
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
          Apertura Google Picker...
        </>
      ) : (
        <>
          <FolderOpen className="h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
}

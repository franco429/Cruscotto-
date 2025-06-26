import { createHmac } from 'crypto';
import { mongoStorage as storage } from './mongo-storage';

// Forza la configurazione di LINK_SECRET_KEY in produzione
const SECRET_KEY = process.env.LINK_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error('LINK_SECRET_KEY deve essere configurata nelle variabili d\'ambiente. Questa chiave è critica per la sicurezza dei link condivisi.');
}

// Assicuriamoci che la chiave sia abbastanza lunga per la sicurezza
if (SECRET_KEY.length < 32) {
  throw new Error('LINK_SECRET_KEY deve essere di almeno 32 caratteri per garantire la sicurezza.');
}

const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 ore in millisecondi

/**
 * Genera un link sicuro con scadenza per un documento o un'azione
 * @param documentId ID del documento o null se è un link per reset password
 * @param userId ID dell'utente che ha generato il link
 * @param action Tipo di azione ('view', 'download', 'reset-password')
 * @param expiryMs Durata di validità del link in millisecondi
 * @returns URL sicuro con token di validazione e timestamp di scadenza
 */
export function generateSecureLink(
  documentId: number | null,
  userId: number,
  action: string,
  expiryMs: number = DEFAULT_EXPIRY
): string {
  // Genera un timestamp di scadenza
  const expires = Date.now() + expiryMs;
  
  // Dati da includere nel token
  const data = {
    documentId,
    userId,
    action,
    expires
  };
  
  // Converti in stringa per la firma
  const dataString = JSON.stringify(data);
  const dataBuffer = Buffer.from(dataString);
  const encodedData = dataBuffer.toString('base64');
  
  // Genera la firma HMAC
  const hmac = createHmac('sha256', SECRET_KEY);
  hmac.update(`${encodedData}.${expires}`);
  const signature = hmac.digest('base64url');
  
  // Registra il link nel log
  if (userId) {
    storage.createLog({
      userId,
      action: 'create-secure-link',
      documentId: documentId || undefined,
      details: {
        action,
        expires: new Date(expires).toISOString(),
        timestamp: new Date().toISOString()
      }
    }).catch(err => {
      // In produzione, questo errore andrebbe gestito da un sistema di logging centralizzato.
    });
  }
  
  // Restituisci l'URL completo
  return `/api/secure/${encodedData}/${expires}/${signature}`;
}

/**
 * Verifica un link sicuro
 * @param encodedData Dati codificati in base64
 * @param expires Timestamp di scadenza
 * @param signature Firma HMAC
 * @returns Dati del link se valido, altrimenti null
 */
export function verifySecureLink(
  encodedData: string,
  expires: string,
  signature: string
): { documentId: number | null; userId: number; action: string; expires: number } | null {
  // Validazione input rigorosa
  if (!encodedData || !expires || !signature) {
    console.warn('verifySecureLink: Parametri mancanti', { 
      hasData: !!encodedData, 
      hasExpires: !!expires, 
      hasSignature: !!signature 
    });
    return null;
  }

  // Validazione formato della firma (deve essere base64url)
  if (!/^[A-Za-z0-9_-]+$/.test(signature)) {
    console.warn('verifySecureLink: Formato firma non valido');
    return null;
  }

  // Verifica se il link è scaduto
  const expiryTime = parseInt(expires, 10);
  if (isNaN(expiryTime) || Date.now() > expiryTime) {
    console.warn('verifySecureLink: Link scaduto', { 
      expiryTime, 
      currentTime: Date.now(),
      difference: Date.now() - expiryTime 
    });
    return null; // Link scaduto
  }

  // Verifica la firma HMAC con timing attack protection
  const hmac = createHmac('sha256', SECRET_KEY);
  hmac.update(`${encodedData}.${expires}`);
  const expectedSignature = hmac.digest('base64url');
  
  // Confronto sicuro delle firme (timing attack resistant)
  if (signature.length !== expectedSignature.length) {
    console.warn('verifySecureLink: Lunghezza firma non valida');
    return null;
  }
  
  // Confronto costante nel tempo per prevenire timing attacks
  let isValid = true;
  for (let i = 0; i < signature.length; i++) {
    if (signature.charCodeAt(i) !== expectedSignature.charCodeAt(i)) {
      isValid = false;
    }
  }
  
  if (!isValid) {
    console.warn('verifySecureLink: Firma HMAC non valida');
    return null; // Firma non valida
  }
  
  try {
    // Decodifica i dati con validazione aggiuntiva
    const dataBuffer = Buffer.from(encodedData, 'base64');
    const dataString = dataBuffer.toString();
    
    // Validazione JSON
    if (!dataString.startsWith('{') || !dataString.endsWith('}')) {
      console.warn('verifySecureLink: Formato dati non valido');
      return null;
    }
    
    const data = JSON.parse(dataString);
    
    // Validazione struttura dati
    if (!data || typeof data !== 'object') {
      console.warn('verifySecureLink: Struttura dati non valida');
      return null;
    }
    
    if (typeof data.userId !== 'number' || typeof data.action !== 'string') {
      console.warn('verifySecureLink: Campi obbligatori mancanti o non validi');
      return null;
    }
    
    // Validazione azioni consentite
    const allowedActions = ['view', 'download', 'reset-password'];
    if (!allowedActions.includes(data.action)) {
      console.warn('verifySecureLink: Azione non consentita', { action: data.action });
      return null;
    }
    
    return {
      documentId: data.documentId,
      userId: data.userId,
      action: data.action,
      expires: expiryTime
    };
  } catch (error) {
    console.error('verifySecureLink: Errore durante la decodifica dei dati:', error);
    return null;
  }
}

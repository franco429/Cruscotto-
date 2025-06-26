import { EventEmitter } from 'events';

// Esportiamo una singola istanza che verrà condivisa da tutta l'applicazione
export const appEvents = new EventEmitter(); 
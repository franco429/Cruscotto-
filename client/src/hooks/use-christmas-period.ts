import { useState, useEffect } from "react";

/**
 * Hook personalizzato per verificare se siamo nel periodo natalizio
 * Periodo: 8 dicembre - 6 gennaio di ogni anno
 * 
 * Per testare in sviluppo, imposta VITE_FORCE_CHRISTMAS=true nel .env
 */
export function useChristmasPeriod(): boolean {
  const [isChristmasPeriod, setIsChristmasPeriod] = useState(false);

  useEffect(() => {
    const checkPeriod = () => {
      // Controllo per forzare il periodo natalizio in sviluppo
      if (import.meta.env.VITE_FORCE_CHRISTMAS === 'true') {
        setIsChristmasPeriod(true);
        return;
      }

      const now = new Date();
      const month = now.getMonth() + 1; // getMonth() restituisce 0-11
      const day = now.getDate();

      // Dal 8 dicembre al 31 dicembre
      if (month === 12 && day >= 8) {
        setIsChristmasPeriod(true);
        return;
      }

      // Dal 1 gennaio al 6 gennaio (Epifania)
      if (month === 1 && day <= 6) {
        setIsChristmasPeriod(true);
        return;
      }

      setIsChristmasPeriod(false);
    };

    // Controlla subito
    checkPeriod();

    // Controlla ogni ora se siamo entrati/usciti dal periodo natalizio
    // Questo permette all'app di reagire anche se lasciata aperta per giorni
    const interval = setInterval(checkPeriod, 3600000); // 1 ora = 3600000ms

    return () => clearInterval(interval);
  }, []);

  return isChristmasPeriod;
}

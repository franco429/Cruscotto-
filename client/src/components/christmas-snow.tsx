import { useEffect, useState } from "react";
import { useChristmasPeriod } from "../hooks/use-christmas-period";

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  opacity: number;
  size: number;
  delay: number;
}

interface FallingItem {
  id: number;
  left: number;
  animationDuration: number;
  delay: number;
  type: 'gift' | 'star' | 'bell';
}

/**
 * Componente per le animazioni natalizie
 * Si attiva automaticamente dal 8 dicembre al 6 gennaio di ogni anno
 * 
 * Per testare in sviluppo: aggiungi VITE_FORCE_CHRISTMAS=true nel file .env
 */
export default function ChristmasSnow() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [fallingItems, setFallingItems] = useState<FallingItem[]>([]);
  const isChristmasPeriod = useChristmasPeriod();

  useEffect(() => {
    // Crea le animazioni solo se siamo nel periodo natalizio
    if (!isChristmasPeriod) return;

    // Log informativo in sviluppo
    if (import.meta.env.DEV) {
      
    }

    // Crea 60 fiocchi di neve con proprietà randomizzate
    const flakes: Snowflake[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: Math.random() * 3 + 2,
      opacity: Math.random() * 0.6 + 0.3,
      size: Math.random() * 10 + 4,
      delay: Math.random() * 5,
    }));
    setSnowflakes(flakes);

    // Crea elementi natalizi che cadono (regali, stelle, campanelle)
    const items: FallingItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: Math.random() * 5 + 8, // Cadono più lentamente (8-13 secondi)
      delay: Math.random() * 10,
      type: ['gift', 'star', 'bell'][Math.floor(Math.random() * 3)] as 'gift' | 'star' | 'bell',
    }));
    setFallingItems(items);
  }, [isChristmasPeriod]);

  const renderFallingItem = (item: FallingItem) => {
    switch (item.type) {
      case 'gift':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="text-red-500 drop-shadow-lg">
            <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 drop-shadow-lg">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      case 'bell':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor" className="text-amber-500 drop-shadow-lg">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
          </svg>
        );
    }
  };

  // Non renderizzare nulla se non siamo nel periodo natalizio
  if (!isChristmasPeriod) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Fiocchi di neve */}
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute animate-snowfall"
          style={{
            left: `${flake.left}%`,
            top: "-10%",
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-blue-400 dark:text-white drop-shadow-md"
          >
            <path d="M12 0L13.5 4.5L18 3L15 7.5L19.5 9L15 10.5L18 15L13.5 13.5L12 18L10.5 13.5L6 15L9 10.5L4.5 9L9 7.5L6 3L10.5 4.5L12 0Z" />
          </svg>
        </div>
      ))}

      {/* Elementi natalizi che cadono */}
      {fallingItems.map((item) => (
        <div
          key={`item-${item.id}`}
          className="absolute animate-falling-items"
          style={{
            left: `${item.left}%`,
            top: "-10%",
            width: "24px",
            height: "24px",
            animationDuration: `${item.animationDuration}s`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {renderFallingItem(item)}
        </div>
      ))}
      
      {/* Luci natalizie in alto */}
      <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={`light-${i}`}
            className="w-3 h-3 rounded-full animate-twinkle"
            style={{
              backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#ff6b6b'][i % 6],
              animationDelay: `${i * 0.15}s`,
              boxShadow: `0 0 12px ${['#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#ff6b6b'][i % 6]}`,
            }}
          />
        ))}
      </div>

      {/* Stelle comete */}
      <div className="absolute top-10 left-0 w-full h-32">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={`comet-${i}`}
            className="absolute animate-shooting-star"
            style={{
              top: `${i * 40}px`,
              animationDelay: `${i * 4}s`,
              animationDuration: '3s',
            }}
          >
            <div className="relative">
              <div className="w-2 h-2 bg-yellow-300 dark:bg-yellow-200 rounded-full shadow-lg shadow-yellow-400" />
              <div className="absolute top-1/2 left-0 w-12 h-px bg-gradient-to-r from-yellow-300 dark:from-yellow-200 to-transparent -translate-y-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Particelle scintillanti sparse */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 bg-blue-300 dark:bg-white rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

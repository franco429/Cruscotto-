import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOConfig {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}

/**
 * Hook per gestire SEO meta tags dinamici
 */
export function useSEO(config: SEOConfig) {
  const [location] = useLocation();
  
  useEffect(() => {
    // Base URL del sito (sempre HTTPS senza www)
    const baseUrl = 'https://cruscotto-sgi.com';
    
    // URL canonico: se specificato usa quello, altrimenti costruiscilo dalla location
    const canonicalUrl = config.canonicalUrl || `${baseUrl}${location}`;
    
    // Imposta o aggiorna il title
    if (config.title) {
      document.title = config.title;
    }
    
    // Gestisce meta description
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (config.description) {
      if (!descriptionMeta) {
        descriptionMeta = document.createElement('meta');
        descriptionMeta.setAttribute('name', 'description');
        document.head.appendChild(descriptionMeta);
      }
      descriptionMeta.setAttribute('content', config.description);
    }
    
    // Gestisce canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
    
    // Gestisce robots noindex
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (config.noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex,nofollow');
    } else {
      // Rimuovi noindex se non necessario
      if (robotsMeta) {
        robotsMeta.remove();
      }
    }
    
    // Open Graph meta tags
    const updateOGMeta = (property: string, content: string) => {
      let ogMeta = document.querySelector(`meta[property="${property}"]`);
      if (!ogMeta) {
        ogMeta = document.createElement('meta');
        ogMeta.setAttribute('property', property);
        document.head.appendChild(ogMeta);
      }
      ogMeta.setAttribute('content', content);
    };
    
    if (config.title) {
      updateOGMeta('og:title', config.title);
    }
    if (config.description) {
      updateOGMeta('og:description', config.description);
    }
    updateOGMeta('og:url', canonicalUrl);
    updateOGMeta('og:type', 'website');
    
  }, [location, config.title, config.description, config.canonicalUrl, config.noindex]);
}

/**
 * Hook semplificato per pagine standard
 */
export function usePageSEO(title: string, description?: string) {
  useSEO({
    title: `${title} | Pannello di Controllo SGI`,
    description,
  });
}

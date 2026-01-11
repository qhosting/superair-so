import React, { useEffect } from 'react';

declare global {
  interface Window {
    chatwootSDK: any;
    $chatwoot: any;
  }
}

const ChatwootWidget: React.FC = () => {
  useEffect(() => {
    // En producción, este token vendría de variables de entorno o configuración de backend
    // Si no hay token, no cargamos el widget para evitar errores
    const WEBSITE_TOKEN = ''; // Dejar vacío si no se tiene uno activo para evitar errores visuales
    const BASE_URL = 'https://app.chatwoot.com';

    if (!WEBSITE_TOKEN) return;

    // Load Chatwoot Script
    (function(d, t) {
      var g = d.createElement(t) as HTMLScriptElement;
      var s = d.getElementsByTagName(t)[0];
      g.src = BASE_URL + "/packs/js/sdk.js";
      g.defer = true;
      g.async = true;
      s.parentNode?.insertBefore(g, s);
      
      g.onload = function() {
        if (window.chatwootSDK) {
            window.chatwootSDK.run({
                websiteToken: WEBSITE_TOKEN,
                baseUrl: BASE_URL
            });
        }
      };
    })(document, "script");

  }, []);

  return null; // El widget se inyecta solo en el DOM
};

export default ChatwootWidget;
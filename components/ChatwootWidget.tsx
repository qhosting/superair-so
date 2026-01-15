
import React, { useEffect } from 'react';

declare global {
  interface Window {
    chatwootSDK: any;
    $chatwoot: any;
  }
}

const ChatwootWidget: React.FC = () => {
  useEffect(() => {
    // Configuración desde el entorno o valores por defecto seguros
    const WEBSITE_TOKEN = ''; // Se mantiene vacío por seguridad hasta configuración de usuario
    const BASE_URL = 'https://app.chatwoot.com';

    if (!WEBSITE_TOKEN) return;

    const loadChatwoot = () => {
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
                    console.log('💬 Chatwoot integration active');
                }
            };
        })(document, "script");
    };

    // Delay load to prioritize ERP main performance
    const timer = setTimeout(loadChatwoot, 3000);
    return () => clearTimeout(timer);

  }, []);

  return null;
};

export default ChatwootWidget;

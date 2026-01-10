import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

// --- ROUTER SHIM (Replazo de react-router-dom) ---
// Agregado para solucionar errores de módulos faltantes en entornos restringidos

const LocationContext = createContext<{ pathname: string; search: string; hash: string }>({ pathname: '/', search: '', hash: '' });
const NavigateContext = createContext<(to: string | number, options?: any) => void>(() => {});

export const useLocation = () => useContext(LocationContext);
export const useNavigate = () => useContext(NavigateContext);

export const HashRouter: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Helper to parse path from a hash string (e.g. "/dashboard")
  const parseHash = (hash: string) => {
    // Remove leading # if present
    const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
    const [pathname, search] = cleanHash.split('?');
    return { 
        pathname: pathname || '/', 
        search: search ? '?' + search : '', 
        hash: hash 
    };
  };

  const [loc, setLoc] = useState(() => {
    if (typeof window === 'undefined') return { pathname: '/', search: '', hash: '' };
    try {
        // Try to read initial hash
        return parseHash(window.location.hash || '#/');
    } catch (e) {
        // Fallback if reading location fails (e.g. restricted environment)
        return { pathname: '/', search: '', hash: '#/' };
    }
  });

  useEffect(() => {
    const handler = () => {
       try {
           setLoc(parseHash(window.location.hash || '#/'));
       } catch (e) {
           // Ignore errors reading hash
       }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (to: string | number) => {
      if (typeof to === 'number') {
          try {
             window.history.go(to);
          } catch(e) {
             // Ignore history errors
          }
          return;
      }
      
      const target = to.toString().startsWith('/') ? to.toString() : '/' + to.toString();
      
      // 1. Update React State (Memory Router) - Critical for restricted environments
      setLoc(parseHash(target));

      // 2. Try to update URL Hash (Sync) - Might fail in Blob/Sandboxes
      try {
          window.location.hash = '#' + target;
      } catch (e) {
          console.warn('Navigation hash update failed (restricted environment). App will function in memory mode.');
      }
  };

  return (
    <LocationContext.Provider value={loc}>
      <NavigateContext.Provider value={navigate}>
        {children}
      </NavigateContext.Provider>
    </LocationContext.Provider>
  );
};

export const Routes: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  let element: ReactNode = null;
  
  React.Children.forEach(children, (child) => {
    if (element) return;
    if (React.isValidElement(child)) {
      const props = child.props as any;
      if (props.path === '*' || props.path === pathname) {
        element = props.element;
      }
    }
  });
  
  return <>{element}</>;
};

export const Route: React.FC<{ path: string; element: ReactNode }> = ({ element }) => <>{element}</>;

export const Navigate: React.FC<{ to: string; state?: any }> = ({ to }) => {
  const navigate = useNavigate();
  useEffect(() => { navigate(to); }, [to, navigate]);
  return null;
};

export const Link: React.FC<any> = ({ to, children, className, ...props }) => {
  const navigate = useNavigate();
  return (
    <a 
      href={`#${to}`} 
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
};

// --- AUTH CONTEXT ---

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, remember: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

// === CONFIGURACIÓN DE PRODUCCIÓN ===
const IS_DEV_MODE = false; // ✅ PROD MODE: Requiere autenticación real

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificación de sesión real
    const localUser = localStorage.getItem('superair_user');
    if (localUser) {
      try {
        setUser(JSON.parse(localUser));
      } catch (e) {
        console.error("Error parsing user data");
        localStorage.removeItem('superair_user');
      }
      setIsLoading(false);
      return;
    }

    const sessionUser = sessionStorage.getItem('superair_user');
    if (sessionUser) {
      try {
        setUser(JSON.parse(sessionUser));
      } catch (e) {
        sessionStorage.removeItem('superair_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (userData: User, remember: boolean) => {
    setUser(userData);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('superair_user', JSON.stringify(userData));
    // Limpiar el otro storage para evitar duplicados/conflictos
    (remember ? sessionStorage : localStorage).removeItem('superair_user');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('superair_user');
    sessionStorage.removeItem('superair_user');
    localStorage.removeItem('superair_auth');
    // Forzar recarga o redirección si es necesario, aunque el ProtectedRoute manejará esto
    window.location.hash = '#/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
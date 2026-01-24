import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';

// --- ROUTER SHIM ---
const LocationContext = createContext<{ pathname: string; search: string; hash: string }>({ pathname: '/', search: '', hash: '' });
const NavigateContext = createContext<(to: string | number, options?: any) => void>(() => {});

export const useLocation = () => useContext(LocationContext);
export const useNavigate = () => useContext(NavigateContext);

export const HashRouter: React.FC<{ children: ReactNode }> = ({ children }) => {
  const parseHash = (hash: string) => {
    const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
    const [pathname, search] = cleanHash.split('?');
    const normalizedPath = pathname.startsWith('/') ? pathname : '/' + pathname;
    return { pathname: normalizedPath || '/', search: search ? '?' + search : '', hash: hash };
  };

  const [loc, setLoc] = useState(() => parseHash(window.location.hash || '#/'));

  React.useEffect(() => {
    const handler = () => setLoc(parseHash(window.location.hash || '#/'));
    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('popstate', handler);
    };
  }, []);

  const navigate = (to: string | number) => {
      if (typeof to === 'number') { 
          try { window.history.go(to); } catch(e) {}
          return; 
      }
      const target = to.toString().startsWith('/') ? to.toString() : '/' + to.toString();
      const newHash = '#' + target;
      if (window.location.hash !== newHash) {
        // Usamos history API para evitar el error de setter bloqueado en ciertos entornos
        window.history.pushState(null, '', newHash);
        window.dispatchEvent(new Event('hashchange'));
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
  const childrenArray = React.Children.toArray(children);
  let element: ReactNode = null;

  for (const child of childrenArray) {
    if (React.isValidElement(child)) {
      const { path } = child.props as any;
      if (path === pathname) {
        element = (child.props as any).element;
        break;
      }
      if (path?.includes(':')) {
        const base = path.split('/:')[0];
        if (pathname.startsWith(base) && base !== '') {
          element = (child.props as any).element;
          break;
        }
      }
    }
  }

  if (!element) {
    const wildcard = childrenArray.find(child => React.isValidElement(child) && (child.props as any).path === '*');
    if (wildcard && React.isValidElement(wildcard)) {
      element = wildcard.props.element;
    }
  }

  return <>{element}</>;
};

export const Route: React.FC<{ path: string; element: ReactNode }> = ({ element }) => <>{element}</>;

export const Navigate: React.FC<{ to: string; state?: any }> = ({ to }) => {
  const navigate = useNavigate();
  React.useEffect(() => { navigate(to); }, [to, navigate]);
  return null;
};

export const Link: React.FC<any> = ({ to, children, className, ...props }) => {
  const navigate = useNavigate();
  return <a href={`#${to}`} onClick={(e) => { e.preventDefault(); navigate(to); }} className={className} {...props}>{children}</a>;
};

// --- AUTH CONTEXT ---
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any, remember: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
      const stored = localStorage.getItem('superair_user');
      if (stored) {
          try { return JSON.parse(stored); } catch (e) { return null; }
      }
      return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = (data: any) => {
      if (data.token) localStorage.setItem('superair_token', data.token);
      if (data.user) {
          localStorage.setItem('superair_user', JSON.stringify(data.user));
          // Sincronización inmediata de estado para evitar que ProtectedRoute falle
          setUser(data.user);
      }
  };

  const logout = () => { 
    localStorage.removeItem('superair_token');
    localStorage.removeItem('superair_user');
    setUser(null); 
    // Usamos history API para evitar el error de setter bloqueado
    window.history.replaceState(null, '', '#/login');
    window.dispatchEvent(new Event('hashchange'));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
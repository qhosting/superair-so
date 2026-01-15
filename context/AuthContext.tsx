
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

// --- ROUTER SHIM (Replazo de react-router-dom) ---
const LocationContext = createContext<{ pathname: string; search: string; hash: string }>({ pathname: '/', search: '', hash: '' });
const NavigateContext = createContext<(to: string | number, options?: any) => void>(() => {});

export const useLocation = () => useContext(LocationContext);
export const useNavigate = () => useContext(NavigateContext);

export const HashRouter: React.FC<{ children: ReactNode }> = ({ children }) => {
  const parseHash = (hash: string) => {
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
        return parseHash(window.location.hash || '#/');
    } catch (e) {
        return { pathname: '/', search: '', hash: '#/' };
    }
  });

  useEffect(() => {
    const handler = () => {
       try {
           setLoc(parseHash(window.location.hash || '#/'));
       } catch (e) { }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (to: string | number) => {
      if (typeof to === 'number') {
          try { window.history.go(to); } catch(e) {}
          return;
      }
      const target = to.toString().startsWith('/') ? to.toString() : '/' + to.toString();
      setLoc(parseHash(target));
      try { window.location.hash = '#' + target; } catch (e) { console.warn('Navigation hash update failed'); }
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
    <a href={`#${to}`} onClick={(e) => { e.preventDefault(); navigate(to); }} className={className} {...props}>
      {children}
    </a>
  );
};

// --- AUTH CONTEXT ---

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { user: User, token?: string }, remember: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
        const localUser = localStorage.getItem('superair_user');
        if (localUser) {
          try {
            setUser(JSON.parse(localUser));
          } catch (e) {
            localStorage.removeItem('superair_user');
          }
        } else {
            const sessionUser = sessionStorage.getItem('superair_user');
            if (sessionUser) {
              try {
                setUser(JSON.parse(sessionUser));
              } catch (e) {
                sessionStorage.removeItem('superair_user');
              }
            }
        }
        setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (data: { user: User, token?: string }, remember: boolean) => {
    setUser(data.user);
    const storage = remember ? localStorage : sessionStorage;
    
    // Store User Data
    storage.setItem('superair_user', JSON.stringify(data.user));
    
    // Store Security Token separately for Interceptor
    if (data.token) {
        storage.setItem('superair_token', data.token);
    }

    // Clean other storage
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem('superair_user');
    otherStorage.removeItem('superair_token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('superair_user');
    localStorage.removeItem('superair_token');
    sessionStorage.removeItem('superair_user');
    sessionStorage.removeItem('superair_token');
    window.location.hash = '#/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

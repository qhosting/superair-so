
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
    return { pathname: pathname || '/', search: search ? '?' + search : '', hash: hash };
  };

  const [loc, setLoc] = useState(() => parseHash(window.location.hash || '#/'));

  React.useEffect(() => {
    const handler = () => setLoc(parseHash(window.location.hash || '#/'));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (to: string | number) => {
      if (typeof to === 'number') { 
          try { window.history.go(to); } catch(e) {}
          return; 
      }
      
      const target = to.toString().startsWith('/') ? to.toString() : '/' + to.toString();
      
      // Primero actualizamos el estado interno para que la UI reaccione inmediatamente
      setLoc(parseHash(target));
      
      // Intentamos actualizar la URL real, pero fallamos silenciosamente si el navegador lo bloquea
      try {
          if (window.location.hash !== '#' + target) {
            window.location.hash = '#' + target;
          }
      } catch (e) {
          console.warn('La navegación por Hash fue bloqueada por el navegador, usando solo estado interno.', e);
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
// --- FIX: Added state prop to Navigate component to avoid TS error in App.tsx ---
export const Navigate: React.FC<{ to: string; state?: any }> = ({ to }) => {
  const navigate = useNavigate();
  React.useEffect(() => { navigate(to); }, [to]);
  return null;
};
export const Link: React.FC<any> = ({ to, children, className, ...props }) => {
  const navigate = useNavigate();
  return <a href={`#${to}`} onClick={(e) => { e.preventDefault(); navigate(to); }} className={className} {...props}>{children}</a>;
};

// --- AUTH CONTEXT (FORCED BYPASS) ---
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any, remember: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

const DEV_USER: User = {
    id: '1',
    name: 'Admin SuperAir',
    email: 'admin@superair.com.mx',
    role: UserRole.SUPER_ADMIN,
    status: 'Activo',
    lastLogin: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // bypass: Iniciamos logueados al 100%
  const [user, setUser] = useState<User | null>(DEV_USER);

  const login = (data: any) => setUser(data.user);
  const logout = () => { 
    setUser(null); 
    try {
        window.location.hash = '#/login';
    } catch(e) {}
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from './context/AuthContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Loader2 } from 'lucide-react';
import ChatwootWidget from './components/ChatwootWidget';

// Public Modules
import LandingPage from './modules/LandingPage';
import Login from './modules/Login';
import Maintenance from './modules/Maintenance';

// Protected Modules
import Layout from './components/Layout';
import Dashboard from './modules/Dashboard';
import Clients from './modules/Clients';
import Quotes from './modules/Quotes';
import Inventory from './modules/Inventory';
import Sales from './modules/Sales';
import Appointments from './modules/Appointments';
import Settings from './modules/Settings';
import Users from './modules/Users';
import LandingBuilder from './modules/LandingBuilder';
import Reports from './modules/Reports';
import Leads from './modules/Leads';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
          Verificando Credenciales...
        </p>
      </div>
    );
  }

  // Lógica Reforzada: Se requiere estar autenticado Y tener un objeto de usuario válido
  if (!isAuthenticated || !user) {
    // Redirige al login guardando la ubicación intentada en el estado
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes: React.FC = () => {
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    // Check maintenance mode from local storage (set in Settings)
    const checkMaintenance = () => {
      const maintenanceStatus = localStorage.getItem('superair_is_published') === 'false';
      setIsMaintenance(maintenanceStatus);
    };
    
    checkMaintenance();
    window.addEventListener('storage', checkMaintenance);
    return () => window.removeEventListener('storage', checkMaintenance);
  }, []);

  return (
    <>
      <ChatwootWidget />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={isMaintenance ? <Maintenance /> : <LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/maintenance" element={<Maintenance />} />

        {/* Protected Dashboard Routes - Wrapped individually for granular security */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/builder" element={<ProtectedRoute><LandingBuilder /></ProtectedRoute>} />

        {/* Fallback - Redirect to root */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
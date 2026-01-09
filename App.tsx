
import React from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './modules/Dashboard';
import LandingBuilder from './modules/LandingBuilder';
import LandingPage from './modules/LandingPage';
import Login from './modules/Login';
import Clients from './modules/Clients';
import Inventory from './modules/Inventory';
import Quotes from './modules/Quotes';
import Sales from './modules/Sales';
import Appointments from './modules/Appointments';
import Users from './modules/Users';
import Settings from './modules/Settings';
import Maintenance from './modules/Maintenance';
import { AppRoute } from './types';

// Componente para proteger las rutas administrativas
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('superair_auth') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Componente para manejar la visualización pública principal
const PublicHomeHandler: React.FC = () => {
  const isPublished = localStorage.getItem('superair_is_published') !== 'false';
  if (!isPublished) return <Maintenance />;
  return <LandingPage />;
};

const App: React.FC = () => {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path="/" element={<PublicHomeHandler />} />
        <Route path="/login" element={<Login />} />
        <Route path="/live" element={<LandingPage />} />
        
        {/* RUTAS ADMINISTRATIVAS (PROTEGIDAS) */}
        <Route path={`/${AppRoute.DASHBOARD}`} element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.BUILDER}`} element={<PrivateRoute><Layout><LandingBuilder /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.CLIENTS}`} element={<PrivateRoute><Layout><Clients /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.INVENTORY}`} element={<PrivateRoute><Layout><Inventory /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.QUOTES}`} element={<PrivateRoute><Layout><Quotes /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.SALES}`} element={<PrivateRoute><Layout><Sales /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.APPOINTMENTS}`} element={<PrivateRoute><Layout><Appointments /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.USERS}`} element={<PrivateRoute><Layout><Users /></Layout></PrivateRoute>} />
        <Route path={`/${AppRoute.SETTINGS}`} element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />

        <Route path="/admin" element={<Navigate to={`/${AppRoute.DASHBOARD}`} />} />
      </Routes>
    </MemoryRouter>
  );
};

export default App;

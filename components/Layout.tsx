
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Construction, 
  Users, 
  FileText, 
  Package, 
  Calendar, 
  Settings, 
  Menu, 
  X,
  Wind,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { AppRoute } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: AppRoute.DASHBOARD },
    { name: 'Constructor Web', icon: Construction, route: AppRoute.BUILDER },
    { name: 'Clientes', icon: Users, route: AppRoute.CLIENTS },
    { name: 'Cotizaciones', icon: FileText, route: AppRoute.QUOTES },
    { name: 'Ventas y Órdenes', icon: ShoppingBag, route: AppRoute.SALES },
    { name: 'Inventario', icon: Package, route: AppRoute.INVENTORY },
    { name: 'Citas e Instalación', icon: Calendar, route: AppRoute.APPOINTMENTS },
    { name: 'Usuarios y Roles', icon: ShieldCheck, route: AppRoute.USERS },
    { name: 'Configuración', icon: Settings, route: AppRoute.SETTINGS },
  ];

  const currentPath = location.pathname.split('/').filter(Boolean)[0];
  const activeRoute = currentPath || AppRoute.DASHBOARD;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col h-full z-20`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800 h-16 shrink-0">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-sky-400">
              <Wind className="w-6 h-6" />
              <span>SuperAir</span>
            </div>
          )}
          {!isSidebarOpen && <Wind className="w-8 h-8 text-sky-400 mx-auto" />}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = activeRoute === item.route;
            const Icon = item.icon;
            return (
              <Link
                key={item.route}
                to={`/${item.route}`}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon size={20} className="shrink-0" />
                {isSidebarOpen && <span className="font-medium truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
            {menuItems.find(m => m.route === activeRoute)?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4 text-slate-500 text-sm font-bold">
            <span className="hidden md:inline">Status: <span className="text-emerald-500 animate-pulse">Online</span></span>
            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-black">SA</div>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">{children}</div>
        </section>
      </main>
    </div>
  );
};

export default Layout;

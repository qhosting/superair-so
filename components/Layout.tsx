import React, { useState, useEffect } from 'react';
import { Link, useLocation } from '../context/AuthContext';
import { 
  LayoutDashboard, Construction, Users, FileText, Package, Calendar, Settings, Menu, X, Wind,
  ShieldCheck, ShoppingBag, BarChart3, LogOut, Bell, CheckCircle2, AlertTriangle, Info, Magnet
} from 'lucide-react';
import { AppRoute } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AdminChat from './AdminChat';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead, toasts, removeToast } = useNotification();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem('superair_logo'));
  const location = useLocation();

  useEffect(() => {
      const handleStorage = () => setLogoUrl(localStorage.getItem('superair_logo'));
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: AppRoute.DASHBOARD },
    { name: 'Leads y Prospectos', icon: Magnet, route: AppRoute.LEADS }, // Asegurado aquí
    { name: 'Reportes e Insights', icon: BarChart3, route: AppRoute.REPORTS },
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

  const userInitials = user?.name 
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'SA';

  const handleNotifClick = () => {
    setShowNotifDropdown(!showNotifDropdown);
    if (!showNotifDropdown && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 relative">
      
      {/* TOAST CONTAINER */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 cursor-pointer ${
                t.type === 'success' ? 'bg-slate-900 text-white' : 
                t.type === 'error' ? 'bg-rose-600 text-white' : 
                'bg-white text-slate-800 border border-slate-200'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 size={20} className="text-emerald-400" />}
            {t.type === 'error' && <AlertTriangle size={20} />}
            {t.type === 'info' && <Info size={20} className="text-sky-500" />}
            <span className="font-bold text-xs uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>

      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col h-full z-20`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800 h-16 shrink-0">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-sky-400">
              {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="max-h-8 object-contain" />
              ) : (
                  <>
                    <Wind className="w-6 h-6" />
                    <span>SuperAir</span>
                  </>
              )}
            </div>
          )}
          {!isSidebarOpen && (logoUrl ? <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain mx-auto" /> : <Wind className="w-8 h-8 text-sky-400 mx-auto" />)}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
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

        <div className="p-4 border-t border-slate-800 shrink-0">
            <button 
                onClick={logout}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
            >
                <LogOut size={20} className="shrink-0" />
                {isSidebarOpen && <span className="font-bold text-sm">Cerrar Sesión</span>}
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
            {menuItems.find(m => m.route === activeRoute)?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4 text-slate-500 text-sm font-bold">
            <div className="relative">
              <button onClick={handleNotifClick} className="p-2 relative hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />}
              </button>
              {showNotifDropdown && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setShowNotifDropdown(false)} />
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Notificaciones</h4>
                      {unreadCount > 0 && <span className="text-[10px] font-bold text-sky-600">{unreadCount} Nuevas</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">Sin notificaciones recientes</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-sky-50/30' : ''}`}>
                            <p className="text-xs font-bold text-slate-800 mb-1">{n.title}</p>
                            <p className="text-[10px] text-slate-500 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-slate-900 leading-none">{user?.name || 'Usuario'}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{user?.role || 'Staff'}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-sky-600/20">
                    {userInitials}
                </div>
            </div>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto p-8 bg-slate-50 relative">
          <div className="max-w-7xl mx-auto">{children}</div>
          <AdminChat /> {/* Floating Admin AI Chat */}
        </section>
      </main>
    </div>
  );
};

export default Layout;
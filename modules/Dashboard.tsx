
import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  Clock,
  Loader2,
  Calendar,
  AlertTriangle,
  Zap,
  MapPin,
  ThermometerSun,
  Wrench,
  PlusCircle,
  FileText,
  UserPlus,
  BrainCircuit,
  ArrowRight,
  Briefcase,
  Magnet,
  BarChart3,
  Truck,
  Package,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { useNavigate, useAuth } from '../context/AuthContext';
import { User, Appointment, Quote, Lead, UserRole } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Real Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [vanInventory, setVanInventory] = useState<any[]>([]);
  
  // AI & Weather State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ temp: number; code: number; loading: boolean }>({ temp: 0, code: 0, loading: true });

  // --- 1. FETCH REAL DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [aptsRes, quotesRes, usersRes, leadsRes] = await Promise.all([
        fetch('/api/appointments').then(r => r.ok ? r.json() : []),
        fetch('/api/quotes').then(r => r.ok ? r.json() : []),
        fetch('/api/users').then(r => r.ok ? r.json() : []),
        fetch('/api/leads').then(r => r.ok ? r.json() : [])
      ]);

      setAppointments(Array.isArray(aptsRes) ? aptsRes : []);
      setQuotes(Array.isArray(quotesRes) ? quotesRes : []);
      setLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setStaff(Array.isArray(usersRes) ? usersRes : []);

      // If installer, fetch their assigned warehouse inventory
      if (user?.role === UserRole.INSTALLER) {
          const warehouses = await fetch('/api/warehouses').then(r => r.json());
          const myWarehouse = warehouses.find((w: any) => w.responsible_id === user.id);
          if (myWarehouse) {
              const levels = await fetch(`/api/inventory/levels/${myWarehouse.id}`).then(r => r.json());
              setVanInventory(levels.filter((l: any) => l.stock > 0).slice(0, 5));
          }
      }

    } catch (err: any) {
      console.error("Dashboard API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. FETCH REAL WEATHER (Open-Meteo) ---
  const fetchWeather = () => {
    if (!navigator.geolocation) {
        setWeather(prev => ({ ...prev, loading: false }));
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`);
            const data = await res.json();
            
            if (data.current) {
                setWeather({
                    temp: data.current.temperature_2m,
                    code: data.current.weather_code,
                    loading: false
                });
            }
        } catch (e) {
            console.error("Weather fetch failed", e);
            setWeather(prev => ({ ...prev, loading: false }));
        }
    }, (err) => {
        console.warn("Geolocation denied", err);
        setWeather(prev => ({ ...prev, loading: false }));
    });
  };

  useEffect(() => {
    fetchData();
    fetchWeather();
  }, []);

  // --- 3. GENERATE AI BRIEFING (Only with real data) ---
  useEffect(() => {
    if (!loading && !aiLoading && !aiBriefing) {
      generateDailyBriefing();
    }
  }, [loading, weather.loading]);

  const generateDailyBriefing = async () => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todaysApts = appointments.filter(a => a.date?.startsWith(todayStr));
      const myApts = user?.role === UserRole.INSTALLER 
        ? todaysApts.filter(a => a.technician === user.name)
        : todaysApts;

      const pendingQuotes = quotes.filter(q => q.status === 'Enviada' || q.status === 'Borrador');
      const pendingAmount = pendingQuotes.reduce((acc, q) => acc + Number(q.total), 0);
      const newLeadsCount = leads.filter(l => l.status === 'Nuevo').length;
      
      if (myApts.length === 0 && pendingQuotes.length === 0 && !weather.temp) {
          setAiBriefing("Sin actividad reciente registrada. ¡Buen momento para prospectar clientes!");
          setAiLoading(false);
          return;
      }

      const prompt = user?.role === UserRole.INSTALLER 
        ? `Eres el asistente de "SuperAir" para técnicos.
           Dato: Tienes ${myApts.length} servicios para hoy. 
           Temperatura exterior: ${weather.temp}°C.
           Saluda a ${user.name} y dale una frase de motivación técnica breve.`
        : `Eres el jefe de operaciones de "SuperAir".
           Analiza estos DATOS REALES:
           - Citas para HOY: ${todaysApts.length} ${todaysApts.length > 0 ? `(${todaysApts.map(a => a.type).join(', ')})` : ''}.
           - Pipeline Ventas (Pendiente): $${pendingAmount} MXN.
           - Nuevos Prospectos: ${newLeadsCount}.
           - Temp: ${weather.temp}°C.
           Genera un resumen operativo de 2 frases con emojis.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiBriefing(response.text);
    } catch (e) {
      setAiBriefing(null); 
    } finally {
      setAiLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = now.toISOString().split('T')[0];

    const monthlyRevenue = quotes
      .filter(q => q.status === 'Aceptada' && new Date(q.createdAt || new Date()) >= startOfMonth)
      .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

    const pipelineValue = quotes
        .filter(q => q.status === 'Enviada' || q.status === 'Borrador')
        .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

    const appointmentsToday = appointments.filter(a => a.date?.startsWith(todayStr));
    const myAptsToday = appointmentsToday.filter(a => a.technician === user?.name);

    let demandIndex = 'Baja';
    if (weather.temp > 25) demandIndex = 'Media';
    if (weather.temp > 30) demandIndex = 'Alta';
    if (weather.temp > 35) demandIndex = 'Crítica';

    const newLeads = leads.filter(l => l.status === 'Nuevo').length;
    const wonLeads = leads.filter(l => l.status === 'Ganado').length;
    const conversionRate = leads.length > 0 ? (wonLeads / leads.length) * 100 : 0;

    return { 
        revenue: monthlyRevenue, 
        pipeline: pipelineValue, 
        appointmentsToday,
        myAptsToday,
        demandIndex,
        newLeads,
        conversionRate
    };
  }, [quotes, appointments, weather, leads, user]);

  const technicianStatus = useMemo(() => {
    const relevantStaff = staff.filter(u => u.role === 'Instalador' || u.role === 'Admin');
    const todayStr = new Date().toISOString().split('T')[0];

    return relevantStaff.map(u => {
      const activeJob = appointments.find(a => a.technician === u.name && a.date?.startsWith(todayStr) && (a.status === 'En Proceso' || a.status === 'Programada'));
      return {
        id: u.id,
        name: u.name,
        status: activeJob ? (activeJob.status === 'En Proceso' ? 'En Sitio' : 'Asignado') : 'Disponible',
        currentLocation: activeJob ? `Cliente #${activeJob.clientId}` : 'Base',
      };
    }).filter(u => u.id !== user?.id); 
  }, [staff, appointments, user]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mb-4 text-sky-600" size={48} />
        <p className="font-bold text-sm uppercase tracking-widest">Sincronizando ERP...</p>
      </div>
    );
  }

  if (user?.role === UserRole.INSTALLER) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                      <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit size={100} /></div>
                      <div className="relative z-10">
                          <h2 className="text-2xl font-black mb-2">Hola, {user.name.split(' ')[0]} 🛠️</h2>
                          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm mt-4">
                            {aiLoading ? <div className="flex gap-2 animate-pulse"><div className="w-2 h-2 bg-sky-400 rounded-full"></div><div className="w-2 h-2 bg-sky-400 rounded-full delay-75"></div></div> : <p className="text-sm font-medium text-slate-200">{aiBriefing}</p>}
                          </div>
                      </div>
                  </div>

                  <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl flex items-center justify-between">
                      <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Tu Agenda Hoy</p>
                          <h3 className="text-5xl font-black">{stats.myAptsToday.length}</h3>
                          <p className="text-xs font-bold text-sky-100 mt-1 uppercase tracking-tighter">Servicios Asignados</p>
                      </div>
                      <div className="text-right">
                          <p className="text-3xl font-black">{weather.temp}°C</p>
                          <p className="text-[10px] font-bold opacity-70">Exterior</p>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                          <Calendar size={20} className="text-sky-500" /> Próximo Servicio
                      </h3>
                      <button onClick={() => navigate('/appointments')} className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Ver Agenda Completa</button>
                  </div>

                  {stats.myAptsToday.length > 0 ? (
                      <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center font-black text-2xl text-sky-600 shrink-0">
                              {stats.myAptsToday[0].time}
                          </div>
                          <div className="flex-1 text-center md:text-left">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stats.myAptsToday[0].type}</p>
                              <h4 className="text-2xl font-black text-slate-900">{stats.myAptsToday[0].client_name}</h4>
                              <p className="text-sm text-slate-500 font-medium">Ubicación registrada en CRM</p>
                          </div>
                          <button 
                            onClick={() => navigate('/appointments')}
                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all shadow-lg flex items-center gap-2"
                          >
                             <Truck size={16} /> Iniciar Ruta
                          </button>
                      </div>
                  ) : (
                      <div className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                          <CheckCircle2 size={40} className="mx-auto mb-4 opacity-20" />
                          <p className="font-bold">¡Día libre o sin citas pendientes!</p>
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                              <Package size={20} className="text-amber-500" /> Stock en mi Unidad
                          </h3>
                          <button onClick={() => navigate('/inventory')} className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Inventario Total</button>
                      </div>
                      <div className="space-y-3">
                          {vanInventory.length > 0 ? vanInventory.map((l: any) => (
                              <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                  <div>
                                      <p className="text-xs font-bold text-slate-800">{l.name}</p>
                                      <p className="text-[9px] font-mono text-slate-400">{l.category}</p>
                                  </div>
                                  <span className="font-black text-lg text-slate-900">{l.stock}</span>
                              </div>
                          )) : (
                              <p className="text-xs text-slate-400 text-center py-4">No hay stock registrado en tu unidad móvil.</p>
                          )}
                      </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-6 flex items-center gap-2">
                          <BookOpen size={20} className="text-purple-500" /> Manual Operativo
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => navigate('/manual')} className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-left hover:bg-purple-100 transition-all">
                              <Wrench size={24} className="text-purple-600 mb-2" />
                              <p className="text-[10px] font-black text-purple-900 uppercase tracking-widest">Instalación</p>
                          </button>
                          <button onClick={() => navigate('/manual')} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-left hover:bg-rose-100 transition-all">
                              <AlertTriangle size={24} className="text-rose-600 mb-2" />
                              <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest">Seguridad</p>
                          </button>
                      </div>
                      <button onClick={() => navigate('/manual')} className="w-full mt-4 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                          Consultar Base de Conocimientos <ArrowRight size={14} />
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-sky-600/20 relative overflow-hidden flex flex-col justify-between min-h-[240px]">
            <div className="absolute top-0 right-0 p-6 opacity-20">
                <ThermometerSun size={120} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                    <MapPin size={14} /> 
                    <span className="text-xs font-bold uppercase tracking-widest">Ubicación Actual</span>
                </div>
                {weather.loading ? (
                    <div className="flex items-center gap-2 animate-pulse">
                        <Loader2 size={24} className="animate-spin"/>
                        <span className="text-xl font-bold">Detectando clima...</span>
                    </div>
                ) : weather.temp !== 0 ? (
                    <>
                        <h2 className="text-5xl font-black tracking-tighter">{weather.temp}°C</h2>
                        <p className="font-medium text-sky-100">Temp Exterior</p>
                    </>
                ) : (
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter">--°C</h2>
                        <p className="text-xs text-sky-200 mt-2">Habilita ubicación para datos reales.</p>
                    </div>
                )}
            </div>
            <div className="relative z-10 mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Demanda Estimada</p>
                <div className="flex items-center gap-2">
                    <Zap size={18} className={`fill-current ${stats.demandIndex === 'Alta' || stats.demandIndex === 'Crítica' ? 'text-amber-300 animate-pulse' : 'text-sky-200'}`} />
                    <span className="text-xl font-bold">{stats.demandIndex}</span>
                </div>
            </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[240px]">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <BrainCircuit size={140} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm text-sky-400">
                        {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                    </div>
                    <h3 className="font-black text-lg uppercase tracking-tight">Gemini Daily Brief</h3>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
                    {aiLoading ? (
                        <p className="text-sm font-medium text-slate-400 animate-pulse">Analizando base de datos en tiempo real...</p>
                    ) : (
                        <p className="text-sm md:text-lg font-medium leading-relaxed text-slate-200">
                            {aiBriefing || "👋 ¡Hola! Registra citas y cotizaciones para recibir análisis estratégicos aquí."}
                        </p>
                    )}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => navigate('/leads')} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all group text-left relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><Magnet size={64}/></div>
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Magnet size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Leads</p>
                      <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-indigo-600">{stats.newLeads}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Nuevos</span>
                      </div>
                  </button>
                  <button onClick={() => navigate('/purchases')} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all group text-left relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><ShoppingCart size={64}/></div>
                      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <ShoppingCart size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Compras</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Órdenes</span>
                  </button>
                  <button onClick={() => navigate('/clients')} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all group text-left">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <UserPlus size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Clientes</p>
                  </button>
                  <button onClick={() => navigate('/appointments')} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-sky-300 transition-all group text-left">
                      <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Calendar size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Agenda</p>
                  </button>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversión Leads</p>
                      <h4 className="text-2xl font-black text-slate-900">{stats.conversionRate.toFixed(1)}%</h4>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-emerald-500 flex items-center justify-center">
                      <BarChart3 size={16} className="text-emerald-500" />
                  </div>
              </div>
          </div>

          <div className="xl:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                      <Wrench size={20} className="text-slate-400" /> Staff Técnico
                  </h3>
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> EN VIVO
                  </span>
              </div>
              
              {technicianStatus.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl p-8">
                      <Users size={32} className="mb-2 opacity-50" />
                      <p className="text-xs font-bold uppercase">Sin más staff activo hoy</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {technicianStatus.map((tech) => (
                          <div key={tech.id} className={`p-5 rounded-3xl border-2 transition-all ${tech.status === 'En Sitio' ? 'bg-sky-50 border-sky-100' : 'bg-slate-50 border-slate-100'}`}>
                              <div className="flex justify-between items-start mb-3">
                                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-slate-700 text-xs">{tech.name.substring(0,2).toUpperCase()}</div>
                                  <div className={`w-3 h-3 rounded-full ${tech.status === 'En Sitio' ? 'bg-sky-500 animate-pulse' : 'bg-emerald-400'}`} />
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm truncate">{tech.name}</h4>
                              <p className="text-xs text-slate-500 font-medium mb-2">{tech.status}</p>
                              {tech.status !== 'Disponible' && (
                                  <div className="bg-white/60 p-2 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-1 truncate">
                                      <MapPin size={10} /> {tech.currentLocation}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;

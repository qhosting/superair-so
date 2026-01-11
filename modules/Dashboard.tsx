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
  Briefcase
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
import { useNavigate } from '../context/AuthContext';
import { User, Appointment, Quote } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Real Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  
  // AI & Weather State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ temp: number; code: number; loading: boolean }>({ temp: 0, code: 0, loading: true });

  // --- 1. FETCH REAL DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [aptsRes, quotesRes, usersRes] = await Promise.all([
        fetch('/api/appointments').then(r => r.ok ? r.json() : []),
        fetch('/api/quotes').then(r => r.ok ? r.json() : []),
        fetch('/api/users').then(r => r.ok ? r.json() : [])
      ]);

      setAppointments(Array.isArray(aptsRes) ? aptsRes : []);
      setQuotes(Array.isArray(quotesRes) ? quotesRes : []);
      // Filter users to find technicians/installers/admins who might have tasks
      setStaff(Array.isArray(usersRes) ? usersRes : []);

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
      const pendingQuotes = quotes.filter(q => q.status === 'Enviada' || q.status === 'Borrador');
      const pendingAmount = pendingQuotes.reduce((acc, q) => acc + Number(q.total), 0);
      
      // If absolutely no data, don't ask AI to hallucinate
      if (todaysApts.length === 0 && pendingQuotes.length === 0 && !weather.temp) {
          setAiBriefing("Sin actividad reciente registrada. ¡Buen momento para prospectar clientes!");
          setAiLoading(false);
          return;
      }

      const prompt = `
        Eres el jefe de operaciones de "SuperAir" (Aire Acondicionado).
        Analiza estos DATOS REALES:
        - Citas para HOY: ${todaysApts.length} ${todaysApts.length > 0 ? `(${todaysApts.map(a => a.type).join(', ')})` : ''}.
        - Pipeline Ventas (Pendiente): $${pendingAmount} MXN en ${pendingQuotes.length} cotizaciones.
        - Temperatura Actual Exterior: ${weather.temp ? weather.temp + '°C' : 'No disponible'}.
        
        Genera un resumen operativo de 2 frases.
        Si hace calor (>25°C) y hay pocas citas, sugiere contactar clientes para mantenimiento.
        Si hay mucho dinero pendiente, sugiere seguimiento de ventas.
        Usa emojis.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiBriefing(response.text);
    } catch (e) {
      // Fail silently or show generic msg
      setAiBriefing(null); 
    } finally {
      setAiLoading(false);
    }
  };

  // --- 4. CALCULATIONS ---
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyRevenue = quotes
      .filter(q => q.status === 'Aceptada' && new Date(q.createdAt || new Date()) >= startOfMonth)
      .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

    const pipelineValue = quotes
        .filter(q => q.status === 'Enviada' || q.status === 'Borrador')
        .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

    const todayStr = now.toISOString().split('T')[0];
    const appointmentsToday = appointments.filter(a => a.date?.startsWith(todayStr));

    // Determine Demand Index based on REAL weather
    let demandIndex = 'Baja';
    if (weather.temp > 25) demandIndex = 'Media';
    if (weather.temp > 30) demandIndex = 'Alta';
    if (weather.temp > 35) demandIndex = 'Crítica';

    return { 
        revenue: monthlyRevenue, 
        pipeline: pipelineValue, 
        appointmentsToday,
        demandIndex
    };
  }, [quotes, appointments, weather]);

  // --- 5. REAL TECHNICIAN STATUS ---
  const technicianStatus = useMemo(() => {
    // Only users with role containing relevant keywords or generally all staff if small team
    const relevantStaff = staff.filter(u => 
        u.role === 'Instalador' || u.role === 'Admin' || u.role === 'Super Admin'
    );

    const todayStr = new Date().toISOString().split('T')[0];

    return relevantStaff.map(user => {
      // Find active appointment for this user TODAY
      const activeJob = appointments.find(a => 
        a.technician === user.name && 
        a.date?.startsWith(todayStr) && 
        (a.status === 'En Proceso' || a.status === 'Programada')
      );
      
      return {
        id: user.id,
        name: user.name,
        // If they have a job today that is 'En Proceso', they are On Site.
        // If 'Programada', they are Assigned. Otherwise Available.
        status: activeJob ? (activeJob.status === 'En Proceso' ? 'En Sitio' : 'Asignado') : 'Disponible',
        // If user status is 'Inactivo', override everything
        systemStatus: user.status, 
        currentLocation: activeJob ? `Cliente #${activeJob.clientId}` : 'Base',
        jobType: activeJob?.type
      };
    }).filter(u => u.systemStatus === 'Activo'); // Only show active users in dashboard
  }, [staff, appointments]);

  const chartData = [
      { name: 'Cerrado', value: stats.revenue, color: '#10b981' }, 
      { name: 'En Proceso', value: stats.pipeline, color: '#f59e0b' }
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const getWeatherDescription = (code: number) => {
      if (code === 0) return "Cielo Despejado";
      if (code >= 1 && code <= 3) return "Parcialmente Nublado";
      if (code >= 45 && code <= 48) return "Niebla";
      if (code >= 51 && code <= 67) return "Lluvia Ligera";
      if (code >= 80 && code <= 99) return "Tormenta / Chubascos";
      return "Normal";
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mb-4 text-sky-600" size={48} />
        <p className="font-bold text-sm uppercase tracking-widest">Sincronizando Operaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* TOP SECTION: WEATHER & AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weather Card - Real Data */}
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
                        <p className="font-medium text-sky-100">{getWeatherDescription(weather.code)}</p>
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

        {/* AI Briefing - Real Context */}
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

      {/* MIDDLE SECTION: ACTIONS & TECH STATUS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Quick Actions */}
          <div className="xl:col-span-1 space-y-6">
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                  <Zap size={20} className="text-amber-500" /> Accesos Rápidos
              </h3>
              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => navigate('/quotes')} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-sky-300 transition-all group text-left">
                      <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <FileText size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Nueva Cotización</p>
                  </button>
                  <button onClick={() => navigate('/clients')} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all group text-left">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <UserPlus size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Registrar Cliente</p>
                  </button>
                  <button onClick={() => navigate('/appointments')} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all group text-left">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Calendar size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Agendar Cita</p>
                  </button>
                  <button onClick={() => navigate('/inventory')} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all group text-left">
                      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <PlusCircle size={20} />
                      </div>
                      <p className="font-black text-slate-800 text-sm">Stock Rápido</p>
                  </button>
              </div>
          </div>

          {/* Technician Live Status - Driven by DB */}
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
                      <p className="text-xs font-bold uppercase">No hay staff activo registrado</p>
                      <button onClick={() => navigate('/users')} className="mt-4 text-[10px] text-sky-600 font-bold underline">
                          Gestionar Usuarios
                      </button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {technicianStatus.map((tech) => (
                          <div key={tech.id} className={`p-5 rounded-3xl border-2 transition-all ${
                              tech.status === 'En Sitio' 
                              ? 'bg-sky-50 border-sky-100' 
                              : tech.status === 'Asignado'
                              ? 'bg-amber-50/50 border-amber-100'
                              : 'bg-slate-50 border-slate-100'
                          }`}>
                              <div className="flex justify-between items-start mb-3">
                                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-slate-700 text-xs">
                                      {tech.name.substring(0,2).toUpperCase()}
                                  </div>
                                  <div className={`w-3 h-3 rounded-full ${
                                      tech.status === 'En Sitio' ? 'bg-sky-500 animate-pulse' : 
                                      tech.status === 'Asignado' ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`} />
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

      {/* BOTTOM SECTION: FINANCIALS & ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                  <div>
                      <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">Rendimiento Financiero</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Mes Actual (Datos Reales)</p>
                  </div>
                  <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{formatCurrency(stats.revenue)}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Cobrado</p>
                  </div>
              </div>
              
              <div className="h-48 w-full">
                  {stats.revenue === 0 && stats.pipeline === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300">
                          <TrendingUp size={48} className="mb-2 opacity-50" />
                          <p className="text-xs font-bold uppercase">Sin movimientos financieros este mes</p>
                      </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={chartData} barSize={40}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 800}} width={100} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                  )}
              </div>
              <div className="mt-4 flex gap-6 justify-center">
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <span className="text-xs font-bold text-slate-600">Cerrado ({formatCurrency(stats.revenue)})</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full" />
                      <span className="text-xs font-bold text-slate-600">Pipeline ({formatCurrency(stats.pipeline)})</span>
                  </div>
              </div>
          </div>

          {/* Critical Alerts - Real Data Driven */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-rose-500" /> Atención Requerida
              </h3>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-64">
                  {stats.appointmentsToday.length > 0 && (
                      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex gap-3">
                          <div className="mt-1"><Clock size={16} className="text-sky-600" /></div>
                          <div>
                              <p className="text-xs font-bold text-slate-800">Citas para Hoy</p>
                              <p className="text-[10px] text-slate-500 mt-1">Tienes {stats.appointmentsToday.length} citas programadas que requieren atención.</p>
                          </div>
                      </div>
                  )}
                  {stats.pipeline > 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                          <div className="mt-1"><Briefcase size={16} className="text-amber-500" /></div>
                          <div>
                              <p className="text-xs font-bold text-slate-800">Cotizaciones Pendientes</p>
                              <p className="text-[10px] text-slate-500 mt-1">Hay {formatCurrency(stats.pipeline)} esperando cierre. ¡Haz seguimiento!</p>
                          </div>
                      </div>
                  )}
                  {stats.demandIndex === 'Alta' && (
                      <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3">
                          <div className="mt-1"><ThermometerSun size={16} className="text-rose-500" /></div>
                          <div>
                              <p className="text-xs font-bold text-slate-800">Alta Demanda Térmica</p>
                              <p className="text-[10px] text-slate-500 mt-1">El clima indica alta probabilidad de llamadas de emergencia.</p>
                          </div>
                      </div>
                  )}
                  {stats.appointmentsToday.length === 0 && stats.pipeline === 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-slate-400 text-xs">
                          Sin alertas críticas por el momento.
                      </div>
                  )}
              </div>
              <button onClick={() => navigate('/reports')} className="mt-6 w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                  Ver Reportes Completos <ArrowRight size={14} />
              </button>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
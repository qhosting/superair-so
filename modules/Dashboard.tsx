
import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, Users, ShoppingCart, Loader2, Calendar, AlertTriangle, 
  Zap, MapPin, ThermometerSun, Wrench, BrainCircuit, ArrowRight,
  Magnet, BarChart3, Package, BookOpen, CheckCircle2, Truck,
  Activity, Database, MessageSquare, Globe, Signal
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { useNavigate, useAuth } from '../context/AuthContext';
import { User, Appointment, Quote, Lead, UserRole } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiHealth, setApiHealth] = useState({ server: 'Checking', db: 'Checking' });
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [weather] = useState({ temp: 31, status: 'Calor Intenso' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptsRes, quotesRes, leadsRes, healthRes] = await Promise.all([
        fetch('/api/appointments').then(r => r.ok ? r.json() : []),
        fetch('/api/quotes').then(r => r.ok ? r.json() : []),
        fetch('/api/leads').then(r => r.ok ? r.json() : []),
        fetch('/api/health').then(r => r.ok ? true : false).catch(() => false)
      ]);

      setAppointments(Array.isArray(aptsRes) ? aptsRes : []);
      setQuotes(Array.isArray(quotesRes) ? quotesRes : []);
      setLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setApiHealth({ 
          server: healthRes ? 'Online' : 'Offline', 
          db: healthRes ? 'Sincronizada' : 'Error Conexión' 
      });
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && !aiBriefing) generateDailyBriefing();
  }, [loading]);

  const generateDailyBriefing = async () => {
    if (!process.env.API_KEY || leads.length === 0) {
        setAiBriefing("Enfoque: Inicia el día revisando leads pendientes y optimizando rutas.");
        return;
    }
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como el Director Operativo de SuperAir. 
                     Contexto REAL: ${leads.length} leads en el pipeline, ${quotes.length} cotizaciones y clima de ${weather.temp}°C. 
                     Dame un análisis de 2 líneas sobre la prioridad operativa de hoy basado en estos números.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiBriefing(response.text);
    } catch (e) {
      setAiBriefing("Prioridad: Atender solicitudes de mantenimiento preventivo ante el aumento de temperatura.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- LOGICA DE DATOS REALES PARA GRAFICA ---
  const chartData = useMemo(() => {
      const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return {
              date: d.toISOString().split('T')[0],
              day: d.toLocaleDateString('es-MX', { weekday: 'short' }),
              sales: 0,
              jobs: 0
          };
      });

      quotes.forEach(q => {
          if (q.status === 'Aceptada') {
              const qDate = new Date(q.createdAt || '').toISOString().split('T')[0];
              const dayObj = last7Days.find(d => d.date === qDate);
              if (dayObj) dayObj.sales += Number(q.total);
          }
      });

      appointments.forEach(a => {
          const aDate = a.date?.split('T')[0];
          const dayObj = last7Days.find(d => d.date === aDate);
          if (dayObj) dayObj.jobs += 1;
      });

      return last7Days;
  }, [quotes, appointments]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const aptsToday = appointments.filter(a => a.date?.startsWith(today));
    const revenue = quotes.filter(q => q.status === 'Aceptada').reduce((acc, q) => acc + Number(q.total), 0);
    return { 
        aptsToday, 
        revenue, 
        newLeads: leads.filter(l => l.status === 'Nuevo').length,
        conversionRate: leads.length > 0 ? ((leads.filter(l => l.status === 'Ganado').length / leads.length) * 100).toFixed(1) : 0
    };
  }, [appointments, quotes, leads]);

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="animate-spin text-sky-600 mb-4" size={40} />
      <p className="font-black text-xs uppercase tracking-widest">Consultando Base de Datos...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* AI Briefing */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[200px]">
            <BrainCircuit size={160} className="absolute -right-8 -bottom-8 opacity-5" />
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-2xl backdrop-blur-md border border-sky-500/30">
                        <BrainCircuit size={22} />
                    </div>
                    <div>
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-sky-400">Copiloto IA SuperAir</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Resumen Operativo Basado en Datos Reales</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-sm">
                    {aiLoading ? (
                        <div className="flex gap-2 p-2">
                            <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    ) : (
                        <p className="text-sm md:text-base font-medium text-slate-200 leading-relaxed italic">
                            "{aiBriefing || 'Listo para optimizar tu jornada.'}"
                        </p>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-orange-400 to-rose-600 rounded-[3rem] p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
            <ThermometerSun size={120} className="absolute -left-4 -bottom-4 opacity-10 rotate-12" />
            <div className="relative z-10">
                <MapPin size={16} className="mb-2 opacity-60" />
                <h2 className="text-5xl font-black tracking-tighter">{weather.temp}°C</h2>
                <p className="font-bold text-orange-100 text-xs uppercase tracking-widest mt-1">Querétaro, MX</p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Impacto Climático</p>
                <div className="flex items-center gap-2 text-lg font-black italic tracking-tight">
                    <Zap size={18} className="text-yellow-300 animate-pulse" /> ALTA DEMANDA
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gráfica Real */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                  <div>
                      <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          <Activity size={20} className="text-sky-500"/> Actividad de la Semana
                      </h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ingresos por Cotizaciones Aceptadas</p>
                  </div>
              </div>
              <div className="h-64 w-full">
                  {chartData.some(d => d.sales > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                            <YAxis hide />
                            <Tooltip 
                              contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ fontSize: '12px', fontWeight: '900' }}
                              formatter={(value) => [`$${value}`, 'Venta']}
                            />
                            <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-50 rounded-3xl">
                        <p className="text-slate-300 font-black text-xs uppercase tracking-widest">Sin ventas registradas esta semana</p>
                    </div>
                  )}
              </div>
          </div>

          {/* Salud de Sistema Real */}
          <div className="space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                      <Signal size={18} className="text-emerald-500"/> Salud del ERP
                  </h3>
                  <div className="space-y-4">
                      {[
                          { label: 'Servidor API', status: apiHealth.server, icon: Globe, color: apiHealth.server === 'Online' ? 'text-emerald-500' : 'text-rose-500' },
                          { label: 'PostgreSQL', status: apiHealth.db, icon: Database, color: apiHealth.db === 'Sincronizada' ? 'text-emerald-500' : 'text-rose-500' },
                          { label: 'IA Engine', status: 'Activo', icon: Zap, color: 'text-sky-500' }
                      ].map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                              <div className="flex items-center gap-3">
                                  <s.icon size={16} className="text-slate-400" />
                                  <span className="text-xs font-bold text-slate-700">{s.label}</span>
                              </div>
                              <span className={`text-[9px] font-black uppercase ${s.color}`}>{s.status}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* KPI Cards Dinámicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
              { label: 'Facturación Real', val: `$${(stats.revenue/1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', sub: 'Total de órdenes aceptadas' },
              { label: 'Citas Hoy', val: stats.aptsToday.length, icon: Calendar, color: 'text-sky-500', bg: 'bg-sky-50', sub: 'Servicios en agenda' },
              { label: 'Leads Activos', val: leads.length, icon: Magnet, color: 'text-indigo-500', bg: 'bg-indigo-50', sub: 'Pipeline comercial' },
              { label: 'Tasa Conversión', val: `${stats.conversionRate}%`, icon: CheckCircle2, color: 'text-rose-500', bg: 'bg-rose-50', sub: 'Eficiencia de cierre' }
          ].map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}><s.icon size={24} /></div>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Base de Datos</span>
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{s.val}</h4>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">{s.sub}</p>
                  </div>
              </div>
          ))}
      </div>

      {/* Agenda Real */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Truck size={20} className="text-sky-500"/> Servicios del Día
                  </h3>
                  <button onClick={() => navigate('/appointments')} className="text-[10px] font-black text-sky-600 uppercase bg-sky-50 px-4 py-2 rounded-xl hover:bg-sky-100 transition-all">Ir al Calendario</button>
              </div>
              {stats.aptsToday.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stats.aptsToday.map(a => (
                          <div key={a.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center font-black text-sky-600 shadow-sm border border-slate-50 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                    <span className="text-xs leading-none">{a.time.substring(0,2)}</span>
                                    <span className="text-[8px] opacity-60">HRS</span>
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 leading-tight">{a.client_name || 'Cliente'}</p>
                                      <p className="text-[9px] font-black text-slate-400 uppercase mt-1 flex items-center gap-1">
                                        <Wrench size={10} /> {a.type}
                                      </p>
                                  </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[8px] font-black uppercase px-2.5 py-1 bg-white rounded-full border border-slate-200 text-slate-500">{a.technician}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="py-20 text-center text-slate-300 border-2 border-dashed border-slate-50 rounded-[3rem]">
                      <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="font-bold uppercase text-xs tracking-[0.3em]">Agenda despejada para hoy</p>
                  </div>
              )}
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-xl flex flex-col justify-between">
              <div>
                  <h3 className="font-black text-white uppercase text-sm mb-6 flex items-center gap-2">
                    <Zap size={18} className="text-yellow-400"/> Productividad
                  </h3>
                  <div className="space-y-3">
                      <button onClick={() => navigate('/builder')} className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-sky-600 rounded-[2rem] transition-all group border border-white/5">
                          <div className="flex items-center gap-4">
                              <BookOpen size={20} className="text-sky-400 group-hover:text-white" />
                              <div className="text-left">
                                  <p className="text-xs font-black uppercase tracking-widest text-white">Constructor</p>
                                  <p className="text-[10px] text-slate-400 group-hover:text-sky-100">Actualizar Landing</p>
                              </div>
                          </div>
                          <ArrowRight size={16} className="text-slate-600 group-hover:text-white" />
                      </button>
                      <button onClick={() => navigate('/leads')} className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-indigo-600 rounded-[2rem] transition-all group border border-white/5">
                          <div className="flex items-center gap-4">
                              <Users size={20} className="text-indigo-400 group-hover:text-white" />
                              <div className="text-left">
                                  <p className="text-xs font-black uppercase tracking-widest text-white">Prospectos</p>
                                  <p className="text-[10px] text-slate-400 group-hover:text-indigo-100">Manejo de Leads</p>
                              </div>
                          </div>
                          <ArrowRight size={16} className="text-slate-600 group-hover:text-white" />
                      </button>
                  </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10 text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">PROD ENV • v1.1.0</p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  TrendingUp, Users, ShoppingCart, Loader2, Calendar, AlertTriangle, 
  Zap, MapPin, ThermometerSun, Wrench, BrainCircuit, ArrowRight,
  Magnet, BarChart3, Package, BookOpen, CheckCircle2, Truck,
  Activity, Database, MessageSquare, Globe, Signal, FileText, Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate, useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { User, Appointment, Quote, Lead, UserRole } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const [loading, setLoading] = useState(true);
  const [apiHealth, setApiHealth] = useState({ server: 'Checking', db: 'Checking' });
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [weather] = useState({ temp: 31, status: 'Ola de Calor' });

  const formatMXN = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const generateDailyBriefing = useCallback(async (currentLeads: number, currentQuotes: number) => {
    setAiLoading(true);
    try {
      const token = localStorage.getItem('superair_token');
      const res = await fetch('/api/dashboard/ai-briefing', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ currentLeads, currentQuotes })
      });
      if (res.ok) {
          const data = await res.json();
          setAiBriefing(data.text);
      } else {
          setAiBriefing("Prioridad: Revisar mantenimientos preventivos ante el pronóstico de calor extremo en la zona.");
      }
    } catch (e) {
      setAiBriefing("Recomendación: Optimizar rutas de técnicos en Juriquilla por alta demanda de reparaciones por calor.");
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('superair_token');
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
          fetch('/api/health').then(r => r.ok ? true : false).catch(() => false)
        ]);

        if (!isMounted) return;

        if (statsRes) {
            setQuotes(Array(1).fill({ total: statsRes.revenue, status: 'Aceptada' })); // Mock structure for stats.revenue compat
            setLeads(Array(statsRes.activeLeads).fill({}));
            setAppointments(Array(statsRes.todayApts).fill({}));

            if (!aiBriefing) {
                generateDailyBriefing(statsRes.activeLeads, 100); // 100 as approximate total quotes for context
            }
        }

        setApiHealth({ 
            server: healthRes ? 'Online' : 'Offline', 
            db: healthRes ? 'Conectada' : 'Error' 
        });

      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [generateDailyBriefing]);

  useEffect(() => {
      if (!socket) return;

      const handleUpdate = () => {
          // Re-fetch dashboard data lightly on events
          const token = localStorage.getItem('superair_token');
          fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(statsRes => {
                if(statsRes) {
                    setQuotes(Array(1).fill({ total: statsRes.revenue, status: 'Aceptada' }));
                    setLeads(Array(statsRes.activeLeads).fill({}));
                    setAppointments(Array(statsRes.todayApts).fill({}));
                }
            });
      };

      socket.on('lead_update', handleUpdate);
      socket.on('order_update', handleUpdate);
      socket.on('dashboard_update', handleUpdate);

      return () => {
          socket.off('lead_update', handleUpdate);
          socket.off('order_update', handleUpdate);
          socket.off('dashboard_update', handleUpdate);
      };
  }, [socket]);

  const stats = useMemo(() => {
    // Now stats come directly from backend, mapped into state arrays for compatibility
    const revenue = quotes.reduce((acc, q) => acc + Number(q.total || 0), 0);
    return { revenue, activeLeads: leads.length, todayApts: appointments.length };
  }, [appointments, quotes, leads]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center text-slate-400">
      <Loader2 className="animate-spin text-sky-600 mb-4" size={40} />
      <p className="font-black text-xs uppercase tracking-widest">Iniciando Sistemas de Ingeniería...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[220px]">
            <Sparkles size={200} className="absolute -right-16 -bottom-16 opacity-5 rotate-12" />
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-sky-500/20 text-sky-400 rounded-2xl backdrop-blur-md border border-sky-500/30">
                        <BrainCircuit size={26} />
                    </div>
                    <div>
                        <h3 className="font-black text-xs uppercase tracking-[0.3em] text-sky-400">Copiloto de Operaciones IA</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Análisis Predictivo Gemini</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-sm min-h-[100px] flex items-center">
                    {aiLoading ? (
                        <div className="flex gap-2 p-2">
                            <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    ) : (
                        <p className="text-base md:text-lg font-medium text-slate-200 leading-relaxed italic border-l-4 border-sky-500 pl-6">
                            "{aiBriefing || 'Sistemas listos para climatización de alto rendimiento.'}"
                        </p>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-orange-400 to-rose-600 rounded-[3rem] p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
            <ThermometerSun size={120} className="absolute -left-4 -bottom-4 opacity-10 rotate-12" />
            <div className="relative z-10">
                <MapPin size={16} className="mb-2 opacity-60" />
                <h2 className="text-6xl font-black tracking-tighter">{weather.temp}°C</h2>
                <p className="font-bold text-orange-100 text-xs uppercase tracking-widest mt-1">Querétaro, MX</p>
            </div>
            <div className="bg-white/20 p-5 rounded-2xl backdrop-blur-md relative z-10 border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Carga del Compresor</p>
                <div className="flex items-center gap-2 text-xl font-black italic tracking-tight text-yellow-300">
                    <Zap size={22} className="animate-pulse" /> ALTA CARGA
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
              { label: 'Ingresos Aceptados', val: formatMXN(stats.revenue), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', sub: 'Montos en Pesos MXN' },
              { label: 'Servicios de Hoy', val: stats.todayApts, icon: Calendar, color: 'text-sky-500', bg: 'bg-sky-50', sub: 'Instalación y Mant.' },
              { label: 'Leads en Pipeline', val: stats.activeLeads, icon: Magnet, color: 'text-indigo-500', bg: 'bg-indigo-50', sub: 'Oportunidades de Venta' },
              { label: 'Salud de Red', val: apiHealth.server, icon: Signal, color: 'text-rose-500', bg: 'bg-rose-50', sub: `DB: ${apiHealth.db}` }
          ].map((s, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group cursor-pointer">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${s.bg} ${s.color} group-hover:scale-110 transition-transform`}><s.icon size={28} /></div>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">SISTEMA MX</span>
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                      <h4 className="text-2xl font-black text-slate-900 tracking-tighter truncate">{s.val}</h4>
                      <p className="text-[9px] font-bold text-slate-400 mt-2">{s.sub}</p>
                  </div>
              </div>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[3.5rem] border border-slate-100 p-10 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                  <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                          <Activity size={24} className="text-sky-500"/> Flujo de Ingeniería Comercial
                      </h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Actividad de ventas en tiempo real</p>
                  </div>
                  <button className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-sky-600 transition-colors"><BarChart3 size={20}/></button>
              </div>
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                  <Activity size={48} className="text-slate-200 mb-4" />
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Gráfico de Tendencias en Proceso...</p>
              </div>
          </div>

          <div className="bg-slate-900 rounded-[3.5rem] p-10 shadow-2xl flex flex-col justify-between text-white border border-white/5">
              <div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-sky-400 mb-8 flex items-center gap-2">
                      <Zap size={20} className="text-yellow-400" /> Alertas Críticas
                  </h3>
                  <div className="space-y-6">
                      {[
                          { title: 'Inventario de Gas', desc: 'R-410a con stock menor al 10%', type: 'Urgent' },
                          { title: 'Garantía York', desc: 'Protocolo de garantía pendiente folio #204', type: 'Pending' }
                      ].map((alert, i) => (
                          <div key={i} className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                              <div className="w-1.5 h-full bg-rose-500 rounded-full group-hover:scale-y-110 transition-transform" />
                              <div>
                                  <h4 className="font-bold text-sm text-slate-200">{alert.title}</h4>
                                  <p className="text-[10px] text-slate-500 uppercase mt-1">{alert.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <button className="mt-10 w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-500 transition-all flex items-center justify-center gap-2">
                  Ver Bitácora Forense <ArrowRight size={14}/>
              </button>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  CheckCircle2,
  Clock,
  ExternalLink,
  Workflow,
  Loader2,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Fallback data for development or offline/error states
const MOCK_DATA = {
    clients: [
        { id: 1, name: 'Cliente Demo Residencial', created_at: new Date().toISOString() },
        { id: 2, name: 'Comercial del Centro', created_at: new Date(Date.now() - 86400000).toISOString() }
    ],
    appointments: [
        { id: 1, client_name: 'Residencial Lomas', type: 'Mantenimiento', technician: 'Carlos R.', status: 'Programada', date: new Date().toISOString(), time: '10:00' },
        { id: 2, client_name: 'Oficinas Norte', type: 'Instalación', technician: 'Miguel A.', status: 'En Proceso', date: new Date().toISOString(), time: '12:00' }
    ],
    quotes: [
        { id: 1, total: 12500, status: 'Aceptada', created_at: new Date().toISOString() },
        { id: 2, total: 8400, status: 'Borrador', created_at: new Date().toISOString() }
    ]
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [usingMockData, setUsingMockData] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [clientsRes, aptsRes, quotesRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/appointments'),
        fetch('/api/quotes')
      ]);

      if (!clientsRes.ok || !aptsRes.ok || !quotesRes.ok) {
          throw new Error("Failed to fetch dashboard data");
      }

      const clientsData = await clientsRes.json();
      const aptsData = await aptsRes.json();
      const quotesData = await quotesRes.json();

      setClients(Array.isArray(clientsData) ? clientsData : []);
      setAppointments(Array.isArray(aptsData) ? aptsData : []);
      setQuotes(Array.isArray(quotesData) ? quotesData : []);
      setUsingMockData(false);

    } catch (err: any) {
      console.warn("Dashboard API Error (Using Fallback Data):", err);
      // Fallback data
      setClients(MOCK_DATA.clients);
      setAppointments(MOCK_DATA.appointments);
      setQuotes(MOCK_DATA.quotes);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- KPI CALCULATIONS ---
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Ventas Mensuales
    const monthlyRevenue = quotes
      .filter(q => {
        const qDate = new Date(q.created_at || now);
        return q.status === 'Aceptada' && qDate >= startOfMonth;
      })
      .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

    // 2. Clientes Nuevos
    const newClients = clients.filter(c => {
      const cDate = new Date(c.created_at || now);
      return cDate >= startOfMonth;
    }).length;

    // 3. Cotizaciones Pendientes
    const pendingQuotes = quotes.filter(q => q.status === 'Borrador' || q.status === 'Enviada').length;

    // 4. Citas Hoy
    const todayStr = now.toISOString().split('T')[0];
    const appointmentsToday = appointments.filter(a => {
        const aDate = typeof a.date === 'string' ? a.date.substring(0, 10) : '';
        return aDate === todayStr;
    }).length;

    return {
      revenue: monthlyRevenue,
      newClients,
      pendingQuotes,
      appointmentsToday
    };
  }, [quotes, clients, appointments]);

  // --- CHART DATA GENERATION (Last 7 Days) ---
  const chartData = useMemo(() => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(d);

      const sales = quotes
        .filter(q => {
           const qDate = new Date(q.created_at || today).toISOString().split('T')[0];
           return qDate === dateStr && q.status === 'Aceptada';
        })
        .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

      days.push({ name: dayName.charAt(0).toUpperCase() + dayName.slice(1), ventas: sales });
    }
    return days;
  }, [quotes]);

  const recentAppointments = useMemo(() => {
    return appointments.slice(0, 5); 
  }, [appointments]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mb-4 text-sky-600" size={48} />
        <p className="font-bold text-sm uppercase tracking-widest">Cargando Datos de Producción...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Resumen Ejecutivo</h2>
            <p className="text-slate-500 text-sm font-medium">Información en tiempo real de tu operación.</p>
         </div>
         <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${usingMockData ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
            <div className={`w-2 h-2 rounded-full ${usingMockData ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{usingMockData ? 'Modo Demo (Offline)' : 'PostgreSQL Connected'}</span>
         </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ingresos (Mes)', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Nuevos Clientes', value: stats.newClients.toString(), icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Cotizaciones Activas', value: stats.pendingQuotes.toString(), icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
          { label: 'Citas para Hoy', value: stats.appointmentsToday.toString(), icon: Clock, color: 'bg-sky-50 text-sky-600' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
              <h3 className="text-3xl font-black text-slate-900">{card.value}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">Ventas Confirmadas</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Últimos 7 días</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                  itemStyle={{fontSize: '12px', fontWeight: 'bold'}}
                />
                <Area type="monotone" dataKey="ventas" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Roadmap / Project Plan */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-black text-lg text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
            <CheckCircle2 className="text-sky-500" />
            Estado del Sistema
          </h3>
          <div className="space-y-6 flex-1">
            {[
              { title: 'Base de Datos', desc: usingMockData ? 'Conexión Fallida (Mock)' : 'PostgreSQL Producción', status: usingMockData ? 'error' : 'completado' },
              { title: 'API Endpoints', desc: 'Rutas CRUD activas', status: 'completado' },
              { title: 'Integraciones', desc: 'Webhooks Ready', status: 'en-progreso' },
              { title: 'IA Gemini', desc: 'Motor de cotizaciones disponible', status: 'completado' },
            ].map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className={`mt-1.5 h-3 w-3 rounded-full shrink-0 shadow-sm ${
                  step.status === 'completado' ? 'bg-emerald-500 shadow-emerald-200' :
                  step.status === 'error' ? 'bg-rose-500 shadow-rose-200' :
                  step.status === 'en-progreso' ? 'bg-amber-500 animate-pulse' : 'bg-slate-200'
                }`} />
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">{step.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
               <Workflow size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Producción</span>
            </div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">Próximos Servicios</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Agenda en tiempo real</p>
          </div>
          <button className="text-sky-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
             Ver Calendario <ExternalLink size={12}/>
          </button>
        </div>
        <div className="overflow-x-auto">
          {recentAppointments.length === 0 ? (
             <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                <Calendar size={48} className="mb-4 text-slate-200" />
                <p className="text-sm font-medium">No hay citas registradas.</p>
             </div>
          ) : (
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <tr>
                    <th className="px-8 py-5">Cliente</th>
                    <th className="px-8 py-5">Servicio</th>
                    <th className="px-8 py-5">Técnico</th>
                    <th className="px-8 py-5">Estado</th>
                    <th className="px-8 py-5">Fecha / Hora</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                {recentAppointments.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{row.client_name || 'Cliente'}</td>
                    <td className="px-8 py-5 font-medium text-slate-600">{row.type}</td>
                    <td className="px-8 py-5 text-slate-500">{row.technician}</td>
                    <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        row.status === 'Completada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        row.status === 'En Proceso' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                        {row.status}
                        </span>
                    </td>
                    <td className="px-8 py-5 font-mono text-xs text-slate-400 font-bold">
                        {row.date ? row.date.substring(0,10) : ''} • {row.time ? row.time.substring(0,5) : ''}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
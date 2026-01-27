
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, PieChart, Calendar, Download, 
  BrainCircuit, Loader2, FileSpreadsheet, FileText, DollarSign, 
  Briefcase, Users, AlertCircle, Zap, Package, CheckCircle2,
  Target, Activity, Sparkles, Filter, RefreshCw
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart as RePieChart, Pie, Cell
} from 'recharts';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financial' | 'operational' | 'inventory'>('financial');
  const [dateRange, setDateRange] = useState('6');
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const [quotes, setQuotes] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [serverFinancialData, setServerFinancialData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('superair_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [quotesRes, aptsRes, prodsRes, finRes] = await Promise.all([
          fetch('/api/quotes', { headers }).catch(() => null),
          fetch('/api/appointments', { headers }).catch(() => null),
          fetch('/api/products', { headers }).catch(() => null),
          fetch(`/api/reports/financial?months=${dateRange}`, { headers }).catch(() => null)
        ]);
        
        const quotesData = quotesRes && quotesRes.ok ? await quotesRes.json() : [];
        const aptsData = aptsRes && aptsRes.ok ? await aptsRes.json() : [];
        const prodsData = prodsRes && prodsRes.ok ? await prodsRes.json() : [];
        const finData = finRes && finRes.ok ? await finRes.json() : [];

        setQuotes(Array.isArray(quotesData) ? quotesData : []);
        setAppointments(Array.isArray(aptsData) ? aptsData : []);
        setProducts(Array.isArray(prodsData) ? prodsData : []);
        setServerFinancialData(Array.isArray(finData) ? finData : []);
      } catch (e) {
        console.error("Failed to load reports data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange]);

  // --- PROCESAMIENTO DE DATOS AVANZADO ---

  const financialData = useMemo(() => {
    // Prefer server side data if available, fallback to empty
    if (serverFinancialData.length > 0) return serverFinancialData.map(d => ({
        ...d,
        ingresos: parseFloat(d.ingresos),
        gastos: parseFloat(d.gastos),
        ganancia: parseFloat(d.ganancia)
    }));
    return [];
  }, [serverFinancialData]);

  const commercialStats = useMemo(() => {
      const total = quotes.length;
      const accepted = quotes.filter(q => q.status === 'Aceptada' || q.status === 'Ejecutada' || q.status === 'Completada').length;
      const rate = total > 0 ? (accepted / total) * 100 : 0;
      const pipelineValue = quotes.filter(q => q.status === 'Borrador' || q.status === 'Enviada').reduce((acc, q) => acc + Number(q.total), 0);
      return { accepted, total, rate, pipelineValue };
  }, [quotes]);

  const technicianPerformance = useMemo(() => {
    const techMap: Record<string, { total: number, completed: number }> = {};
    appointments.forEach(a => {
      const tech = a.technician || 'Sin Asignar';
      if (!techMap[tech]) techMap[tech] = { total: 0, completed: 0 };
      techMap[tech].total += 1;
      if (a.status === 'Completada') techMap[tech].completed += 1;
    });
    return Object.entries(techMap).map(([name, stats]) => ({
      name,
      servicios: stats.total,
      eficiencia: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
    })).sort((a,b) => b.servicios - a.servicios);
  }, [appointments]);

  const inventoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    products.forEach(p => {
       const cat = p.category || 'General';
       const value = (Number(p.cost) || 0) * (Number(p.stock) || 0); // Valoración a costo para contabilidad
       catMap[cat] = (catMap[cat] || 0) + value;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [products]);

  const generateAiAnalysis = async () => {
    setLoadingAi(true);
    setAiAnalysis(null);
    try {
      const contextData = {
        empresa: "SuperAir de México",
        periodo: `Últimos ${dateRange} meses`,
        kpis: {
            tasaCierre: `${commercialStats.rate.toFixed(1)}%`,
            valorPipeline: commercialStats.pipelineValue,
            eficienciaTecnicaPromedio: `${(technicianPerformance.reduce((acc, t) => acc + t.eficiencia, 0) / (technicianPerformance.length || 1)).toFixed(1)}%`
        },
        financiero: financialData.map(d => ({ Mes: d.name, Ingresos: d.ingresos, Utilidad: d.ganancia })),
        clima: "Ola de calor intensa en zona Bajío (31°C - 35°C)"
      };

      const token = localStorage.getItem('superair_token');
      const res = await fetch('/api/reports/ai-analysis', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ contextData })
      });
      if (res.ok) {
          const data = await res.json();
          setAiAnalysis(data.analysis);
      } else {
          setAiAnalysis("<li>Error en análisis de servidor.</li>");
      }
    } catch (error) {
      setAiAnalysis("<li>Error: No se pudo conectar con el motor de analítica IA.</li>");
    } finally {
      setLoadingAi(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Inteligencia de Negocios</h2>
          <p className="text-slate-500 text-sm font-medium">Dashboard consolidado de rentabilidad y eficiencia técnica.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-sky-600 transition-all shadow-sm"><RefreshCw size={18}/></button>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm"
          >
            <option value="3">Trimestre</option>
            <option value="6">Semestre</option>
            <option value="12">Anual</option>
          </select>
          <button onClick={generateAiAnalysis} disabled={loadingAi} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 transition-all shadow-xl">
             {loadingAi ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={16}/>} Auditoría IA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={20}/></div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase">Real</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilidad Bruta</p>
              <h3 className="text-2xl font-black text-slate-900">{formatCurrency(financialData.reduce((acc,d)=>acc+d.ganancia,0))}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between mb-4">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl"><Target size={20}/></div>
                  <span className="text-[9px] font-black text-sky-600 uppercase">Efectividad</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Cierre</p>
              <h3 className="text-2xl font-black text-slate-900">{commercialStats.rate.toFixed(1)}%</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Activity size={20}/></div>
                  <span className="text-[9px] font-black text-indigo-600 uppercase">Activo</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Pipeline</p>
              <h3 className="text-2xl font-black text-slate-900">{formatCurrency(commercialStats.pipelineValue)}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex justify-between mb-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><AlertCircle size={20}/></div>
                  <span className="text-[9px] font-black text-rose-600 uppercase">Alerta</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Citas x Confirmar</p>
              <h3 className="text-2xl font-black text-slate-900">{appointments.filter(a=>a.status==='Programada').length}</h3>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              {/* Chart Financiero */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Desempeño Económico</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Ingresos vs Utilidad Neta</p>
                      </div>
                      <div className="flex gap-2">
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"/><span className="text-[9px] font-black uppercase text-slate-400">Ingresos</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/><span className="text-[9px] font-black uppercase text-slate-400">Utilidad</span></div>
                      </div>
                  </div>
                  <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={financialData}>
                              <defs>
                                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                                  <linearGradient id="gradGanancia" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} tickFormatter={(val)=>`$${val/1000}k`} />
                              <Tooltip contentStyle={{borderRadius:'20px', border:'none', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                              <Area type="monotone" dataKey="ingresos" stroke="#0ea5e9" strokeWidth={4} fill="url(#gradIngresos)" />
                              <Area type="monotone" dataKey="ganancia" stroke="#10b981" strokeWidth={4} fill="url(#gradGanancia)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Chart Operativo */}
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8">Eficiencia Técnica de Flota</h3>
                  <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={technicianPerformance} layout="vertical">
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 900}} width={100} />
                              <Tooltip cursor={{fill: '#f8fafc'}} />
                              <Bar dataKey="eficiencia" name="Eficiencia %" fill="#0f172a" radius={[0, 10, 10, 0]} barSize={25} />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* AI Insights & Breakdown */}
          <div className="space-y-8">
              <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                  <Sparkles size={120} className="absolute -right-8 -bottom-8 opacity-5 rotate-12" />
                  <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-sky-500/20 text-sky-400 rounded-2xl backdrop-blur-md border border-sky-400/20"><BrainCircuit size={24}/></div>
                          <h4 className="font-black text-lg uppercase tracking-tighter leading-none">Análisis Estratégico<br/>Gemini AI</h4>
                      </div>
                      
                      {!aiAnalysis ? (
                          <div className="space-y-6">
                              <p className="text-xs text-slate-400 font-medium leading-relaxed uppercase tracking-widest">El motor de IA está listo para procesar {quotes.length} cotizaciones y {appointments.length} citas actuales para darte una ventaja competitiva.</p>
                              <button onClick={generateAiAnalysis} disabled={loadingAi} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-50 transition-all flex items-center justify-center gap-2">
                                  {loadingAi ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>} Ejecutar Análisis Real
                              </button>
                          </div>
                      ) : (
                          <div className="animate-in fade-in zoom-in duration-500">
                              <div 
                                className="text-xs text-slate-300 leading-relaxed font-medium space-y-4 [&>ul]:space-y-4 [&>ul>li]:bg-white/5 [&>ul>li]:p-4 [&>ul>li]:rounded-2xl [&>ul>li]:border [&>ul>li]:border-white/10"
                                dangerouslySetInnerHTML={{ __html: aiAnalysis }}
                              />
                              <button onClick={() => setAiAnalysis(null)} className="mt-6 w-full py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:text-white transition-all">Limpiar Auditoría</button>
                          </div>
                      )}
                  </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Inversión en Inventario</h4>
                  <div className="space-y-4">
                      {inventoryData.map((cat, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase">{cat.name}</p>
                                  <p className="font-black text-slate-900 text-sm">{formatCurrency(cat.value)}</p>
                              </div>
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm"><Package size={18}/></div>
                          </div>
                      ))}
                      {inventoryData.length === 0 && <p className="text-center py-6 text-slate-300 text-xs font-black uppercase">Sin stock valorizado</p>}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Reports;

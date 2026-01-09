
import React from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Workflow
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

const data = [
  { name: 'Lun', ventas: 4000 },
  { name: 'Mar', ventas: 3000 },
  { name: 'Mie', ventas: 2000 },
  { name: 'Jue', ventas: 2780 },
  { name: 'Vie', ventas: 1890 },
  { name: 'Sab', ventas: 2390 },
  { name: 'Dom', ventas: 3490 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ventas Mensuales', value: '$128,450', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Clientes Nuevos', value: '42', icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Cotizaciones Pendientes', value: '18', icon: ShoppingCart, color: 'bg-amber-50 text-amber-600' },
          { label: 'Citas Hoy', value: '5', icon: Clock, color: 'bg-sky-50 text-sky-600' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">{card.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-slate-800">Desempeño Semanal</h3>
            <select className="text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none">
              <option>Últimos 7 días</option>
              <option>Últimos 30 días</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="ventas" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Roadmap / Project Plan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-sky-500" />
            Plan de Implementación
          </h3>
          <div className="space-y-4">
            {[
              { title: 'Fase 1: ERP Base', desc: 'CRM, Inventario y Ventas centralizados.', status: 'completado' },
              { title: 'Fase 2: Web Builder', desc: 'Landing page dinámica para captar leads.', status: 'en-progreso' },
              { title: 'Fase 3: Integraciones', desc: 'Google Calendar, Chatwoot & n8n.', status: 'en-progreso' },
              { title: 'Fase 4: IA Assistant', desc: 'Cálculo de BTU inteligente con Gemini.', status: 'pendiente' },
            ].map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                  step.status === 'completado' ? 'bg-emerald-500' :
                  step.status === 'en-progreso' ? 'bg-sky-500 animate-pulse' : 'bg-slate-200'
                }`} />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{step.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-700">
               <Workflow size={16} />
               <span className="text-xs font-bold uppercase">n8n Workflow Activo</span>
            </div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
          </div>
          <button className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            Ver Roadmap Completo <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Citas Recientes / Próximas</h3>
          <button className="text-sky-600 text-sm font-semibold hover:underline">Ver todas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Servicio</th>
                <th className="px-6 py-4">Técnico</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {[
                { client: 'Residencial Lomas', type: 'Mantenimiento', tech: 'Carlos R.', status: 'En Proceso', date: 'Hoy, 10:00' },
                { client: 'Oficinas Nexus', type: 'Instalación', tech: 'Miguel A.', status: 'Programada', date: 'Mañana, 09:00' },
                { client: 'Jorge Salcedo', type: 'Reparación', tech: 'Carlos R.', status: 'Completada', date: 'Ayer, 15:30' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{row.client}</td>
                  <td className="px-6 py-4">{row.type}</td>
                  <td className="px-6 py-4">{row.tech}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      row.status === 'Completada' ? 'bg-emerald-50 text-emerald-600' :
                      row.status === 'En Proceso' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

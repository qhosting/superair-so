
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  MoreHorizontal, 
  Filter, 
  Workflow, 
  History as HistoryIcon, 
  Calendar,
  X,
  Save,
  Trash2,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronRight,
  ClipboardList,
  // Added missing Users icon from lucide-react
  Users
} from 'lucide-react';
import { Client } from '../types';

const Clients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Residencial' | 'Comercial'>('Todos');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: 'Ana Martínez', email: 'ana.m@example.com', phone: '55 1234 5678', address: 'Av. Reforma 123, CDMX', type: 'Residencial', status: 'Activo', totalSpent: 24500, lastService: '2024-03-15', notes: 'Prefiere mantenimientos los sábados por la mañana.' },
    { id: '2', name: 'Corporativo Omega', email: 'ventas@omega.com', phone: '55 8765 4321', address: 'Polanco III, CDMX', type: 'Comercial', status: 'Activo', totalSpent: 142000, lastService: '2024-04-10', notes: 'Requiere factura inmediata. 12 unidades tipo paquete.' },
    { id: '3', name: 'Roberto Garza', email: 'r.garza@test.com', phone: '81 4455 6677', address: 'Colonia Del Valle, Monterrey', type: 'Residencial', status: 'Prospecto', totalSpent: 0, notes: 'Interesado en Mini Split Inverter para recámara principal.' },
  ]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'Todos' || c.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [clients, searchTerm, activeFilter]);

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'Activo').length,
    prospects: clients.filter(c => c.status === 'Prospecto').length,
    revenue: clients.reduce((acc, c) => acc + (c.totalSpent || 0), 0)
  };

  const triggerN8n = (clientId: string) => {
    setTriggeringId(clientId);
    setTimeout(() => {
      setTriggeringId(null);
      alert('Datos sincronizados con Chatwoot y n8n.');
    }, 1500);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Clientes', value: stats.total, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Ingreso Total', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Prospectos', value: stats.prospects, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Servicios Realizados', value: '142', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex-1 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email, empresa..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Todos', 'Residencial', 'Comercial'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f as any)}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-3 px-8 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          Nuevo Cliente
        </button>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-sky-200 transition-all group overflow-hidden flex flex-col">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-xl font-black shadow-inner ${
                  client.type === 'Comercial' ? 'bg-indigo-50 text-indigo-500' : 'bg-sky-50 text-sky-500'
                }`}>
                  {client.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => triggerN8n(client.id)}
                    className={`p-3 rounded-2xl transition-all ${triggeringId === client.id ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}
                  >
                    <Workflow size={20} />
                  </button>
                  <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-600">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-black text-slate-900 text-xl tracking-tighter mb-1">{client.name}</h4>
                <div className="flex gap-2 items-center">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                    client.status === 'Activo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {client.status}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                    {client.type}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={14} /></div>
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={14} /></div>
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><MapPin size={14} /></div>
                  <span className="truncate">{client.address}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
              <button 
                onClick={() => setSelectedClient(client)}
                className="flex-1 py-3 bg-white text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-50 hover:text-sky-600 border border-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <HistoryIcon size={14} />
                Historial
              </button>
              <button className="flex-1 py-3 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 shadow-lg shadow-sky-600/10 transition-all flex items-center justify-center gap-2">
                <Calendar size={14} />
                Cita
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Client Detail Drawer (Modal) */}
      {selectedClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-end">
           <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-sky-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black">
                      {selectedClient.name.charAt(0)}
                   </div>
                   <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedClient.name}</h3>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">ID: {selectedClient.id} • {selectedClient.type}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Invertido</p>
                      <h4 className="text-2xl font-black text-slate-900">{formatCurrency(selectedClient.totalSpent || 0)}</h4>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Último Servicio</p>
                      <h4 className="text-2xl font-black text-slate-900">{selectedClient.lastService || 'N/A'}</h4>
                   </div>
                </div>

                {/* Notes Section */}
                <div>
                   <h5 className="font-black text-slate-900 uppercase tracking-tighter text-lg mb-6 flex items-center gap-3">
                      <ClipboardList size={20} className="text-sky-500" />
                      Notas Técnicas
                   </h5>
                   <div className="p-6 bg-sky-50/50 border border-sky-100 rounded-[2rem] text-sky-900 leading-relaxed font-medium">
                      {selectedClient.notes || 'No hay notas registradas para este cliente.'}
                   </div>
                </div>

                {/* Activity Timeline */}
                <div>
                   <h5 className="font-black text-slate-900 uppercase tracking-tighter text-lg mb-8 flex items-center gap-3">
                      <FileText size={20} className="text-sky-500" />
                      Historial de Actividad
                   </h5>
                   <div className="space-y-6">
                      {[
                        { date: '2024-04-10', type: 'Mantenimiento', status: 'Completado', amount: '$850' },
                        { date: '2024-03-05', type: 'Venta de Unidad', status: 'Completado', amount: '$14,500' },
                        { date: '2024-02-12', type: 'Reparación', status: 'Garantía', amount: '$0' },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-6 items-start group">
                           <div className="pt-1">
                              <div className="w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:border-sky-500 group-hover:text-sky-600 transition-all">
                                 <HistoryIcon size={20} />
                              </div>
                           </div>
                           <div className="flex-1 pb-6 border-b border-slate-100 last:border-0">
                              <div className="flex justify-between mb-1">
                                 <p className="font-black text-slate-800 uppercase tracking-tight">{item.type}</p>
                                 <span className="text-xs font-bold text-sky-600">{item.amount}</span>
                              </div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.date} • {item.status}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20">Nueva Cotización</button>
                 <button className="px-10 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100">Editar Cliente</button>
              </div>
           </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Nuevo Cliente</h3>
                 <button onClick={() => setShowForm(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 grid grid-cols-2 gap-6">
                 <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo / Empresa</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono (WhatsApp)</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Cliente</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                       <option>Residencial</option>
                       <option>Comercial</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                       <option>Prospecto</option>
                       <option>Activo</option>
                    </select>
                 </div>
                 <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección de Servicio</label>
                    <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-24 resize-none" />
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button onClick={() => setShowForm(false)} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20">Registrar Cliente</button>
                 <button onClick={() => setShowForm(false)} className="px-10 py-4 bg-white text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Clients;

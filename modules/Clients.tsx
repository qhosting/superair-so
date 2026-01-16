
import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, Search, Plus, MapPin, Phone, Mail, FileText, Trash2, 
  Loader2, UploadCloud, CheckCircle2, AlertCircle, X, BrainCircuit, ExternalLink,
  Edit3, Save, Wind, History, DollarSign, Wallet, Calendar, Thermometer, ChevronRight,
  PlusCircle, Info, Settings, Factory, Layout, Wrench
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Client, ClientAsset } from '../types';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [profile360, setProfile360] = useState<any>(null);
  const [loading360, setLoading360] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'history' | 'finance'>('assets');

  // Asset Form State
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState<Partial<ClientAsset>>({
      brand: '', model: '', btu: 12000, type: 'MiniSplit', install_date: new Date().toISOString().split('T')[0], notes: ''
  });

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '', email: '', phone: '', address: '', rfc: '', type: 'Residencial', status: 'Prospecto', notes: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadClient360 = async (id: string) => {
      setSelectedClientId(id);
      setLoading360(true);
      try {
          const res = await fetch(`/api/clients/${id}/360`);
          const data = await res.json();
          setProfile360(data);
      } catch (e) { console.error(e); }
      finally { setLoading360(false); }
  };

  const handleSaveAsset = async () => {
      if (!selectedClientId) return;
      setIsSaving(true);
      try {
          const res = await fetch(`/api/clients/${selectedClientId}/assets`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(assetForm)
          });
          if (res.ok) {
              setShowAssetModal(false);
              loadClient360(selectedClientId);
          }
      } catch (e) { alert("Error guardando equipo"); }
      finally { setIsSaving(false); }
  };

  const handleDeleteAsset = async (assetId: string) => {
      if (!confirm("¿Eliminar este equipo del expediente?")) return;
      try {
          await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
          loadClient360(selectedClientId!);
      } catch (e) { console.error(e); }
  };

  const isMaintenanceDue = (lastService?: string) => {
      if (!lastService) return false;
      const last = new Date(lastService);
      const diffMonths = (new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return diffMonths >= 6;
  };

  const formatMXN = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const filteredClients = useMemo(() => {
    return clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.rfc && c.rfc.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [clients, searchTerm]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Clientes 360</h2>
          <p className="text-slate-500 text-sm font-medium">CRM Industrial con expediente técnico de activos HVAC.</p>
        </div>
        <button onClick={() => { setIsEditing(false); setShowAddModal(true); }} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 shadow-2xl transition-all">
            <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Resumen Operativo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl"><User size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Total Cartera</p><h4 className="text-xl font-black">{clients.length}</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl animate-pulse"><AlertCircle size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Mants. Pendientes</p><h4 className="text-xl font-black">{clients.filter(c => isMaintenanceDue(c.lastService)).length}</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Ventas Proyectadas</p><h4 className="text-xl font-black">$---k</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Thermometer size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Alerta Calor MX</p><h4 className="text-xl font-black">Alta Carga</h4></div>
          </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex items-center gap-4">
             <Search className="text-slate-400" />
             <input 
                placeholder="Buscar por nombre, RFC o ubicación..." 
                className="w-full outline-none font-bold text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
         </div>
         {loading ? (
             <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={32}/></div>
         ) : (
             <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                     <tr>
                         <th className="px-8 py-5">Cliente</th>
                         <th className="px-8 py-5">Tipo</th>
                         <th className="px-8 py-5">Status Mantenimiento</th>
                         <th className="px-8 py-5">LTV (Venta)</th>
                         <th className="px-8 py-5 text-right">Acciones</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredClients.map(client => {
                         const due = isMaintenanceDue(client.lastService);
                         return (
                            <tr key={client.id} className="hover:bg-slate-50/50 cursor-pointer group transition-all" onClick={() => loadClient360(client.id)}>
                                <td className="px-8 py-5">
                                    <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{client.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1"><MapPin size={10}/> {client.address || 'Sin dirección'}</div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${client.type === 'Comercial' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {client.type}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    {due ? (
                                        <div className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase">
                                            <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" /> Requiere Servicio
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
                                            <CheckCircle2 size={14} /> Al día
                                        </div>
                                    )}
                                    <div className="text-[9px] text-slate-400 mt-1 uppercase">Último: {client.lastService ? new Date(client.lastService).toLocaleDateString() : 'NUNCA'}</div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="font-black text-slate-900">{formatMXN(Number(client.ltv || 0))}</div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button className="p-3 text-slate-300 hover:text-sky-600 hover:bg-white rounded-2xl shadow-sm transition-all"><ChevronRight size={18}/></button>
                                </td>
                            </tr>
                         );
                     })}
                 </tbody>
             </table>
         )}
      </div>

      {/* DRAWER: VISIÓN 360° CLIENTE */}
      {selectedClientId && profile360 && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex justify-end">
              <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                  {/* Header Profile */}
                  <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                      <div className="flex items-center gap-6">
                          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-xl ${profile360.client.type === 'Comercial' ? 'bg-slate-900' : 'bg-sky-600'}`}>
                             <User size={32}/>
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{profile360.client.name}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{profile360.client.rfc || 'Sin RFC'}</span>
                                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">{profile360.client.type}</span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedClientId(null)} className="p-3 hover:bg-white rounded-2xl shadow-sm"><X size={24} className="text-slate-400" /></button>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-3 gap-px bg-slate-100 border-b border-slate-100 shrink-0">
                      <div className="bg-white p-6 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Venta Total</p>
                          <p className="text-lg font-black text-emerald-600">{formatMXN(profile360.quotes.filter((q:any)=>q.status==='Aceptada').reduce((acc:number, q:any)=>acc+Number(q.total), 0))}</p>
                      </div>
                      <div className="bg-white p-6 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Servicios</p>
                          <p className="text-lg font-black text-slate-900">{profile360.appointments.length}</p>
                      </div>
                      <div className="bg-white p-6 text-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipos</p>
                          <p className="text-lg font-black text-sky-600">{profile360.assets.length}</p>
                      </div>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex bg-slate-50 p-2 shrink-0">
                      <button onClick={() => setActiveTab('assets')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assets' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Expediente Técnico</button>
                      <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Historial Servicios</button>
                      <button onClick={() => setActiveTab('finance')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Finanzas & Maps</button>
                  </div>

                  {/* Content View */}
                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      {activeTab === 'assets' && (
                          <div className="space-y-6">
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Wind size={18} className="text-sky-500"/> Equipos Instalados</h4>
                                  <button onClick={() => setShowAssetModal(true)} className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 transition-all"><PlusCircle size={20}/></button>
                              </div>
                              {profile360.assets.map((asset: any) => (
                                  <div key={asset.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative group">
                                      <button onClick={() => handleDeleteAsset(asset.id)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                      <div className="flex gap-4 items-start">
                                          <div className="p-4 bg-white rounded-2xl shadow-sm text-sky-600"><Wind size={24}/></div>
                                          <div>
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.brand} • {asset.btu} BTU</p>
                                              <h5 className="font-black text-slate-800 text-lg">{asset.type} {asset.model}</h5>
                                              <div className="flex items-center gap-4 mt-3">
                                                  <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400"/><span className="text-[10px] font-bold text-slate-500 uppercase">Instalado: {asset.install_date ? new Date(asset.install_date).toLocaleDateString() : '--'}</span></div>
                                                  <div className="flex items-center gap-1.5"><Wrench size={12} className="text-slate-400"/><span className="text-[10px] font-bold text-slate-500 uppercase">Último Mant: {asset.last_service ? new Date(asset.last_service).toLocaleDateString() : '--'}</span></div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              {profile360.assets.length === 0 && (
                                  <div className="text-center py-10 opacity-30">
                                      <Wind size={48} className="mx-auto mb-4"/>
                                      <p className="font-black uppercase text-xs tracking-widest">Sin equipos registrados</p>
                                  </div>
                              )}
                          </div>
                      )}

                      {activeTab === 'history' && (
                          <div className="space-y-6">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><History size={18} className="text-indigo-500"/> Historial de Intervenciones</h4>
                              <div className="space-y-4">
                                  {profile360.appointments.map((apt: any) => (
                                      <div key={apt.id} className="flex gap-6 items-start">
                                          <div className="flex flex-col items-center gap-2">
                                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${apt.status === 'Completada' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                                  {apt.status === 'Completada' ? <CheckCircle2 size={18}/> : <Calendar size={18}/>}
                                              </div>
                                              <div className="w-0.5 flex-1 bg-slate-100 min-h-[40px]"></div>
                                          </div>
                                          <div className="flex-1 pb-8">
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(apt.date).toLocaleDateString()} • {apt.time} HRS</p>
                                              <h5 className="font-black text-slate-800 text-sm mt-1">{apt.type} - {apt.status}</h5>
                                              <p className="text-xs text-slate-500 mt-1">Técnico: <span className="font-bold text-slate-700">{apt.technician}</span></p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {activeTab === 'finance' && (
                          <div className="space-y-10">
                              <div className="space-y-4">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><DollarSign size={18} className="text-emerald-500"/> Cotizaciones y Pagos</h4>
                                  <div className="space-y-3">
                                      {profile360.quotes.map((q: any) => (
                                          <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                                              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Folio #{q.id}</p><p className="font-bold text-slate-700 text-sm">{new Date(q.created_at).toLocaleDateString()}</p></div>
                                              <div className="text-right">
                                                  <p className="font-black text-slate-900">{formatMXN(q.total)}</p>
                                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${q.status === 'Aceptada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{q.status}</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><MapPin size={18} className="text-rose-500"/> Ubicación Logística</h4>
                                  <div className="h-48 bg-slate-100 rounded-[2.5rem] border border-slate-200 overflow-hidden relative group">
                                      <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-10" />
                                      <iframe 
                                        width="100%" 
                                        height="100%" 
                                        style={{ border: 0 }} 
                                        loading="lazy" 
                                        allowFullScreen 
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={`https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(profile360.client.address)}`}
                                        className="grayscale hover:grayscale-0 transition-all duration-700"
                                      />
                                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                                          <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile360.client.address)}`} 
                                            target="_blank" 
                                            className="px-6 py-2 bg-slate-900 text-white rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-sky-600 transition-all"
                                          >
                                              Abrir en Maps
                                          </a>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: NUEVO EQUIPO (Asset) */}
      {showAssetModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Añadir Equipo AC</h3>
                      <button onClick={() => setShowAssetModal(false)}><X size={24} className="text-slate-400"/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                              <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={assetForm.brand} onChange={e=>setAssetForm({...assetForm, brand: e.target.value})} placeholder="Ej: Carrier" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</label>
                              <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={assetForm.model} onChange={e=>setAssetForm({...assetForm, model: e.target.value})} placeholder="Ej: Inverter X" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidad (BTU)</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={assetForm.btu} onChange={e=>setAssetForm({...assetForm, btu: parseInt(e.target.value)})}>
                                  <option value={12000}>12,000 (1 Ton)</option>
                                  <option value={18000}>18,000 (1.5 Ton)</option>
                                  <option value={24000}>24,000 (2 Ton)</option>
                                  <option value={36000}>36,000 (3 Ton)</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={assetForm.type} onChange={e=>setAssetForm({...assetForm, type: e.target.value as any})}>
                                  <option>MiniSplit</option><option>Multisplit</option><option>Paquete</option><option>VRF</option>
                              </select>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Instalación</label>
                          <input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={assetForm.install_date} onChange={e=>setAssetForm({...assetForm, install_date: e.target.value})} />
                      </div>
                      <button onClick={handleSaveAsset} disabled={isSaving} className="w-full py-5 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                          {isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'Guardar en Expediente'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: REGISTRO CLIENTE (Existing with UI Tweaks) */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                              {isEditing ? 'Editar Perfil' : 'Registro de Cliente'}
                          </h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de datos de contacto y facturación.</p>
                      </div>
                      <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
                  </div>

                  <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre / Razón Social</label>
                              <input value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC</label>
                                  <input value={newClient.rfc} onChange={e => setNewClient({...newClient, rfc: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase" />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                                  <input value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                              </div>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                              <input value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                          </div>
                      </div>
                      
                      <div className="space-y-6">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cliente</label>
                              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                                  {['Residencial', 'Comercial'].map(t => (
                                      <button 
                                        key={t}
                                        onClick={() => setNewClient({...newClient, type: t as any})}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newClient.type === t ? 'bg-white shadow-md text-sky-600' : 'text-slate-400 hover:text-slate-600'}`}
                                      >
                                          {t}
                                      </button>
                                  ))}
                              </div>
                           </div>

                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Fiscal / Instalación</label>
                              <textarea 
                                value={newClient.address} 
                                onChange={e => setNewClient({...newClient, address: e.target.value})} 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm h-32 resize-none"
                              />
                           </div>
                      </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-slate-100 flex gap-4">
                      <button 
                        onClick={async () => {
                            if (!newClient.name) return;
                            setIsSaving(true);
                            try {
                                const method = isEditing ? 'PUT' : 'POST';
                                const url = isEditing ? `/api/clients/${newClient.id}` : '/api/clients';
                                const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(newClient)});
                                if(res.ok) { fetchClients(); setShowAddModal(false); }
                            } catch(e) { alert("Error"); }
                            finally { setIsSaving(false); }
                        }} 
                        disabled={isSaving}
                        className="flex-1 py-5 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
                      >
                          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                          {isEditing ? 'Actualizar Información' : 'Confirmar Registro'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Clients;


import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, Search, Plus, MapPin, Phone, Mail, FileText, Trash2, 
  Loader2, CheckCircle2, AlertCircle, X, BrainCircuit, ExternalLink,
  Edit3, Save, Wind, History, DollarSign, Wallet, Calendar, Thermometer, ChevronRight,
  PlusCircle, Info, Settings, Factory, Layout, Wrench, MessageSquare, Sparkles,
  Trophy, Star, Building
} from 'lucide-react';
import { Client, ClientAsset } from '../types';
import { useNotification } from '../context/NotificationContext';

const Clients: React.FC = () => {
  const { showToast } = useNotification();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [profile360, setProfile360] = useState<any>(null);
  const [loading360, setLoading360] = useState(false);
  const [activeTab, setActiveTab] = useState<'assets' | 'history' | 'finance'>('assets');

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Asset Form State
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState<Partial<ClientAsset>>({
      brand: '', model: '', btu: 12000, type: 'MiniSplit', install_date: new Date().toISOString().split('T')[0], notes: ''
  });

  const [newClient, setNewClient] = useState<Partial<Client & { contact_name: string; category: string }>>({
    name: '', contact_name: '', email: '', phone: '', address: '', rfc: '', type: 'Residencial', category: 'Bronze', status: 'Activo', notes: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      showToast("Error al conectar con la base de datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadClient360 = async (id: string) => {
      setSelectedClientId(id);
      setAiAnalysis(null);
      setLoading360(true);
      try {
          const res = await fetch(`/api/clients/${id}/360`);
          const data = await res.json();
          setProfile360(data);
      } catch (e) { console.error(e); }
      finally { setLoading360(false); }
  };

  const runAIAnalysis = async () => {
      if (!profile360) return;
      setIsAnalyzing(true);
      setAiAnalysis(null);
      try {
          const res = await fetch(`/api/clients/${selectedClientId}/ai-analysis`, { method: 'POST' });
          const data = await res.json();
          if (data.analysis) {
            setAiAnalysis(data.analysis);
            showToast("Análisis Gemini completado");
          } else {
            showToast("No se pudo generar el análisis", "error");
          }
      } catch (e) {
          showToast("Error en el diagnóstico de IA", "error");
      } finally {
          setIsAnalyzing(false);
      }
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
              showToast("Equipo registrado correctamente");
              setAssetForm({ brand: '', model: '', btu: 12000, type: 'MiniSplit', install_date: new Date().toISOString().split('T')[0], notes: '' });
          }
      } catch (e) { showToast("Error guardando equipo", "error"); }
      finally { setIsSaving(false); }
  };

  const markAssetServiced = async (assetId: string) => {
      try {
          const res = await fetch(`/api/assets/${assetId}/service`, { method: 'PUT' });
          if (res.ok) {
              showToast("Servicio registrado hoy");
              loadClient360(selectedClientId!);
          }
      } catch (e) { showToast("Error al actualizar servicio", "error"); }
  };

  const handleDeleteAsset = async (assetId: string) => {
      if (!confirm("¿Eliminar este equipo del expediente?")) return;
      try {
          const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
          if (res.ok) {
              showToast("Equipo eliminado");
              loadClient360(selectedClientId!);
          }
      } catch (e) { showToast("Error al eliminar equipo", "error"); }
  };

  const handleDeleteClient = async (id: string) => {
      if (!confirm("¿Eliminar este cliente y todos sus datos permanentemente?")) return;
      try {
          const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
          if (res.ok) {
              showToast("Expediente eliminado");
              setSelectedClientId(null);
              fetchClients();
          }
      } catch (e) { showToast("Error al eliminar cliente", "error"); }
  };

  const handleOpenEditClient = () => {
      if (!profile360) return;
      setNewClient(profile360.client);
      setIsEditing(true);
      setShowAddModal(true);
  };

  const formatMXN = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.rfc && c.rfc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm))
    );
  }, [clients, searchTerm]);

  const getCategoryColor = (cat?: string) => {
      switch(cat) {
          case 'Gold': return 'text-amber-500 bg-amber-50 border-amber-100';
          case 'Silver': return 'text-slate-400 bg-slate-50 border-slate-100';
          default: return 'text-orange-700 bg-orange-50 border-orange-100';
      }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Expediente de Clientes 360</h2>
          <p className="text-slate-500 text-sm font-medium">CRM Técnico con monitoreo de activos y salud de equipos HVAC.</p>
        </div>
        <button onClick={() => { 
            setNewClient({name: '', contact_name: '', email: '', phone: '', address: '', rfc: '', type: 'Residencial', category: 'Bronze', status: 'Activo', notes: ''});
            setIsEditing(false); 
            setShowAddModal(true); 
        }} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 shadow-2xl transition-all">
            <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl"><User size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Cartera Total</p><h4 className="text-xl font-black">{clients.length}</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Trophy size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Clientes Gold</p><h4 className="text-xl font-black">{clients.filter(c => c.category === 'Gold').length}</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Ventas LTV</p><h4 className="text-xl font-black">{formatMXN(clients.reduce((acc,c)=>acc+Number(c.ltv||0),0))}</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Thermometer size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Salud Sistema</p><h4 className="text-xl font-black">Online</h4></div>
          </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex items-center gap-4">
             <Search className="text-slate-400" />
             <input 
                placeholder="Buscar por nombre, RFC, teléfono o dirección..." 
                className="w-full outline-none font-bold text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
         </div>
         {loading ? (
             <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={32}/></div>
         ) : (
             <div className="overflow-x-auto">
                 <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                         <tr>
                             <th className="px-8 py-5">Identidad del Cliente</th>
                             <th className="px-8 py-5">Nivel</th>
                             <th className="px-8 py-5">Tipo</th>
                             <th className="px-8 py-5">Ventas Acum.</th>
                             <th className="px-8 py-5 text-right">Acciones</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {filteredClients.map(client => (
                            <tr key={client.id} className="hover:bg-slate-50/50 cursor-pointer group transition-all" onClick={() => loadClient360(client.id)}>
                                <td className="px-8 py-5">
                                    <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors flex items-center gap-2">
                                        {client.name}
                                        {client.category === 'Gold' && <Star size={12} className="text-amber-500 fill-amber-500" />}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1"><MapPin size={10}/> {client.address || 'Ubicación no registrada'}</div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getCategoryColor(client.category)}`}>
                                        {client.category || 'Bronze'}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${client.type === 'Comercial' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {client.type}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="font-black text-slate-900">{formatMXN(Number(client.ltv || 0))}</div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); loadClient360(client.id); }} className="p-2 text-slate-400 hover:text-sky-600"><ChevronRight size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
      </div>

      {/* DRAWER: VISIÓN 360° CLIENTE */}
      {selectedClientId && profile360 && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex justify-end">
              <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-200">
                  {/* Header Profile */}
                  <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          {profile360.client.category === 'Gold' && <Trophy size={100} className="text-amber-500" />}
                      </div>
                      <div className="flex items-center gap-6 relative z-10">
                          <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl ${profile360.client.type === 'Comercial' ? 'bg-slate-900' : 'bg-sky-600'}`}>
                             <User size={32}/>
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{profile360.client.name}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{profile360.client.rfc || 'PÚBLICO EN GENERAL'}</span>
                                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${profile360.health === 'Healthy' ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>{profile360.health === 'Healthy' ? 'Saludable' : 'Atención Requerida'}</span>
                              </div>
                              <div className="mt-4 flex gap-2">
                                  <button onClick={handleOpenEditClient} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase hover:bg-slate-50 transition-all"><Edit3 size={12}/> Editar Perfil</button>
                                  <button onClick={() => handleDeleteClient(selectedClientId)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-rose-100 text-rose-500 rounded-lg text-[9px] font-black uppercase hover:bg-rose-50 transition-all"><Trash2 size={12}/> Eliminar</button>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedClientId(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} className="text-slate-400" /></button>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex bg-slate-50 p-2 shrink-0 border-b border-slate-100">
                      <button onClick={() => setActiveTab('assets')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assets' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Activos Técnicos</button>
                      <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Bitácora Servicios</button>
                      <button onClick={() => setActiveTab('finance')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Finanzas & Maps</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
                      {activeTab === 'assets' && (
                          <div className="space-y-8">
                              <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Wind size={18} className="text-sky-500"/> Unidades Instaladas</h4>
                                  <div className="flex gap-2">
                                      <button onClick={runAIAnalysis} disabled={isAnalyzing || profile360.assets.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all">
                                          {isAnalyzing ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={14}/>} {isAnalyzing ? 'Diagnosticando...' : 'IA Prognosis'}
                                      </button>
                                      <button onClick={() => setShowAssetModal(true)} className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 border border-sky-100 transition-all"><PlusCircle size={20}/></button>
                                  </div>
                              </div>

                              {aiAnalysis && (
                                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
                                      <Sparkles className="absolute top-4 right-4 text-sky-400 opacity-50 animate-pulse" size={24}/>
                                      <h5 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-4">Dictamen Técnico Gemini AI</h5>
                                      <div className="text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-line border-l-2 border-sky-500 pl-4">
                                          {aiAnalysis}
                                      </div>
                                  </div>
                              )}

                              <div className="space-y-4">
                                {profile360.assets.map((asset: any) => (
                                    <div key={asset.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative group hover:border-sky-200 transition-all">
                                        <button onClick={() => handleDeleteAsset(asset.id)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                        <div className="flex gap-5 items-start">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm text-sky-600 border border-slate-100"><Wind size={24}/></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.brand} • {asset.btu} BTU</p>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{asset.type}</span>
                                                </div>
                                                <h5 className="font-black text-slate-800 text-lg uppercase tracking-tight">{asset.model}</h5>
                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100/50">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400"/><span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Instalado: {asset.install_date ? new Date(asset.install_date).toLocaleDateString() : '--'}</span></div>
                                                        <div className="flex items-center gap-1.5"><Wrench size={12} className="text-slate-400"/><span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Último Mant: {asset.last_service ? new Date(asset.last_service).toLocaleDateString() : 'PENDIENTE'}</span></div>
                                                    </div>
                                                    <button 
                                                        onClick={() => markAssetServiced(asset.id)}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-[8px] tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-900/10 transition-all"
                                                    >
                                                        Registrar Servicio Hoy
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                              </div>
                          </div>
                      )}

                      {activeTab === 'history' && (
                          <div className="space-y-8">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><History size={18} className="text-indigo-500"/> Cronología de Intervenciones</h4>
                              <div className="space-y-6 pl-4 border-l-2 border-slate-100">
                                  {profile360.appointments.map((apt: any) => (
                                      <div key={apt.id} className="relative pb-8 pl-8 group">
                                          <div className={`absolute -left-[1.25rem] top-0 w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shadow-lg z-10 transition-transform group-hover:scale-110 ${apt.status === 'Completada' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                              {apt.status === 'Completada' ? <CheckCircle2 size={16}/> : <Calendar size={16}/>}
                                          </div>
                                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white transition-all shadow-sm">
                                              <div className="flex justify-between items-start mb-2">
                                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(apt.date).toLocaleDateString()} • {apt.time} HRS</p>
                                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${apt.status === 'Completada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{apt.status}</span>
                                              </div>
                                              <h5 className="font-black text-slate-800 text-sm uppercase tracking-tight">{apt.type}</h5>
                                              <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                                                  <User size={12} className="text-sky-500"/>
                                                  Técnico: <span className="font-bold text-slate-700">{apt.technician}</span>
                                              </p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {activeTab === 'finance' && (
                          <div className="space-y-12">
                              <div className="space-y-4">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><DollarSign size={18} className="text-emerald-500"/> Estado de Cuenta</h4>
                                  <div className="grid grid-cols-2 gap-4 mb-6">
                                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem]">
                                          <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Venta Total</p>
                                          <p className="text-2xl font-black text-emerald-700">{formatMXN(profile360.quotes.filter((q:any)=>q.status==='Aceptada'||q.status==='Ejecutada').reduce((acc:number, q:any)=>acc+Number(q.total), 0))}</p>
                                      </div>
                                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem]">
                                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cotizaciones</p>
                                          <p className="text-2xl font-black text-slate-700">{profile360.quotes.length}</p>
                                      </div>
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><MapPin size={18} className="text-rose-500"/> Ubicación de Servicio</h4>
                                  <div className="h-56 bg-slate-100 rounded-[2.5rem] border border-slate-200 overflow-hidden relative group">
                                      <iframe 
                                        width="100%" 
                                        height="100%" 
                                        style={{ border: 0 }} 
                                        loading="lazy" 
                                        allowFullScreen 
                                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS_KEY || 'AIzaSyA'}&q=${encodeURIComponent(profile360.client.address || 'Queretaro, Mexico')}`}
                                        className="grayscale hover:grayscale-0 transition-all duration-700"
                                      />
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
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Carga de Activo HVAC</h3>
                      <button onClick={() => setShowAssetModal(false)}><X size={24} className="text-slate-400"/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca Fabricante</label>
                              <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={assetForm.brand} onChange={e=>setAssetForm({...assetForm, brand: e.target.value})} placeholder="Carrier, York, Trane..." />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo / SKU</label>
                              <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={assetForm.model} onChange={e=>setAssetForm({...assetForm, model: e.target.value})} placeholder="Serie X-500" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidad (BTU)</label>
                              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={assetForm.btu} onChange={e=>setAssetForm({...assetForm, btu: parseInt(e.target.value)})}>
                                  <option value={12000}>12,000 (1 Ton)</option>
                                  <option value={18000}>18,000 (1.5 Ton)</option>
                                  <option value={24000}>24,000 (2 Ton)</option>
                                  <option value={36000}>36,000 (3 Ton)</option>
                                  <option value={60000}>60,000 (5 Ton)</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tecnología / Tipo</label>
                              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={assetForm.type} onChange={e=>setAssetForm({...assetForm, type: e.target.value as any})}>
                                  <option>MiniSplit Inverter</option>
                                  <option>Multisplit</option>
                                  <option>Unidad Paquete</option>
                                  <option>VRF / Central</option>
                              </select>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Instalación</label>
                          <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={assetForm.install_date} onChange={e=>setAssetForm({...assetForm, install_date: e.target.value})} />
                      </div>
                      <button onClick={handleSaveAsset} disabled={isSaving} className="w-full py-5 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-sky-700 transition-all flex items-center justify-center gap-2">
                          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                          Guardar en Base de Datos
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: REGISTRO/EDICIÓN CLIENTE */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                              {isEditing ? 'Actualizar Expediente' : 'Alta de Cliente SuperAir'}
                          </h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Control de datos de facturación y contacto técnico.</p>
                      </div>
                      <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social / Empresa</label>
                              <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                <input value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-sky-500" placeholder="Corporativo Industrial MX" />
                              </div>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Atención / Contacto Directo</label>
                              <input value={newClient.contact_name} onChange={e => setNewClient({...newClient, contact_name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="Ing. Carlos Pérez" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC</label>
                                  <input value={newClient.rfc} onChange={e => setNewClient({...newClient, rfc: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase" placeholder="ABC123456XYZ" />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Segmento</label>
                                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={newClient.category} onChange={e=>setNewClient({...newClient, category: e.target.value})}>
                                      <option value="Bronze">Bronze (Residencial)</option>
                                      <option value="Silver">Silver (Pymes)</option>
                                      <option value="Gold">Gold (Industrial)</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                      
                      <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                                    <input value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="10 dígitos" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                    <input value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="admin@empresa.com" />
                                </div>
                           </div>

                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección de Servicio Principal</label>
                              <textarea 
                                value={newClient.address} 
                                onChange={e => setNewClient({...newClient, address: e.target.value})} 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm h-32 resize-none focus:ring-2 focus:ring-sky-500"
                                placeholder="Colonia, Municipio, CP..."
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
                                if(res.ok) { 
                                    fetchClients(); 
                                    setShowAddModal(false); 
                                    showToast(isEditing ? "Expediente actualizado" : "Cliente registrado en sistema");
                                    if (selectedClientId) loadClient360(selectedClientId);
                                }
                            } catch(e) { showToast("Error al procesar solicitud", "error"); }
                            finally { setIsSaving(false); }
                        }} 
                        disabled={isSaving}
                        className="flex-1 py-5 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
                      >
                          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                          {isEditing ? 'Confirmar Cambios en Base de Datos' : 'Registrar Cliente en Sistema'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Clients;

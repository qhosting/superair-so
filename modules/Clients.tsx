import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, UserPlus, Mail, Phone, MapPin, MoreHorizontal, Workflow, 
  History as HistoryIcon, Calendar, X, TrendingUp, CheckCircle2, Clock, 
  ClipboardList, Users, Loader2, FileUp, FileText, ScanLine, Building2, Sparkles, Trash2,
  Wrench, Truck
} from 'lucide-react';
import { Client } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const Clients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Residencial' | 'Comercial'>('Todos');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Modals State
  const [showForm, setShowForm] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Client Form
  const [newClient, setNewClient] = useState({
    name: '', email: '', phone: '', address: '', rfc: '', type: 'Residencial', status: 'Prospecto', notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // New Appointment Form
  const [schedulingClientId, setSchedulingClientId] = useState<string | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    technician: 'Carlos Rodríguez',
    type: 'Mantenimiento',
    status: 'Programada'
  });
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => {
          if(!res.ok) throw new Error("API Error");
          return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch(err => {
        console.error("Failed to load clients:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveClient = async () => {
    setIsSaving(true);
    try {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newClient)
        });
        
        if (response.ok) {
            const savedClient = await response.json();
            setClients([savedClient, ...clients]);
            setShowForm(false);
            setNewClient({ name: '', email: '', phone: '', address: '', rfc: '', type: 'Residencial', status: 'Prospecto', notes: '' });
        } else {
            throw new Error('Save Failed');
        }
    } catch (e) {
        alert("Error al guardar cliente en la base de datos.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("¿Eliminar este cliente y todos sus datos?")) return;
    try {
        await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        setClients(clients.filter(c => c.id !== id));
        if (selectedClient?.id === id) setSelectedClient(null);
    } catch(e) {
        alert("Error al eliminar cliente.");
    }
  };

  // --- Appointment Logic ---
  const handleOpenAppointment = (clientId: string) => {
    setSchedulingClientId(clientId);
    setAppointmentForm({
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        technician: 'Carlos Rodríguez',
        type: 'Mantenimiento',
        status: 'Programada'
    });
    setShowAppointmentModal(true);
  };

  const handleSaveAppointment = async () => {
    if (!schedulingClientId) return;
    setIsBooking(true);
    try {
        const payload = {
            client_id: schedulingClientId,
            ...appointmentForm
        };

        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Cita programada exitosamente.');
            setShowAppointmentModal(false);
            setSchedulingClientId(null);
        } else {
            throw new Error("Error booking");
        }
    } catch (e) {
        alert('Error al guardar la cita.');
    } finally {
        setIsBooking(false);
    }
  };

  // --- LOGICA DE IA (Gemini) ---
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];

    if (!validTypes.includes(file.type)) {
        alert('Formato no soportado. Por favor sube PDF (Constancia Fiscal) o Imagen (JPG, PNG).');
        return;
    }

    setIsAnalyzing(true);

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Configuración del Modelo y Prompt
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-latest',
                contents: {
                    parts: [
                        { inlineData: { mimeType: file.type, data: base64Data } },
                        { text: "Analiza este documento fiscal mexicano (Constancia de Situación Fiscal). Extrae con precisión: Razón Social (name), RFC, Dirección Fiscal Completa (address) y determina si es Persona Física (Residencial) o Moral (Comercial)." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Nombre completo o Razón Social" },
                            rfc: { type: Type.STRING, description: "RFC (Registro Federal de Contribuyentes)" },
                            address: { type: Type.STRING, description: "Calle, Número, Colonia, Código Postal, Estado" },
                            type: { type: Type.STRING, enum: ["Residencial", "Comercial"], description: "Tipo de cliente basado en el régimen fiscal" }
                        },
                        required: ["name", "rfc", "address", "type"]
                    }
                }
            });

            if (response.text) {
                const extractedData = JSON.parse(response.text);
                setNewClient(prev => ({
                    ...prev,
                    name: extractedData.name || prev.name,
                    rfc: extractedData.rfc || prev.rfc,
                    address: extractedData.address || prev.address,
                    type: extractedData.type || prev.type,
                    notes: `Datos extraídos automáticamente por IA el ${new Date().toLocaleDateString()} desde: ${file.name}`
                }));
                alert('¡Datos Fiscales extraídos con éxito!');
            }
        };
    } catch (e) {
        console.error(e);
        alert("Ocurrió un error al procesar el documento con IA. Intenta con una imagen más clara o un PDF nativo.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (c.rfc && c.rfc.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const triggerN8n = async (clientId: string) => {
    setTriggeringId(clientId);
    try {
        await fetch('/api/trigger-n8n', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                webhookUrl: 'https://n8n.tu-dominio.com/webhook/sync-client',
                payload: { clientId, action: 'SYNC_CRM' }
            })
        });
        alert('Datos enviados al Webhook de n8n exitosamente.');
    } catch (e) {
        alert('Error conectando con n8n.');
    } finally {
        setTimeout(() => setTriggeringId(null), 1000);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Clientes', value: stats.total, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Ingreso Histórico', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Prospectos', value: stats.prospects, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Servicios Realizados', value: '0', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
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
              placeholder="Buscar por nombre, RFC, email..."
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

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-sky-600" size={48} />
        </div>
      )}

      {/* Clients Grid */}
      {!loading && filteredClients.length === 0 && (
          <div className="text-center py-20 text-slate-400">
              <p>No se encontraron clientes.</p>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-sky-200 transition-all group overflow-hidden flex flex-col">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-xl font-black shadow-inner ${
                  client.type === 'Comercial' ? 'bg-indigo-50 text-indigo-500' : 'bg-sky-50 text-sky-500'
                }`}>
                  {client.type === 'Comercial' ? <Building2 size={24}/> : client.name.charAt(0)}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => triggerN8n(client.id)}
                    className={`p-3 rounded-2xl transition-all ${triggeringId === client.id ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}
                    title="Sincronizar con n8n"
                  >
                    <Workflow size={20} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-black text-slate-900 text-xl tracking-tighter mb-1">{client.name}</h4>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                    client.status === 'Activo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {client.status}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                    {client.type}
                  </span>
                  {client.rfc && (
                    <span className="text-[9px] font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {client.rfc}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={14} /></div>
                  <span className="truncate">{client.email || 'Sin email'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={14} /></div>
                  <span>{client.phone || 'Sin teléfono'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"><MapPin size={14} /></div>
                  <span className="truncate">{client.address || 'Sin dirección'}</span>
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
              <button 
                onClick={(e) => { e.stopPropagation(); handleOpenAppointment(client.id); }}
                className="flex-1 py-3 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 shadow-lg shadow-sky-600/10 transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={14} />
                Cita
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Client Detail Drawer */}
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
                {selectedClient.rfc && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RFC Registrado</p>
                            <p className="font-mono text-lg font-bold text-slate-800">{selectedClient.rfc}</p>
                        </div>
                        <FileText className="text-slate-300" size={24} />
                    </div>
                )}
                
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
              </div>
           </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-in zoom-in duration-300 custom-scrollbar">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Nuevo Cliente</h3>
                 <button onClick={() => setShowForm(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
              </div>

              <div className="p-8 space-y-8">
                 
                 {/* AI Upload Area */}
                 <div 
                    className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all relative overflow-hidden group ${dragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                 >
                     {isAnalyzing ? (
                         <div className="flex flex-col items-center justify-center py-6">
                             <Loader2 size={48} className="text-sky-600 animate-spin mb-4" />
                             <h4 className="font-black text-slate-900 uppercase tracking-tight">Analizando Documento...</h4>
                             <p className="text-xs text-slate-400 font-medium">Gemini está extrayendo los datos fiscales.</p>
                         </div>
                     ) : (
                         <>
                             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-sky-500 group-hover:scale-110 transition-transform">
                                <ScanLine size={32} />
                             </div>
                             <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-2">
                                 Lectura Inteligente <span className="text-sky-500">AI</span>
                             </h4>
                             <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto mb-6">
                                 Arrastra aquí la <strong>Constancia de Situación Fiscal (PDF o Imagen)</strong> para autocompletar el formulario.
                             </p>
                             <label className="cursor-pointer px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg inline-flex items-center gap-2">
                                <FileUp size={14} /> Seleccionar Archivo
                                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e.target.files)} />
                             </label>
                         </>
                     )}
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                     <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo / Razón Social</label>
                        <input 
                            value={newClient.name}
                            onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                            placeholder="Ej. Comercializadora del Bajío SA de CV"
                        />
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                           RFC <Sparkles size={10} className="text-sky-500" />
                        </label>
                        <input 
                            value={newClient.rfc}
                            onChange={(e) => setNewClient({...newClient, rfc: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold uppercase" 
                            placeholder="XAXX010101000"
                        />
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Cliente</label>
                        <select 
                            value={newClient.type}
                            onChange={(e) => setNewClient({...newClient, type: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        >
                           <option value="Residencial">Residencial</option>
                           <option value="Comercial">Comercial</option>
                        </select>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                        <input 
                            value={newClient.email}
                            onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono (WhatsApp)</label>
                        <input 
                            value={newClient.phone}
                            onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" 
                        />
                     </div>
                     
                     <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección Fiscal / Servicio</label>
                        <textarea 
                            value={newClient.address}
                            onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-20 resize-none" 
                        />
                     </div>

                     <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas Internas</label>
                        <textarea 
                            value={newClient.notes}
                            onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-16 resize-none text-xs" 
                            placeholder="Notas generadas por IA o comentarios adicionales..."
                        />
                     </div>
                  </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 sticky bottom-0">
                 <button 
                    onClick={handleSaveClient}
                    disabled={isSaving || !newClient.name}
                    className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                    {isSaving ? 'Guardando...' : 'Registrar Cliente'}
                 </button>
                 <button onClick={() => setShowForm(false)} className="px-10 py-4 bg-white text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && schedulingClientId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Calendar size={24}/></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Agendar Cita</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Cliente: {clients.find(c => c.id === schedulingClientId)?.name}
                        </p>
                    </div>
                 </div>
                 <button onClick={() => setShowAppointmentModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                       <input 
                            type="date" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                            value={appointmentForm.date}
                            onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                       <input 
                            type="time" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                            value={appointmentForm.time}
                            onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                        />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Servicio</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        value={appointmentForm.type}
                        onChange={(e) => setAppointmentForm({...appointmentForm, type: e.target.value})}
                    >
                       <option value="Instalación">Instalación</option>
                       <option value="Mantenimiento">Mantenimiento</option>
                       <option value="Reparación">Reparación</option>
                       <option value="Visita Técnica">Visita Técnica</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Responsable</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        value={appointmentForm.technician}
                        onChange={(e) => setAppointmentForm({...appointmentForm, technician: e.target.value})}
                    >
                       <option value="Carlos Rodríguez">Carlos Rodríguez</option>
                       <option value="Miguel Acevedo">Miguel Acevedo</option>
                       <option value="Juan Pérez">Juan Pérez</option>
                    </select>
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={handleSaveAppointment}
                  disabled={isBooking}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                    {isBooking ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                    Confirmar Agendamiento
                 </button>
                 <button 
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-10 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                 >Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
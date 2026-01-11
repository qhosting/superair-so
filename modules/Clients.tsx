
import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, Search, Plus, MapPin, Phone, Mail, FileText, Trash2, 
  Loader2, UploadCloud, CheckCircle2, AlertCircle, X, BrainCircuit, ExternalLink
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Client } from '../types';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // IA Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '', email: '', phone: '', address: '', rfc: '', type: 'Residencial', status: 'Prospecto', notes: ''
  });

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

  const handleSaveClient = async () => {
    if (!newClient.name) return;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewClient({ name: '', email: '', phone: '', address: '', rfc: '', type: 'Residencial', status: 'Prospecto', notes: '' });
        fetchClients();
      }
    } catch (e) {
      alert('Error guardando cliente');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('¿Eliminar cliente?')) {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      setClients(clients.filter(c => c.id !== id));
    }
  };

  // --- LOGICA DE IA (Gemini) + UPLOAD REAL ---
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
        // 1. Subir archivo al servidor
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('superair_token')}`
            },
            body: formData
        });
        
        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadData = await uploadRes.json();
        console.log("File saved at:", uploadData.url);

        // 2. Procesar con IA
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Usamos Gemini 3 Flash Preview para mayor precisión en extracción de datos
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
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
                            name: { type: Type.STRING },
                            rfc: { type: Type.STRING },
                            address: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["Residencial", "Comercial"] }
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
                    notes: `Documento: ${uploadData.url}\nDatos extraídos automáticamente por IA el ${new Date().toLocaleDateString()}.`
                }));
                alert('¡Datos Fiscales extraídos y archivo guardado!');
            }
        };
    } catch (e) {
        console.error(e);
        alert("Ocurrió un error al procesar o subir el documento.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [clients, searchTerm]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cartera de Clientes</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión de contactos y datos fiscales.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all">
            <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex items-center gap-4">
             <Search className="text-slate-400" />
             <input 
                placeholder="Buscar por nombre o email..." 
                className="w-full outline-none font-bold text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
         </div>
         {loading ? (
             <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600"/></div>
         ) : (
             <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                     <tr>
                         <th className="px-8 py-5">Cliente</th>
                         <th className="px-8 py-5">Contacto</th>
                         <th className="px-8 py-5">Tipo</th>
                         <th className="px-8 py-5">RFC</th>
                         <th className="px-8 py-5 text-right">Acciones</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredClients.map(client => (
                         <tr key={client.id} className="hover:bg-slate-50/50">
                             <td className="px-8 py-5">
                                 <div className="font-bold text-slate-900">{client.name}</div>
                                 <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                    <MapPin size={10} /> 
                                    {client.address ? (
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="hover:text-sky-600 hover:underline"
                                        >
                                            {client.address}
                                        </a>
                                    ) : 'Sin dirección'}
                                 </div>
                             </td>
                             <td className="px-8 py-5">
                                 <div className="flex items-center gap-2 text-xs font-medium text-slate-600"><Mail size={12}/> {client.email}</div>
                                 <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mt-1"><Phone size={12}/> {client.phone}</div>
                             </td>
                             <td className="px-8 py-5">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${client.type === 'Comercial' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                     {client.type}
                                 </span>
                             </td>
                             <td className="px-8 py-5 text-xs font-mono font-bold text-slate-500">{client.rfc || 'N/A'}</td>
                             <td className="px-8 py-5 text-right">
                                 <button onClick={() => handleDeleteClient(client.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         )}
      </div>

      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Registrar Cliente</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manual o vía Constancia Fiscal</p>
                      </div>
                      <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre / Razón Social</label>
                              <input value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC</label>
                              <input value={newClient.rfc} onChange={e => setNewClient({...newClient, rfc: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                              <input value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                          </div>
                      </div>
                      
                      <div className="space-y-6">
                           {/* AI Dropzone */}
                           <div className="border-2 border-dashed border-sky-200 bg-sky-50 rounded-3xl p-6 text-center hover:bg-sky-100 transition-colors relative">
                               <input 
                                  type="file" 
                                  accept="image/*,application/pdf"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => handleFileUpload(e.target.files)}
                               />
                               {isAnalyzing ? (
                                   <div className="flex flex-col items-center gap-2">
                                       <Loader2 className="animate-spin text-sky-600" size={32} />
                                       <span className="text-xs font-bold text-sky-700">Analizando con Gemini 3...</span>
                                   </div>
                               ) : (
                                   <>
                                       <BrainCircuit className="mx-auto text-sky-500 mb-2" size={32} />
                                       <p className="text-xs font-bold text-sky-900 uppercase">Auto-llenado con IA</p>
                                       <p className="text-[10px] text-sky-600 mt-1">Sube Constancia de Situación Fiscal</p>
                                   </>
                               )}
                           </div>
                           
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cliente</label>
                              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
                                  {['Residencial', 'Comercial'].map(t => (
                                      <button 
                                        key={t}
                                        onClick={() => setNewClient({...newClient, type: t as any})}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newClient.type === t ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}
                                      >
                                          {t}
                                      </button>
                                  ))}
                              </div>
                           </div>
                      </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex gap-4">
                      <button onClick={handleSaveClient} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-sky-700">Guardar Cliente</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Clients;

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Magnet, Plus, Phone, MessageSquare, ArrowRight, UserPlus, 
  Loader2, CheckCircle2, X, Sparkles, Copy, Calendar, Edit3, 
  Trash2, User, Megaphone, Smartphone, Clock, AlertTriangle, 
  History, Thermometer, BrainCircuit, Wand2, Send, Save
} from 'lucide-react';
import { Lead, LeadStatus, LeadHistoryItem } from '../types';
import { useNavigate, useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const STATUS_COLUMNS: LeadStatus[] = ['Nuevo', 'Contactado', 'Calificado', 'Cotizado', 'Ganado', 'Perdido'];

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [leadForm, setLeadForm] = useState<Partial<Lead>>({ name: '', phone: '', email: '', notes: '', source: 'Manual', status: 'Nuevo' });
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (res.ok) {
            setLeads(Array.isArray(data) ? data : []);
        } else {
            showToast(data.error || "Error al sincronizar prospectos", "error");
        }
    } catch (e) {
        console.error("Error fetching leads:", e);
        showToast("Error de red al conectar con el ERP", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleDrop = async (status: LeadStatus) => {
      if (!draggedLead || draggedLead.status === status) return;
      const updatedLead = { ...draggedLead, status };
      
      // Optimistic update
      setLeads(leads.map(l => l.id === draggedLead.id ? updatedLead : l));
      setDraggedLead(null);
      
      try {
          const res = await fetch(`/api/leads/${draggedLead.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
          });
          if (res.ok) {
              showToast(`Lead movido a: ${status}`);
          } else {
              const err = await res.json();
              showToast(err.error || "Falla en actualización remota", "error");
              fetchLeads(); // Rollback
          }
      } catch (e) { 
          showToast("Error de conexión al servidor", "error");
          fetchLeads(); 
      }
  };

  const handleConvertToClient = async (lead: Lead) => {
      if(!confirm(`¿Deseas convertir a ${lead.name} en un Cliente real?`)) return;
      
      setIsSaving(true);
      try {
          const res = await fetch(`/api/leads/${lead.id}/convert`, { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
              showToast("¡Cliente generado con éxito!");
              navigate('/clients');
          } else {
              showToast(data.error || "Error al convertir lead", "error");
          }
      } catch (e) {
          showToast("Error de conexión durante la conversión", "error");
      } finally {
          setIsSaving(false);
      }
  };

  const addHistoryComment = async () => {
      if (!selectedLead || !newComment.trim() || isSaving) return;
      
      const history = Array.isArray(selectedLead.history) ? selectedLead.history : [];
      const newItem: LeadHistoryItem = {
          date: new Date().toISOString(),
          text: newComment,
          user: user?.name || 'Admin'
      };
      
      const updatedHistory = [...history, newItem];
      setIsSaving(true);
      
      try {
          const res = await fetch(`/api/leads/${selectedLead.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ history: updatedHistory })
          });
          const saved = await res.json();
          if (res.ok) {
              setSelectedLead(saved);
              setLeads(leads.map(l => l.id === saved.id ? saved : l));
              setNewComment('');
              showToast("Bitácora actualizada");
          } else {
              showToast(saved.error || "Error al guardar nota", "error");
          }
      } catch (e) { 
          showToast("Error de conexión al servidor", "error"); 
      } finally { 
          setIsSaving(false); 
      }
  };

  const handleCreateLead = async () => {
      if (!leadForm.name || isSaving) return;
      setIsSaving(true);
      try {
          const res = await fetch('/api/leads', { 
              method: 'POST', 
              headers: {'Content-Type':'application/json'}, 
              body: JSON.stringify(leadForm) 
          });
          const data = await res.json();
          if(res.ok) { 
              fetchLeads(); 
              setShowAddModal(false); 
              showToast("Prospecto inyectado al sistema");
              setLeadForm({ name: '', phone: '', email: '', notes: '', source: 'Manual', status: 'Nuevo' });
          } else {
              showToast(data.error || "Error al registrar prospecto", "error");
          }
      } catch (e) { 
          showToast("Error crítico de red.", "error"); 
      } finally { 
          setIsSaving(false); 
      }
  };

  if(loading && leads.length === 0) return <div className="h-[60vh] flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-sky-600" size={48}/><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Abriendo Pipeline...</p></div>;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Pipeline Comercial</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión de prospectos SuperAir con flujo Kanban y IA.</p>
        </div>
        <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-600 shadow-2xl transition-all"
        >
            <Plus size={18} /> Registrar Lead
        </button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-max px-2">
              {STATUS_COLUMNS.map(status => (
                  <div 
                    key={status}
                    className="w-80 flex flex-col bg-slate-100/40 rounded-[2.5rem] border border-slate-200/50 overflow-hidden"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(status)}
                  >
                      <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{status}</span>
                          <span className="px-2.5 py-0.5 bg-white rounded-full text-[10px] font-black text-slate-400 border border-slate-100">
                              {leads.filter(l => l.status === status).length}
                          </span>
                      </div>

                      <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                          {leads.filter(l => l.status === status).map(lead => (
                                <div 
                                    key={lead.id}
                                    draggable
                                    onDragStart={() => setDraggedLead(lead)}
                                    onClick={() => setSelectedLead(lead)}
                                    className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-transparent hover:border-sky-300 cursor-pointer transition-all hover:shadow-xl group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight">{lead.name}</h4>
                                        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-300 group-hover:text-sky-500 transition-colors">
                                            <Edit3 size={12}/>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-medium">{lead.notes || 'Sin detalles registrados'}</p>
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400"/>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{lead.source}</span>
                                        </div>
                                        <div className="text-[8px] font-black text-slate-300 uppercase">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '--'}</div>
                                    </div>
                                </div>
                          ))}
                          {leads.filter(l => l.status === status).length === 0 && (
                              <div className="h-24 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 text-[10px] font-black uppercase">Vacio</div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {selectedLead && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex justify-end">
              <div className="w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl text-white ${selectedLead.status === 'Ganado' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                             <User size={24}/>
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{selectedLead.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 bg-sky-50 text-sky-600 rounded-lg text-[9px] font-black uppercase border border-sky-100">{selectedLead.status}</span>
                                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{selectedLead.phone}</span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400"><X size={24} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <History size={14} className="text-sky-500"/> Historial de Seguimiento
                          </h4>
                          <div className="space-y-4">
                              {(Array.isArray(selectedLead.history) ? selectedLead.history : []).map((item, i) => (
                                  <div key={i} className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-xs relative group">
                                      <p className="text-slate-700 font-medium leading-relaxed">{item.text}</p>
                                      <div className="mt-3 flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                          <span>{item.user}</span>
                                          <span>{new Date(item.date).toLocaleString()}</span>
                                      </div>
                                  </div>
                              ))}
                              {(!Array.isArray(selectedLead.history) || selectedLead.history.length === 0) && (
                                  <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-slate-300 text-[10px] font-black uppercase">Sin comentarios</div>
                              )}
                              <div className="pt-6 flex gap-2">
                                  <input 
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                                    placeholder="Añadir nota técnica o de seguimiento..."
                                    onKeyDown={e => e.key === 'Enter' && addHistoryComment()}
                                  />
                                  <button onClick={addHistoryComment} disabled={isSaving || !newComment.trim()} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-sky-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center">
                                      {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                                  </button>
                              </div>
                          </div>
                      </div>

                      {selectedLead.status !== 'Ganado' && (
                          <div className="pt-10 border-t border-slate-100">
                              <button 
                                onClick={() => handleConvertToClient(selectedLead)}
                                disabled={isSaving}
                                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all disabled:opacity-50"
                              >
                                  {isSaving ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20}/>} 
                                  Cerrar Venta & Convertir a Cliente
                              </button>
                              <p className="text-center text-[9px] text-slate-400 font-bold uppercase mt-4 tracking-widest">Al convertir, los datos se pasarán al expediente de clientes 360°</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-10">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl"><Magnet size={24}/></div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Captura de Lead</h3>
                      </div>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo / Empresa</label>
                          <input 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-sky-500" 
                            value={leadForm.name}
                            onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Tel</label>
                              <input 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-sky-500" 
                                value={leadForm.phone}
                                onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Canal de Entrada</label>
                              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={leadForm.source} onChange={e => setLeadForm({...leadForm, source: e.target.value})}>
                                  <option>Manual</option><option>Web</option><option>Recomendación</option><option>Facebook</option><option>Google</option>
                              </select>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas Iniciales</label>
                          <textarea 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-xs h-24 resize-none" 
                            value={leadForm.notes}
                            onChange={e => setLeadForm({...leadForm, notes: e.target.value})}
                          />
                      </div>
                      <button 
                        onClick={handleCreateLead}
                        disabled={isSaving || !leadForm.name}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/10 hover:bg-sky-600 transition-all disabled:opacity-50"
                      >
                          {isSaving ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Inyectar al Pipeline'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Leads;
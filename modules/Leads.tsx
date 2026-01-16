
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Magnet, Plus, Phone, MessageSquare, ArrowRight, UserPlus, 
  Loader2, CheckCircle2, X, Sparkles, Copy, Calendar, Edit3, 
  Trash2, User, Megaphone, Smartphone, Clock, AlertTriangle, 
  History, Thermometer, BrainCircuit, Wand2, Send, Save
} from 'lucide-react';
import { Lead, LeadStatus, LeadHistoryItem } from '../types';
import { useNavigate, useAuth } from '../context/AuthContext';

const STATUS_COLUMNS: LeadStatus[] = ['Nuevo', 'Contactado', 'Calificado', 'Cotizado', 'Ganado', 'Perdido'];

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  
  const [leadForm, setLeadForm] = useState<Partial<Lead>>({ name: '', phone: '', email: '', notes: '', source: 'Manual' });
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
        setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
        console.error("Error fetching leads:", e);
    } finally {
        setLoading(false);
    }
  };

  const handleDrop = async (status: LeadStatus) => {
      if (!draggedLead || draggedLead.status === status) return;
      const updatedLead = { ...draggedLead, status };
      setLeads(leads.map(l => l.id === draggedLead.id ? updatedLead : l));
      setDraggedLead(null);
      try {
          await fetch(`/api/leads/${draggedLead.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
          });
      } catch (e) { fetchLeads(); }
  };

  const handleConvertToClient = async (lead: Lead) => {
      if(!confirm("¿Deseas convertir este Lead en un Cliente real?")) return;
      
      setIsSaving(true);
      try {
          const res = await fetch(`/api/leads/${lead.id}/convert`, { method: 'POST' });
          if (res.ok) {
              const newClient = await res.json();
              localStorage.setItem('pending_quote_client', JSON.stringify({ id: newClient.id, name: newClient.name }));
              alert("¡Cliente generado con éxito!");
              navigate('/quotes');
          } else {
              alert("Error al convertir lead.");
          }
      } catch (e) {
          alert("Error de conexión.");
      } finally {
          setIsSaving(false);
      }
  };

  const addHistoryComment = async () => {
      if (!selectedLead || !newComment.trim()) return;
      const newItem: LeadHistoryItem = {
          date: new Date().toISOString(),
          text: newComment,
          user: user?.name || 'Admin'
      };
      const updatedHistory = [...(selectedLead.history || []), newItem];
      setIsSaving(true);
      try {
          const res = await fetch(`/api/leads/${selectedLead.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ history: updatedHistory })
          });
          if (res.ok) {
              const saved = await res.json();
              setSelectedLead(saved);
              setLeads(leads.map(l => l.id === saved.id ? saved : l));
              setNewComment('');
          }
      } catch (e) { alert("Error"); }
      finally { setIsSaving(false); }
  };

  if(loading) return <div className="h-[60vh] flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-sky-600" size={48}/><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Leads...</p></div>;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Pipeline Comercial</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión de prospectos SuperAir.</p>
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
                    className="w-80 flex flex-col bg-slate-100/40 rounded-[2.5rem] border border-slate-200/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(status)}
                  >
                      <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-white/50 rounded-t-[2.5rem] backdrop-blur-sm">
                          <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                          <span className="text-[10px] font-black text-slate-300">
                              {leads.filter(l => l.status === status).length}
                          </span>
                      </div>

                      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                          {leads.filter(l => l.status === status).map(lead => (
                                <div 
                                    key={lead.id}
                                    draggable
                                    onDragStart={() => setDraggedLead(lead)}
                                    onClick={() => setSelectedLead(lead)}
                                    className="bg-white p-5 rounded-3xl shadow-sm border-2 border-transparent hover:border-sky-300 cursor-pointer transition-all hover:shadow-xl group"
                                >
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{lead.name}</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{lead.notes || 'Sin detalles'}</p>
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                                        <div className="text-[8px] font-black text-slate-300 uppercase">{lead.source}</div>
                                        <div className="text-[8px] font-black text-slate-300 uppercase">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                          ))}
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
                          <div className="p-4 rounded-2xl bg-slate-900 text-white">
                             <User size={24}/>
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{selectedLead.name}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedLead.status}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={24} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <History size={14}/> Bitácora
                          </h4>
                          <div className="space-y-4">
                              {selectedLead.history?.map((item, i) => (
                                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                                      <p className="text-slate-700">{item.text}</p>
                                      <p className="text-[8px] font-black text-slate-300 uppercase mt-1">{item.user} • {new Date(item.date).toLocaleString()}</p>
                                  </div>
                              ))}
                              <div className="pt-4 flex gap-2">
                                  <input 
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" 
                                    placeholder="Añadir comentario..."
                                  />
                                  <button onClick={addHistoryComment} disabled={isSaving || !newComment.trim()} className="p-3 bg-slate-900 text-white rounded-xl"><Save size={18}/></button>
                              </div>
                          </div>
                      </div>

                      {selectedLead.status !== 'Ganado' && (
                          <div className="pt-8 border-t border-slate-100">
                              <button 
                                onClick={() => handleConvertToClient(selectedLead)}
                                disabled={isSaving}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2"
                              >
                                  {isSaving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} 
                                  Convertir a Cliente
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Nuevo Prospecto</h3>
                      <button onClick={() => setShowAddModal(false)}><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                          <input 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" 
                            value={leadForm.name}
                            onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                              <input 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" 
                                value={leadForm.phone}
                                onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuente</label>
                              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={leadForm.source} onChange={e => setLeadForm({...leadForm, source: e.target.value})}>
                                  <option>Manual</option><option>Web</option><option>Recomendación</option>
                              </select>
                          </div>
                      </div>
                      <button 
                        onClick={async () => {
                            if (!leadForm.name) return;
                            const res = await fetch('/api/leads', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(leadForm) });
                            if(res.ok) { fetchLeads(); setShowAddModal(false); }
                        }}
                        className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                      >
                          Crear Lead
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Leads;

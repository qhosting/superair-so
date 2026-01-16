
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
  
  // Modals & Sidebars
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null); // leadId
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState<string | null>(null);
  
  // Forms
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

  const analyzeWithIA = async (leadId: string) => {
      setIsAnalyzing(leadId);
      try {
          const res = await fetch(`/api/leads/${leadId}/ai-analyze`, { method: 'POST' });
          if (res.ok) {
              const updated = await res.json();
              setLeads(leads.map(l => l.id === leadId ? updated : l));
              if (selectedLead?.id === leadId) setSelectedLead(updated);
          }
      } catch (e) { alert("Error en análisis de IA"); }
      finally { setIsAnalyzing(null); }
  };

  const suggestMagicReply = async (leadId: string) => {
      setIsSuggesting(true);
      setSuggestedReply(null);
      try {
          const res = await fetch(`/api/leads/${leadId}/suggest-reply`, { method: 'POST' });
          const data = await res.json();
          setSuggestedReply(data.reply);
      } catch (e) { alert("Error sugiriendo respuesta"); }
      finally { setIsSuggesting(false); }
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
      } catch (e) { alert("Error guardando bitácora"); }
      finally { setIsSaving(false); }
  };

  const isStale = (createdAt: string, updatedAt?: string) => {
      const lastAction = new Date(updatedAt || createdAt);
      const diffHours = (new Date().getTime() - lastAction.getTime()) / (1000 * 60 * 60);
      return diffHours > 24;
  };

  const getScoreColor = (score?: number) => {
      if (!score) return 'text-slate-300';
      if (score >= 8) return 'text-rose-500';
      if (score >= 5) return 'text-amber-500';
      return 'text-sky-500';
  };

  if(loading) return <div className="h-[60vh] flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-sky-600" size={48}/><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Iniciando Pipeline IA...</p></div>;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Célula Comercial SuperAir</h2>
          <p className="text-slate-500 text-sm font-medium">Pipeline inteligente potenciado por Gemini 3 Flash.</p>
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
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${
                              status === 'Nuevo' ? 'bg-sky-100 text-sky-700' :
                              status === 'Ganado' ? 'bg-emerald-100 text-emerald-700' :
                              status === 'Perdido' ? 'bg-rose-100 text-rose-700' :
                              'bg-white text-slate-500 border border-slate-200'
                          }`}>
                              {status}
                          </span>
                          <span className="text-[10px] font-black text-slate-300">
                              {leads.filter(l => l.status === status).length} LEADS
                          </span>
                      </div>

                      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                          {leads.filter(l => l.status === status).map(lead => {
                              const stale = lead.status !== 'Ganado' && lead.status !== 'Perdido' && isStale(lead.createdAt, lead.updatedAt);
                              return (
                                <div 
                                    key={lead.id}
                                    draggable
                                    onDragStart={() => setDraggedLead(lead)}
                                    onClick={() => setSelectedLead(lead)}
                                    className={`bg-white p-5 rounded-3xl shadow-sm border-2 cursor-pointer transition-all hover:shadow-xl group relative ${stale ? 'border-amber-400 animate-pulse-slow' : 'border-transparent hover:border-sky-300'}`}
                                >
                                    {stale && <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg" title="Estancado >24h"><Clock size={12}/></div>}
                                    
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-xl bg-slate-50 ${getScoreColor(lead.ai_score)}`}>
                                                <Thermometer size={14} fill={lead.ai_score ? 'currentColor' : 'none'} />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lead.source}</span>
                                        </div>
                                        {lead.ai_score && (
                                            <div className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black">{lead.ai_score}</div>
                                        )}
                                    </div>
                                    
                                    <h4 className="font-bold text-slate-800 text-sm mb-1">{lead.name}</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{lead.notes || 'Sin detalles'}</p>
                                    
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <div className="flex gap-2">
                                            <div className="p-1.5 bg-slate-100 text-slate-400 rounded-lg group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors"><MessageSquare size={12}/></div>
                                            <div className="p-1.5 bg-slate-100 text-slate-400 rounded-lg"><History size={12}/></div>
                                        </div>
                                        <div className="text-[8px] font-black text-slate-300 uppercase">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* DRAWER: DETALLE PROSPECTO (Inteligencia de Venta) */}
      {selectedLead && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex justify-end">
              <div className="w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl bg-slate-900 text-white ${getScoreColor(selectedLead.ai_score)}`}>
                             <User size={24}/>
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{selectedLead.name}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Megaphone size={10}/> {selectedLead.source} • {selectedLead.status}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => { setSelectedLead(null); setSuggestedReply(null); }} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={24} className="text-slate-400" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      {/* IA ANALYSIS CARD */}
                      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
                          <BrainCircuit size={140} className="absolute -right-8 -bottom-8 opacity-5" />
                          <div className="relative z-10">
                              <div className="flex justify-between items-start mb-6">
                                  <div>
                                      <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Análisis de Prioridad</h4>
                                      <div className="flex items-center gap-3">
                                          <span className="text-4xl font-black">{selectedLead.ai_score || '--'}</span>
                                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/ 10</span>
                                      </div>
                                  </div>
                                  <button 
                                    onClick={() => analyzeWithIA(selectedLead.id)}
                                    disabled={isAnalyzing === selectedLead.id}
                                    className="p-3 bg-white/10 hover:bg-sky-600 rounded-2xl transition-all border border-white/5"
                                  >
                                      {isAnalyzing === selectedLead.id ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                  </button>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed italic">
                                  {selectedLead.ai_analysis || "Solicita un análisis de IA para determinar la temperatura de venta de este cliente."}
                              </p>
                          </div>
                      </div>

                      {/* MAGIC REPLY */}
                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Respuesta Inteligente</h4>
                              <button 
                                onClick={() => suggestMagicReply(selectedLead.id)}
                                disabled={isSuggesting}
                                className="flex items-center gap-2 text-[10px] font-black text-sky-600 bg-sky-50 px-4 py-2 rounded-xl hover:bg-sky-100"
                              >
                                  {isSuggesting ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>} Magic Reply
                              </button>
                          </div>
                          {suggestedReply && (
                              <div className="p-5 bg-sky-50 border border-sky-100 rounded-3xl relative animate-in zoom-in">
                                  <p className="text-xs text-slate-600 leading-relaxed mb-4">{suggestedReply}</p>
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => { navigator.clipboard.writeText(suggestedReply); alert("Copiado"); }}
                                        className="flex-1 py-3 bg-white border border-sky-200 text-sky-700 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2"
                                      >
                                          <Copy size={12}/> Copiar
                                      </button>
                                      <a 
                                        href={`https://wa.me/${selectedLead.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(suggestedReply)}`}
                                        target="_blank"
                                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2"
                                      >
                                          <Send size={12}/> WhatsApp
                                      </a>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* HISTORY BITÁCORA */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <History size={14}/> Bitácora de Seguimiento
                          </h4>
                          <div className="space-y-4">
                              {selectedLead.history?.map((item, i) => (
                                  <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                          {item.user[0]}
                                      </div>
                                      <div>
                                          <p className="text-xs text-slate-700 leading-relaxed">{item.text}</p>
                                          <p className="text-[8px] font-black text-slate-300 uppercase mt-1">{item.user} • {new Date(item.date).toLocaleString()}</p>
                                      </div>
                                  </div>
                              ))}
                              
                              <div className="pt-4 flex gap-2">
                                  <input 
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-sky-500" 
                                    placeholder="Registra una llamada o contacto..."
                                  />
                                  <button 
                                    onClick={addHistoryComment}
                                    disabled={isSaving || !newComment.trim()}
                                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-sky-600 disabled:opacity-50"
                                  >
                                      <Save size={18}/>
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* CONVERSIÓN */}
                      {selectedLead.status !== 'Ganado' && (
                          <div className="pt-8 border-t border-slate-100">
                              <button 
                                onClick={() => {
                                    if(confirm("¿Convertir a Cliente y crear cotización?")) {
                                        localStorage.setItem('pending_quote_client', JSON.stringify({ id: selectedLead.id, name: selectedLead.name }));
                                        navigate('/quotes');
                                    }
                                }}
                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                              >
                                  <CheckCircle2 size={16}/> Finalizar Venta / Crear Cliente
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: REGISTRO MANUAL */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Nuevo Prospecto</h3>
                      <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                          <input 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                            placeholder="Ej: Ing. Jorge Trejo"
                            value={leadForm.name}
                            onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                              <input 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                                value={leadForm.phone}
                                onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuente</label>
                              <select 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                                value={leadForm.source}
                                onChange={e => setLeadForm({...leadForm, source: e.target.value})}
                              >
                                  <option>Manual</option>
                                  <option>Recomendación</option>
                                  <option>Evento / Expo</option>
                              </select>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interés / Notas iniciales</label>
                          <textarea 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-32 resize-none outline-none focus:ring-2 focus:ring-sky-500"
                            value={leadForm.notes}
                            onChange={e => setLeadForm({...leadForm, notes: e.target.value})}
                          />
                      </div>
                      <button 
                        onClick={async () => {
                            if (!leadForm.name) return;
                            const res = await fetch('/api/leads', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(leadForm) });
                            if(res.ok) { fetchLeads(); setShowAddModal(false); }
                        }}
                        className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-sky-600/20"
                      >
                          Crear en Pipeline
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Leads;

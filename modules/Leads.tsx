import React, { useState, useEffect } from 'react';
import { 
  Magnet, Plus, Phone, MessageSquare, ArrowRight, UserPlus, 
  MoreHorizontal, Loader2, GripVertical, CheckCircle2, X,
  Share2, Copy, Facebook, Globe, Calendar, Link as LinkIcon, Edit3, Trash2, Mail
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { useNavigate } from '../context/AuthContext';

const STATUS_COLUMNS: LeadStatus[] = ['Nuevo', 'Contactado', 'Calificado', 'Cotizado', 'Ganado', 'Perdido'];

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [leadForm, setLeadForm] = useState<Partial<Lead>>({ name: '', phone: '', email: '', notes: '', source: 'Manual' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (Array.isArray(data)) setLeads(data);
    } catch (e) {
        console.error("Error fetching leads", e);
    } finally {
        setLoading(false);
    }
  };

  const handleDragStart = (lead: Lead) => {
      setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = async (status: LeadStatus) => {
      if (!draggedLead || draggedLead.status === status) return;
      
      const updatedLead = { ...draggedLead, status };
      
      // Optimistic Update
      setLeads(leads.map(l => l.id === draggedLead.id ? updatedLead : l));
      setDraggedLead(null);

      try {
          await fetch(`/api/leads/${draggedLead.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status })
          });
      } catch (e) {
          console.error("Update failed");
          fetchLeads(); // Revert on error
      }
  };

  const handleOpenCreate = () => {
      setLeadForm({ name: '', phone: '', email: '', notes: '', source: 'Manual' });
      setIsEditing(false);
      setShowAddModal(true);
  };

  const handleOpenEdit = (lead: Lead) => {
      setLeadForm(lead);
      setIsEditing(true);
      setShowAddModal(true);
  };

  const handleSaveLead = async () => {
      if (!leadForm.name) return;
      setIsSaving(true);
      try {
          let res;
          if (isEditing && leadForm.id) {
              res = await fetch(`/api/leads/${leadForm.id}`, {
                  method: 'PUT',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(leadForm)
              });
          } else {
              res = await fetch('/api/leads', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(leadForm)
              });
          }

          if(res.ok) {
              const saved = await res.json();
              if (isEditing) {
                  setLeads(leads.map(l => l.id === saved.id ? saved : l));
              } else {
                  setLeads([saved, ...leads]);
              }
              setShowAddModal(false);
          }
      } catch(e) {
          alert("Error guardando lead");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteLead = async (id: string) => {
      if (!confirm("¿Eliminar este prospecto permanentemente?")) return;
      try {
          await fetch(`/api/leads/${id}`, { method: 'DELETE' });
          setLeads(leads.filter(l => l.id !== id));
      } catch(e) {
          alert("Error al eliminar");
      }
  };

  const convertToClient = async (leadId: string) => {
      if(!confirm("¿Convertir este prospecto en Cliente? Se moverá a la base de datos principal.")) return;
      
      try {
          const res = await fetch(`/api/leads/${leadId}/convert`, { method: 'POST' });
          if(res.ok) {
              const data = await res.json();
              // Navigate to Quotes with pre-selected client
              localStorage.setItem('pending_quote_client', JSON.stringify(data.client));
              navigate('/quotes'); 
          }
      } catch(e) {
          alert("Error en conversión");
      }
  };

  const getSourceIcon = (source: string) => {
      if(source === 'Facebook' || source === 'Instagram') return <Facebook size={12} className="text-blue-600"/>;
      if(source === 'Google') return <Globe size={12} className="text-red-500"/>;
      return <UserPlus size={12} className="text-slate-400"/>;
  };

  if(loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-600" size={48}/></div>;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Tablero de Prospectos</h2>
          <p className="text-slate-500 text-sm font-medium">Gestiona leads de Facebook y Google Ads.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowWebhookInfo(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-sm"
          >
            <LinkIcon size={18} /> Webhook Ads
          </button>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
          >
            <Plus size={18} /> Nuevo Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-max px-2">
              {STATUS_COLUMNS.map(status => (
                  <div 
                    key={status}
                    className="w-80 flex flex-col bg-slate-100/50 rounded-[2rem] border border-slate-200/60"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(status)}
                  >
                      {/* Column Header */}
                      <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50/50 rounded-t-[2rem]">
                          <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                              status === 'Nuevo' ? 'bg-sky-100 text-sky-700' :
                              status === 'Ganado' ? 'bg-emerald-100 text-emerald-700' :
                              status === 'Perdido' ? 'bg-rose-100 text-rose-700' :
                              'bg-white text-slate-600 border border-slate-200'
                          }`}>
                              {status}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                              {leads.filter(l => l.status === status).length}
                          </span>
                      </div>

                      {/* Cards Container */}
                      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                          {leads.filter(l => l.status === status).map(lead => (
                              <div 
                                key={lead.id}
                                draggable
                                onDragStart={() => handleDragStart(lead)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-sky-200 cursor-grab active:cursor-grabbing transition-all group relative"
                              >
                                  <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                          {getSourceIcon(lead.source)}
                                          <span className="text-[9px] font-bold text-slate-500 uppercase">{lead.source}</span>
                                      </div>
                                      <div className="flex gap-1">
                                          <button onClick={() => handleOpenEdit(lead)} className="text-slate-300 hover:text-sky-500 p-1"><Edit3 size={12}/></button>
                                          <button onClick={() => handleDeleteLead(lead.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={12}/></button>
                                      </div>
                                  </div>
                                  
                                  <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">{lead.name}</h4>
                                  
                                  {lead.campaign && (
                                      <p className="text-[9px] text-slate-400 mb-3 truncate">Camp: {lead.campaign}</p>
                                  )}

                                  <div className="flex items-center justify-between mt-4 border-t border-slate-50 pt-3">
                                      <div className="flex gap-2">
                                          {lead.phone && (
                                              <a href={`https://wa.me/${lead.phone}`} target="_blank" className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">
                                                  <MessageSquare size={14} />
                                              </a>
                                          )}
                                      </div>
                                      
                                      {status !== 'Ganado' && (
                                          <button 
                                            onClick={() => convertToClient(lead.id)}
                                            className="flex items-center gap-1 text-[9px] font-black uppercase text-sky-600 hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors"
                                          >
                                              Convertir <ArrowRight size={10}/>
                                          </button>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Add/Edit Lead Modal */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-xl text-slate-900 uppercase">{isEditing ? 'Editar Lead' : 'Nuevo Prospecto'}</h3>
                      <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  <div className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                          <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                          <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                          <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fuente</label>
                          <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-600" value={leadForm.source} onChange={e => setLeadForm({...leadForm, source: e.target.value as any})}>
                              <option>Manual</option>
                              <option>Facebook</option>
                              <option>Google</option>
                              <option>Recomendación</option>
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas</label>
                          <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-20 resize-none" value={leadForm.notes} onChange={e => setLeadForm({...leadForm, notes: e.target.value})} />
                      </div>
                      
                      <button onClick={handleSaveLead} disabled={isSaving} className="w-full py-4 bg-sky-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-sky-700 transition-all flex items-center justify-center gap-2">
                          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Guardar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Webhook Info Modal */}
      {showWebhookInfo && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><LinkIcon size={24}/></div>
                      <div>
                          <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Conexión de Anuncios</h3>
                          <p className="text-slate-400 text-xs">Integra Facebook & Google Lead Forms</p>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu URL de Webhook (POST)</p>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-xl">
                          <code className="text-xs font-mono text-slate-600 truncate flex-1">
                              {window.location.origin}/api/webhooks/leads
                          </code>
                          <button className="text-sky-600 hover:text-sky-700" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/leads`)}>
                              <Copy size={16} />
                          </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                          Configura este endpoint en Zapier o n8n. El sistema espera un JSON con: 
                          <span className="font-mono text-slate-600"> name, email, phone_number, platform, campaign_name</span>.
                      </p>
                  </div>

                  <div className="flex justify-end">
                      <button onClick={() => setShowWebhookInfo(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800">Entendido</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Leads;
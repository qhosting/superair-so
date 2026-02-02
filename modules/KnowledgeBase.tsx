
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, Search, Plus, Tag, Loader2, X, Save, 
  FileText, ShieldCheck, Wrench, AlertTriangle, ChevronRight,
  Book, ExternalLink, Edit3, Trash2, BrainCircuit, Send, 
  Sparkles, CheckCircle2, History, Info, Wand2, UserCheck
} from 'lucide-react';
import { ManualArticle, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [articles, setArticles] = useState<ManualArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  
  // IA States
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [selectedArticle, setSelectedArticle] = useState<ManualArticle | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [articleForm, setArticleForm] = useState<Partial<ManualArticle>>({
    title: '', category: 'Instalación', content: '', tags: [], pdf_url: '', version: '1.0'
  });

  const categories = ['Todas', 'Instalación', 'Mantenimiento', 'Seguridad', 'Administrativo'];
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchArticles(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('superair_token');
      const res = await fetch('/api/manuals', { headers: { 'Authorization': `Bearer ${token}`, 'x-user-id': user?.id || '0' } });
      if (res.ok) setArticles(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDeleteArticle = async (article: ManualArticle) => {
      if (!confirm(`¿Eliminar manual "${article.title}"?`)) return;
      try {
          const token = localStorage.getItem('superair_token');
          const res = await fetch(`/api/manuals/${article.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              fetchArticles();
              showToast("Manual eliminado");
          }
      } catch (e) { showToast("Error al eliminar", "error"); }
  };

  const handleAISuggest = async () => {
      if (!articleForm.title) return showToast("Primero escribe un título para el tema", "warning");
      setIsGenerating(true);
      try {
          const token = localStorage.getItem('superair_token');
          const res = await fetch('/api/manuals/ai-generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ topic: articleForm.title, category: articleForm.category })
          });
          const data = await res.json();
          setArticleForm(prev => ({ ...prev, content: data.content }));
          showToast("Protocolo redactado por IA con éxito");
      } catch (e) { showToast("Error al generar borrador", "error"); }
      finally { setIsGenerating(false); }
  };

  const handleAskAI = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!question.trim() || isAsking) return;
      
      const q = question;
      setQuestion('');
      setChatHistory(prev => [...prev, { role: 'user', text: q }]);
      setIsAsking(true);

      try {
          const token = localStorage.getItem('superair_token');
          const res = await fetch('/api/manuals/ai-ask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ question: q })
          });
          const data = await res.json();
          setChatHistory(prev => [...prev, { role: 'ai', text: data.reply }]);
      } catch (e) { showToast("Error de conexión con IA", "error"); }
      finally { setIsAsking(false); }
  };

  const markAsRead = async (articleId: string) => {
      try {
          const token = localStorage.getItem('superair_token');
          const res = await fetch(`/api/manuals/${articleId}/mark-read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ userId: user?.id })
          });
          if (res.ok) {
              setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_read: true } : a));
              showToast("Lectura registrada. Gracias por tu compromiso.");
          }
      } catch (e) { console.error(e); }
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Todas' || a.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchTerm, activeCategory]);

  const handleSaveArticle = async () => {
      if (!articleForm.title) return;
      const method = articleForm.id ? 'PUT' : 'POST';
      const url = articleForm.id ? `/api/manuals/${articleForm.id}` : '/api/manuals';
      
      const token = localStorage.getItem('superair_token');
      const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ...articleForm, author_name: user?.name })
      });
      
      if (res.ok) {
          setShowEditModal(false);
          fetchArticles();
          showToast("Manual actualizado");
      }
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
        case 'Instalación': return <Wrench size={16}/>;
        case 'Seguridad': return <ShieldCheck size={16}/>;
        case 'Mantenimiento': return <Book size={16}/>;
        case 'Administrativo': return <FileText size={16}/>;
        default: return <BookOpen size={16}/>;
    }
  };

  return (
    <div className="space-y-8 pb-20 relative min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Manual de Operación Inteligente</h2>
          <p className="text-slate-500 text-sm font-medium">Capacitación técnica y cumplimiento normativo SuperAir.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setChatOpen(!chatOpen)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${chatOpen ? 'bg-sky-600 text-white' : 'bg-white text-sky-600 border border-sky-100'}`}
            >
                <BrainCircuit size={18} /> Asistente Técnico
            </button>
            {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
                <button onClick={() => { setArticleForm({ title: '', category: 'Instalación', content: '', tags: [], pdf_url: '', version: '1.0' }); setShowEditModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800">
                    <Plus size={18} /> Nuevo Protocolo
                </button>
            )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
          {/* Sidebar: Filtros y Stats */}
          <div className="xl:w-80 space-y-6">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="relative mb-6">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium text-sm"
                        placeholder="Buscar guías..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3">Categorías</p>
                      {categories.map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => setActiveCategory(cat)}
                            className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all font-bold text-xs ${activeCategory === cat ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            <span className="flex items-center gap-2">
                                {getCategoryIcon(cat)}
                                {cat}
                            </span>
                            {activeCategory === cat && <ChevronRight size={14}/>}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Status de Capacitación */}
              <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <History className="absolute -right-4 -bottom-4 opacity-10 text-white" size={120} />
                  <div className="relative z-10">
                      <h4 className="font-black uppercase text-[10px] tracking-[0.2em] text-sky-400 mb-4">Progreso de Formación</h4>
                      <div className="space-y-4">
                          <div className="flex justify-between items-end">
                              <p className="text-2xl font-black">{articles.filter(a => a.is_read).length}/{articles.length}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Leídos</p>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div className="bg-sky-500 h-full transition-all duration-1000" style={{ width: `${(articles.filter(a => a.is_read).length / (articles.length || 1)) * 100}%` }} />
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Listado de Manuales */}
          <div className="flex-1 space-y-6">
              {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-600" size={32}/></div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredArticles.map(article => (
                          <div 
                            key={article.id} 
                            onClick={() => setSelectedArticle(article)}
                            className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer group relative ${selectedArticle?.id === article.id ? 'border-sky-400 shadow-2xl' : 'border-slate-100 hover:border-slate-200 hover:shadow-lg'}`}
                          >
                              {article.is_read && (
                                  <div className="absolute top-6 right-8 text-emerald-500" title="Leído">
                                      <CheckCircle2 size={20} />
                                  </div>
                              )}
                              
                              <div className="flex justify-between items-start mb-6">
                                  <div className={`p-3 rounded-2xl ${
                                      article.category === 'Seguridad' ? 'bg-rose-50 text-rose-600' :
                                      article.category === 'Instalación' ? 'bg-sky-50 text-sky-600' :
                                      'bg-slate-50 text-slate-500'
                                  }`}>
                                      {getCategoryIcon(article.category)}
                                  </div>
                                  {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setArticleForm(article); setShowEditModal(true); }} className="p-2 text-slate-300 hover:text-sky-600 transition-colors"><Edit3 size={16}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteArticle(article); }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                  )}
                              </div>
                              <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-sky-600 transition-colors">{article.title}</h3>
                              <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed mb-6">
                                  {article.content}
                              </p>
                              <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  <div className="flex items-center gap-2">
                                      <span className="bg-slate-100 px-2 py-0.5 rounded">v{article.version || '1.0'}</span>
                                      <span>{article.category}</span>
                                  </div>
                                  <span>Act: {new Date(article.updated_at).toLocaleDateString()}</span>
                              </div>
                          </div>
                      ))}
                      {filteredArticles.length === 0 && (
                          <div className="col-span-full py-20 text-center text-slate-300">
                              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                              <p className="font-bold uppercase tracking-widest text-xs">No se encontraron artículos</p>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* CHAT ASISTENTE IA (RAG) */}
      {chatOpen && (
          <div className="fixed bottom-6 right-6 w-96 h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 z-[250] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl"><Sparkles size={20}/></div>
                      <div>
                          <h4 className="font-black text-sm uppercase">Consulta Técnica IA</h4>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Contexto: Manual SuperAir</p>
                      </div>
                  </div>
                  <button onClick={() => setChatOpen(false)}><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50">
                  {chatHistory.length === 0 && (
                      <div className="text-center py-10 opacity-40">
                          <BrainCircuit size={48} className="mx-auto mb-4 text-slate-300" />
                          <p className="text-xs font-bold uppercase text-slate-400">¿Tienes dudas sobre un procedimiento? Pregúntame.</p>
                      </div>
                  )}
                  {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${msg.role === 'user' ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  {isAsking && (
                      <div className="flex justify-start">
                          <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce delay-100" />
                              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce delay-200" />
                          </div>
                      </div>
                  )}
                  <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleAskAI} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  <input 
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Ej: ¿Torque para válvulas 1/2?"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                  />
                  <button disabled={isAsking || !question.trim()} className="p-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-colors">
                      <Send size={18} />
                  </button>
              </form>
          </div>
      )}

      {/* Article Detail View Modal */}
      {selectedArticle && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-4">
                          <div className="p-4 bg-white rounded-2xl shadow-sm text-sky-600">
                              {getCategoryIcon(selectedArticle.category)}
                          </div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedArticle.title}</h3>
                                  <span className="px-3 py-1 bg-slate-200 rounded-full text-[9px] font-black uppercase">v{selectedArticle.version}</span>
                              </div>
                              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                                  Publicado por {selectedArticle.author_name || 'Staff SuperAir'} • {selectedArticle.category}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedArticle(null)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"><X size={24} /></button>
                  </div>
                  <div className="p-12 overflow-y-auto custom-scrollbar flex-1">
                      <div className="prose prose-slate max-w-none">
                          <div className="whitespace-pre-line text-slate-600 leading-loose font-medium text-lg">
                              {selectedArticle.content}
                          </div>
                      </div>
                      
                      <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-6 items-center justify-between">
                          <div className="flex items-center gap-6">
                              {selectedArticle.pdf_url && (
                                  <a href={selectedArticle.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sky-600 font-black uppercase text-[10px] tracking-widest hover:underline">
                                      <ExternalLink size={16}/> Ficha Técnica PDF
                                  </a>
                              )}
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Última Revisión: {new Date(selectedArticle.updated_at).toLocaleDateString()}</span>
                          </div>

                          {!selectedArticle.is_read && (user?.role === 'Instalador') && (
                              <button 
                                onClick={() => markAsRead(selectedArticle.id)}
                                className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-700 flex items-center gap-2 animate-bounce"
                              >
                                  <UserCheck size={18} /> Confirmar Lectura Obligatoria
                              </button>
                          )}
                          {selectedArticle.is_read && (
                              <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px]">
                                  <CheckCircle2 size={18} /> Protocolo Leído y Comprendido
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Create/Edit Modal with AI Drafting */}
      {showEditModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
                  <div className="flex justify-between items-center mb-8 shrink-0">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Editor de Protocolo Técnico</h3>
                      <button onClick={() => setShowEditModal(false)}><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título del Manual</label>
                              <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-sky-500 outline-none" value={articleForm.title} onChange={e=>setArticleForm({...articleForm, title: e.target.value})} placeholder="Ej: Protocolo de Seguridad en Alturas" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={articleForm.category} onChange={e=>setArticleForm({...articleForm, category: e.target.value as any})}>
                                      {categories.filter(c=>c!=='Todas').map(c=><option key={c} value={c}>{c}</option>)}
                                  </select>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Versión</label>
                                  <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center" value={articleForm.version} onChange={e=>setArticleForm({...articleForm, version: e.target.value})} />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-1 relative">
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenido Técnico</label>
                              <button 
                                onClick={handleAISuggest}
                                disabled={isGenerating}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                              >
                                  {isGenerating ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} Redactar con IA (Draft)
                              </button>
                          </div>
                          <textarea className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl h-80 resize-none leading-relaxed font-medium focus:ring-2 focus:ring-sky-500 outline-none" value={articleForm.content} onChange={e=>setArticleForm({...articleForm, content: e.target.value})} />
                          {isGenerating && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-3xl z-10">
                                  <div className="text-center">
                                      <Loader2 className="animate-spin text-indigo-600 mx-auto mb-2" size={32}/>
                                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Gemini redactando...</p>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enlace a PDF Externo / Fabricante (URL)</label>
                          <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="https://cloud.superair.mx/manuals/carrier-v3.pdf" value={articleForm.pdf_url} onChange={e=>setArticleForm({...articleForm, pdf_url: e.target.value})} />
                      </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex justify-end shrink-0">
                      <button onClick={handleSaveArticle} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-sky-600 transition-all">Publicar Revisión Oficial</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

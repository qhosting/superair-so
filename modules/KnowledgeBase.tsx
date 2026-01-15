
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Plus, Filter, Tag, Loader2, X, Save, 
  FileText, ShieldCheck, Wrench, AlertTriangle, ChevronRight,
  Book, ExternalLink, Edit3, Trash2
} from 'lucide-react';
import { ManualArticle } from '../types';

const KnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<ManualArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  
  const [selectedArticle, setSelectedArticle] = useState<ManualArticle | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [articleForm, setArticleForm] = useState<Partial<ManualArticle>>({
    title: '', category: 'Instalación', content: '', tags: [], pdf_url: ''
  });

  const categories = ['Todas', 'Instalación', 'Mantenimiento', 'Seguridad', 'Administrativo'];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manuals');
      if (res.ok) setArticles(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
      
      const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(articleForm)
      });
      
      if (res.ok) {
          setShowEditModal(false);
          fetchArticles();
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Manual de Operación</h2>
          <p className="text-slate-500 text-sm font-medium">Protocolos, guías técnicas y normativas internas.</p>
        </div>
        <button onClick={() => { setArticleForm({ title: '', category: 'Instalación', content: '', tags: [], pdf_url: '' }); setShowEditModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
            <Plus size={18} /> Nuevo Manual
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 min-h-[600px]">
          {/* Categorías y Búsqueda */}
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

              <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 text-rose-700">
                  <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle size={24} />
                      <h4 className="font-black uppercase text-xs tracking-widest">Protocolo Crítico</h4>
                  </div>
                  <p className="text-[10px] font-bold leading-relaxed">
                      En caso de accidente o fuga de refrigerante mayor, sigue el protocolo de emergencia NIVEL 1.
                  </p>
              </div>
          </div>

          {/* Listado y Visor */}
          <div className="flex-1 space-y-6">
              {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-600" /></div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredArticles.map(article => (
                          <div 
                            key={article.id} 
                            onClick={() => setSelectedArticle(article)}
                            className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer group ${selectedArticle?.id === article.id ? 'border-sky-400 shadow-xl' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                              <div className="flex justify-between items-start mb-6">
                                  <div className={`p-3 rounded-2xl ${
                                      article.category === 'Seguridad' ? 'bg-rose-50 text-rose-600' :
                                      article.category === 'Instalación' ? 'bg-sky-50 text-sky-600' :
                                      'bg-slate-50 text-slate-500'
                                  }`}>
                                      {getCategoryIcon(article.category)}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); setArticleForm(article); setShowEditModal(true); }} className="p-2 text-slate-300 hover:text-sky-600 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={16}/></button>
                              </div>
                              <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-sky-600 transition-colors">{article.title}</h3>
                              <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed mb-6">
                                  {article.content}
                              </p>
                              <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  <span>Cat: {article.category}</span>
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
                              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedArticle.title}</h3>
                              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Manual Operativo • {selectedArticle.category}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedArticle(null)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"><X size={24} /></button>
                  </div>
                  <div className="p-12 overflow-y-auto custom-scrollbar flex-1">
                      <div className="prose prose-slate max-w-none">
                          <div className="whitespace-pre-line text-slate-600 leading-loose font-medium">
                              {selectedArticle.content}
                          </div>
                      </div>
                      {selectedArticle.pdf_url && (
                          <div className="mt-12 p-6 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                  <FileText className="text-sky-600" size={32} />
                                  <div>
                                      <p className="font-black text-sky-900 text-sm">Ficha Técnica Completa</p>
                                      <p className="text-xs text-sky-600 uppercase font-bold">Documento PDF del fabricante</p>
                                  </div>
                              </div>
                              <a href={selectedArticle.pdf_url} target="_blank" rel="noreferrer" className="px-6 py-3 bg-sky-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                  <ExternalLink size={14}/> Abrir PDF
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Create/Edit Modal */}
      {showEditModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Editor de Manual</h3>
                      <button onClick={() => setShowEditModal(false)}><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</label>
                              <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={articleForm.title} onChange={e=>setArticleForm({...articleForm, title: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={articleForm.category} onChange={e=>setArticleForm({...articleForm, category: e.target.value as any})}>
                                  {categories.filter(c=>c!=='Todas').map(c=><option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuerpo del Manual (Texto Plano)</label>
                          <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-64 resize-none leading-relaxed" value={articleForm.content} onChange={e=>setArticleForm({...articleForm, content: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL PDF Adicional (Opcional)</label>
                          <input className="w-full p-4 bg-slate-50 border rounded-2xl" placeholder="https://..." value={articleForm.pdf_url} onChange={e=>setArticleForm({...articleForm, pdf_url: e.target.value})} />
                      </div>
                      <button onClick={handleSaveArticle} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Publicar en Manual</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

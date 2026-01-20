
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, Eye, Type as TypeIcon, Layout as LayoutIcon, Smartphone,
  Monitor, CheckCircle2, Wind, History, MapPin, Globe, Lock, ChevronUp,
  ChevronDown, Edit3, Image as ImageIcon, Palette, Phone, Mail, AlertTriangle, Loader2,
  Zap, Star, LayoutTemplate, Factory, Home, Percent, X, Wand2, Sparkles, MoveUp, MoveDown
} from 'lucide-react';
import { LandingSection, SectionType } from '../types';
import { useNotification } from '../context/NotificationContext';

const LandingBuilder: React.FC = () => {
  const { showToast } = useNotification();
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
        try {
            const res = await fetch('/api/cms/content');
            const data = await res.json();
            if (Array.isArray(data)) setSections(data);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };
    loadContent();
  }, []);

  const saveContent = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sections })
      });
      if (res.ok) showToast('Sitio web actualizado correctamente');
    } catch (e) { showToast('Error guardando cambios', 'error'); }
    finally { setSaving(false); }
  };

  const addSection = (type: SectionType) => {
    const newSection: LandingSection = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: 'Nuevo Título',
      subtitle: 'Descripción breve de la sección.',
      buttonText: type === 'hero' || type === 'cta' ? 'Contactar' : undefined
    };
    setSections([...sections, newSection]);
    setEditingId(newSection.id);
  };

  const updateSection = (id: string, data: Partial<LandingSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const moveSection = (idx: number, direction: 'up' | 'down') => {
      const newSections = [...sections];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sections.length) return;
      [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];
      setSections(newSections);
  };

  const handleAiCopy = async (field: 'title' | 'subtitle', section: LandingSection) => {
      setAiLoading(`${section.id}-${field}`);
      try {
          const res = await fetch('/api/ai/copywrite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field, context: section.type, currentText: (section as any)[field] })
          });
          const data = await res.json();
          if (data.improvedText) {
              updateSection(section.id, { [field]: data.improvedText });
              showToast("IA ha optimizado tu copy");
          }
      } catch (e) { showToast("Error con la IA", "error"); }
      finally { setAiLoading(null); }
  };

  const activeSection = sections.find(s => s.id === editingId);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48}/></div>;

  return (
    <div className="flex gap-8 h-full bg-slate-50 relative">
      {/* Editor Sidebar */}
      <div className="w-96 flex flex-col gap-6 shrink-0 h-full overflow-hidden pb-10">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em]">Panel de Edición</h3>
            {editingId && <button onClick={() => setEditingId(null)} className="text-[10px] font-black text-sky-600 uppercase">Cerrar</button>}
          </div>

          {editingId && activeSection ? (
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título Principal</label>
                    <button onClick={() => handleAiCopy('title', activeSection)} disabled={!!aiLoading} className="p-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-all">
                        {aiLoading === `${activeSection.id}-title` ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                    </button>
                </div>
                <textarea 
                  value={activeSection.title}
                  onChange={(e) => updateSection(activeSection.id, { title: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black h-24 resize-none focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtítulo / Bajada</label>
                    <button onClick={() => handleAiCopy('subtitle', activeSection)} disabled={!!aiLoading} className="p-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-all">
                        {aiLoading === `${activeSection.id}-subtitle` ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                    </button>
                </div>
                <textarea 
                  value={activeSection.subtitle}
                  onChange={(e) => updateSection(activeSection.id, { subtitle: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs h-32 resize-none leading-relaxed focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              {activeSection.buttonText !== undefined && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Call to Action</label>
                    <input 
                      value={activeSection.buttonText}
                      onChange={(e) => updateSection(activeSection.id, { buttonText: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4"><Edit3 size={32} /></div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Selecciona un bloque</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <h3 className="font-black text-slate-900 mb-6 text-[10px] uppercase tracking-[0.2em] shrink-0">Arquitectura de Página</h3>
          <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {sections.map((section, idx) => (
              <div 
                key={section.id} 
                className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${editingId === section.id ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                onClick={() => setEditingId(section.id)}
              >
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} className="p-1 hover:text-sky-600"><MoveUp size={12}/></button>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} className="p-1 hover:text-sky-600"><MoveDown size={12}/></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-black text-sky-600 uppercase tracking-widest mb-0.5">{section.type}</p>
                  <p className="text-[10px] font-black text-slate-800 truncate uppercase">{section.title}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("¿Eliminar bloque?")) setSections(sections.filter(s=>s.id!==section.id)); }} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-slate-100 shrink-0">
            {[{ type: 'hero', icon: LayoutIcon, label: 'Hero' }, { type: 'services', icon: Wind, label: 'Servicios' }, { type: 'cta', icon: Zap, label: 'CTA' }].map((item: any) => (
              <button key={item.type} onClick={() => addSection(item.type)} className="flex flex-col items-center justify-center py-4 bg-slate-900 text-white rounded-2xl hover:bg-sky-600 transition-all">
                <item.icon size={18} />
                <span className="text-[8px] font-black uppercase mt-1 opacity-60 tracking-tighter">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col gap-6 pb-10">
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
            <button onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${previewMode === 'desktop' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}><Monitor size={14} /> Desktop</button>
            <button onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-2 px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${previewMode === 'mobile' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-400'}`}><Smartphone size={14} /> Mobile</button>
          </div>
          <button onClick={saveContent} disabled={saving} className="px-10 py-3 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} Publicar Cambios
          </button>
        </div>

        <div className="flex-1 bg-slate-200 rounded-[3.5rem] overflow-hidden relative border-[12px] border-slate-300 transition-all mx-auto shadow-2xl flex flex-col w-full">
            {/* Simulador de Barra de Navegador */}
            <div className="bg-white border-b border-slate-100 h-10 shrink-0 flex items-center px-6 gap-2">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400"/><div className="w-2.5 h-2.5 rounded-full bg-amber-400"/><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"/></div>
                <div className="flex-1 mx-10 bg-slate-50 rounded-md h-6 flex items-center justify-center text-[10px] font-medium text-slate-300">superair.com.mx</div>
            </div>
            
            <div className={`h-full bg-white overflow-y-auto custom-scrollbar mx-auto transition-all duration-500 ${previewMode === 'mobile' ? 'w-[375px] border-x border-slate-200 shadow-2xl' : 'w-full'}`}>
                {sections.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 p-20 text-center">
                        <LayoutTemplate size={80} className="mb-6 opacity-20" />
                        <h3 className="font-black uppercase tracking-[0.2em]">Página en Blanco</h3>
                        <p className="text-xs mt-2">Usa el panel lateral para dar vida a SuperAir.</p>
                    </div>
                ) : (
                    sections.map(s => (
                        <div key={s.id} className={`py-24 px-10 text-center border-b border-slate-50 last:border-0 relative ${s.type === 'hero' ? 'bg-slate-900 text-white' : s.type === 'cta' ? 'bg-sky-600 text-white' : 'bg-white'}`}>
                            {editingId === s.id && <div className="absolute inset-0 border-4 border-sky-400 pointer-events-none z-10 animate-pulse"/>}
                            <h2 className={`font-black uppercase tracking-tighter mb-4 ${s.type === 'hero' ? 'text-5xl' : 'text-3xl'}`}>{s.title}</h2>
                            <p className={`text-sm mb-10 max-w-2xl mx-auto leading-relaxed ${s.type === 'hero' || s.type === 'cta' ? 'text-slate-300' : 'text-slate-500'}`}>{s.subtitle}</p>
                            {s.buttonText && <button className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">{s.buttonText}</button>}
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default LandingBuilder;

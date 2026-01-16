
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, Eye, Type as TypeIcon, Layout as LayoutIcon, Smartphone,
  Monitor, CheckCircle2, Wind, History, MapPin, Globe, Lock, ChevronUp,
  ChevronDown, Edit3, Image as ImageIcon, Palette, Phone, Mail, AlertTriangle, Loader2,
  Zap, Star, LayoutTemplate, Factory, Home, Percent, X, Wand2
} from 'lucide-react';
import { LandingSection, SectionType } from '../types';

const LandingBuilder: React.FC = () => {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
        try {
            const res = await fetch('/api/cms/content');
            if (!res.ok) throw new Error("Server error");
            const data = await res.json();
            if (Array.isArray(data)) {
                setSections(data);
            }
        } catch (err) {
            console.error("Error loading CMS content:", err);
            // No alertamos para no molestar al usuario si es la primera vez
        } finally {
            setLoading(false);
        }
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
      if (res.ok) {
          alert('Contenido guardado exitosamente.');
      }
    } catch (e) {
      alert('Error guardando contenido');
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: SectionType) => {
    const newSection: LandingSection = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: type === 'hero' ? 'Título Principal' : 'Nuevo Título de Sección',
      subtitle: 'Descripción breve de esta sección.',
      buttonText: type === 'hero' || type === 'cta' ? 'Botón de Acción' : undefined,
      items: type === 'services' ? [
          { title: 'Servicio 1', desc: 'Descripción del servicio.', icon: 'wrench' }
      ] : undefined
    };
    setSections([...sections, newSection]);
    setEditingId(newSection.id);
  };

  const updateSection = (id: string, data: Partial<LandingSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const removeSection = (id: string) => {
    if(confirm("¿Eliminar esta sección?")) {
        setSections(sections.filter(s => s.id !== id));
        if (editingId === id) setEditingId(null);
    }
  };

  const activeSection = sections.find(s => s.id === editingId);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48}/></div>;

  return (
    <div className="flex gap-8 h-full bg-slate-50 relative">
      <div className="w-96 flex flex-col gap-6 shrink-0 h-full overflow-hidden">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em]">Editor de Bloque</h3>
            {editingId && <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-sky-600 uppercase">Listo</button>}
          </div>

          {editingId && activeSection ? (
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</label>
                <textarea 
                  value={activeSection.title}
                  onChange={(e) => updateSection(activeSection.id, { title: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold h-24 resize-none focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtítulo / Texto</label>
                <textarea 
                  value={activeSection.subtitle}
                  onChange={(e) => updateSection(activeSection.id, { subtitle: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
              {(activeSection.type === 'hero' || activeSection.type === 'cta') && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto del Botón</label>
                    <input 
                      value={activeSection.buttonText || ''}
                      onChange={(e) => updateSection(activeSection.id, { buttonText: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                    />
                  </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
              <Edit3 className="text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 text-sm font-medium">Selecciona un bloque para editar.</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <h3 className="font-black text-slate-900 mb-6 text-xs uppercase tracking-[0.2em] shrink-0">Estructura</h3>
          <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {sections.map((section, idx) => (
              <div 
                key={section.id} 
                className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${editingId === section.id ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                onClick={() => setEditingId(section.id)}
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-0.5">{section.type}</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{section.title}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-slate-100 shrink-0">
            {[{ type: 'hero', icon: LayoutIcon, label: 'Hero' }, { type: 'services', icon: Wind, label: 'Servicios' }, { type: 'cta', icon: Zap, label: 'Llamada' }].map((item: any) => (
              <button key={item.type} onClick={() => addSection(item.type)} className="flex flex-col items-center justify-center py-4 bg-slate-900 text-white rounded-2xl hover:bg-sky-600 transition-all">
                <item.icon size={18} />
                <span className="text-[8px] font-black uppercase mt-1 opacity-60">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs ${previewMode === 'desktop' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}><Monitor size={14} /> Desktop</button>
                <button onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs ${previewMode === 'mobile' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}><Smartphone size={14} /> Mobile</button>
              </div>
          </div>
          <button onClick={saveContent} disabled={saving} className="px-8 py-2 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-xl flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} PUBLICAR CAMBIOS
          </button>
        </div>

        <div className="flex-1 bg-slate-200 rounded-[2.5rem] overflow-hidden relative border-[12px] border-slate-300 transition-all mx-auto shadow-2xl flex flex-col w-full">
            <div className={`h-full bg-white overflow-y-auto custom-scrollbar mx-auto transition-all duration-500 ${previewMode === 'mobile' ? 'w-[375px] border-x border-slate-200' : 'w-full'}`}>
                {sections.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                        <LayoutIcon size={48} className="mb-4 text-slate-300" />
                        <h3 className="font-bold text-lg">Página Vacía</h3>
                        <p className="text-sm">Agrega bloques para comenzar.</p>
                    </div>
                ) : (
                    sections.map(s => (
                        <div key={s.id} className={`py-20 px-10 text-center ${s.type === 'hero' ? 'bg-slate-900 text-white' : s.type === 'cta' ? 'bg-sky-600 text-white' : 'bg-white'}`}>
                            <h2 className="text-3xl font-black uppercase mb-4">{s.title}</h2>
                            <p className="text-sm opacity-80 mb-8 max-w-lg mx-auto">{s.subtitle}</p>
                            {s.buttonText && <button className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase">{s.buttonText}</button>}
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

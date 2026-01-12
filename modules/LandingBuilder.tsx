
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, Eye, Type as TypeIcon, Layout as LayoutIcon, Smartphone,
  Monitor, CheckCircle2, Wind, History, MapPin, Globe, Lock, ChevronUp,
  ChevronDown, Edit3, Image as ImageIcon, Palette, Phone, Mail, AlertTriangle, Loader2,
  Zap, Star
} from 'lucide-react';
import { LandingSection, SectionType } from '../types';

const LandingBuilder: React.FC = () => {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Load from DB
  useEffect(() => {
    fetch('/api/cms/content')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          setSections(data);
        } else {
          // Default SuperAir Template if DB is empty - SYNCHRONIZED WITH STATIC DESIGN
          setSections([
            { 
                id: 'hero-def', 
                type: 'hero', 
                title: 'El clima perfecto existe.', 
                subtitle: 'Expertos en instalación, reparación y mantenimiento de aire acondicionado. Servicio residencial y comercial con garantía por escrito.', 
                buttonText: 'Cotizar Ahora', 
                imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069' 
            },
            { 
                id: 'serv-def', 
                type: 'services', 
                title: 'Nuestros Servicios', 
                subtitle: 'Soluciones integrales diseñadas para maximizar la eficiencia energética y el confort de tu espacio.', 
                buttonText: 'Ver Servicios' 
            },
            { 
                id: 'cta-def', 
                type: 'cta', 
                title: '¿Tu equipo falla?', 
                subtitle: 'Servicio de emergencia 24/7 disponible en zona metropolitana.', 
                buttonText: 'Contactar' 
            }
          ]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading CMS content:", err);
        setLoading(false);
      });
  }, []);

  const saveContent = async () => {
    setSaving(true);
    try {
      await fetch('/api/cms/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sections })
      });
      alert('Contenido guardado exitosamente. La Landing Page pública ha sido actualizada.');
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
    <div className="flex gap-8 h-full bg-slate-50">
      {/* Sidebar Controls */}
      <div className="w-96 flex flex-col gap-6 shrink-0 h-full overflow-hidden">
        
        {/* Editor */}
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
              {/* Image Input for Hero */}
              {activeSection.type === 'hero' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Imagen de Fondo</label>
                    <input 
                      value={activeSection.imageUrl || ''}
                      onChange={(e) => updateSection(activeSection.id, { imageUrl: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      placeholder="https://..."
                    />
                  </div>
              )}
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
              <p className="text-slate-400 text-sm font-medium">Haz clic en una sección de la lista para editar su contenido.</p>
            </div>
          )}
        </div>

        {/* Estructura */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <h3 className="font-black text-slate-900 mb-6 text-xs uppercase tracking-[0.2em] shrink-0">Orden de Secciones</h3>
          <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {sections.map((section, idx) => (
              <div 
                key={section.id} 
                className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${editingId === section.id ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                onClick={() => setEditingId(section.id)}
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                    {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-0.5">{section.type}</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{section.title}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-slate-100 shrink-0">
            {[{ type: 'hero', icon: LayoutIcon, label: 'Hero' }, { type: 'services', icon: Wind, label: 'Servicios' }, { type: 'cta', icon: Zap, label: 'Llamada' }].map((item: any) => (
              <button key={item.type} onClick={() => addSection(item.type)} className="flex flex-col items-center justify-center py-4 bg-slate-900 text-white rounded-2xl hover:bg-sky-600 transition-all">
                <item.icon size={18} />
                <span className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-60">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
             <button onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs ${previewMode === 'desktop' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}>
                <Monitor size={14} /> Desktop
             </button>
             <button onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs ${previewMode === 'mobile' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}>
                <Smartphone size={14} /> Mobile
             </button>
          </div>
          <button onClick={saveContent} disabled={saving} className="px-8 py-2 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-xl flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} GUARDAR CAMBIOS
          </button>
        </div>

        <div className="flex-1 bg-slate-200 rounded-[2.5rem] overflow-hidden relative border-[12px] border-slate-300 transition-all mx-auto shadow-2xl flex flex-col w-full">
            <div className={`h-full bg-white overflow-y-auto custom-scrollbar mx-auto transition-all duration-500 ${previewMode === 'mobile' ? 'w-[375px] border-x border-slate-200' : 'w-full'}`}>
                {/* Visual Preview Logic - SYNCHRONIZED WITH LANDINGPAGE RENDERER */}
                {sections.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                        <LayoutIcon size={48} className="mb-4 text-slate-300" />
                        <h3 className="font-bold text-lg">Página Vacía</h3>
                        <p className="text-sm">Agrega secciones desde el panel izquierdo.</p>
                    </div>
                ) : (
                    sections.map(s => {
                        if (s.type === 'hero') {
                            return (
                                <div key={s.id} className="relative h-[400px] flex items-center overflow-hidden">
                                     <img src={s.imageUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e"} className="absolute inset-0 w-full h-full object-cover" />
                                     <div className="absolute inset-0 bg-slate-900/60" />
                                     <div className="relative z-10 px-8 text-center w-full">
                                         <span className="inline-block px-3 py-1 mb-4 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase tracking-widest border border-sky-400/30">Vista Previa</span>
                                         <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter drop-shadow-lg">{s.title}</h2>
                                         <p className="text-slate-200 text-sm max-w-lg mx-auto mb-6">{s.subtitle}</p>
                                         <button className="px-6 py-2 bg-sky-600 text-white font-black rounded-xl uppercase text-xs">{s.buttonText || 'Botón'}</button>
                                     </div>
                                </div>
                            );
                        }
                        if (s.type === 'services') {
                            return (
                                <div key={s.id} className="py-16 px-8 text-center bg-white">
                                    <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">{s.title}</h2>
                                    <p className="text-slate-500 text-sm max-w-xl mx-auto mb-10">{s.subtitle}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50 pointer-events-none">
                                        {[1,2,3].map(i => (
                                            <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                <div className="w-10 h-10 bg-slate-200 rounded-xl mb-4 mx-auto"/>
                                                <div className="h-4 w-24 bg-slate-200 rounded mx-auto mb-2"/>
                                                <div className="h-2 w-32 bg-slate-200 rounded mx-auto"/>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 text-[10px] text-slate-400 font-medium italic">* Los servicios se muestran completos en el sitio público</p>
                                </div>
                            )
                        }
                        return (
                            <div key={s.id} className="py-16 px-8 text-center bg-sky-600 text-white">
                                <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter">{s.title}</h2>
                                <p className="text-sky-100 text-sm max-w-xl mx-auto mb-8">{s.subtitle}</p>
                                <button className="px-6 py-2 bg-white text-sky-600 font-black rounded-xl uppercase text-xs">{s.buttonText || 'Botón'}</button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default LandingBuilder;

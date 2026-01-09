
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Type as TypeIcon,
  Layout as LayoutIcon,
  Smartphone,
  Monitor,
  CheckCircle2,
  Wind,
  History,
  MapPin,
  Globe,
  Lock,
  ChevronUp,
  ChevronDown,
  Edit3,
  Image as ImageIcon,
  Palette,
  // Added missing Phone and Mail icons
  Phone,
  Mail
} from 'lucide-react';

type SectionType = 'hero' | 'about' | 'services' | 'history' | 'cta' | 'footer';

interface LandingSection {
  id: string;
  type: SectionType;
  title: string;
  subtitle: string;
  buttonText?: string;
  imageUrl?: string;
  accentColor?: string;
}

const LandingBuilder: React.FC = () => {
  const [isPublished, setIsPublished] = useState<boolean>(() => {
    return localStorage.getItem('superair_is_published') !== 'false';
  });

  const [sections, setSections] = useState<LandingSection[]>(() => {
    const saved = localStorage.getItem('superair_landing_content');
    return saved ? JSON.parse(saved) : [
      { 
        id: 'hero-1', 
        type: 'hero', 
        title: 'Somos especialistas en climatización', 
        subtitle: 'Atención personalizada con técnicos certificados en Querétaro.',
        buttonText: 'Cotizar Ahora',
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069'
      },
      { 
        id: 'services-1', 
        type: 'services', 
        title: 'Nuestros Servicios', 
        subtitle: 'Soluciones integrales para hogar e industria.',
        accentColor: '#0ea5e9'
      },
      { 
        id: 'footer-1', 
        type: 'footer', 
        title: 'SuperAir México', 
        subtitle: 'Expertos en Confort' 
      }
    ];
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const saveContent = () => {
    localStorage.setItem('superair_landing_content', JSON.stringify(sections));
    alert('Borrador guardado exitosamente.');
  };

  const togglePublish = () => {
    const newState = !isPublished;
    setIsPublished(newState);
    localStorage.setItem('superair_is_published', newState.toString());
    localStorage.setItem('superair_landing_content', JSON.stringify(sections));
  };

  const addSection = (type: SectionType) => {
    const newSection: LandingSection = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: 'Nueva Sección ' + type,
      subtitle: 'Descripción personalizada para esta sección.',
      buttonText: type === 'hero' ? 'Ver Más' : undefined,
      imageUrl: type === 'hero' ? 'https://images.unsplash.com/photo-1599839624912-67609f24e1bd?q=80&w=2070' : undefined
    };
    setSections([...sections, newSection]);
    setEditingId(newSection.id);
  };

  const updateSection = (id: string, data: Partial<LandingSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const activeSection = sections.find(s => s.id === editingId);

  return (
    <div className="flex gap-8 h-full bg-slate-50">
      {/* Sidebar Controls */}
      <div className="w-96 flex flex-col gap-6 shrink-0 h-full overflow-hidden">
        
        {/* Editor de Sección Seleccionada */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em]">Configuración</h3>
            {editingId && (
              <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-sky-600 uppercase">Cerrar</button>
            )}
          </div>

          {editingId && activeSection ? (
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título Principal</label>
                <textarea 
                  value={activeSection.title}
                  onChange={(e) => updateSection(activeSection.id, { title: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-sky-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtítulo / Descripción</label>
                <textarea 
                  value={activeSection.subtitle}
                  onChange={(e) => updateSection(activeSection.id, { subtitle: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none h-32 resize-none"
                />
              </div>

              {activeSection.type === 'hero' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon size={12} /> URL de Imagen de Fondo
                    </label>
                    <input 
                      type="text"
                      value={activeSection.imageUrl || ''}
                      onChange={(e) => updateSection(activeSection.id, { imageUrl: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto del Botón</label>
                    <input 
                      type="text"
                      value={activeSection.buttonText || ''}
                      onChange={(e) => updateSection(activeSection.id, { buttonText: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
              <Edit3 className="text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 text-sm font-medium">Selecciona una sección en la estructura para editar su contenido.</p>
            </div>
          )}
        </div>

        {/* Estructura y Añadir */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
          <h3 className="font-black text-slate-900 mb-6 text-xs uppercase tracking-[0.2em] shrink-0">Estructura del Sitio</h3>
          
          <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {sections.map((section, idx) => (
              <div 
                key={section.id} 
                className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  editingId === section.id ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-transparent hover:border-slate-200'
                }`}
                onClick={() => setEditingId(section.id)}
              >
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} className="text-slate-300 hover:text-sky-600 transition-colors"><ChevronUp size={14}/></button>
                  <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} className="text-slate-300 hover:text-sky-600 transition-colors"><ChevronDown size={14}/></button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-0.5">{section.type}</p>
                  <p className="text-xs font-bold text-slate-800 truncate">{section.title}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-slate-100 shrink-0">
            {[
              { type: 'hero' as const, icon: LayoutIcon },
              { type: 'about' as const, icon: CheckCircle2 },
              { type: 'services' as const, icon: Wind },
              { type: 'history' as const, icon: History },
              { type: 'footer' as const, icon: MapPin },
            ].map(item => (
              <button
                key={item.type}
                onClick={() => addSection(item.type)}
                className="flex flex-col items-center justify-center py-4 bg-slate-900 text-white rounded-2xl hover:bg-sky-600 transition-all group"
              >
                <item.icon size={18} />
                <span className="text-[8px] font-black uppercase tracking-tighter mt-1 opacity-60">{item.type}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Canvas */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
            <button 
              onClick={() => setPreviewMode('desktop')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${previewMode === 'desktop' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}
            >
              <Monitor size={14} /> Escritorio
            </button>
            <button 
              onClick={() => setPreviewMode('mobile')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${previewMode === 'mobile' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}
            >
              <Smartphone size={14} /> Móvil
            </button>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={togglePublish}
              className={`px-8 py-2 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl flex items-center gap-2 transition-all ${
                isPublished 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isPublished ? <Lock size={16} /> : <Globe size={16} />}
              {isPublished ? 'MANTENIMIENTO' : 'PUBLICAR SITIO'}
            </button>
            <button 
              onClick={saveContent}
              className="px-8 py-2 bg-sky-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-sky-700 shadow-xl shadow-sky-600/20 flex items-center gap-2 transition-all"
            >
              <Save size={16} /> GUARDAR CAMBIOS
            </button>
          </div>
        </div>

        <div className={`flex-1 bg-slate-200 rounded-[2.5rem] overflow-hidden relative border-[12px] border-slate-300 transition-all duration-500 mx-auto shadow-2xl ${previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'}`}>
          <div className="absolute inset-0 bg-white overflow-y-auto custom-scrollbar relative">
            
            {/* Nav Preview */}
            <nav className="p-6 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-50">
               <div className="flex items-center gap-2 font-black text-xl text-sky-600">
                  <Wind size={24} />
                  <span>SuperAir</span>
               </div>
               <div className="hidden md:flex gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <span className="hover:text-sky-600 cursor-pointer">Inicio</span>
                  <span className="hover:text-sky-600 cursor-pointer">Servicios</span>
                  <span className="hover:text-sky-600 cursor-pointer text-sky-600">Catálogo</span>
               </div>
            </nav>

            {sections.map((s) => (
                <div 
                  key={s.id} 
                  className={`relative group ${editingId === s.id ? 'ring-4 ring-sky-500/30' : ''}`}
                >
                   {/* HERO */}
                   {s.type === 'hero' && (
                     <div className="relative h-[550px] flex items-center justify-center text-center overflow-hidden">
                        <img src={s.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="Hero" />
                        <div className="absolute inset-0 bg-slate-900/60" />
                        <div className="relative z-10 px-6 max-w-4xl animate-in fade-in duration-1000">
                           <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight uppercase tracking-tighter">{s.title}</h2>
                           <p className="text-sky-100 text-lg mb-10 max-w-2xl mx-auto font-medium">{s.subtitle}</p>
                           {s.buttonText && (
                             <button className="px-10 py-4 bg-sky-600 text-white font-black rounded-full shadow-2xl uppercase tracking-widest text-[10px]">
                               {s.buttonText}
                             </button>
                           )}
                        </div>
                     </div>
                   )}

                   {/* ABOUT */}
                   {s.type === 'about' && (
                     <div className="py-20 px-12 bg-white">
                        <div className="max-w-4xl mx-auto text-center">
                           <h3 className="text-3xl font-black text-slate-900 mb-6 uppercase tracking-tighter">{s.title}</h3>
                           <p className="text-slate-500 leading-relaxed text-lg mb-10">{s.subtitle}</p>
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center font-black text-[10px] text-slate-300 tracking-widest uppercase">Cert. {i}</div>)}
                           </div>
                        </div>
                     </div>
                   )}

                   {/* SERVICES */}
                   {s.type === 'services' && (
                     <div className="py-20 px-12 bg-slate-50">
                        <div className="text-center mb-12">
                           <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">{s.title}</h3>
                           <p className="text-slate-500 font-medium text-sm">{s.subtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                           {['INSTALACIÓN', 'REPARACIÓN', 'DIAGNÓSTICO'].map((serv, i) => (
                             <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                                <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-6"><Wind size={24}/></div>
                                <h4 className="font-black text-lg text-slate-900 mb-3 tracking-tight">{serv}</h4>
                                <p className="text-slate-500 text-sm leading-relaxed mb-6">Contamos con las mejores herramientas para garantizar tu confort.</p>
                                <div className="h-1 w-12 bg-sky-500 rounded-full" />
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {/* FOOTER */}
                   {s.type === 'footer' && (
                     <footer className="bg-slate-900 text-white py-16 px-12">
                        <div className="max-w-4xl mx-auto text-center">
                           <div className="flex items-center justify-center gap-2 font-black text-2xl text-sky-400 mb-4">
                              <Wind /> <span>{s.title}</span>
                           </div>
                           <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em]">{s.subtitle}</p>
                           <div className="mt-10 pt-10 border-t border-slate-800 flex justify-center gap-10 opacity-50">
                              <MapPin size={20} /> <Phone size={20} /> <Mail size={20} />
                           </div>
                        </div>
                     </footer>
                   )}
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingBuilder;

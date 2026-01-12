
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, Eye, Type as TypeIcon, Layout as LayoutIcon, Smartphone,
  Monitor, CheckCircle2, Wind, History, MapPin, Globe, Lock, ChevronUp,
  ChevronDown, Edit3, Image as ImageIcon, Palette, Phone, Mail, AlertTriangle, Loader2,
  Zap, Star, LayoutTemplate, Factory, Home, Percent, X
} from 'lucide-react';
import { LandingSection, SectionType } from '../types';

// --- PLANTILLAS PREDEFINIDAS CON ITEMS ---
const RESIDENTIAL_TEMPLATE: LandingSection[] = [
    { 
        id: 'hero-res', 
        type: 'hero', 
        title: 'El clima perfecto existe.', 
        subtitle: 'Expertos en instalación, reparación y mantenimiento de aire acondicionado. Servicio residencial con garantía por escrito.', 
        buttonText: 'Cotizar Ahora', 
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069' 
    },
    { 
        id: 'serv-res', 
        type: 'services', 
        title: 'Confort para tu Hogar', 
        subtitle: 'Soluciones integrales diseñadas para maximizar la eficiencia energética y el confort de tu familia.', 
        buttonText: 'Ver Servicios',
        items: [
            { title: 'Instalación', desc: 'Instalación profesional de equipos Mini Split, Multisplit y Paquetes.', icon: 'wrench', image: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=2070' },
            { title: 'Mantenimiento', desc: 'Limpieza profunda y revisión de presiones para alargar la vida útil.', icon: 'shield', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070' },
            { title: 'Reparación', desc: 'Diagnóstico preciso y reparación de fallas con refacciones originales.', icon: 'zap', image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070' }
        ]
    },
    { 
        id: 'cta-res', 
        type: 'cta', 
        title: '¿Tu equipo falla?', 
        subtitle: 'Servicio de emergencia 24/7 disponible en zona metropolitana.', 
        buttonText: 'Contactar' 
    }
];

const INDUSTRIAL_TEMPLATE: LandingSection[] = [
    { 
        id: 'hero-ind', 
        type: 'hero', 
        title: 'Ingeniería HVAC Industrial', 
        subtitle: 'Especialistas en Chillers, VRF y Sistemas de Ventilación para naves industriales y edificios corporativos.', 
        buttonText: 'Proyecto Industrial', 
        imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070' 
    },
    { 
        id: 'serv-ind', 
        type: 'services', 
        title: 'Soluciones Corporativas', 
        subtitle: 'Pólizas de mantenimiento preventivo y correctivo para asegurar la continuidad operativa de tu empresa.', 
        buttonText: 'Ver Pólizas',
        items: [
            { title: 'Chillers & VRF', desc: 'Mantenimiento especializado a sistemas de agua helada y volumen variable.', icon: 'factory', image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=2070' },
            { title: 'Proyectos HVAC', desc: 'Cálculo térmico, diseño de ductería y ejecución de obra electromecánica.', icon: 'layout', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070' },
            { title: 'Pólizas Anuales', desc: 'Planes a medida para flotillas de equipos con tiempos de respuesta garantizados.', icon: 'file', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070' }
        ]
    },
    { 
        id: 'cta-ind', 
        type: 'cta', 
        title: 'Optimiza tu Energía', 
        subtitle: 'Solicita una auditoría térmica gratuita para tu planta.', 
        buttonText: 'Agendar Auditoría' 
    }
];

const OFFER_TEMPLATE: LandingSection[] = [
    { 
        id: 'hero-off', 
        type: 'hero', 
        title: '🔥 VENTA NOCTURNA - 20% OFF', 
        subtitle: '¡Prepárate para el calor! Descuentos exclusivos en instalación de Minisplits Inverter solo por tiempo limitado.', 
        buttonText: 'Aprovechar Oferta', 
        imageUrl: 'https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=2083' 
    },
    { 
        id: 'serv-off', 
        type: 'services', 
        title: 'Paquetes Todo Incluido', 
        subtitle: 'Equipo + Instalación Básica + Kit de Tubería. Sin costos ocultos.', 
        buttonText: 'Ver Paquetes',
        items: [
            { title: 'Instalación Básica', desc: 'Incluye kit de instalación 4m, bases y mano de obra certificada.', icon: 'check', image: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=2070' },
            { title: 'Mantenimiento 2x1', desc: 'Paga un servicio y el segundo va por nuestra cuenta (mismo domicilio).', icon: 'percent', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070' },
            { title: 'Meses Sin Intereses', desc: 'Hasta 12 MSI con tarjetas participantes en equipos Inverter.', icon: 'credit', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=2070' }
        ]
    },
    { 
        id: 'cta-off', 
        type: 'cta', 
        title: 'Oferta Termina Pronto', 
        subtitle: 'Solo quedan 5 lugares disponibles para instalación esta semana.', 
        buttonText: 'Apartar Lugar' 
    }
];

const LandingBuilder: React.FC = () => {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Load from DB
  useEffect(() => {
    fetch('/api/cms/content')
      .then(res => res.json())
      .then(async (data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setSections(data);
        } else {
          // --- AUTO SEED: Si la DB está vacía, guardamos la plantilla residencial automáticamente ---
          console.log("Database empty. Auto-seeding Residential Template...");
          try {
              await fetch('/api/cms/content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: RESIDENTIAL_TEMPLATE })
              });
              setSections(RESIDENTIAL_TEMPLATE);
          } catch (e) {
              console.error("Auto-seed failed", e);
              setSections(RESIDENTIAL_TEMPLATE); // Fallback local
          }
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

  const applyTemplate = (template: LandingSection[]) => {
      if(confirm("¿Aplicar esta plantilla? Esto reemplazará las secciones actuales. Recuerda 'Guardar Cambios' para publicar.")) {
          // Generamos nuevos IDs para evitar conflictos de renderizado
          const newSections = template.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9) }));
          setSections(newSections);
          setEditingId(null);
          setShowTemplateModal(false);
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
          { title: 'Servicio 1', desc: 'Descripción del servicio.', icon: 'wrench', image: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=2070' },
          { title: 'Servicio 2', desc: 'Descripción del servicio.', icon: 'shield', image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070' },
          { title: 'Servicio 3', desc: 'Descripción del servicio.', icon: 'zap', image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070' }
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
              {activeSection.type === 'services' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-medium">Las tarjetas de servicio se configuran automáticamente al elegir una Plantilla.</p>
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
          <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setPreviewMode('desktop')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs ${previewMode === 'desktop' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}>
                    <Monitor size={14} /> Desktop
                </button>
                <button onClick={() => setPreviewMode('mobile')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-xs ${previewMode === 'mobile' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500'}`}>
                    <Smartphone size={14} /> Mobile
                </button>
              </div>
              <button onClick={() => setShowTemplateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-100 border border-indigo-100 transition-all">
                  <LayoutTemplate size={16} /> Galería de Plantillas
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
                                        {(s.items || [1,2,3]).map((item: any, i: number) => (
                                            <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                {item.image && <img src={item.image} className="w-full h-32 object-cover rounded-xl mb-4" />}
                                                <div className="h-4 w-24 bg-slate-200 rounded mx-auto mb-2 text-xs font-bold text-slate-900">{item.title}</div>
                                                <div className="h-2 w-32 bg-slate-200 rounded mx-auto text-[10px] text-slate-500">{item.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 text-[10px] text-slate-400 font-medium italic">* Vista Previa Simplificada</p>
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

      {/* TEMPLATE GALLERY MODAL */}
      {showTemplateModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Estilos Predefinidos</h3>
                          <p className="text-slate-400 text-sm font-medium">Elige una estructura base para tu sitio web.</p>
                      </div>
                      <button onClick={() => setShowTemplateModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} className="text-slate-400"/></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Residencial */}
                      <div className="group border border-slate-200 hover:border-sky-300 rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-sky-100 bg-white">
                          <div className="h-40 bg-sky-50 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-blue-600 opacity-10 group-hover:opacity-20 transition-opacity" />
                              <Home size={64} className="text-sky-600 relative z-10" />
                          </div>
                          <h4 className="text-xl font-black text-slate-900 mb-2">Residencial</h4>
                          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                              Ideal para venta de minisplits y servicios a hogares. Enfoque en confort familiar.
                          </p>
                          <button onClick={() => applyTemplate(RESIDENTIAL_TEMPLATE)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all">
                              Aplicar Estilo
                          </button>
                      </div>

                      {/* Industrial */}
                      <div className="group border border-slate-200 hover:border-indigo-300 rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-indigo-100 bg-white">
                          <div className="h-40 bg-indigo-50 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-600 opacity-10 group-hover:opacity-20 transition-opacity" />
                              <Factory size={64} className="text-indigo-600 relative z-10" />
                          </div>
                          <h4 className="text-xl font-black text-slate-900 mb-2">Industrial</h4>
                          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                              Enfoque B2B para naves industriales, chillers y pólizas de mantenimiento corporativo.
                          </p>
                          <button onClick={() => applyTemplate(INDUSTRIAL_TEMPLATE)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all">
                              Aplicar Estilo
                          </button>
                      </div>

                      {/* Oferta Flash */}
                      <div className="group border border-slate-200 hover:border-rose-300 rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-rose-100 bg-white">
                          <div className="h-40 bg-rose-50 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-rose-400 to-orange-600 opacity-10 group-hover:opacity-20 transition-opacity" />
                              <Percent size={64} className="text-rose-600 relative z-10" />
                          </div>
                          <h4 className="text-xl font-black text-slate-900 mb-2">Oferta Flash</h4>
                          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                              Diseño agresivo para temporadas altas (Hot Sale/Buen Fin). Maximiza conversión.
                          </p>
                          <button onClick={() => applyTemplate(OFFER_TEMPLATE)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-all">
                              Aplicar Estilo
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default LandingBuilder;

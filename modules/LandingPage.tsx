
import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  ShieldCheck, 
  Wrench, 
  Star, 
  Phone, 
  Mail, 
  MessageCircle,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Zap,
  Loader2,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Link, useLocation } from '../context/AuthContext';
import { LandingSection } from '../types';

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const location = useLocation();
  
  // Marketing State
  const [utmData, setUtmData] = useState({ source: 'Web', campaign: '' });

  // Appointment Form State
  const [appointmentForm, setAppointmentForm] = useState({
    name: '',
    phone: '',
    service: 'Mantenimiento Preventivo',
    date: '',
    notes: ''
  });

  const [contactForm, setContactForm] = useState({
      name: '',
      phone: '',
      service: 'Mantenimiento Preventivo'
  });

  // CMS Data State
  const [cmsSections, setCmsSections] = useState<LandingSection[] | null>(null);
  const [loadingCms, setLoadingCms] = useState(true);

  useEffect(() => {
    // 1. Detect UTMs from URL
    try {
        const params = new URLSearchParams(window.location.search);
        const source = params.get('utm_source');
        const campaign = params.get('utm_campaign');
        const medium = params.get('utm_medium');
        
        if (source) {
            let finalSource = 'Web';
            if (source.toLowerCase().includes('facebook') || source.toLowerCase().includes('fb')) finalSource = 'Facebook';
            else if (source.toLowerCase().includes('google') || source.toLowerCase().includes('adwords')) finalSource = 'Google';
            else if (source.toLowerCase().includes('instagram') || source.toLowerCase().includes('ig')) finalSource = 'Instagram';
            else if (medium === 'cpc' || medium === 'paid') finalSource = 'Google';

            setUtmData({ 
                source: finalSource, 
                campaign: campaign || '' 
            });
            console.log("🎯 Marketing Tracked:", finalSource, campaign);
        }
    } catch (e) { console.error("Error parsing UTMs", e); }

    // 2. Load CMS & Settings
    Promise.all([
        fetch('/api/cms/content').then(r => r.ok ? r.json() : null),
        fetch('/api/settings/public').then(r => r.ok ? r.json() : null)
    ])
    .then(([cmsData, settingsData]) => {
        if (cmsData && Array.isArray(cmsData) && cmsData.length > 0) {
          setCmsSections(cmsData);
        } else {
          setCmsSections(null);
        }
        
        if (settingsData && settingsData.logoUrl) {
            setLogoUrl(settingsData.logoUrl);
        }
    })
    .catch(err => {
        console.log("Info: Usando diseño estático por defecto");
        setCmsSections(null);
    })
    .finally(() => setLoadingCms(false));
  }, []);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
        if (id === 'hero') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: contactForm.name,
                phone: contactForm.phone,
                source: utmData.source, 
                campaign: utmData.campaign, 
                notes: `Interesado en: ${contactForm.service}`
            })
        });

        if (res.ok) {
            alert("¡Gracias por tu mensaje! Tu solicitud ha sido recibida. Un técnico de SuperAir te contactará en breve.");
            setContactForm({ name: '', phone: '', service: 'Mantenimiento Preventivo' });
        } else {
            alert("Hubo un error al enviar tus datos. Por favor intenta más tarde o llama directamente.");
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: appointmentForm.name,
                phone: appointmentForm.phone,
                source: utmData.source === 'Web' ? 'Web (Cita)' : utmData.source,
                campaign: utmData.campaign,
                notes: `Solicitud de Cita para: ${appointmentForm.service}. Fecha preferida: ${appointmentForm.date}`
            })
        });

        if (res.ok) {
             setShowAppointmentModal(false);
             alert(`¡Solicitud Recibida! Hemos agendado una pre-reserva para ${appointmentForm.name}. Te confirmaremos la hora exacta por WhatsApp al número ${appointmentForm.phone}.`);
             setAppointmentForm({ name: '', phone: '', service: 'Mantenimiento Preventivo', date: '', notes: '' });
        } else {
            alert("Error al procesar solicitud.");
        }
    } catch (e) {
        alert("Error de conexión.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const faqs = [
    { q: "¿En qué zonas de Querétaro ofrecen servicio?", a: "Cubrimos toda el área metropolitana, incluyendo Juriquilla, El Refugio, Zibatá, Centro Sur y parques industriales cercanos." },
    { q: "¿Ofrecen garantía en sus reparaciones?", a: "Sí, todos nuestros servicios cuentan con garantía por escrito de 30 días en mano de obra y garantías de fábrica en refacciones." },
    { q: "¿Emiten factura fiscal?", a: "Por supuesto. Todos nuestros precios incluyen IVA y facturamos el mismo día de tu pago." },
  ];

  const brands = ["Carrier", "York", "Trane", "Mirage", "Daikin", "LG"];

  // --- RENDERIZADO DINÁMICO (Sincronizado con DB) ---
  const renderDynamicSection = (section: LandingSection) => {
      switch(section.type) {
          case 'hero':
              return (
                <header key={section.id} id="hero" className="relative pt-32 pb-10 px-4">
                    <div className="relative h-[650px] flex items-center overflow-hidden rounded-[3.5rem] shadow-2xl mx-auto max-w-[1400px]">
                        <img src={section.imageUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069"} className="absolute inset-0 w-full h-full object-cover transform hover:scale-105 transition-transform duration-[20s]" alt="Hero Background" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
                        
                        <div className="relative z-10 max-w-7xl mx-auto px-10 w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div className="text-center md:text-left animate-in slide-in-from-bottom-8 duration-700">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 border border-sky-400/30 rounded-full text-sky-300 text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                                    <Star size={12} fill="currentColor" /> #1 En Climatización
                                </div>
                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none drop-shadow-lg">
                                    {section.title}
                                </h1>
                                <p className="text-slate-300 text-lg mb-10 leading-relaxed font-medium max-w-xl mx-auto md:mx-0">
                                    {section.subtitle}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                    <button onClick={() => setShowAppointmentModal(true)} className="px-10 py-4 bg-sky-600 text-white font-black rounded-2xl hover:bg-sky-500 transition-all shadow-xl shadow-sky-600/30 uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:-translate-y-1">
                                      <Zap size={16} /> {section.buttonText || 'Cotizar Ahora'}
                                    </button>
                                    <a href="tel:4423325814" className="px-10 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-2xl hover:bg-white hover:text-slate-900 transition-all shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                      <Phone size={16} /> Llamar
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
              );
          case 'services':
              return (
                  <section key={section.id} id="services" className="py-24 px-6 max-w-7xl mx-auto">
                      <div className="text-center mb-20">
                          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tighter">{section.title}</h2>
                          <p className="text-slate-500 text-lg max-w-2xl mx-auto">{section.subtitle}</p>
                      </div>
                      
                      {/* Servicios fijos por diseño (El usuario edita el título/subtítulo) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {[
                          { title: 'Instalación', desc: 'Instalación profesional de equipos Mini Split, Multisplit y Paquetes con los más altos estándares.', icon: Wrench, img: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=2070' },
                          { title: 'Mantenimiento', desc: 'Limpieza profunda, revisión de presiones y diagnóstico preventivo para alargar la vida de tu equipo.', icon: ShieldCheck, img: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070' },
                          { title: 'Reparación', desc: 'Diagnóstico preciso y reparación de fallas con refacciones originales y garantía de servicio.', icon: Zap, img: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070' },
                          ].map((service, idx) => (
                          <div key={idx} className="group rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white">
                              <div className="h-48 overflow-hidden relative">
                                  <img src={service.img} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                  <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors" />
                              </div>
                              <div className="p-8">
                                  <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-6">
                                      <service.icon size={24} />
                                  </div>
                                  <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">{service.title}</h3>
                                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{service.desc}</p>
                                  <button onClick={() => setShowAppointmentModal(true)} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-700">
                                      Solicitar Cita <ArrowRight size={14} />
                                  </button>
                              </div>
                          </div>
                          ))}
                      </div>
                  </section>
              );
          case 'cta':
              return (
                  <section key={section.id} className="py-24 px-6 bg-sky-600 text-white text-center">
                      <div className="max-w-4xl mx-auto">
                          <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter">{section.title}</h2>
                          <p className="text-sky-100 text-lg mb-10">{section.subtitle}</p>
                          <button onClick={() => setShowAppointmentModal(true)} className="inline-block bg-white text-sky-600 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-50 transition-all shadow-xl hover:scale-105">
                              {section.buttonText || 'Contactar'}
                          </button>
                      </div>
                  </section>
              );
          default:
              return null;
      }
  };


  // --- LAYOUT COMÚN ---
  return (
    <div className="bg-white font-sans text-slate-900 scroll-smooth selection:bg-sky-100 selection:text-sky-900">
      {/* Floating WhatsApp */}
      <a href="https://wa.me/524423325814" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all duration-300 animate-bounce">
        <MessageCircle size={28} />
      </a>

      {/* Floating Island Navigation */}
      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div 
            className={`
                pointer-events-auto
                w-full max-w-5xl bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl shadow-sky-900/10 
                transition-all duration-500 ease-in-out overflow-hidden
                ${mobileMenuOpen ? 'rounded-[2.5rem] bg-white h-auto' : 'rounded-full h-20'}
            `}
        >
            <div className="flex items-center justify-between px-2 pl-6 pr-3 h-20">
                {/* Logo */}
                <div 
                    className="flex items-center gap-3 font-black text-2xl text-slate-800 tracking-tighter cursor-pointer group" 
                    onClick={() => { window.scrollTo({top:0, behavior:'smooth'}); setMobileMenuOpen(false); }}
                >
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-10 object-contain" />
                    ) : (
                        <>
                            <div className="bg-sky-600 text-white p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-sky-600/30">
                                <Wind size={20} /> 
                            </div>
                            <span className="hidden sm:inline group-hover:text-sky-600 transition-colors">SuperAir</span>
                        </>
                    )}
                </div>

                {/* Desktop Links (Pill Style) */}
                <div className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-full border border-slate-200/50 absolute left-1/2 -translate-x-1/2">
                    {[
                        { id: 'hero', label: 'Inicio' },
                        { id: 'services', label: 'Servicios' },
                        { id: 'contact', label: 'Contacto' }
                    ].map(link => (
                        <button 
                            key={link.id}
                            onClick={() => scrollToSection(link.id)} 
                            className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:text-sky-600 hover:shadow-sm transition-all"
                        >
                            {link.label}
                        </button>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-3">
                     <Link to="/login" className="text-[10px] font-black text-slate-400 hover:text-sky-600 transition-colors uppercase tracking-widest px-2">
                        Acceso Staff
                     </Link>
                     <button 
                        onClick={() => setShowAppointmentModal(true)} 
                        className="bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 hover:scale-105 transition-all shadow-lg flex items-center gap-2 group"
                     >
                        Agendar <div className="bg-white/20 rounded-full p-1 group-hover:bg-white/30 transition-colors"><ArrowRight size={10}/></div>
                     </button>
                </div>

                {/* Mobile Toggle */}
                <div className="md:hidden flex items-center gap-3">
                    <button 
                        onClick={() => setShowAppointmentModal(true)}
                        className="bg-sky-600 text-white p-3 rounded-full shadow-lg shadow-sky-600/20 active:scale-95 transition-transform"
                    >
                        <Zap size={18} fill="currentColor" />
                    </button>
                    <button 
                        className={`p-3 rounded-full transition-all ${mobileMenuOpen ? 'bg-slate-100 text-slate-900 rotate-90' : 'bg-white text-slate-600 hover:bg-slate-50'}`} 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
                    </button>
                </div>
            </div>

            {/* Mobile Content (Expanded) */}
            <div className={`md:hidden px-6 pb-8 space-y-2 transition-all duration-500 ${mobileMenuOpen ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}>
                 <div className="w-full h-px bg-slate-100 mb-6"></div>
                 {[
                    { id: 'hero', label: 'Inicio' },
                    { id: 'services', label: 'Servicios' },
                    { id: 'contact', label: 'Contacto' }
                 ].map(link => (
                     <button 
                        key={link.id}
                        onClick={() => scrollToSection(link.id)} 
                        className="w-full py-4 text-left font-black text-slate-600 hover:text-sky-600 hover:bg-slate-50 rounded-2xl px-4 transition-all text-lg flex justify-between items-center group"
                     >
                        {link.label}
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-sky-500 -translate-x-2 group-hover:translate-x-0 transition-transform opacity-0 group-hover:opacity-100" />
                     </button>
                 ))}
                 <div className="pt-6">
                     <Link to="/login" className="block w-full py-4 text-center font-bold text-slate-400 bg-slate-50 rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-100 mb-2">
                        Portal de Empleados
                     </Link>
                 </div>
            </div>
        </div>
      </nav>

      {loadingCms ? (
          <div className="h-screen flex items-center justify-center">
              <Loader2 className="animate-spin text-sky-600" size={48} />
          </div>
      ) : cmsSections ? (
          // RENDERIZADO DINÁMICO (CMS)
          <div className="pt-0">
              {cmsSections.map(section => renderDynamicSection(section))}
              
              {/* Brands Section (Siempre Visible) */}
              <div className="bg-slate-50 border-y border-slate-200 py-10 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Trabajamos con las mejores marcas del mercado</p>
                    <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    {brands.map(brand => (
                        <span key={brand} className="text-2xl md:text-3xl font-black text-slate-400 hover:text-slate-800 cursor-default select-none">{brand}</span>
                    ))}
                    </div>
                </div>
              </div>

              {/* FAQ Section */}
              <section id="faq" className="py-24 px-6 max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-12 text-center uppercase tracking-tighter">Preguntas Frecuentes</h2>
                <div className="space-y-4">
                    {faqs.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <button 
                            onClick={() => toggleFaq(idx)}
                            className="w-full flex items-center justify-between p-6 bg-white hover:bg-slate-50 transition-colors text-left"
                        >
                            <span className="font-bold text-slate-800">{item.q}</span>
                            <ChevronDown size={20} className={`text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                        </button>
                        {activeFaq === idx && (
                            <div className="p-6 bg-slate-50 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                                {item.a}
                            </div>
                        )}
                    </div>
                    ))}
                </div>
              </section>

              {/* Sección de contacto siempre visible al final */}
              <section id="contact" className="py-24 bg-sky-50 px-6">
                <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
                    <div className="p-12 md:w-1/2 bg-slate-900 text-white flex flex-col justify-between">
                        <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-6">Contáctanos</h3>
                        <p className="text-slate-400 mb-8 leading-relaxed">Estamos listos para atenderte.</p>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-sky-400"><Phone size={20}/></div>
                                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Llámanos</p><p className="font-bold text-lg">442 332 5814</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-emerald-400"><MessageCircle size={20}/></div>
                                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">WhatsApp</p><p className="font-bold text-lg">442 332 5814</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-rose-400"><Mail size={20}/></div>
                                <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</p><p className="font-bold text-lg">contacto@superair.com.mx</p></div>
                            </div>
                        </div>
                        </div>
                        
                        <div className="mt-12 flex gap-4 opacity-50">
                        <div className="w-8 h-8 bg-white/20 rounded-full" />
                        <div className="w-8 h-8 bg-white/20 rounded-full" />
                        <div className="w-8 h-8 bg-white/20 rounded-full" />
                        </div>
                    </div>
                    
                    <div className="p-12 md:w-1/2">
                        <form className="space-y-6" onSubmit={handleContactSubmit}>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Nombre</label>
                                <input 
                                    required 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" 
                                    value={contactForm.name}
                                    onChange={e => setContactForm({...contactForm, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Teléfono</label>
                                <input 
                                    required 
                                    type="tel" 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" 
                                    placeholder="10 dígitos" 
                                    value={contactForm.phone}
                                    onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Servicio Requerido</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                    value={contactForm.service}
                                    onChange={e => setContactForm({...contactForm, service: e.target.value})}
                                >
                                    <option>Mantenimiento Preventivo</option>
                                    <option>Reparación / Diagnóstico</option>
                                    <option>Instalación Nueva</option>
                                    <option>Cotización de Equipo</option>
                                </select>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-sky-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-70">
                                {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>}
                                {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
                            </button>
                        </form>
                    </div>
                </div>
              </section>
          </div>
      ) : (
          // FALLBACK SI TODO FALLA (VACÍO)
          <div className="h-screen flex items-center justify-center">
             <div className="text-center">
                 <Loader2 className="animate-spin text-slate-300 mx-auto mb-4" size={48} />
                 <p className="text-slate-400 font-bold">Cargando Contenido...</p>
             </div>
          </div>
      )}

      {/* MODAL DE AGENDAR CITA */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-600/20">
                       <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Agendar Visita</h3>
                        <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Reserva tu espacio técnico</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAppointmentModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              <div className="p-8">
                 <form className="space-y-6" onSubmit={handleAppointmentSubmit}>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                        <input 
                            required 
                            value={appointmentForm.name}
                            onChange={(e) => setAppointmentForm({...appointmentForm, name: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                            placeholder="Ej. Familia López"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                            <input 
                                required 
                                type="tel"
                                value={appointmentForm.phone}
                                onChange={(e) => setAppointmentForm({...appointmentForm, phone: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                                placeholder="442..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Preferida</label>
                            <input 
                                type="date"
                                required
                                value={appointmentForm.date}
                                onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-sm" 
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Servicio</label>
                        <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                            value={appointmentForm.service}
                            onChange={(e) => setAppointmentForm({...appointmentForm, service: e.target.value})}
                        >
                            <option>Mantenimiento Preventivo</option>
                            <option>Reparación / Revisión</option>
                            <option>Instalación de Equipo</option>
                            <option>Cotización / Visita Técnica</option>
                        </select>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full py-5 bg-sky-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-70 shadow-xl shadow-sky-600/20 hover:bg-sky-500 transition-all"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                        {isSubmitting ? 'Agendando...' : 'Solicitar Confirmación'}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-medium">
                        Te contactaremos por WhatsApp para confirmar la hora exacta.
                    </p>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;

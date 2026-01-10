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
  Calendar,
  Clock,
  MapPin
} from 'lucide-react';
import { Link } from '../context/AuthContext';
import { LandingSection } from '../types';

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  // Appointment Form State
  const [appointmentForm, setAppointmentForm] = useState({
    name: '',
    phone: '',
    service: 'Mantenimiento Preventivo',
    date: '',
    notes: ''
  });

  // CMS Data State
  const [cmsSections, setCmsSections] = useState<LandingSection[] | null>(null);
  const [loadingCms, setLoadingCms] = useState(true);

  useEffect(() => {
    // Intentar cargar contenido del CMS
    fetch('/api/cms/content')
      .then(res => {
          if(!res.ok) throw new Error("API Error");
          return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          setCmsSections(data);
        } else {
          setCmsSections(null); // Usar fallback
        }
      })
      .catch(err => {
        console.log("Info: Usando diseño estático por defecto (API no disponible o vacía)");
        setCmsSections(null);
      })
      .finally(() => setLoadingCms(false));
  }, []);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    // Pequeño timeout para permitir que el DOM se estabilice si hubo cambios
    setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.warn(`Sección con id '${id}' no encontrada.`);
        }
    }, 100);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
        setIsSubmitting(false);
        alert("¡Gracias por tu mensaje! Tu solicitud ha sido recibida. Un técnico de SuperAir te contactará en breve.");
    }, 1500);
  };

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simular envío a API/WhatsApp
    setTimeout(() => {
        setIsSubmitting(false);
        setShowAppointmentModal(false);
        alert(`¡Solicitud Recibida! Hemos agendado una pre-reserva para ${appointmentForm.name}. Te confirmaremos la hora exacta por WhatsApp al número ${appointmentForm.phone}.`);
        setAppointmentForm({ name: '', phone: '', service: 'Mantenimiento Preventivo', date: '', notes: '' });
    }, 2000);
  };

  const faqs = [
    { q: "¿En qué zonas de Querétaro ofrecen servicio?", a: "Cubrimos toda el área metropolitana, incluyendo Juriquilla, El Refugio, Zibatá, Centro Sur y parques industriales cercanos." },
    { q: "¿Ofrecen garantía en sus reparaciones?", a: "Sí, todos nuestros servicios cuentan con garantía por escrito de 30 días en mano de obra y garantías de fábrica en refacciones." },
    { q: "¿Emiten factura fiscal?", a: "Por supuesto. Todos nuestros precios incluyen IVA y facturamos el mismo día de tu pago." },
  ];

  const brands = ["Carrier", "York", "Trane", "Mirage", "Daikin", "LG"];

  // --- RENDERIZADO DINÁMICO (Si hay datos en CMS) ---
  const renderDynamicSection = (section: LandingSection) => {
      switch(section.type) {
          case 'hero':
              return (
                <header key={section.id} id="hero" className="relative pt-20">
                    <div className="relative h-[600px] md:h-[700px] flex items-center overflow-hidden">
                        <img src={section.imageUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069"} className="absolute inset-0 w-full h-full object-cover" alt="Hero Background" />
                        <div className="absolute inset-0 bg-slate-900/70" />
                        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-center md:text-left">
                            <h1 className="text-4xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none animate-in slide-in-from-bottom-5 duration-700">
                                {section.title}
                            </h1>
                            <p className="text-slate-300 text-lg md:text-xl mb-10 leading-relaxed font-medium max-w-2xl mx-auto md:mx-0 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                                {section.subtitle}
                            </p>
                            {section.buttonText && (
                                <button onClick={() => setShowAppointmentModal(true)} className="inline-flex items-center gap-2 px-8 py-4 bg-sky-600 text-white font-black rounded-2xl hover:bg-sky-500 transition-all shadow-xl shadow-sky-600/20 uppercase tracking-widest text-xs animate-in zoom-in duration-500 delay-200">
                                    <Zap size={16} /> {section.buttonText}
                                </button>
                            )}
                        </div>
                    </div>
                </header>
              );
          case 'services':
              return (
                  <section key={section.id} id="services" className="py-24 px-6 bg-slate-50">
                      <div className="max-w-7xl mx-auto text-center">
                          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tighter">{section.title}</h2>
                          <p className="text-slate-500 text-lg max-w-2xl mx-auto mb-16">{section.subtitle}</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {['Instalación', 'Mantenimiento', 'Reparación'].map((s, i) => (
                                  <div key={i} className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-100 hover:-translate-y-2 transition-transform duration-300 flex flex-col items-center text-center">
                                      <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><Wrench size={24}/></div>
                                      <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">{s}</h3>
                                      <p className="text-slate-500 text-sm mb-6">Servicio profesional certificado.</p>
                                      <button onClick={() => setShowAppointmentModal(true)} className="mt-auto inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-700">
                                          Solicitar Cita <ArrowRight size={14} />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>
              );
          case 'cta':
              return (
                  <section key={section.id} className="py-24 px-6 bg-sky-600 text-white text-center">
                      <div className="max-w-4xl mx-auto">
                          <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter">{section.title}</h2>
                          <p className="text-sky-100 text-lg mb-10">{section.subtitle}</p>
                          <button onClick={() => setShowAppointmentModal(true)} className="inline-block bg-white text-sky-600 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-50 transition-all shadow-xl">
                              {section.buttonText || 'Contactar'}
                          </button>
                      </div>
                  </section>
              );
          default:
              return null;
      }
  };


  // --- LAYOUT COMÚN (Navbar, Footer, Contact) ---
  return (
    <div className="bg-white font-sans text-slate-900 scroll-smooth selection:bg-sky-100 selection:text-sky-900">
      {/* Floating WhatsApp */}
      <a href="https://wa.me/524423325814" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-[50] w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all duration-300 animate-bounce">
        <MessageCircle size={28} />
      </a>

      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-40 border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-2xl text-sky-600 tracking-tighter cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                <Wind size={28} /> <span>SuperAir</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-slate-500">
                <button onClick={() => window.scrollTo(0,0)} className="hover:text-sky-600 transition-colors">Inicio</button>
                <button onClick={() => scrollToSection('services')} className="hover:text-sky-600 transition-colors">Servicios</button>
                <button onClick={() => scrollToSection('contact')} className="hover:text-sky-600 transition-colors">Contacto</button>
            </div>

            <div className="hidden md:flex items-center gap-4">
                 <Link to="/login" className="text-xs font-black text-slate-400 hover:text-sky-600 transition-colors uppercase tracking-widest">Soy Staff</Link>
                 <button 
                    onClick={() => setShowAppointmentModal(true)} 
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                 >
                    <Calendar size={14} /> Agendar Cita
                 </button>
            </div>

            <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-100 p-6 flex flex-col gap-4 shadow-xl z-50 animate-in slide-in-from-top-10">
             <button onClick={() => { window.scrollTo(0,0); setMobileMenuOpen(false); }} className="font-bold text-slate-600 py-2 border-b border-slate-50 text-left">Inicio</button>
             <button onClick={() => scrollToSection('services')} className="font-bold text-slate-600 py-2 border-b border-slate-50 text-left">Servicios</button>
             <button onClick={() => scrollToSection('contact')} className="font-bold text-slate-600 py-2 border-b border-slate-50 text-left">Contacto</button>
             <button onClick={() => { setShowAppointmentModal(true); setMobileMenuOpen(false); }} className="font-bold text-white bg-sky-600 rounded-xl py-3 text-center shadow-lg">Agendar Cita Ahora</button>
             <Link to="/login" className="font-bold text-slate-400 py-2 text-center text-xs uppercase tracking-widest">Acceso Staff</Link>
          </div>
        )}
      </nav>

      {loadingCms ? (
          <div className="h-screen flex items-center justify-center">
              <Loader2 className="animate-spin text-sky-600" size={48} />
          </div>
      ) : cmsSections ? (
          // RENDERIZADO DINÁMICO (CMS)
          <div className="pt-0">
              {cmsSections.map(section => renderDynamicSection(section))}
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
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Nombre</label><input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" /></div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Teléfono</label>
                                <input required type="tel" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="10 dígitos" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Servicio Requerido</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
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
          // FALLBACK: DISEÑO ESTÁTICO (Original High Quality)
          <>
            <header id="hero" className="relative pt-20">
                <div className="relative h-[700px] flex items-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069" className="absolute inset-0 w-full h-full object-cover" alt="Hero Background" />
                    <div className="absolute inset-0 bg-slate-900/70" />
                    
                    <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="text-center md:text-left animate-in slide-in-from-bottom-8 duration-700">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 border border-sky-400/30 rounded-full text-sky-300 text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-sm">
                                <Star size={12} fill="currentColor" /> #1 En Climatización Querétaro
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-none">
                                El clima perfecto <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">existe</span>.
                            </h1>
                            <p className="text-slate-300 text-lg mb-10 leading-relaxed font-medium max-w-xl mx-auto md:mx-0">
                                Expertos en instalación, reparación y mantenimiento de aire acondicionado. Servicio residencial y comercial con garantía por escrito.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <button onClick={() => setShowAppointmentModal(true)} className="px-8 py-4 bg-sky-600 text-white font-black rounded-2xl hover:bg-sky-500 transition-all shadow-xl shadow-sky-600/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                <Zap size={16} /> Cotizar Ahora
                                </button>
                                <a href="tel:4423325814" className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                                <Phone size={16} /> Llamar
                                </a>
                            </div>
                            
                            <div className="mt-12 flex items-center justify-center md:justify-start gap-8">
                                <div className="flex items-center gap-2 text-white">
                                    <ShieldCheck className="text-emerald-400" size={24} />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Garantía</p>
                                        <p className="text-xs font-bold">Por Escrito</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-white">
                                    <Wrench className="text-amber-400" size={24} />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Técnicos</p>
                                        <p className="text-xs font-bold">Certificados</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Brands Section */}
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

            {/* Services Section */}
            <section id="services" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Nuestros Servicios</h2>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto">Soluciones integrales diseñadas para maximizar la eficiencia energética y el confort de tu espacio.</p>
                </div>
                
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

            {/* FAQ */}
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

            {/* Contact Form */}
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
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Nombre</label><input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" /></div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Teléfono</label>
                                <input required type="tel" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="10 dígitos" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Servicio Requerido</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
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
          </>
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
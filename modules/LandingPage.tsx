
import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  ShieldCheck, 
  Wrench, 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    { q: "¿En qué zonas de Querétaro ofrecen servicio?", a: "Cubrimos toda el área metropolitana, incluyendo Juriquilla, El Refugio, Zibatá, Centro Sur y parques industriales cercanos." },
    { q: "¿Ofrecen garantía en sus reparaciones?", a: "Sí, todos nuestros servicios cuentan con garantía por escrito de 30 días en mano de obra y garantías de fábrica en refacciones." },
    { q: "¿Emiten factura fiscal?", a: "Por supuesto. Todos nuestros precios incluyen IVA y facturamos el mismo día de tu pago." },
    { q: "¿Cuál es el tiempo de respuesta para emergencias?", a: "Para clientes con póliza de mantenimiento, el tiempo de respuesta es menor a 4 horas. Para servicios generales, agendamos en 24-48 horas." }
  ];

  const brands = ["Carrier", "York", "Trane", "Mirage", "Daikin", "LG"];

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="bg-white font-sans text-slate-900 scroll-smooth selection:bg-sky-100 selection:text-sky-900">
      {/* Floating WhatsApp */}
      <a href="https://wa.me/524423325814" target="_blank" rel="noreferrer" className="fixed bottom-6 right-6 z-[50] w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all duration-300 animate-bounce">
        <MessageCircle size={28} />
      </a>

      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-40 border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-2xl text-sky-600 tracking-tighter">
                <Wind size={28} /> <span>SuperAir</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-slate-500">
                <a href="#hero" className="hover:text-sky-600 transition-colors">Inicio</a>
                <a href="#services" className="hover:text-sky-600 transition-colors">Servicios</a>
                <a href="#testimonials" className="hover:text-sky-600 transition-colors">Opiniones</a>
                <a href="#faq" className="hover:text-sky-600 transition-colors">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
                 <Link to="/login" className="text-xs font-black text-slate-400 hover:text-sky-600 transition-colors uppercase tracking-widest">Soy Staff</Link>
                 <a href="#contact" className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg">
                    Agendar Cita
                 </a>
            </div>

            <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-slate-100 p-6 flex flex-col gap-4 shadow-xl">
             <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-600">Inicio</a>
             <a href="#services" onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-600">Servicios</a>
             <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-600">Opiniones</a>
             <Link to="/login" className="font-bold text-sky-600">Acceso Staff</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
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
                        <a href="#contact" className="px-8 py-4 bg-sky-600 text-white font-black rounded-2xl hover:bg-sky-500 transition-all shadow-xl shadow-sky-600/20 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                           <Zap size={16} /> Cotizar Ahora
                        </a>
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
                     <a href="#contact" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-700">
                        Solicitar Info <ArrowRight size={14} />
                     </a>
                  </div>
               </div>
             ))}
          </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600 blur-[120px] rounded-full"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-20">
                 <h2 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tighter">Clientes Felices</h2>
                 <p className="text-slate-400 text-lg">La satisfacción de nuestros clientes es nuestra mejor carta de presentación.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {[
                   { name: "Roberto Garza", role: "Residencial", text: "Excelente servicio, muy puntuales y limpios. Instalaron 3 equipos en mi casa y todo quedó perfecto." },
                   { name: "Hotel Boutique Qro", role: "Comercial", text: "SuperAir gestiona el mantenimiento de nuestras 25 habitaciones. Son aliados estratégicos para nuestro negocio." },
                   { name: "Ana Martínez", role: "Residencial", text: "Me explicaron todo el proceso y me ayudaron a elegir el equipo que realmente necesitaba para ahorrar luz." }
                 ].map((t, i) => (
                   <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-[2rem]">
                      <div className="flex gap-1 text-amber-400 mb-6">
                         {[1,2,3,4,5].map(star => <Star key={star} size={16} fill="currentColor" />)}
                      </div>
                      <p className="text-slate-300 leading-relaxed italic mb-8">"{t.text}"</p>
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center font-bold text-sm">
                            {t.name.charAt(0)}
                         </div>
                         <div>
                            <h4 className="font-bold text-white text-sm">{t.name}</h4>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500">{t.role}</p>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
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
                   <h3 className="text-3xl font-black uppercase tracking-tighter mb-6">Agenda tu servicio</h3>
                   <p className="text-slate-400 mb-8 leading-relaxed">Déjanos tus datos y un asesor técnico te contactará en menos de 30 minutos para coordinar tu visita.</p>
                   
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-sky-400"><Phone size={20}/></div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Llámanos</p>
                            <p className="font-bold text-lg">442 332 5814</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-emerald-400"><MessageCircle size={20}/></div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">WhatsApp</p>
                            <p className="font-bold text-lg">442 332 5814</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-rose-400"><Mail size={20}/></div>
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</p>
                            <p className="font-bold text-lg">contacto@superair.com.mx</p>
                         </div>
                      </div>
                   </div>
                </div>
                
                <div className="mt-12 flex gap-4 opacity-50">
                   {/* Social Icons Placeholder */}
                   <div className="w-8 h-8 bg-white/20 rounded-full" />
                   <div className="w-8 h-8 bg-white/20 rounded-full" />
                   <div className="w-8 h-8 bg-white/20 rounded-full" />
                </div>
             </div>
             
             <div className="p-12 md:w-1/2">
                <form className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Nombre Completo</label>
                      <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" placeholder="Tu nombre" />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Teléfono</label>
                      <input type="tel" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" placeholder="10 dígitos" />
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
                   <button className="w-full py-5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl shadow-xl shadow-sky-600/20 uppercase tracking-widest text-xs transition-all">
                      Solicitar Diagnóstico
                   </button>
                </form>
             </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-6 border-t border-slate-800">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
               <div className="flex items-center gap-2 font-black text-2xl text-sky-500 mb-6">
                  <Wind size={28} /> <span>SuperAir</span>
               </div>
               <p className="text-slate-400 leading-relaxed max-w-sm">
                  Dedicados a crear ambientes confortables con tecnología de punta y servicio humano. Tu confianza es nuestro motor.
               </p>
            </div>
            
            <div>
               <h5 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-sky-500">Enlaces</h5>
               <ul className="space-y-4 text-sm font-bold text-slate-300">
                  <li><a href="#hero" className="hover:text-white transition-colors">Inicio</a></li>
                  <li><a href="#services" className="hover:text-white transition-colors">Servicios</a></li>
                  <li><a href="#faq" className="hover:text-white transition-colors">Preguntas Frecuentes</a></li>
                  <li><Link to="/login" className="hover:text-white transition-colors">Acceso Administrativo</Link></li>
               </ul>
            </div>
            
            <div>
               <h5 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-sky-500">Legal</h5>
               <ul className="space-y-4 text-sm font-bold text-slate-300">
                  <li><a href="#" className="hover:text-white transition-colors">Aviso de Privacidad</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-800 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">
            © 2024 SuperAir de México S.A. de C.V. • Todos los derechos reservados.
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;

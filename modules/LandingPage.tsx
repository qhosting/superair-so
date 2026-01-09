
import React, { useEffect } from 'react';
import { Wind, ShieldCheck, Wrench, Star, MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const savedSections = JSON.parse(localStorage.getItem('superair_landing_content') || '[]');
  const sections = savedSections.length > 0 ? savedSections : [
    { type: 'hero', title: 'Somos especialistas en climatización', subtitle: 'Atención personalizada con técnicos certificados en Querétaro.' },
    { type: 'services', title: 'Nuestros Servicios', subtitle: 'Soluciones integrales para hogar e industria.' },
    { type: 'footer' }
  ];

  useEffect(() => {
    // Simulación de inyección de script de Chatwoot
    (window as any).chatwootSettings = {
      position: "left",
      type: "standard",
      launcherTitle: "Habla con un experto",
    };
    
    // Aquí iría el script real proporcionado por Chatwoot
    console.log("Chatwoot Widget Initialized");
  }, []);

  return (
    <div className="bg-white font-sans text-slate-900 overflow-x-hidden scroll-smooth">
      {/* WhatsApp Flotante */}
      <a href="https://wa.me/524423325814" target="_blank" rel="noreferrer" className="fixed bottom-8 right-8 z-[100] w-16 h-16 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-600 hover:scale-110 transition-all duration-300 animate-bounce">
        <MessageCircle size={32} />
      </a>

      <nav className="p-6 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="flex items-center gap-2 font-black text-2xl text-sky-600">
          <Wind size={28} /> <span>SuperAir</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-black uppercase tracking-widest text-slate-600">
          <a href="#hero" className="hover:text-sky-600 transition-colors">Inicio</a>
          <a href="#services" className="hover:text-sky-600 transition-colors">Servicios</a>
          <Link to="/login" className="text-sky-600 border-b-2 border-sky-600 pb-1">Acceso Staff</Link>
        </div>
        <button className="bg-sky-600 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-sky-700 shadow-xl shadow-sky-600/20">Cotizar Ahora</button>
      </nav>

      {sections.map((s: any, idx: number) => (
        <section key={idx} id={s.type}>
          {s.type === 'hero' && (
            <div className="relative h-[85vh] flex items-center justify-center text-center px-6 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069" className="absolute inset-0 w-full h-full object-cover" alt="Hero" />
              <div className="absolute inset-0 bg-slate-900/60" />
              <div className="relative z-10 max-w-4xl">
                <h1 className="text-5xl md:text-8xl font-black text-white mb-8 uppercase tracking-tighter leading-none">{s.title}</h1>
                <p className="text-sky-100 text-xl md:text-2xl mb-12 max-w-2xl mx-auto font-medium">{s.subtitle}</p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <button className="px-12 py-5 bg-sky-600 text-white font-black rounded-full hover:scale-105 transition-all shadow-2xl uppercase tracking-widest text-sm">Tienda Online</button>
                  <button className="px-12 py-5 bg-white/10 backdrop-blur-md text-white border border-white/30 font-black rounded-full hover:bg-white/20 transition-all uppercase tracking-widest text-sm">Llamar: (442) 332 5814</button>
                </div>
              </div>
            </div>
          )}

          {s.type === 'services' && (
            <div className="py-24 px-8 md:px-24 bg-slate-50">
               <div className="text-center mb-20">
                  <h2 className="text-5xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Servicios Especializados</h2>
                  <p className="text-slate-500 text-lg">{s.subtitle}</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
                  {['VENTA', 'INSTALACIÓN', 'MANTENIMIENTO'].map((serv, i) => (
                    <div key={i} className="bg-white rounded-[3rem] overflow-hidden shadow-2xl hover:-translate-y-4 transition-all group">
                       <div className="h-72 relative">
                          <img src={`https://images.unsplash.com/photo-${i === 0 ? '1599839624912-67609f24e1bd' : i === 1 ? '1621905252507-b354bcadcabc' : '1581092918056-0c4c3acd3789'}?q=80&w=2070`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={serv} />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent p-10 flex flex-col justify-end">
                             <h4 className="font-black text-3xl text-white tracking-tighter">{serv}</h4>
                             <p className="text-sky-300 text-xs font-bold uppercase tracking-widest mt-2">Garantía SuperAir</p>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {s.type === 'footer' && (
            <footer className="bg-slate-900 text-white py-24 px-8 md:px-24">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
                <div>
                  <div className="flex items-center gap-3 font-black text-3xl text-sky-400 mb-8">
                    <Wind size={32} /> <span>SuperAir</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed mb-10">Líderes en climatización en Querétaro desde 2018.</p>
                </div>
                <div>
                  <h5 className="font-black text-xs uppercase tracking-[0.3em] mb-10 text-sky-400">Ubicación</h5>
                  <p className="text-slate-400 flex gap-4"><MapPin className="text-sky-500" /> La Pradera, Querétaro, Qro.</p>
                </div>
                <div>
                   <h5 className="font-black text-xs uppercase tracking-[0.3em] mb-10 text-sky-400">Línea Directa</h5>
                   <p className="text-2xl font-black">(442) 332 5814</p>
                </div>
              </div>
            </footer>
          )}
        </section>
      ))}
    </div>
  );
};

export default LandingPage;

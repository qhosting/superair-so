
import React from 'react';
import { Wind, MessageCircle, Phone, Clock, AlertTriangle } from 'lucide-react';

const Maintenance: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Elementos Decorativos de Fondo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-2xl w-full text-center relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="bg-slate-800 p-6 rounded-[2.5rem] border border-slate-700 shadow-2xl relative">
              <Wind size={64} className="text-sky-400 animate-bounce" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter">
          Sitio en <span className="text-sky-500">Mantenimiento</span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl mb-12 leading-relaxed max-w-lg mx-auto">
          Estamos actualizando nuestra plataforma para ofrecerte una mejor experiencia en climatización. ¡Volveremos muy pronto!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-3xl text-left">
            <Clock className="text-sky-400 mb-3" size={24} />
            <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Tiempo Estimado</h4>
            <p className="text-slate-400 text-xs">Finalizaremos en aproximadamente 2 horas.</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-3xl text-left">
            <AlertTriangle className="text-amber-400 mb-3" size={24} />
            <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Atención Urgente</h4>
            <p className="text-slate-400 text-xs">Nuestros técnicos siguen operando con normalidad.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="https://wa.me/524423325814" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-900/20"
          >
            <MessageCircle size={20} /> Contactar por WhatsApp
          </a>
          <a 
            href="tel:4423325814" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all shadow-xl"
          >
            <Phone size={20} /> Llamar Directo
          </a>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
          SuperAir de México • Expertos en Confort
        </div>
      </div>
    </div>
  );
};

export default Maintenance;

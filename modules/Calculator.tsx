
import React, { useState, useMemo } from 'react';
import { 
  Calculator, Wind, Thermometer, Users, Zap, Layout, 
  ArrowRight, Copy, CheckCircle2, Info, Sparkles, 
  Maximize, Minimize, Ruler, Sun, Monitor
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const CalculatorModule: React.FC = () => {
  const { showToast } = useNotification();
  const [params, setParams] = useState({
      width: 4,
      length: 4,
      people: 2,
      electronics: 2,
      sunExposure: 'Normal', // Normal, Mucha, Poca
      isTopFloor: false
  });

  const btuResult = useMemo(() => {
      const area = params.width * params.length;
      // Base: 600 BTU por m2 (Estándar México zona cálida moderada)
      let base = area * 600;
      
      // Ajuste por personas (150 BTU extra por persona)
      base += (params.people * 150);
      
      // Ajuste por electrónicos (200 BTU por aparato)
      base += (params.electronics * 200);
      
      // Ajuste por sol
      if (params.sunExposure === 'Mucha') base *= 1.25;
      if (params.sunExposure === 'Poca') base *= 0.90;
      
      // Ajuste por piso superior (techo recibe sol directo)
      if (params.isTopFloor) base += (area * 200);

      return Math.round(base);
  }, [params]);

  const recommendedUnit = useMemo(() => {
      if (btuResult <= 12500) return '1.0 Tonelada (12,000 BTU)';
      if (btuResult <= 18500) return '1.5 Toneladas (18,000 BTU)';
      if (btuResult <= 24500) return '2.0 Toneladas (24,000 BTU)';
      if (btuResult <= 36500) return '3.0 Toneladas (36,000 BTU)';
      return '5.0 Toneladas (Unidad Paquete)';
  }, [btuResult]);

  const copyToClipboard = async () => {
      const text = `ANÁLISIS DE CARGA TÉRMICA SUPERAIR:
Area: ${params.width * params.length}m²
Ocupantes: ${params.people}
Carga Electrónica: ${params.electronics} dispositivos
Carga Calculada: ${btuResult.toLocaleString()} BTU
Recomendación Técnica: ${recommendedUnit}`;
      
      navigator.clipboard.writeText(text);
      showToast("Cálculo técnico copiado al portapapeles");

      // Log usage to backend
      try {
          await fetch('/api/calculator/log', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ params, result: btuResult, recommendedUnit })
          });
      } catch (e) { console.error("Logging error", e); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Cálculo de Carga Térmica</h2>
          <p className="text-slate-500 text-sm font-medium">Dimensionamiento de ingeniería para eficiencia energética.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Dimensiones */}
                      <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Ruler size={14}/> Dimensiones del Espacio
                          </h4>
                          <div className="space-y-8">
                              <div>
                                  <div className="flex justify-between mb-4">
                                      <label className="text-xs font-bold text-slate-500 uppercase">Ancho (m)</label>
                                      <span className="font-black text-slate-900">{params.width}m</span>
                                  </div>
                                  <input 
                                    type="range" min="1" max="20" step="0.5" 
                                    value={params.width} onChange={e => setParams({...params, width: parseFloat(e.target.value)})}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600"
                                  />
                              </div>
                              <div>
                                  <div className="flex justify-between mb-4">
                                      <label className="text-xs font-bold text-slate-500 uppercase">Largo (m)</label>
                                      <span className="font-black text-slate-900">{params.length}m</span>
                                  </div>
                                  <input 
                                    type="range" min="1" max="20" step="0.5" 
                                    value={params.length} onChange={e => setParams({...params, length: parseFloat(e.target.value)})}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600"
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Factores Externos */}
                      <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Sun size={14}/> Factores de Calor
                          </h4>
                          <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Exposición Solar</label>
                                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                        {['Poca', 'Normal', 'Mucha'].map(s => (
                                            <button 
                                                key={s}
                                                onClick={() => setParams({...params, sunExposure: s})}
                                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${params.sunExposure === s ? 'bg-white shadow-md text-sky-600' : 'text-slate-400'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-amber-500"><Sun size={16}/></div>
                                        <span className="text-xs font-bold text-slate-700">¿Es último piso?</span>
                                    </div>
                                    <button 
                                        onClick={() => setParams({...params, isTopFloor: !params.isTopFloor})}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${params.isTopFloor ? 'bg-amber-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${params.isTopFloor ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-100">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={14}/> Personas en el área</label>
                          <div className="flex items-center gap-4">
                              <button onClick={() => setParams({...params, people: Math.max(0, params.people - 1)})} className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xl text-slate-500 hover:bg-slate-200 transition-all">-</button>
                              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl h-12 flex items-center justify-center font-black text-lg text-slate-900">{params.people}</div>
                              <button onClick={() => setParams({...params, people: params.people + 1})} className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xl text-slate-500 hover:bg-slate-200 transition-all">+</button>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Monitor size={14}/> Equipos Electrónicos</label>
                          <div className="flex items-center gap-4">
                              <button onClick={() => setParams({...params, electronics: Math.max(0, params.electronics - 1)})} className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xl text-slate-500 hover:bg-slate-200 transition-all">-</button>
                              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl h-12 flex items-center justify-center font-black text-lg text-slate-900">{params.electronics}</div>
                              <button onClick={() => setParams({...params, electronics: params.electronics + 1})} className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xl text-slate-500 hover:bg-slate-200 transition-all">+</button>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex items-center justify-between relative overflow-hidden group">
                  <Sparkles size={120} className="absolute -right-8 -bottom-8 opacity-5 rotate-12 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                      <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-2">Resumen de Ingeniería</p>
                      <h4 className="text-xl font-bold italic text-slate-300 max-w-md">"Este cálculo provee un margen de seguridad del 15% para climas extremos de México."</h4>
                  </div>
                  <button onClick={copyToClipboard} className="relative z-10 px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-500 hover:text-white transition-all flex items-center gap-2 shadow-2xl">
                      <Copy size={16}/> Copiar Reporte
                  </button>
              </div>
          </div>

          <div className="space-y-8">
              <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-[2rem] flex items-center justify-center mb-8">
                      <Wind size={40} className="animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Requerimiento Neto</p>
                  <h3 className="text-6xl font-black text-slate-900 tracking-tighter mb-4">
                      {btuResult.toLocaleString()} <span className="text-2xl text-slate-400">BTU</span>
                  </h3>
                  <div className="h-px w-full bg-slate-100 my-8" />
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-2">Unidad Recomendada</p>
                  <h4 className="text-2xl font-black text-slate-800 leading-tight px-4">{recommendedUnit}</h4>
                  
                  <div className="mt-10 w-full space-y-3">
                      <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Área Total</span>
                          <span className="text-xs font-black text-slate-900">{params.width * params.length} m²</span>
                      </div>
                      <div className="flex justify-between p-4 bg-slate-50 rounded-2xl">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Factor Solar</span>
                          <span className="text-xs font-black text-slate-900">{params.sunExposure}</span>
                      </div>
                  </div>
              </div>

              <div className="bg-indigo-600 p-8 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                  <Zap size={100} className="absolute -left-4 -bottom-4 opacity-10 rotate-12" />
                  <h5 className="font-black text-lg uppercase tracking-tight mb-4 flex items-center gap-2">
                      <Info size={20}/> Nota de Venta
                  </h5>
                  <p className="text-xs text-indigo-100 leading-relaxed font-medium mb-8">
                      Para espacios comerciales con techos de más de 3 metros, recomendamos escalar el cálculo un 20% adicional.
                  </p>
                  <button className="w-full py-4 bg-white/20 backdrop-blur-md rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/30 transition-all">Ver Equipos Compatibles</button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default CalculatorModule;


import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Send, 
  Calculator,
  BrainCircuit,
  Wind,
  Check,
  CreditCard,
  X,
  AlertCircle,
  Trash2,
  Package,
  Wrench,
  MinusCircle,
  PlusCircle,
  Loader2,
  Printer,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Percent,
  DollarSign,
  Mail,
  ExternalLink,
  CheckCircle2,
  Share2,
  History,
  Layout as LayoutIcon,
  Palette
} from 'lucide-react';
import { PaymentTerms, Product, Quote } from '../types';
import { GoogleGenAI } from "@google/genai";

const AVAILABLE_PRODUCTS: Product[] = [
  { id: '1', name: 'Mini Split Inverter 12k BTU', description: 'Alta eficiencia, Solo Frío', price: 8500, stock: 15, category: 'Unidad AC' },
  { id: '2', name: 'Mini Split Inverter 18k BTU', description: 'Eficiencia Premium', price: 12400, stock: 8, category: 'Unidad AC' },
  { id: '3', name: 'Mini Split Inverter 24k BTU', description: 'Uso rudo industrial', price: 18900, stock: 4, category: 'Unidad AC' },
  { id: '4', name: 'Mantenimiento Preventivo', description: 'Limpieza profunda y revisión', price: 850, stock: 999, category: 'Servicio' },
  { id: '5', name: 'Instalación Básica', description: 'Hasta 5 metros de tubería', price: 2500, stock: 999, category: 'Servicio' },
  { id: '6', name: 'Carga de Gas R410a', description: 'Carga completa por unidad', price: 1200, stock: 50, category: 'Refacción' },
];

interface QuoteItem {
  product: Product;
  quantity: number;
}

const Quotes: React.FC = () => {
  const [showSmartCalc, setShowSmartCalc] = useState(false);
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSyncingChatwoot, setIsSyncingChatwoot] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [roomSize, setRoomSize] = useState({ width: '', length: '', height: '', sunlight: 'normal', equipmentCount: '0' });
  const [recommendation, setRecommendation] = useState<{ text: string, suggestedUnit?: Product } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [selectedTerms, setSelectedTerms] = useState<PaymentTerms>(PaymentTerms.FIFTY_FIFTY);
  const [addedItems, setAddedItems] = useState<QuoteItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [clientName, setClientName] = useState('Residencial Lomas');
  const [clientEmail, setClientEmail] = useState('cliente@ejemplo.com');

  const subtotal = useMemo(() => addedItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0), [addedItems]);
  const discountAmount = (subtotal * discount) / 100;
  const iva = (subtotal - discountAmount) * 0.16;
  const totalAmount = subtotal - discountAmount + iva;

  const addItem = (product: Product) => {
    const existing = addedItems.find(item => item.product.id === product.id);
    if (existing) {
      setAddedItems(addedItems.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setAddedItems([...addedItems, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setAddedItems(addedItems.map(item => item.product.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeItem = (id: string) => setAddedItems(addedItems.filter(item => item.product.id !== id));

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  const filteredProducts = AVAILABLE_PRODUCTS.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase()));

  const handleChatwootSync = () => {
    setIsSyncingChatwoot(true);
    setTimeout(() => {
      setIsSyncingChatwoot(false);
      alert('Cotización sincronizada con la conversación activa en Chatwoot.');
    }, 2000);
  };

  const handleSendEmail = () => {
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setShowEmailModal(false);
      alert('Correo enviado exitosamente a ' + clientEmail);
    }, 2500);
  };

  const calculateWithGemini = async () => {
    setLoadingAI(true);
    setRecommendation(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actúa como un ingeniero experto en HVAC de SuperAir México. 
      Dimensiones habitación: Ancho ${roomSize.width}m, Largo ${roomSize.length}m, Alto ${roomSize.height}m. 
      Exposición solar: ${roomSize.sunlight}. Equipos electrónicos: ${roomSize.equipmentCount}. 
      Calcula la carga térmica necesaria en BTU.
      Si el resultado es cercano a 12k BTU, sugiere el equipo de 12k. Si es 18k, el de 18k. Si es más, el de 24k.
      Explica brevemente por qué de forma técnica.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text || "No se pudo generar una recomendación.";
      let suggestedUnit = AVAILABLE_PRODUCTS[0];
      if (text.includes('18k') || text.includes('18,000')) suggestedUnit = AVAILABLE_PRODUCTS[1];
      if (text.includes('24k') || text.includes('24,000')) suggestedUnit = AVAILABLE_PRODUCTS[2];

      setRecommendation({ text, suggestedUnit });
    } catch (error) {
      setRecommendation({ text: "Error al consultar la IA. Por favor, usa el cálculo manual." });
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cotizaciones</h2>
          <p className="text-slate-500 text-sm font-medium">Genera propuestas comerciales de alta calidad.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSmartCalc(!showSmartCalc)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl"
          >
            <BrainCircuit size={18} className="text-sky-400" />
            Asistente IA Gemini
          </button>
          <button 
            onClick={() => { setAddedItems([]); setShowNewQuote(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
          >
            <Plus size={18} />
            Nueva Cotización
          </button>
        </div>
      </div>

      {showSmartCalc && (
        <div className="bg-white p-10 rounded-[3rem] border-2 border-sky-100 shadow-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wind size={120} className="text-sky-600" />
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-sky-100 text-sky-600 rounded-[1.5rem]"><Calculator size={32} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cálculo de Carga Térmica</h3>
              <p className="text-slate-500 text-sm font-medium">Potenciado por Gemini 3 Flash Preview</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 relative z-10">
            {['Ancho', 'Largo', 'Alto'].map((label, idx) => (
              <div key={label} className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label} (metros)</label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-bold"
                  placeholder="0.00"
                  value={idx === 0 ? roomSize.width : idx === 1 ? roomSize.length : roomSize.height}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (idx === 0) setRoomSize(p => ({ ...p, width: val }));
                    if (idx === 1) setRoomSize(p => ({ ...p, length: val }));
                    if (idx === 2) setRoomSize(p => ({ ...p, height: val }));
                  }}
                />
              </div>
            ))}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exposición Solar</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-bold"
                value={roomSize.sunlight}
                onChange={(e) => setRoomSize(p => ({...p, sunlight: e.target.value}))}
              >
                <option value="normal">Normal</option>
                <option value="mucha">Mucha (Ventanas grandes)</option>
                <option value="extrema">Extrema (Techo directo)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <button 
              onClick={calculateWithGemini}
              disabled={loadingAI || !roomSize.width || !roomSize.length}
              className="px-10 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-700 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-sky-600/20"
            >
              {loadingAI ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
              Obtener Análisis de Ingeniería
            </button>
            <button onClick={() => setShowSmartCalc(false)} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">Cerrar Asistente</button>
          </div>

          {recommendation && (
            <div className="mt-10 p-10 bg-sky-50 rounded-[2.5rem] border border-sky-100 animate-in fade-in duration-700">
               <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white text-sky-600 rounded-xl shadow-sm"><Wind size={20} /></div>
                        <h4 className="font-black text-sky-900 text-lg uppercase tracking-tight">Resultados del Análisis</h4>
                     </div>
                     <div className="text-sky-800 leading-relaxed whitespace-pre-wrap text-sm font-medium">{recommendation.text}</div>
                  </div>
                  {recommendation.suggestedUnit && (
                    <div className="md:w-72 bg-white p-6 rounded-3xl border border-sky-200 shadow-xl flex flex-col items-center text-center self-start">
                       <Package className="text-sky-600 mb-4" size={40} />
                       <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Equipo Sugerido</p>
                       <h5 className="font-black text-slate-900 mb-2">{recommendation.suggestedUnit.name}</h5>
                       <p className="text-2xl font-black text-sky-600 mb-6">{formatCurrency(recommendation.suggestedUnit.price)}</p>
                       <button 
                        onClick={() => {addItem(recommendation.suggestedUnit!); setShowSmartCalc(false); setShowNewQuote(true);}}
                        className="w-full py-3 bg-sky-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 transition-all shadow-lg"
                       >
                         Cotizar Ahora
                       </button>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva Cotización */}
      {showNewQuote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-slate-50 w-full max-w-7xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
             
             <div className="p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white"><FileText size={24}/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Editor de Cotización</h3>
                    <p className="text-slate-400 text-xs font-bold">Folio: COT-2024-0012</p>
                  </div>
                </div>
                <button onClick={() => setShowNewQuote(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
             </div>

             <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Panel Izquierdo: Selección de Items */}
                <div className="flex-1 p-8 overflow-y-auto border-r border-slate-200 bg-white">
                   <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Cliente</label>
                           <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Destinatario</label>
                           <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                              type="text" 
                              placeholder="Buscar en catálogo..."
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredProducts.map(p => (
                              <button key={p.id} onClick={() => addItem(p)} className="p-4 bg-slate-50 hover:bg-sky-50 border border-slate-100 rounded-2xl text-left transition-all flex items-center gap-4 group">
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                                    <p className="text-sky-600 font-black text-xs">{formatCurrency(p.price)}</p>
                                 </div>
                                 <PlusCircle className="text-slate-200 group-hover:text-sky-500" size={20} />
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conceptos</h4>
                         <div className="space-y-3">
                            {addedItems.map(item => (
                                <div key={item.product.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-6">
                                   <div className="flex-1 min-w-0 font-black text-slate-900 truncate">{item.product.name}</div>
                                   <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-100">
                                      <button onClick={() => updateQuantity(item.product.id, -1)} className="text-slate-400"><MinusCircle size={20}/></button>
                                      <span className="font-black w-6 text-center">{item.quantity}</span>
                                      <button onClick={() => updateQuantity(item.product.id, 1)} className="text-slate-400"><PlusCircle size={20}/></button>
                                   </div>
                                   <div className="w-28 text-right font-black text-slate-900">{formatCurrency(item.product.price * item.quantity)}</div>
                                   <button onClick={() => removeItem(item.product.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                                </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="w-full lg:w-[450px] p-8 flex flex-col gap-6 bg-slate-50">
                   <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
                      <div className="flex justify-between items-center pb-4 border-b">
                        <h4 className="font-black text-slate-900 uppercase text-lg">Resumen</h4>
                        <DollarSign size={20} className="text-emerald-500" />
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-black">{formatCurrency(subtotal)}</span></div>
                         <div className="flex justify-between text-sm"><span>IVA (16%)</span><span className="font-black">{formatCurrency(iva)}</span></div>
                         <div className="pt-6 border-t flex justify-between items-center">
                            <span className="text-lg font-black uppercase">Total</span>
                            <span className="text-3xl font-black text-sky-600">{formatCurrency(totalAmount)}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleChatwootSync}
                        disabled={isSyncingChatwoot}
                        className="col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                         {isSyncingChatwoot ? <Loader2 className="animate-spin" size={18}/> : <MessageSquare size={18} />}
                         Sincronizar Chatwoot
                      </button>
                      <button 
                        onClick={() => setShowEmailModal(true)}
                        className="py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-sky-700 flex items-center justify-center gap-2"
                      >
                         <Mail size={16} /> Enviar Email
                      </button>
                      <button className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 flex items-center justify-center gap-2">
                         <Printer size={16} /> Generar PDF
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Email Sending Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Enviar Cotización</h3>
                 <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinatario</label>
                    <input value={clientEmail} disabled className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold opacity-60" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asunto</label>
                    <input defaultValue={`Cotización SuperAir: Propuesta Climatización - ${clientName}`} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-sky-500" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensaje Adicional</label>
                    <textarea 
                      placeholder="Hola, adjunto la propuesta técnica para tu proyecto..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-32 resize-none font-medium"
                    />
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-sky-50 border border-sky-100 rounded-2xl">
                    <FileText className="text-sky-600" size={24} />
                    <div>
                       <p className="text-[10px] font-black text-sky-900 uppercase tracking-widest leading-none mb-1">Archivo Adjunto</p>
                       <p className="text-xs font-bold text-sky-600">SuperAir_Cotizacion_2024.pdf</p>
                    </div>
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20 flex items-center justify-center gap-3"
                 >
                    {isSendingEmail ? <Loader2 className="animate-spin" size={18}/> : <Send size={18} />}
                    Enviar Ahora
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Historial (No changes needed in layout, just functionality) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-900 uppercase tracking-tighter">Historial de Operaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Folio</th>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Monto Total</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5">Canal Envío</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {[
                { id: 'COT-2024-001', client: 'Residencial Lomas', total: 14500, status: 'Aceptada', channel: 'Email' },
                { id: 'COT-2024-002', client: 'Corporativo Nexus', total: 82000, status: 'Enviada', channel: 'Chatwoot' },
                { id: 'COT-2024-003', client: 'Ana Martínez', total: 950, status: 'Borrador', channel: '-' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-6 font-black text-sky-600">{row.id}</td>
                  <td className="px-8 py-6 font-bold text-slate-800">{row.client}</td>
                  <td className="px-8 py-6 font-black text-slate-900">{formatCurrency(row.total)}</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-[9px] font-black border border-sky-100 uppercase tracking-widest">{row.status}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       {row.channel === 'Email' ? <Mail size={14} className="text-sky-500" /> : row.channel === 'Chatwoot' ? <MessageSquare size={14} className="text-indigo-500" /> : null}
                       {row.channel}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 hover:bg-white rounded-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-all"><ChevronRight size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quotes;

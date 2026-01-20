
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, Search, Mail, Eye, Send, X, Loader2, 
  Download, CheckCircle2, Edit3, Trash2, Calculator,
  Briefcase, Check, ArrowRight, DollarSign, Wallet, User, 
  Calendar, Info, ExternalLink, ShieldCheck, TrendingUp, Layers,
  BrainCircuit, Sparkles, AlertTriangle, Zap, Save
} from 'lucide-react';
import { Quote, Client, Product, PaymentTerms, QuoteItem, QuoteItemCategory } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CATEGORIES: QuoteItemCategory[] = ['Equipos', 'Materiales', 'Mano de Obra'];

const Quotes: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // AI State
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote>>({
      clientId: '', clientName: '', status: 'Borrador', paymentTerms: PaymentTerms.FIFTY_FIFTY, items: [] as QuoteItem[], total: 0
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quoteDesign, setQuoteDesign] = useState<any>(null);

  const formatMXN = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  useEffect(() => { 
      fetchQuotes(); 
      fetchDesign();
  }, []);

  const fetchQuotes = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/quotes');
          const data = await res.json();
          if(Array.isArray(data)) setQuotes(data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  const fetchDesign = async () => {
      try {
          const res = await fetch('/api/settings/public');
          if (res.ok) {
              const data = await res.json();
              if (data.quote_design) setQuoteDesign(data.quote_design);
          }
      } catch (e) {}
  };

  const loadDependencies = async () => {
      try {
          const [cliRes, prodRes] = await Promise.all([fetch('/api/clients'), fetch('/api/products')]);
          setClients(await cliRes.json());
          setProducts(await prodRes.json());
      } catch (e) { console.error(e); }
  };

  const handleOpenCreate = async () => {
      await loadDependencies();
      setAiFeedback(null);
      setCurrentQuote({ clientId: '', clientName: '', status: 'Borrador', paymentTerms: PaymentTerms.FIFTY_FIFTY, items: [] as QuoteItem[], total: 0 });
      setShowEditor(true);
      setIsEditing(false);
  };

  const handleAuditQuote = async () => {
      const items = (currentQuote.items as QuoteItem[]) || [];
      if (items.length === 0) return;
      
      setIsAuditing(true);
      setAiFeedback(null);
      try {
          const res = await fetch('/api/quotes/ai-audit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items })
          });
          const data = await res.json();
          setAiFeedback(data.feedback);
      } catch (e) {
          showToast("Error en auditoría IA", "error");
      } finally {
          setIsAuditing(false);
      }
  };

  const addItem = () => {
      const currentItems = (currentQuote.items as QuoteItem[]) || [];
      setCurrentQuote({
          ...currentQuote,
          items: [...currentItems, { productId: '', productName: '', quantity: 1, price: 0, cost: 0, category: 'Equipos' }]
      });
  };

  const updateItem = (idx: number, field: keyof QuoteItem, value: any) => {
      const currentItems = (currentQuote.items as QuoteItem[]) || [];
      const newItems = [...currentItems];
      const item = { ...newItems[idx] };
      if (field === 'productId') {
          const prod = products.find(p => p.id.toString() === value.toString());
          item.productId = value;
          item.productName = prod?.name || '';
          item.price = Number(prod?.price || 0);
          item.cost = Number(prod?.cost || 0);
      } else {
          (item as any)[field] = value;
      }
      newItems[idx] = item;
      setCurrentQuote({ ...currentQuote, items: newItems });
  };

  const totals = useMemo(() => {
      const items = Array.isArray(currentQuote.items) ? currentQuote.items : [];
      const subtotal = items.reduce((acc, i) => acc + (i.quantity * i.price), 0);
      const costTotal = items.reduce((acc, i) => acc + (i.quantity * (i.cost || 0)), 0);
      const margin = subtotal > 0 ? ((subtotal - costTotal) / subtotal) * 100 : 0;
      return { subtotal, iva: subtotal * 0.16, total: subtotal * 1.16, margin };
  }, [currentQuote.items]);

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const payload = { ...currentQuote, total: totals.total };
          const res = await fetch('/api/quotes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          if (res.ok) { 
              showToast("Propuesta guardada correctamente");
              setShowEditor(false); 
              fetchQuotes(); 
          }
      } catch (e) { showToast("Error al guardar", "error"); }
      finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Propuestas de Ingeniería</h2>
            <p className="text-slate-500 text-sm font-medium">Control comercial con auditoría IA y flujo operativo automatizado.</p>
         </div>
         <button onClick={handleOpenCreate} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all shadow-2xl flex items-center gap-2">
            <Plus size={18} /> Nueva Cotización
         </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl"><FileText size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Total Periodo</p><h4 className="text-xl font-black">{quotes.length} Proyectos</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Tasa Cierre</p><h4 className="text-xl font-black">{((quotes.filter(q=>q.status==='Aceptada'||q.status==='Ejecutada').length / (quotes.length||1))*100).toFixed(0)}%</h4></div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><DollarSign size={24}/></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase">Valor Pipeline</p><h4 className="text-xl font-black">{formatMXN(quotes.reduce((acc,q)=>acc+Number(q.total),0))}</h4></div>
          </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
          {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={32}/></div> : (
              <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                          <th className="pb-6 px-4">Folio</th>
                          <th className="pb-6 px-4">Cliente / Proyecto</th>
                          <th className="pb-6 px-4">Inversión</th>
                          <th className="pb-6 px-4">Estatus Comercial</th>
                          <th className="pb-6 px-4 text-right">Canales</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {quotes.map(q => (
                          <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="py-6 px-4 font-black text-slate-400 italic">#{q.id}</td>
                              <td className="py-6 px-4">
                                  <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{q.client_name}</div>
                                  <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">{q.payment_terms}</div>
                              </td>
                              <td className="py-6 px-4">
                                  <div className="font-black text-slate-900">{formatMXN(Number(q.total))}</div>
                                  <div className="text-[8px] text-slate-400 uppercase font-bold">IVA 16% Incluido</div>
                              </td>
                              <td className="py-6 px-4">
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                      q.status === 'Ejecutada' ? 'bg-slate-900 text-white border-slate-900' :
                                      q.status === 'Aceptada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                      'bg-slate-100 text-slate-400 border-slate-200'
                                  }`}>
                                      {q.status}
                                  </span>
                              </td>
                              <td className="py-6 px-4 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => window.open(`/#/view/quote/${q.public_token}`, '_blank')} className="p-3 bg-white text-sky-600 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 transition-all"><ExternalLink size={18}/></button>
                                      <button className="p-3 bg-white text-slate-400 rounded-2xl shadow-sm hover:text-rose-500 border border-slate-100 transition-all"><Download size={18}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {/* EDITOR MODAL CON IA AUDITOR */}
      {showEditor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex justify-end">
              <div className="w-full max-w-6xl bg-slate-50 h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-200">
                  <div className="bg-white p-8 border-b border-slate-200 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Editor de Ingeniería Comercial</h3>
                          <div className="flex gap-4 mt-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Info size={12}/> MXN • IVA 16% Incl.</span>
                          </div>
                      </div>
                      <div className="flex items-center gap-6">
                          {user?.role === 'Super Admin' && (
                              <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl flex items-center gap-4">
                                  <div>
                                      <p className="text-[8px] font-black text-sky-400 uppercase tracking-[0.2em] mb-0.5">Margen Proyectado</p>
                                      <span className="text-xl font-black">{totals.margin.toFixed(1)}%</span>
                                  </div>
                                  <div className={`w-2 h-8 rounded-full ${totals.margin > 35 ? 'bg-emerald-500' : totals.margin > 20 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                              </div>
                          )}
                          <button onClick={() => setShowEditor(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                      {/* Cabecera Cotización */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Solicitante</label>
                              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-sky-500" value={currentQuote.clientId} onChange={e => setCurrentQuote({...currentQuote, clientId: e.target.value, clientName: clients.find(c=>c.id.toString()===e.target.value)?.name})}>
                                  <option value="">-- Seleccionar de Cartera --</option>
                                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Esquema de Cobro</label>
                              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" value={currentQuote.paymentTerms} onChange={e => setCurrentQuote({...currentQuote, paymentTerms: e.target.value as any})}>
                                  {Object.values(PaymentTerms).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* HVAC SMART AUDITOR (AI) CARD */}
                      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                          <Sparkles className="absolute top-4 right-4 text-sky-400 opacity-50" size={24}/>
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                              <div>
                                  <h4 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                      <BrainCircuit size={18}/> HVAC Smart Auditor (Beta)
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-medium max-w-lg">
                                      Nuestra IA analiza tus conceptos para asegurar que no falte material crítico (tubería, soportes, gas) según los equipos cotizados.
                                  </p>
                              </div>
                              <button 
                                onClick={handleAuditQuote}
                                disabled={isAuditing || (currentQuote.items as QuoteItem[]).length === 0}
                                className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-50 transition-all flex items-center gap-2 shadow-xl disabled:opacity-50"
                              >
                                  {/* Fix: Added Zap and Save to lucide-react imports */}
                                  {isAuditing ? <Loader2 className="animate-spin" size={14}/> : <Zap size={14}/>}
                                  {isAuditing ? 'Analizando...' : 'Auditar Presupuesto'}
                              </button>
                          </div>

                          {aiFeedback && (
                              <div className="mt-6 p-6 bg-white/5 border border-white/10 rounded-3xl animate-in zoom-in duration-300">
                                  <div className="flex gap-4">
                                      <AlertTriangle className="text-amber-400 shrink-0" size={20}/>
                                      <div className="text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                                          {aiFeedback}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Partidas Agrupadas */}
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Layers size={18} className="text-sky-500"/> Desglose Técnico</h4>
                              <button onClick={addItem} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all shadow-lg">+ Añadir Partida</button>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                              <table className="w-full text-left">
                                  <thead className="bg-slate-50 border-b border-slate-200">
                                      <tr>
                                          <th className="p-4 pl-8 text-[10px] font-black text-slate-400 uppercase">Clasificación</th>
                                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Concepto / Producto</th>
                                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center w-24">Cant.</th>
                                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Precio Venta</th>
                                          {user?.role === 'Super Admin' && <th className="p-4 text-[10px] font-black text-slate-400 uppercase italic text-rose-400">Costo (Privado)</th>}
                                          <th className="p-4 pr-8 text-right text-[10px] font-black text-slate-400 uppercase">Subtotal</th>
                                          <th className="p-4 w-10"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {(currentQuote.items as QuoteItem[]).map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-3 pl-8">
                                                  <select className="w-full p-2 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest border-none outline-none focus:ring-1 focus:ring-sky-500" value={item.category} onChange={e=>updateItem(idx, 'category', e.target.value)}>
                                                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                                  </select>
                                              </td>
                                              <td className="p-3">
                                                  <select className="w-full p-2 font-bold text-xs bg-transparent border-none outline-none focus:ring-1 focus:ring-sky-500 rounded-lg" value={item.productId} onChange={e=>updateItem(idx, 'productId', e.target.value)}>
                                                      <option value="">-- Buscar en Catálogo --</option>
                                                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                  </select>
                                              </td>
                                              <td className="p-3">
                                                  <input type="number" className="w-full p-2 bg-slate-100 rounded-lg text-center font-black text-sm" value={item.quantity} onChange={e=>updateItem(idx, 'quantity', Number(e.target.value))} />
                                              </td>
                                              <td className="p-3">
                                                  <div className="relative">
                                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">$</span>
                                                      <input type="number" className="w-full pl-6 p-2 bg-slate-100 rounded-lg font-bold text-sm" value={item.price} onChange={e=>updateItem(idx, 'price', Number(e.target.value))} />
                                                  </div>
                                              </td>
                                              {user?.role === 'Super Admin' && (
                                                  <td className="p-3">
                                                      <div className="relative">
                                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-300">$</span>
                                                          <input type="number" className="w-full pl-6 p-2 bg-rose-50 text-rose-700 rounded-lg font-bold text-sm border border-rose-100" value={item.cost} onChange={e=>updateItem(idx, 'cost', Number(e.target.value))} />
                                                      </div>
                                                  </td>
                                              )}
                                              <td className="p-3 pr-8 text-right font-black text-slate-900 text-sm">{formatMXN(item.quantity * item.price)}</td>
                                              <td className="p-3"><button onClick={() => setCurrentQuote({...currentQuote, items: (currentQuote.items as QuoteItem[]).filter((_,i)=>i!==idx)})} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                              { (currentQuote.items as QuoteItem[]).length === 0 && (
                                  <div className="p-20 text-center text-slate-300 bg-white">
                                      <Layers size={48} className="mx-auto mb-4 opacity-20" />
                                      <p className="font-black uppercase text-[10px] tracking-widest">Sin conceptos en la propuesta</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="flex justify-end pt-6">
                          <div className="w-80 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
                              <div className="flex justify-between text-xs font-bold text-slate-400 tracking-widest"><span>SUBTOTAL</span><span>{formatMXN(totals.subtotal)}</span></div>
                              <div className="flex justify-between text-xs font-bold text-slate-400 tracking-widest"><span>IVA 16%</span><span>{formatMXN(totals.iva)}</span></div>
                              <div className="h-px bg-slate-100" />
                              <div className="flex justify-between items-center"><span className="text-sm font-black text-slate-900">TOTAL NETO</span><span className="text-2xl font-black text-sky-600">{formatMXN(totals.total)}</span></div>
                          </div>
                      </div>
                  </div>

                  <div className="p-8 bg-white border-t flex justify-end gap-4 shrink-0">
                      <button onClick={() => setShowEditor(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                      <button onClick={handleSave} disabled={isSaving || !currentQuote.clientId} className="px-12 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-sky-600/20 hover:bg-sky-700 transition-all disabled:opacity-50 flex items-center gap-2">
                          {/* Fix: Added Zap and Save to lucide-react imports */}
                          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                          Publicar Propuesta al Portal
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Quotes;

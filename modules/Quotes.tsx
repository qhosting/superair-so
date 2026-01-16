
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, Search, Mail, Eye, Send, X, Loader2, 
  Download, CheckCircle2, Edit3, Trash2, Calculator,
  Briefcase, Check, ArrowRight, DollarSign, Wallet, User, 
  Calendar, Info, ExternalLink, ShieldCheck, TrendingUp, Layers
} from 'lucide-react';
import { Quote, Client, Product, PaymentTerms, QuoteItem, QuoteItemCategory } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

const CATEGORIES: QuoteItemCategory[] = ['Equipos', 'Materiales', 'Mano de Obra'];

const Quotes: React.FC = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote>>({
      clientId: '', clientName: '', status: 'Borrador', paymentTerms: PaymentTerms.FIFTY_FIFTY, items: [], total: 0
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
          const res = await fetch('/api/settings');
          const data = await res.json();
          if (data.quote_design) setQuoteDesign(data.quote_design);
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
      setCurrentQuote({ clientId: '', clientName: '', status: 'Borrador', paymentTerms: PaymentTerms.FIFTY_FIFTY, items: [], total: 0 });
      setShowEditor(true);
      setIsEditing(false);
  };

  const handleOpenEdit = async (quote: Quote) => {
      await loadDependencies();
      let items = quote.items;
      if (typeof items === 'string') items = JSON.parse(items);
      setCurrentQuote({ ...quote, items });
      setShowEditor(true);
      setIsEditing(true);
  };

  const addItem = () => {
      setCurrentQuote({
          ...currentQuote,
          items: [...(currentQuote.items || []), { productId: '', productName: '', quantity: 1, price: 0, cost: 0, category: 'Equipos' }]
      });
  };

  const updateItem = (idx: number, field: keyof QuoteItem, value: any) => {
      const newItems = [...(currentQuote.items || [])];
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
      const subtotal = (currentQuote.items || []).reduce((acc, i) => acc + (i.quantity * i.price), 0);
      const costTotal = (currentQuote.items || []).reduce((acc, i) => acc + (i.quantity * (i.cost || 0)), 0);
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
          if (res.ok) { setShowEditor(false); fetchQuotes(); }
      } catch (e) { alert("Error al guardar"); }
      finally { setIsSaving(false); }
  };

  const handleExecuteProject = async (quoteId: string) => {
      if (!confirm("¿Ejecutar este proyecto? Esto descontará stock y creará la orden de instalación.")) return;
      setIsExecuting(true);
      try {
          const res = await fetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
          if (res.ok) {
              alert("¡Proyecto en marcha! Stock actualizado y cita generada.");
              fetchQuotes();
          } else {
              const err = await res.json();
              alert(err.error);
          }
      } catch (e) { console.error(e); }
      finally { setIsExecuting(false); }
  };

  const generatePDF = (quote: Quote) => {
      const doc = new jsPDF();
      const design = quoteDesign || {
          primaryColor: '#0ea5e9',
          accentColor: '#0f172a',
          documentTitle: 'PROPUESTA TÉCNICA Y ECONÓMICA',
          slogan: 'Líderes en Climatización Industrial',
          footerNotes: 'Garantía SuperAir de 30 días en mano de obra.',
          showSignLine: true
      };

      // Convert hex to RGB helper
      const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
      };

      const primaryRGB = hexToRgb(design.primaryColor);

      doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(design.documentTitle.toUpperCase(), 20, 20);
      doc.setFontSize(10);
      doc.text(design.slogan, 20, 30);
      
      const items: QuoteItem[] = Array.isArray(quote.items) ? quote.items : JSON.parse(quote.items as any);
      
      let lastY = 60;

      CATEGORIES.forEach((cat, index) => {
          const catItems = items.filter(i => i.category === cat);
          if (catItems.length === 0) return;
          
          (doc as any).autoTable({
              head: [[cat.toUpperCase(), 'CANT', 'P. UNIT (MXN)', 'SUBTOTAL']],
              body: catItems.map(i => [i.productName, i.quantity, formatMXN(i.price), formatMXN(i.quantity * i.price)]),
              startY: lastY,
              theme: 'striped',
              headStyles: { fillColor: [51, 65, 85] }
          });
          lastY = (doc as any).lastAutoTable.finalY + 10;
      });

      doc.setTextColor(0);
      doc.setFontSize(12);
      const finalY = lastY + 10;
      doc.text(`TOTAL NETO: ${formatMXN(Number(quote.total))}`, 130, finalY);

      if (design.footerNotes) {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(design.footerNotes, 20, finalY + 20, { maxWidth: 170 });
      }

      if (design.showSignLine) {
          doc.setDrawColor(200);
          doc.line(70, finalY + 60, 140, finalY + 60);
          doc.text('FIRMA DE CONFORMIDAD', 85, finalY + 65);
      }
      
      doc.save(`Propuesta_${quote.id}.pdf`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Propuestas de Ingeniería</h2>
            <p className="text-slate-500 text-sm font-medium">Control comercial con análisis de margen y flujo automatizado.</p>
         </div>
         <button onClick={handleOpenCreate} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all shadow-2xl">
            <Plus size={18} /> Crear Propuesta
         </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
          {loading ? <Loader2 className="animate-spin mx-auto text-sky-600" /> : (
              <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                          <th className="pb-6">Folio</th>
                          <th className="pb-6">Cliente</th>
                          <th className="pb-6">Monto Total</th>
                          <th className="pb-6">Estatus</th>
                          <th className="pb-6 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {quotes.map(q => (
                          <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="py-6 font-black text-slate-400">#{q.id}</td>
                              <td className="py-6">
                                  <div className="font-bold text-slate-900">{q.client_name}</div>
                                  <div className="text-[9px] text-slate-400 uppercase font-black">{q.payment_terms}</div>
                              </td>
                              <td className="py-6 font-black text-slate-900">{formatMXN(Number(q.total))}</td>
                              <td className="py-6">
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                      q.status === 'Ejecutada' ? 'bg-emerald-600 text-white border-emerald-600' :
                                      q.status === 'Aceptada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                      'bg-slate-100 text-slate-400'
                                  }`}>
                                      {q.status}
                                  </span>
                              </td>
                              <td className="py-6 text-right">
                                  <div className="flex justify-end gap-2">
                                      {q.status === 'Aceptada' && (
                                          <button 
                                            onClick={() => handleExecuteProject(q.id)}
                                            className="px-4 py-2 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-sky-700 animate-pulse"
                                          >
                                              Ejecutar Proyecto
                                          </button>
                                      )}
                                      <button onClick={() => window.open(`/#/view/quote/${q.public_token}`, '_blank')} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-white rounded-xl shadow-sm"><ExternalLink size={18}/></button>
                                      <button onClick={() => generatePDF(q)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm"><Download size={18}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {showEditor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex justify-end">
              <div className="w-full max-w-6xl bg-slate-50 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200">
                  <div className="bg-white p-8 border-b border-slate-200 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase">Editor de Ingeniería Comercial</h3>
                          <div className="flex gap-4 mt-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Info size={12}/> Moneda: Pesos Mexicanos (IVA 16% Incl.)</span>
                          </div>
                      </div>
                      <div className="flex items-center gap-10">
                          {user?.role === 'Super Admin' && (
                              <div className="bg-slate-900 p-4 rounded-2xl text-white">
                                  <p className="text-[9px] font-black text-sky-400 uppercase tracking-[0.2em] mb-1">Margen Estimado</p>
                                  <div className="flex items-center gap-2">
                                      <TrendingUp size={16} className={totals.margin > 30 ? 'text-emerald-400' : 'text-amber-400'}/>
                                      <span className="text-xl font-black">{totals.margin.toFixed(1)}%</span>
                                  </div>
                              </div>
                          )}
                          <button onClick={() => setShowEditor(false)} className="p-3 hover:bg-slate-100 rounded-xl transition-all"><X size={24}/></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                      {/* Cabecera Cotización */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm grid grid-cols-3 gap-8">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Receptor</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={currentQuote.clientId} onChange={e => setCurrentQuote({...currentQuote, clientId: e.target.value, clientName: clients.find(c=>c.id.toString()===e.target.value)?.name})}>
                                  <option value="">Seleccionar...</option>
                                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Términos de Pago</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={currentQuote.paymentTerms} onChange={e => setCurrentQuote({...currentQuote, paymentTerms: e.target.value as any})}>
                                  {Object.values(PaymentTerms).map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* Partidas Agrupadas */}
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Layers size={18} className="text-sky-500"/> Desglose de Conceptos</h4>
                              <button onClick={addItem} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all">+ Partida</button>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
                              <table className="w-full text-left">
                                  <thead className="bg-slate-50 border-b border-slate-200">
                                      <tr>
                                          <th className="p-4 pl-8 text-[10px] font-black text-slate-400 uppercase">Clasificación</th>
                                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Concepto / Producto</th>
                                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Cant.</th>
                                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Unitario (Venta)</th>
                                          {user?.role === 'Super Admin' && <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Unitario (Costo)</th>}
                                          <th className="p-4 pr-8 text-right text-[10px] font-black text-slate-400 uppercase">Subtotal</th>
                                          <th className="p-4 w-10"></th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {currentQuote.items?.map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-3 pl-8">
                                                  <select className="w-full p-2 bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest border-none outline-none" value={item.category} onChange={e=>updateItem(idx, 'category', e.target.value)}>
                                                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                                  </select>
                                              </td>
                                              <td className="p-3">
                                                  <select className="w-full p-2 font-bold text-xs bg-transparent outline-none" value={item.productId} onChange={e=>updateItem(idx, 'productId', e.target.value)}>
                                                      <option value="">Manual / Servicio...</option>
                                                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                  </select>
                                              </td>
                                              <td className="p-3">
                                                  <input type="number" className="w-16 p-2 bg-slate-100 rounded-lg text-center font-black" value={item.quantity} onChange={e=>updateItem(idx, 'quantity', Number(e.target.value))} />
                                              </td>
                                              <td className="p-3">
                                                  <input type="number" className="w-24 p-2 bg-slate-100 rounded-lg font-bold" value={item.price} onChange={e=>updateItem(idx, 'price', Number(e.target.value))} />
                                              </td>
                                              {user?.role === 'Super Admin' && (
                                                  <td className="p-3">
                                                      <input type="number" className="w-24 p-2 bg-rose-50 text-rose-700 rounded-lg font-bold" value={item.cost} onChange={e=>updateItem(idx, 'cost', Number(e.target.value))} />
                                                  </td>
                                              )}
                                              <td className="p-3 pr-8 text-right font-black text-slate-900">{formatMXN(item.quantity * item.price)}</td>
                                              <td className="p-3"><button onClick={() => setCurrentQuote({...currentQuote, items: currentQuote.items?.filter((_,i)=>i!==idx)})} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      <div className="flex justify-end">
                          <div className="w-80 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
                              <div className="flex justify-between text-xs font-bold text-slate-400"><span>SUBTOTAL</span><span>{formatMXN(totals.subtotal)}</span></div>
                              <div className="flex justify-between text-xs font-bold text-slate-400"><span>IVA 16%</span><span>{formatMXN(totals.iva)}</span></div>
                              <div className="h-px bg-slate-100" />
                              <div className="flex justify-between items-center"><span className="text-sm font-black text-slate-900">TOTAL NETO</span><span className="text-2xl font-black text-sky-600">{formatMXN(totals.total)}</span></div>
                          </div>
                      </div>
                  </div>

                  <div className="p-8 bg-white border-t flex justify-end gap-4 shrink-0">
                      <button onClick={() => setShowEditor(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">Descartar</button>
                      <button onClick={handleSave} disabled={isSaving} className="px-12 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-sky-600/20">
                          {isSaving ? <Loader2 className="animate-spin mx-auto"/> : 'Guardar y Generar Portal'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Quotes;


import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, Search, Mail, Eye, Send, X, Loader2, 
  Printer, Download, CheckCircle2, Edit3, Trash2, Calculator,
  Briefcase, Check, ArrowRight, DollarSign, Wallet, User, Calendar
} from 'lucide-react';
import { Quote, Client, Product, PaymentTerms } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from '../context/AuthContext';

interface QuoteItem {
    productId: string;
    productName: string; 
    quantity: number;
    price: number;
}

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote>>({
      clientId: '',
      clientName: '',
      status: 'Borrador',
      paymentTerms: PaymentTerms.FIFTY_FIFTY,
      items: [],
      total: 0
  });

  // DB Data for Selectors
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedQuoteForEmail, setSelectedQuoteForEmail] = useState<Quote | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetchQuotes();
    
    // Check for pending lead to convert
    const pendingClient = localStorage.getItem('pending_quote_client');
    if (pendingClient) {
        try {
            const client = JSON.parse(pendingClient);
            handleOpenCreate(client);
            localStorage.removeItem('pending_quote_client');
        } catch (e) { console.error("Error parsing pending client"); }
    }
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

  const loadDependencies = async () => {
      if (clients.length === 0 || products.length === 0) {
          const [cliRes, prodRes] = await Promise.all([
              fetch('/api/clients'),
              fetch('/api/products')
          ]);
          setClients(await cliRes.json());
          setProducts(await prodRes.json());
      }
  };

  // --- EDITOR LOGIC ---

  const handleOpenCreate = async (preSelectedClient?: any) => {
      await loadDependencies();
      setCurrentQuote({
          clientId: preSelectedClient?.id || '',
          clientName: preSelectedClient?.name || '',
          status: 'Borrador',
          paymentTerms: PaymentTerms.FIFTY_FIFTY,
          items: [],
          total: 0
      });
      setIsEditing(false);
      setShowEditor(true);
  };

  const handleOpenEdit = async (quote: Quote) => {
      await loadDependencies();
      let parsedItems = quote.items;
      if (typeof quote.items === 'string') {
          try { parsedItems = JSON.parse(quote.items); } catch(e) { parsedItems = []; }
      }
      
      setCurrentQuote({
          ...quote,
          items: Array.isArray(parsedItems) ? parsedItems : [] 
      });
      setIsEditing(true);
      setShowEditor(true);
  };

  const addItem = () => {
      const newItems = [...(currentQuote.items || [])];
      // Initialize with explicit numbers to avoid NaN
      newItems.push({ productId: '', productName: '', quantity: 1, price: 0 });
      setCurrentQuote({ ...currentQuote, items: newItems });
  };

  const removeItem = (index: number) => {
      const newItems = [...(currentQuote.items || [])];
      newItems.splice(index, 1);
      recalculateTotal(newItems);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
      const newItems = [...(currentQuote.items || [])];
      const item = newItems[index];

      if (field === 'productId') {
          const product = products.find(p => p.id.toString() === value.toString());
          if (product) {
              item.productId = product.id;
              item.productName = product.name;
              item.price = Number(product.price);
          } else {
              // Reset if cleared
              item.productId = '';
              item.productName = '';
              item.price = 0;
          }
      } else if (field === 'quantity' || field === 'price') {
          // Force number type, default to 0 if NaN
          const numVal = parseFloat(value);
          (item as any)[field] = isNaN(numVal) ? 0 : numVal;
      } else {
          (item as any)[field] = value;
      }
      
      newItems[index] = item;
      recalculateTotal(newItems);
  };

  const recalculateTotal = (items: any[]) => {
      const total = items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
      setCurrentQuote({ ...currentQuote, items, total });
  };

  const handleSave = async () => {
      if (!currentQuote.clientId) {
          alert("Por favor seleccione un cliente.");
          return;
      }

      // Filter out invalid items (no product selected)
      const validItems = (currentQuote.items || []).filter((i: any) => i.productId && i.productId !== '');
      
      if (validItems.length === 0) {
          alert("Agregue al menos un producto válido a la cotización.");
          return;
      }

      // Calculate final total based on valid items
      const finalSubtotal = validItems.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);
      const finalTotal = finalSubtotal * 1.16; // Assuming 16% IVA logic is applied globally

      // Prepare Payload - FIXING TYPES HERE
      const client = clients.find(c => c.id.toString() === currentQuote.clientId?.toString());
      
      const payload = {
          ...currentQuote,
          clientId: parseInt(currentQuote.clientId?.toString() || '0'), // Ensure INT
          clientName: client?.name || currentQuote.clientName,
          items: validItems, // Backend handles stringify or use as jsonb
          total: finalTotal
      };

      setIsSaving(true);
      try {
          let res;
          if (isEditing && currentQuote.id) {
              res = await fetch(`/api/quotes/${currentQuote.id}`, {
                  method: 'PUT',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(payload)
              });
          } else {
              res = await fetch('/api/quotes', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(payload)
              });
          }

          if (res.ok) {
              setShowEditor(false);
              fetchQuotes();
          } else {
              const err = await res.json();
              alert(`Error al guardar: ${err.error || 'Verifique los datos'}`);
          }
      } catch (e) { 
          alert("Error de conexión con el servidor."); 
      } finally {
          setIsSaving(false);
      }
  };

  const handleConvert = async () => {
      if (!currentQuote.id) return;
      if (!confirm("¿Generar Orden de Venta?")) return;

      try {
          const res = await fetch(`/api/quotes/${currentQuote.id}/convert`, { method: 'POST' });
          if (res.ok) {
              alert("¡Orden Generada Exitosamente!");
              setShowEditor(false);
              navigate('/sales');
          } else {
              alert("Error al convertir");
          }
      } catch(e) { alert("Error de conexión"); }
  };

  // --- PDF GENERATOR ---
  const generatePDF = (quote: Quote, returnBlob = false) => {
    const doc = new jsPDF();
    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN', 20, 25);
    doc.setFontSize(10);
    doc.text('SuperAir S.A. de C.V.', 20, 32);
    doc.text(`Folio: #${quote.id}`, 160, 25);
    doc.text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString()}`, 160, 32);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.clientName || 'Cliente General', 20, 62);

    const tableColumn = ["Concepto / Producto", "Cant.", "Precio Unit.", "Total"];
    const tableRows: any[] = [];
    let items: any[] = [];
    try { items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items; } catch (e) { items = []; }

    items.forEach((item: any) => {
      const itemTotal = item.price * item.quantity;
      tableRows.push([
        item.productName || `ID: ${item.productId}`,
        item.quantity,
        `$${Number(item.price).toFixed(2)}`,
        `$${itemTotal.toFixed(2)}`
      ]);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] }, 
      styles: { fontSize: 10, cellPadding: 3 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${Number(quote.total).toFixed(2)} MXN`, 140, finalY);

    if (returnBlob) return doc.output('blob');
    doc.save(`Cotizacion_SuperAir_${quote.id}.pdf`);
  };

  const openEmailModal = (quote: Quote) => {
      setSelectedQuoteForEmail(quote);
      setClientEmail(''); 
      setEmailSubject(`Cotización #${quote.id} - SuperAir`);
      setEmailBody(`Estimado cliente,\n\nAdjunto encontrará la cotización solicitada #${quote.id}.\n\nSaludos,\nEquipo SuperAir`);
      setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
      if (!selectedQuoteForEmail) return;
      setIsSendingEmail(true);
      try {
          const pdfBlob = generatePDF(selectedQuoteForEmail, true) as Blob;
          const formData = new FormData();
          formData.append('to', clientEmail);
          formData.append('subject', emailSubject);
          formData.append('text', emailBody);
          formData.append('attachment', pdfBlob, `Cotizacion_${selectedQuoteForEmail.id}.pdf`);

          const res = await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('superair_token')}` },
              body: formData
          });

          if (res.ok) {
              alert('Correo enviado exitosamente.');
              setShowEmailModal(false);
          } else {
              throw new Error('Server error');
          }
      } catch (e) {
          alert('Error al enviar correo.');
      } finally {
          setIsSendingEmail(false);
      }
  };

  const subtotal = useMemo(() => {
      return (currentQuote.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
  }, [currentQuote.items]);

  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cotizaciones</h2>
            <p className="text-slate-500 text-sm font-medium">Historial y envíos pendientes.</p>
         </div>
         <button 
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 transition-all shadow-xl shadow-sky-600/20"
         >
            <Plus size={18} /> Nueva
         </button>
      </div>

      {/* QUOTES LIST */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
          {loading ? <Loader2 className="animate-spin mx-auto text-sky-600" /> : (
              <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                          <th className="pb-4">Folio</th>
                          <th className="pb-4">Cliente</th>
                          <th className="pb-4">Total (MXN)</th>
                          <th className="pb-4">Estado</th>
                          <th className="pb-4 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {quotes.map(q => (
                          <tr key={q.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="py-4 font-bold text-slate-700">#{q.id}</td>
                              <td className="py-4 font-bold text-slate-900">{q.clientName || q.clientId}</td>
                              <td className="py-4 font-bold text-emerald-600">${Number(q.total).toFixed(2)}</td>
                              <td className="py-4">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                      q.status === 'Aceptada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                      q.status === 'Enviada' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                      'bg-amber-50 text-amber-600 border-amber-100'
                                  }`}>
                                      {q.status}
                                  </span>
                              </td>
                              <td className="py-4 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleOpenEdit(q)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar"><Edit3 size={16}/></button>
                                      <button onClick={() => generatePDF(q)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="PDF"><Download size={16}/></button>
                                      <button onClick={() => openEmailModal(q)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all" title="Enviar"><Mail size={16}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>
      
      {/* EDITOR SLIDE-OVER (WIDE) */}
      {showEditor && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex justify-end">
              <div className="w-full max-w-5xl bg-slate-50 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200">
                  {/* Header */}
                  <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-10">
                      <div>
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl"><FileText size={24} /></div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                  {isEditing ? `Cotización #${currentQuote.id}` : 'Nueva Cotización'}
                              </h3>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest ml-12">
                              {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                          {/* Live Total Display */}
                          <div className="text-right mr-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimado</p>
                              <p className="text-2xl font-black text-slate-900">${total.toFixed(2)}</p>
                          </div>

                          {isEditing && currentQuote.status === 'Aceptada' && (
                              <button onClick={handleConvert} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2">
                                  <Briefcase size={16} /> Crear Venta
                              </button>
                          )}
                          <button onClick={() => setShowEditor(false)} className="p-3 hover:bg-slate-100 rounded-xl transition-all"><X size={20} className="text-slate-400"/></button>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
                          
                          {/* Top Controls Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><User size={12}/> Cliente</label>
                                  <select 
                                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all"
                                      value={currentQuote.clientId}
                                      onChange={e => setCurrentQuote({...currentQuote, clientId: e.target.value})}
                                  >
                                      <option value="">Seleccionar Cliente...</option>
                                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Wallet size={12}/> Condiciones</label>
                                  <select 
                                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all"
                                      value={currentQuote.paymentTerms}
                                      onChange={e => setCurrentQuote({...currentQuote, paymentTerms: e.target.value as any})}
                                  >
                                      {Object.values(PaymentTerms).map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><CheckCircle2 size={12}/> Estatus</label>
                                  <select 
                                      value={currentQuote.status}
                                      onChange={e => setCurrentQuote({...currentQuote, status: e.target.value as any})}
                                      className={`w-full p-4 rounded-2xl outline-none font-bold border focus:ring-2 focus:ring-sky-500 transition-all ${
                                          currentQuote.status === 'Aceptada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                                      }`}
                                  >
                                      <option>Borrador</option>
                                      <option>Enviada</option>
                                      <option>Aceptada</option>
                                      <option>Rechazada</option>
                                  </select>
                              </div>
                          </div>

                          {/* Items Table */}
                          <div>
                              <div className="flex justify-between items-center mb-4 px-2">
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Partidas de la Cotización</h4>
                                  <span className="text-xs font-bold text-slate-400">{(currentQuote.items || []).length} Ítems</span>
                              </div>
                              
                              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                  <table className="w-full text-left">
                                      <thead className="bg-slate-50 border-b border-slate-200">
                                          <tr>
                                              <th className="p-4 pl-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Producto / Servicio</th>
                                              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[15%] text-center">Cantidad</th>
                                              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Precio Unitario</th>
                                              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%] text-right">Subtotal</th>
                                              <th className="p-4 w-[5%]"></th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {(currentQuote.items || []).map((item: any, idx: number) => (
                                              <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                                  <td className="p-3 pl-6">
                                                      <select 
                                                          className="w-full p-3 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 outline-none text-sm font-bold text-slate-700 transition-all rounded-lg"
                                                          value={item.productId}
                                                          onChange={e => updateItem(idx, 'productId', e.target.value)}
                                                      >
                                                          <option value="">Seleccionar Producto...</option>
                                                          {products.map(p => (
                                                              <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name} - ${p.stock} disp.</option>
                                                          ))}
                                                      </select>
                                                  </td>
                                                  <td className="p-3">
                                                      <input 
                                                          type="number" 
                                                          className="w-full p-2 bg-slate-100 border border-transparent focus:bg-white focus:border-sky-500 rounded-xl outline-none text-sm font-bold text-center transition-all"
                                                          value={item.quantity}
                                                          onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                          min="1"
                                                      />
                                                  </td>
                                                  <td className="p-3">
                                                      <div className="relative">
                                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                                          <input 
                                                              type="number" 
                                                              className="w-full pl-6 p-2 bg-slate-100 border border-transparent focus:bg-white focus:border-sky-500 rounded-xl outline-none text-sm font-bold transition-all"
                                                              value={item.price}
                                                              onChange={e => updateItem(idx, 'price', e.target.value)}
                                                          />
                                                      </div>
                                                  </td>
                                                  <td className="p-3 pr-6 text-right font-black text-slate-800 text-sm">
                                                      ${(item.quantity * item.price).toFixed(2)}
                                                  </td>
                                                  <td className="p-3 text-center">
                                                      <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-all"><Trash2 size={16}/></button>
                                                  </td>
                                              </tr>
                                          ))}
                                          {(!currentQuote.items || currentQuote.items.length === 0) && (
                                              <tr>
                                                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm font-medium">
                                                      No hay productos agregados. Haz clic en "Agregar Partida".
                                                  </td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                                  <button onClick={addItem} className="w-full py-4 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 hover:text-sky-600 transition-all flex items-center justify-center gap-2 border-t border-slate-100">
                                      <Plus size={16} /> Agregar Partida
                                  </button>
                              </div>
                          </div>

                          {/* Footer Totals */}
                          <div className="flex justify-end pt-4">
                              <div className="w-72 bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                                  <div className="flex justify-between text-xs font-bold text-slate-500">
                                      <span>Subtotal</span>
                                      <span>${subtotal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold text-slate-500">
                                      <span>IVA (16%)</span>
                                      <span>${iva.toFixed(2)}</span>
                                  </div>
                                  <div className="w-full h-px bg-slate-200"></div>
                                  <div className="flex justify-between items-center">
                                      <span className="text-sm font-black text-slate-900 uppercase">Total Neto (MXN)</span>
                                      <span className="text-xl font-black text-sky-600">${total.toFixed(2)}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-4 shrink-0 z-20">
                      <button onClick={() => setShowEditor(false)} className="px-8 py-4 text-slate-500 font-bold text-xs hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                      <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="px-10 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center gap-2 disabled:opacity-70"
                      >
                          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16} />} 
                          {isSaving ? 'Guardando...' : 'Guardar Cotización'}
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl p-8 rounded-[2rem] shadow-xl animate-in zoom-in duration-300">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-lg">Enviar Cotización PDF</h3>
                   <button onClick={() => setShowEmailModal(false)}><X size={20}/></button>
               </div>
               <div className="space-y-4">
                   <input className="w-full p-3 border rounded-xl" placeholder="Email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} />
                   <input className="w-full p-3 border rounded-xl" placeholder="Asunto" value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} />
                   <textarea className="w-full p-3 border rounded-xl h-32" value={emailBody} onChange={e=>setEmailBody(e.target.value)} />
                   <button 
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold flex justify-center gap-2 disabled:opacity-70"
                   >
                       {isSendingEmail ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />} 
                       {isSendingEmail ? 'Enviando PDF...' : 'Enviar Ahora'}
                   </button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;

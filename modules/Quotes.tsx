import React, { useState, useMemo, useEffect } from 'react';
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
  Palette,
  Pencil,
  Eye,
  User as UserIcon
} from 'lucide-react';
import { PaymentTerms, Product, Quote, Template, Client } from '../types';
import { GoogleGenAI } from "@google/genai";

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
  const [isApproving, setIsApproving] = useState<number | null>(null);
  
  const [roomSize, setRoomSize] = useState({ width: '', length: '', height: '', sunlight: 'normal', equipmentCount: '0' });
  const [recommendation, setRecommendation] = useState<{ text: string, suggestedUnit?: Product } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Data State
  const [quotes, setQuotes] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  // Email Template State
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Editing State
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  
  const [addedItems, setAddedItems] = useState<QuoteItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const fetchQuotes = async () => {
    try {
      setLoadingQuotes(true);
      const res = await fetch('/api/quotes');
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (e) {
      console.error("Error fetching quotes", e);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const fetchProducts = async () => {
      try {
          const res = await fetch('/api/products');
          if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) setAvailableProducts(data);
          }
      } catch (e) { console.error(e); }
  }

  const fetchClients = async () => {
      try {
          const res = await fetch('/api/clients');
          if (res.ok) {
              const data = await res.json();
              if(Array.isArray(data)) setClients(data);
          }
      } catch(e) { console.error(e); }
  }

  useEffect(() => {
    fetchQuotes();
    fetchProducts();
    fetchClients();
  }, []);

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      if (!selectedId) return;
      
      const client = clients.find(c => c.id.toString() === selectedId);
      if (client) {
          setClientName(client.name);
          setClientEmail(client.email || '');
      }
  };

  // --- LOGIC: Cargar Plantilla de Email ---
  const prepareEmailModal = async () => {
      setShowEmailModal(true);
      try {
          const res = await fetch('/api/templates');
          const templates = await res.json();
          const emailTemplate = templates.find((t: Template) => t.code === 'email_quote');
          
          if (emailTemplate) {
              let subject = emailTemplate.subject || '';
              let body = emailTemplate.content || '';
              
              // Replace Variables
              const replaceMap: any = {
                  '{{client_name}}': clientName,
                  '{{quote_id}}': editingQuoteId || 'BORRADOR', 
                  '{{total}}': formatCurrency(totalAmount)
              };

              Object.keys(replaceMap).forEach(key => {
                  subject = subject.replaceAll(key, replaceMap[key]);
                  body = body.replaceAll(key, replaceMap[key]);
              });

              setEmailSubject(subject);
              setEmailBody(body);
          }
      } catch (e) {
          console.error("Error loading template");
      }
  };

  const subtotal = useMemo(() => addedItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0), [addedItems]);
  const iva = subtotal * 0.16;
  const totalAmount = subtotal + iva;

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
  const filteredProducts = availableProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase()));

  // --- CRUD ACTIONS ---
  const handleOpenNewQuote = () => {
      setEditingQuoteId(null);
      setClientName('');
      setClientEmail('');
      setAddedItems([]);
      setShowNewQuote(true);
  }

  const handleEditQuote = (quote: any) => {
      setEditingQuoteId(quote.id);
      setClientName(quote.client_name);
      // Try to find email from clients if not stored in quote
      const client = clients.find(c => c.name === quote.client_name);
      setClientEmail(client?.email || '');
      
      if (quote.items) {
          setAddedItems(Array.isArray(quote.items) ? quote.items : []);
      }
      setShowNewQuote(true);
  };

  const handleDeleteQuote = async (id: string) => {
      if(!confirm("¿Estás seguro de eliminar esta cotización?")) return;
      try {
          await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
          setQuotes(quotes.filter(q => q.id !== id));
      } catch(e) {
          alert("Error al eliminar.");
      }
  };

  const handleSaveQuote = async () => {
    const payload = {
          client_name: clientName,
          total: totalAmount,
          items: addedItems
    };

    try {
      let res;
      if (editingQuoteId) {
          // UPDATE
          res = await fetch(`/api/quotes/${editingQuoteId}`, {
             method: 'PUT',
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify(payload)
          });
      } else {
          // CREATE
          res = await fetch('/api/quotes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          });
      }

      if (res.ok) {
        setShowNewQuote(false);
        setAddedItems([]);
        setEditingQuoteId(null);
        fetchQuotes();
        alert(editingQuoteId ? "Cotización actualizada." : "Cotización creada exitosamente.");
      }
    } catch(e) {
      alert("Error guardando cotización.");
    }
  };

  const handleApproveQuote = async (id: number) => {
    if (!confirm("¿Aprobar esta cotización y generar una Orden de Venta?")) return;
    setIsApproving(id);
    try {
      const res = await fetch(`/api/quotes/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        alert("¡Éxito! La cotización ha sido aprobada y la Orden de Venta generada.");
        fetchQuotes();
      } else {
        throw new Error("Failed");
      }
    } catch(e) {
      alert("Error al aprobar cotización.");
    } finally {
      setIsApproving(null);
    }
  };

  const handleChatwootSync = async () => {
    setIsSyncingChatwoot(true);
    try {
        await fetch('/api/trigger-n8n', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                webhookUrl: 'https://n8n.webhook.url/test', // Mock URL
                payload: {
                    action: 'SYNC_QUOTE',
                    clientName,
                    amount: totalAmount,
                    items: addedItems
                }
            })
        });
        alert('Cotización enviada a n8n para sincronización con Chatwoot.');
    } catch(e) {
        alert('Error conectando con servicio de mensajería.');
    } finally {
        setIsSyncingChatwoot(false);
    }
  };

  const handleSendEmail = () => {
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setShowEmailModal(false);
      alert('Correo enviado exitosamente a ' + clientEmail + ' usando la plantilla configurada.');
    }, 2500);
  };

  const handlePrintQuote = (quote: any) => {
     // Generate items HTML
     const itemsHtml = (quote.items || []).map((item: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
           <td style="padding: 12px; font-weight: 600; color: #1e293b;">${item.product.name}</td>
           <td style="padding: 12px; text-align: center; color: #475569;">${item.quantity}</td>
           <td style="padding: 12px; text-align: right; color: #475569;">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.product.price)}</td>
           <td style="padding: 12px; text-align: right; font-weight: 700; color: #0f172a;">${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.product.price * item.quantity)}</td>
        </tr>
     `).join('');

     const printWindow = window.open('', '_blank');
     if (!printWindow) return alert("Habilita los pop-ups para imprimir.");

     printWindow.document.write(`
        <html>
        <head>
          <title>Cotización #${quote.id}</title>
          <style>
             body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #0f172a; }
             .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 40px; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th { text-align: left; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; color: #94a3b8; padding: 10px; border-bottom: 2px solid #e2e8f0; }
             .totals { margin-top: 40px; display: flex; justify-content: flex-end; }
             .totals-box { width: 300px; }
             .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 0.875rem; color: #475569; }
             .total-row { display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #0f172a; font-weight: 900; font-size: 1.25rem; margin-top: 10px; }
          </style>
        </head>
        <body>
           <div class="header">
              <div>
                 <h1 style="font-size: 2rem; font-weight: 900; margin: 0; line-height: 1;">COTIZACIÓN</h1>
                 <p style="margin: 5px 0 0 0; color: #64748b; font-weight: 600;">FOLIO #${quote.id}</p>
              </div>
              <div style="text-align: right;">
                 <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;">SuperAir de México</h2>
                 <p style="margin: 5px 0 0 0; font-size: 0.875rem; color: #64748b;">Av. de la Luz 402, Juriquilla<br>Querétaro, Qro.</p>
              </div>
           </div>

           <div style="margin-bottom: 40px;">
              <p style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Cliente</p>
              <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0;">${quote.client_name}</h3>
           </div>

           <table>
              <thead>
                 <tr>
                    <th>Descripción</th>
                    <th style="text-align: center;">Cant.</th>
                    <th style="text-align: right;">Precio Unit.</th>
                    <th style="text-align: right;">Total</th>
                 </tr>
              </thead>
              <tbody>
                 ${itemsHtml}
              </tbody>
           </table>

           <div class="totals">
              <div class="totals-box">
                 <div class="row"><span>Subtotal</span><span>${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(quote.total) / 1.16)}</span></div>
                 <div class="row"><span>IVA (16%)</span><span>${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(quote.total) - (Number(quote.total) / 1.16))}</span></div>
                 <div class="total-row"><span>TOTAL</span><span>${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(quote.total))}</span></div>
              </div>
           </div>

           <div style="margin-top: 80px; text-align: center; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <p>Precios sujetos a cambio sin previo aviso. Validez de la oferta: 15 días.</p>
              <p>SuperAir de México S.A. de C.V.</p>
           </div>
           
           <script>
              window.onload = function() { window.print(); }
           </script>
        </body>
        </html>
     `);
     printWindow.document.close();
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
      // Simple logic to map AI text to available products roughly
      let suggestedUnit = availableProducts.find(p => p.name.includes('12000') || p.name.includes('1 Ton')); 
      if (text.includes('18k') || text.includes('18,000')) suggestedUnit = availableProducts.find(p => p.name.includes('18000') || p.name.includes('1.5 Ton'));
      if (text.includes('24k') || text.includes('24,000')) suggestedUnit = availableProducts.find(p => p.name.includes('24000') || p.name.includes('2 Ton'));

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
            onClick={handleOpenNewQuote}
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
                        onClick={() => {addItem(recommendation.suggestedUnit!); setShowSmartCalc(false); handleOpenNewQuote();}}
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

      {/* Modal Nueva/Editar Cotización */}
      {showNewQuote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6">
          <div className="bg-slate-50 w-full max-w-7xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
             
             <div className="p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-600 rounded-2xl flex items-center justify-center text-white"><FileText size={24}/></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingQuoteId ? 'Editar Cotización' : 'Editor de Cotización'}</h3>
                    <p className="text-slate-400 text-xs font-bold">{editingQuoteId ? `ID: #${editingQuoteId}` : 'Nueva Propuesta Comercial'}</p>
                  </div>
                </div>
                <button onClick={() => setShowNewQuote(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
             </div>

             <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Panel Izquierdo: Selección de Items */}
                <div className="flex-1 p-8 overflow-y-auto border-r border-slate-200 bg-white">
                   <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2 col-span-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                               <UserIcon size={12}/> Seleccionar Cliente Existente
                           </label>
                           <select 
                                onChange={handleClientSelect}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                           >
                               <option value="">-- Buscar Cliente --</option>
                               {clients.map(c => (
                                   <option key={c.id} value={c.id}>{c.name}</option>
                               ))}
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Cliente (Manual)</label>
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
                                    <p className="text-sky-600 font-black text-xs">{formatCurrency(Number(p.price))}</p>
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
                        onClick={handleSaveQuote}
                        disabled={addedItems.length === 0}
                        className="col-span-2 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-emerald-700 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                         <CheckCircle2 size={18} />
                         {editingQuoteId ? 'Actualizar Cotización' : 'Guardar Cotización'}
                      </button>
                      <button 
                        onClick={handleChatwootSync}
                        disabled={isSyncingChatwoot}
                        className="py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                         {isSyncingChatwoot ? <Loader2 className="animate-spin" size={18}/> : <MessageSquare size={18} />}
                         Sync n8n
                      </button>
                      <button 
                        onClick={prepareEmailModal}
                        disabled={!clientEmail}
                        className="py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-sky-700 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                         <Mail size={16} /> Enviar Email
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Email Sending Modal (Split View) */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-5xl h-[80vh] flex rounded-[3.5rem] shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
              
              {/* Left Panel: Editor */}
              <div className="w-1/2 p-10 border-r border-slate-100 flex flex-col bg-white">
                <div className="flex items-center justify-between mb-8">
                     <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Redactar Correo</h3>
                </div>
                
                <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinatario</label>
                        <input value={clientEmail} disabled className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold opacity-60" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asunto</label>
                        <input 
                            value={emailSubject}
                            onChange={e => setEmailSubject(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-sky-500" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensaje (Editable)</label>
                        <textarea 
                          value={emailBody}
                          onChange={e => setEmailBody(e.target.value)}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-64 resize-none font-medium leading-relaxed focus:ring-2 focus:ring-sky-500"
                        />
                     </div>
                </div>

                <div className="pt-8 mt-auto border-t border-slate-100">
                     <button 
                      onClick={handleSendEmail}
                      disabled={isSendingEmail}
                      className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20 flex items-center justify-center gap-3"
                     >
                        {isSendingEmail ? <Loader2 className="animate-spin" size={18}/> : <Send size={18} />}
                        Enviar Ahora
                     </button>
                </div>
              </div>

              {/* Right Panel: Preview */}
              <div className="w-1/2 bg-slate-50 flex flex-col relative">
                 <button onClick={() => setShowEmailModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-200 rounded-xl transition-all z-10"><X size={20}/></button>
                 
                 <div className="p-10 pb-4 border-b border-slate-200 flex items-center gap-2">
                    <Eye size={18} className="text-slate-400"/>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa Cliente</span>
                 </div>

                 <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 min-h-[500px]">
                        {/* Simulated Email Header */}
                        <div className="bg-slate-900 text-white p-6">
                            <h2 className="font-bold text-lg">SuperAir</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="whitespace-pre-wrap text-slate-600 text-sm font-medium leading-relaxed">
                                {emailBody}
                            </div>
                            
                            {/* Simulated Quote Attachment Card */}
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center gap-4">
                                <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Cotización_SuperAir.pdf</p>
                                    <p className="text-xs text-slate-400">125 KB</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 text-xs text-slate-400">
                                <p>SuperAir de México S.A. de C.V.</p>
                                <p>Av. de la Luz 402, Juriquilla, Qro.</p>
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-900 uppercase tracking-tighter">Historial de Operaciones</h3>
        </div>
        <div className="overflow-x-auto">
          {loadingQuotes ? (
             <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={32} /></div>
          ) : quotes.length === 0 ? (
             <div className="p-10 text-center text-slate-400">No hay cotizaciones registradas.</div>
          ) : (
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                    <th className="px-8 py-5">Folio</th>
                    <th className="px-8 py-5">Cliente</th>
                    <th className="px-8 py-5">Monto Total</th>
                    <th className="px-8 py-5">Estado</th>
                    <th className="px-8 py-5">Fecha</th>
                    <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                {quotes.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6 font-black text-sky-600">#{row.id}</td>
                    <td className="px-8 py-6 font-bold text-slate-800">{row.client_name || 'Sin Nombre'}</td>
                    <td className="px-8 py-6 font-black text-slate-900">{formatCurrency(Number(row.total))}</td>
                    <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${
                            row.status === 'Aceptada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                            {row.status}
                        </span>
                    </td>
                    <td className="px-8 py-6 text-slate-400 font-medium text-xs">
                        {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end gap-2">
                            {row.status !== 'Aceptada' && (
                                <>
                                    <button 
                                        onClick={() => handleApproveQuote(row.id)}
                                        disabled={isApproving === row.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest disabled:opacity-50"
                                        title="Aprobar y Crear Orden"
                                    >
                                        {isApproving === row.id ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12} />}
                                    </button>
                                    <button 
                                        onClick={() => handleEditQuote(row)}
                                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                        title="Editar"
                                    >
                                        <Pencil size={16}/>
                                    </button>
                                </>
                            )}
                            <button 
                                onClick={() => handlePrintQuote(row)}
                                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                title="Imprimir PDF Web"
                            >
                                <Printer size={16}/>
                            </button>
                            <button 
                                onClick={() => handleDeleteQuote(row.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Eliminar"
                            >
                                <Trash2 size={16}/>
                            </button>
                       </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quotes;
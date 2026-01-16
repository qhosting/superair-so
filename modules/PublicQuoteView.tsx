
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Wind, ShieldCheck, CheckCircle2, Download, Printer, 
    Calendar, User, Mail, Phone, Loader2, Zap, Layout, ArrowRight
} from 'lucide-react';
import { Quote } from '../types';

const PublicQuoteView: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [quoteDesign, setQuoteDesign] = useState({
        primaryColor: '#0ea5e9',
        accentColor: '#0f172a',
        documentTitle: 'Propuesta de Ingeniería',
        slogan: 'Líderes en Climatización Industrial',
        footerNotes: 'Garantía SuperAir certificada en cada proyecto.',
        showIvaDetail: true
    });

    useEffect(() => {
        if (token) {
            Promise.all([
                fetch(`/api/quotes/public/${token}`).then(res => res.json()),
                fetch('/api/settings/public').then(res => res.ok ? res.json() : null)
            ])
            .then(([quoteData, settingsData]) => {
                setQuote(quoteData);
                if (settingsData && settingsData.quote_design) {
                    setQuoteDesign(prev => ({ ...prev, ...settingsData.quote_design }));
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
        }
    }, [token]);

    const handleAccept = async () => {
        if (!token) return;
        setIsAccepting(true);
        try {
            const res = await fetch(`/api/quotes/public/${token}/accept`, { method: 'POST' });
            if (res.ok) setAccepted(true);
        } catch (e) { alert("Error al aceptar propuesta."); }
        finally { setIsAccepting(false); }
    };

    const formatMXN = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-sky-600" size={48}/></div>;
    if (!quote) return <div className="h-screen flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest">Enlace Inválido o Expirado</div>;

    const items = typeof quote.items === 'string' ? JSON.parse(quote.items) : quote.items;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans selection:bg-sky-100">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
                {/* Header Branding */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/50" style={{ borderTop: `8px solid ${quoteDesign.primaryColor}` }}>
                    <div className="flex items-center gap-4">
                        <div className="text-white p-3 rounded-2xl shadow-lg" style={{ backgroundColor: quoteDesign.primaryColor }}><Wind size={32}/></div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">SuperAir</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{quoteDesign.slogan}</p>
                        </div>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Folio del Documento</p>
                        <h2 className="text-2xl font-black text-slate-900">#{quote.id}</h2>
                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 mt-2 inline-block">Propuesta Vigente</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8" style={{ color: quoteDesign.accentColor }}>{quoteDesign.documentTitle}</h3>
                            
                            <div className="space-y-10">
                                {['Equipos', 'Materiales', 'Mano de Obra'].map(cat => {
                                    const catItems = items.filter((i:any) => i.category === cat);
                                    if (catItems.length === 0) return null;
                                    return (
                                        <div key={cat} className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">{cat}</h4>
                                            <div className="space-y-3">
                                                {catItems.map((item:any, idx:number) => (
                                                    <div key={idx} className="flex justify-between items-start group">
                                                        <div className="flex gap-4">
                                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-xs text-slate-300 group-hover:text-sky-600 transition-colors">{item.quantity}x</div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 text-sm">{item.productName || 'Concepto Técnico'}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">Precio Unitario: {formatMXN(item.price)}</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-black text-slate-900 text-sm">{formatMXN(item.quantity * item.price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>Subtotal</span><span>{formatMXN(quote.total / 1.16)}</span></div>
                                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase"><span>IVA 16%</span><span>{formatMXN(quote.total - (quote.total/1.16))}</span></div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-sm font-black uppercase text-slate-900">Total Neto</span>
                                        <span className="text-2xl font-black" style={{ color: quoteDesign.primaryColor }}>{formatMXN(Number(quote.total))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extra Info */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                                <ShieldCheck className="text-emerald-500 mb-4" size={24}/>
                                <h5 className="font-black text-xs uppercase mb-2">Garantía Certificada</h5>
                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">30 días de garantía en mano de obra y garantías de fábrica en equipos.</p>
                            </div>
                            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                                <Calendar className="text-sky-400 mb-4" size={24} style={{ color: quoteDesign.primaryColor }}/>
                                <h5 className="font-black text-xs uppercase mb-2">Instalación Estimada</h5>
                                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Sujeto a disponibilidad. Tiempo estimado: 24 a 48 hrs después del anticipo.</p>
                            </div>
                        </div>
                        
                        {quoteDesign.footerNotes && (
                            <div className="p-8 bg-slate-100/50 rounded-[2.5rem] text-[10px] font-medium text-slate-500 leading-relaxed">
                                <p className="font-black uppercase tracking-widest mb-2">Notas y Términos Adicionales:</p>
                                {quoteDesign.footerNotes}
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Approval */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 sticky top-12">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Aprobación</h3>
                            
                            {accepted || quote.status === 'Aceptada' || quote.status === 'Ejecutada' ? (
                                <div className="text-center py-10 animate-in zoom-in">
                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 uppercase">Propuesta Aceptada</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Un asesor te contactará para agendar.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-8">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Condiciones comerciales</p>
                                        <div className="flex items-center gap-3 text-slate-700 font-bold text-sm">
                                            <Zap size={16} style={{ color: quoteDesign.primaryColor }}/>
                                            {quote.payment_terms}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleAccept}
                                        disabled={isAccepting}
                                        className="w-full py-5 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-3"
                                        style={{ backgroundColor: quoteDesign.primaryColor }}
                                    >
                                        {isAccepting ? <Loader2 className="animate-spin" size={20}/> : <ShieldCheck size={20}/>}
                                        Aceptar y Confirmar
                                    </button>
                                    
                                    <p className="text-[9px] text-slate-400 font-medium text-center mt-6 uppercase leading-relaxed">
                                        Al hacer clic, confirmas que has leído y aceptas los términos técnicos de esta propuesta.
                                    </p>
                                </>
                            )}

                            <div className="mt-10 pt-8 border-t border-slate-100 space-y-4">
                                <button onClick={() => window.print()} className="w-full py-4 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <Printer size={16}/> Imprimir Copia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center pt-10 opacity-30 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                    SuperAir de México • Soluciones en Climatización Industrial
                </div>
            </div>
        </div>
    );
};

export default PublicQuoteView;

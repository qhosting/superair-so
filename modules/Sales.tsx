
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Inbox, FileText, CheckCircle, X, Receipt, Link as LinkIcon, 
  Loader2, Filter, Search, Calendar, DollarSign, Wallet, CreditCard,
  AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Camera,
  Clock, ArrowUpRight, CheckCircle2, MoreVertical, Smartphone, FileSpreadsheet
} from 'lucide-react';
import { Order, FiscalData } from '../types';
import { exportToExcel } from '../utils/exportHelper';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const Sales: React.FC = () => {
  const { showToast } = useNotification();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals State
  const [showFiscalVault, setShowFiscalVault] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [vaultItems, setVaultItems] = useState<FiscalData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Logic State
  const [isLinking, setIsLinking] = useState(false);
  const [isReminding, setIsReminding] = useState<string | number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [isPaying, setIsPaying] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
    } catch (e) { showToast('Error cargando ventas', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const sendReminder = async (order: Order) => {
      setIsReminding(order.id);
      try {
          const res = await fetch(`/api/orders/${order.id}/remind`, { method: 'POST' });
          if (res.ok) showToast(`WhatsApp enviado a ${order.clientName}`);
      } catch (e) { showToast('Error al enviar WhatsApp', 'error'); }
      finally { setIsReminding(null); }
  };

  const handleRegisterPayment = async () => {
      if (!selectedOrder || !paymentAmount) return;
      setIsPaying(true);
      try {
          const res = await fetch('/api/orders/pay', {
              method: 'POST',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ orderId: selectedOrder.id, amount: parseFloat(paymentAmount), method: paymentMethod })
          });
          if(res.ok) {
              showToast(`Abono registrado con éxito`);
              setShowPaymentModal(false);
              fetchOrders();
          }
      } catch(e) { showToast('Error de conexión', 'error'); }
      finally { setIsPaying(false); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
             <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Centro de Cobranza & Utilidad</h2>
                <p className="text-slate-500 text-sm font-medium">Control financiero Tier-1: Rentabilidad, Vencimientos y Cash Flow.</p>
             </div>
             <div className="flex gap-3">
                 <button
                     onClick={() => exportToExcel(orders, 'Ventas_SuperAir')}
                     className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 border border-emerald-100"
                     title="Exportar Excel"
                 >
                    <FileSpreadsheet size={18} />
                 </button>
                 <button onClick={() => setShowFiscalVault(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20">
                    <Inbox size={18} /> Bóveda Fiscal
                 </button>
             </div>
          </div>

          {/* Quick Metrics Rentabilidad */}
          {user?.role === 'Super Admin' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white">
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Cuentas por Cobrar</p>
                    <h4 className="text-2xl font-black">{formatCurrency(orders.reduce((acc, o) => acc + (Number(o.total) - Number(o.paidAmount)), 0))}</h4>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margen Promedio</p>
                    <h4 className="text-2xl font-black text-emerald-600">
                        {(orders.reduce((acc, o) => acc + (o.profitMargin || 0), 0) / (orders.length || 1)).toFixed(1)}%
                    </h4>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ventas Vencidas</p>
                    <h4 className="text-2xl font-black text-rose-600">{orders.filter(o => o.isOverdue).length}</h4>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comisiones x Pagar</p>
                    <h4 className="text-2xl font-black text-indigo-600">{formatCurrency(orders.reduce((acc, o) => acc + (o.commission || 0), 0))}</h4>
                </div>
            </div>
          )}

          <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden p-10">
              {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={40}/></div> : (
                  <table className="w-full text-left">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                          <tr>
                              <th className="pb-6">Expediente</th>
                              <th className="pb-6">Vencimiento / Antigüedad</th>
                              <th className="pb-6">Finanzas (Venta)</th>
                              {user?.role === 'Super Admin' && <th className="pb-6">Utilidad</th>}
                              <th className="pb-6">Estatus</th>
                              <th className="pb-6 text-right">Cobranza</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {orders.map(order => {
                              const percentPaid = Math.min((Number(order.paidAmount) / Number(order.total)) * 100, 100);
                              return (
                              <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${order.isOverdue ? 'bg-rose-50/30' : ''}`}>
                                  <td className="py-6">
                                      <div className="font-black text-slate-900 text-sm">#{order.id} - {order.clientName}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                          {order.evidenceUrl ? (
                                              <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1"><CheckCircle size={12}/> Evidencia OK</span>
                                          ) : (
                                              <button onClick={() => { setSelectedOrder(order); setShowEvidenceModal(true); }} className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 hover:underline"><Camera size={12}/> Subir Entrega</button>
                                          )}
                                      </div>
                                  </td>
                                  <td className="py-6">
                                      <div className={`text-[11px] font-black uppercase ${order.isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                                          {order.isOverdue ? `Vencido hace ${Math.floor((new Date().getTime() - new Date(order.dueDate).getTime()) / (1000 * 60 * 60 * 24))} días` : `Vence: ${new Date(order.dueDate).toLocaleDateString()}`}
                                      </div>
                                      <div className="text-[9px] text-slate-300 font-bold uppercase mt-0.5">{order.paymentTerms}</div>
                                  </td>
                                  <td className="py-6">
                                      <div className="font-black text-slate-900">{formatCurrency(order.total)}</div>
                                      <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden mt-1.5">
                                          <div className={`h-full ${percentPaid === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{width: `${percentPaid}%`}} />
                                      </div>
                                  </td>
                                  {user?.role === 'Super Admin' && (
                                      <td className="py-6">
                                          <div className="flex items-center gap-2">
                                              {order.profitMargin > 25 ? <TrendingUp size={14} className="text-emerald-500"/> : <TrendingDown size={14} className="text-amber-500"/>}
                                              <span className={`text-xs font-black ${order.profitMargin > 25 ? 'text-emerald-600' : 'text-amber-600'}`}>{order.profitMargin.toFixed(1)}%</span>
                                          </div>
                                          <div className="text-[8px] text-slate-400 font-bold uppercase">Costo: {formatCurrency(Number(order.cost_total))}</div>
                                      </td>
                                  )}
                                  <td className="py-6">
                                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${order.status === 'Completado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                          {order.status}
                                      </span>
                                  </td>
                                  <td className="py-6 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                              onClick={() => sendReminder(order)}
                                              disabled={isReminding === order.id}
                                              className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-50"
                                              title="Enviar Recordatorio WhatsApp"
                                          >
                                              {isReminding === order.id ? <Loader2 className="animate-spin" size={18}/> : <MessageSquare size={18} />}
                                          </button>
                                          <button 
                                              onClick={() => { setSelectedOrder(order); setShowPaymentModal(true); }}
                                              className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-sky-600 transition-all"
                                              title="Cobrar / Abonar"
                                          >
                                              <DollarSign size={18} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          )})}
                      </tbody>
                  </table>
              )}
          </div>

          {/* MODAL EVIDENCIA TÉCNICA */}
          {showEvidenceModal && selectedOrder && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                  <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                      <div className="flex justify-between items-center mb-8">
                          <h3 className="text-2xl font-black text-slate-900 uppercase">Cierre Técnico</h3>
                          <button onClick={() => setShowEvidenceModal(false)}><X className="text-slate-400" /></button>
                      </div>
                      <div className="space-y-6">
                          <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl">
                              <p className="text-xs font-bold text-amber-700 leading-relaxed uppercase tracking-wide">Para cerrar administrativamente la orden #{selectedOrder.id}, es obligatorio adjuntar evidencia de la instalación concluida.</p>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subir Evidencia (Foto/PDF)</label>
                              <div className="relative">
                                  <input
                                    type="file"
                                    className="w-full p-4 bg-slate-50 border rounded-2xl text-xs"
                                    onChange={e => setEvidenceFile(e.target.files?.[0] || null)}
                                  />
                                  {evidenceFile && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-black flex items-center gap-1"><CheckCircle2 size={12}/> Listo</span>}
                              </div>
                              <p className="text-[9px] text-slate-400 text-center font-medium mt-2">O pega una URL externa si prefieres:</p>
                              <input 
                                className="w-full p-3 bg-slate-50 border rounded-xl font-mono text-[10px] mt-1"
                                placeholder="https://..."
                                value={evidenceUrl}
                                onChange={e => setEvidenceUrl(e.target.value)}
                              />
                          </div>
                          <button 
                            onClick={async () => {
                                let finalUrl = evidenceUrl;
                                if (evidenceFile) {
                                    const formData = new FormData();
                                    formData.append('file', evidenceFile);
                                    const token = localStorage.getItem('superair_token');
                                    const uploadRes = await fetch('/api/upload', {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }, // Add Auth token
                                        body: formData
                                    });
                                    if (uploadRes.ok) {
                                        const data = await uploadRes.json();
                                        finalUrl = data.url;
                                    } else {
                                        showToast("Error subiendo archivo", "error");
                                        return;
                                    }
                                }

                                if (!finalUrl) {
                                    showToast("Debes subir archivo o URL", "error");
                                    return;
                                }

                                const token = localStorage.getItem('superair_token');
                                const res = await fetch(`/api/orders/${selectedOrder.id}/close-technical`, {
                                    method:'POST',
                                    headers: {
                                        'Content-Type':'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({evidenceUrl: finalUrl})
                                });
                                if(res.ok) { setShowEvidenceModal(false); fetchOrders(); }
                            }}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl"
                          >
                            Validar Cierre Operativo
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* PAYMENT REGISTRATION MODAL */}
          {showPaymentModal && selectedOrder && (
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                    <div className="flex justify-between items-center mb-6 text-center md:text-left">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase">Abono Directo</h3>
                            <p className="text-xs text-slate-500 font-medium">Orden #{selectedOrder.id} • Restante: <span className="text-rose-500 font-bold">{formatCurrency(Number(selectedOrder.total) - Number(selectedOrder.paidAmount))}</span></p>
                        </div>
                        <button onClick={() => setShowPaymentModal(false)}><X className="text-slate-400" /></button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto a Recibir (MXN)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={24} />
                                <input 
                                    type="number" 
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full pl-12 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-black text-2xl text-emerald-600 shadow-inner"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medio de Recepción</label>
                            <select 
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700"
                            >
                                <option>Transferencia SPEI</option>
                                <option>Efectivo (Caja Chica)</option>
                                <option>TPV (Tarjeta)</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleRegisterPayment}
                            disabled={!paymentAmount || isPaying}
                            className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 mt-4"
                        >
                            {isPaying ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                            Confirmar Cobranza
                        </button>
                    </div>
                </div>
             </div>
          )}
      </div>
  );
};

export default Sales;


import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Inbox, FileText, CheckCircle, X, Receipt, Link as LinkIcon, 
  Loader2, Filter, Search, Calendar, DollarSign, Wallet, CreditCard
} from 'lucide-react';
import { Order, FiscalData } from '../types';
import { useNotification } from '../context/NotificationContext';

const Sales: React.FC = () => {
  const { showToast } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals State
  const [showFiscalVault, setShowFiscalVault] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [vaultItems, setVaultItems] = useState<FiscalData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Logic State
  const [isLinking, setIsLinking] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [isPaying, setIsPaying] = useState(false);

  // Fetch Orders
  const fetchOrders = async () => {
    setLoading(true);
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  // Fetch Fiscal Inbox
  useEffect(() => {
      if (showFiscalVault) {
          fetch('/api/fiscal/inbox')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setVaultItems(data);
            })
            .catch(e => console.error("Error fetching inbox", e));
      }
  }, [showFiscalVault]);

  const manualLinkInvoice = async (fiscalItem: FiscalData) => {
    if (!selectedOrder) return;
    setIsLinking(true);
    
    try {
        const res = await fetch(`/api/orders/${selectedOrder.id}/link-fiscal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fiscalUuid: fiscalItem.uuid })
        });

        const data = await res.json();

        if (res.ok) {
            showToast('Factura vinculada correctamente');
            setVaultItems(vaultItems.filter(v => v.uuid !== fiscalItem.uuid));
            fetchOrders();
            setShowFiscalVault(false);
        } else {
            showToast(data.error || 'Error al vincular', 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    } finally {
        setIsLinking(false);
    }
  };

  const handleRegisterPayment = async () => {
      if (!selectedOrder || !paymentAmount) return;
      setIsPaying(true);
      try {
          const res = await fetch('/api/orders/pay', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ 
                  orderId: selectedOrder.id, 
                  amount: parseFloat(paymentAmount), 
                  method: paymentMethod 
              })
          });
          
          if(res.ok) {
              const data = await res.json();
              showToast(`Pago de $${paymentAmount} registrado. Nuevo saldo: ${data.status}`);
              setShowPaymentModal(false);
              setPaymentAmount('');
              fetchOrders();
          } else {
              showToast('Error al registrar pago', 'error');
          }
      } catch(e) {
          showToast('Error de conexión', 'error');
      } finally {
          setIsPaying(false);
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
      <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ventas y Órdenes</h2>
                <p className="text-slate-500 text-sm font-medium">Gestión de pedidos y facturación.</p>
             </div>
             <button 
                onClick={() => setShowFiscalVault(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20"
             >
                <Inbox size={18} /> Bóveda Fiscal
             </button>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
              {loading ? <Loader2 className="animate-spin mx-auto text-indigo-600" /> : (
                  <table className="w-full text-left">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                              <th className="pb-4">Orden</th>
                              <th className="pb-4">Cliente</th>
                              <th className="pb-4">Total (MXN)</th>
                              <th className="pb-4">Pagado</th>
                              <th className="pb-4">Estado</th>
                              <th className="pb-4">CFDI</th>
                              <th className="pb-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {orders.map(order => {
                              const percentPaid = Math.min((Number(order.paidAmount) / Number(order.total)) * 100, 100);
                              return (
                              <tr key={order.id} className="hover:bg-slate-50">
                                  <td className="py-4 font-bold text-slate-700">#{order.id}</td>
                                  <td className="py-4 font-bold text-slate-900">{order.clientName}</td>
                                  <td className="py-4 font-bold text-slate-900">{formatCurrency(order.total)}</td>
                                  <td className="py-4 w-32">
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1">
                                          <div className={`h-full ${percentPaid === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${percentPaid}%`}} />
                                      </div>
                                      <span className="text-[9px] font-bold text-slate-500">{formatCurrency(Number(order.paidAmount))}</span>
                                  </td>
                                  <td className="py-4">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'Completado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                          {order.status}
                                      </span>
                                  </td>
                                  <td className="py-4">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.cfdiStatus === 'Timbrado' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                          {order.cfdiStatus}
                                      </span>
                                  </td>
                                  <td className="py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                        {Number(order.paidAmount) < Number(order.total) && (
                                            <button 
                                                onClick={() => { setSelectedOrder(order); setShowPaymentModal(true); }}
                                                className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                                                title="Registrar Pago"
                                            >
                                                <DollarSign size={16} />
                                            </button>
                                        )}
                                        {order.cfdiStatus !== 'Timbrado' && (
                                            <button 
                                                onClick={() => { setSelectedOrder(order); setShowFiscalVault(true); }}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg"
                                            >
                                                Vincular
                                            </button>
                                        )}
                                        {order.fiscalData?.pdfUrl && (
                                            <a href={order.fiscalData.pdfUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:text-rose-600">
                                                <FileText size={16} />
                                            </a>
                                        )}
                                      </div>
                                  </td>
                              </tr>
                          )})}
                      </tbody>
                  </table>
              )}
          </div>

          {/* PAYMENT REGISTRATION MODAL */}
          {showPaymentModal && selectedOrder && (
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase">Registrar Pago</h3>
                            <p className="text-xs text-slate-500 font-medium">Orden #{selectedOrder.id} • Restante: <span className="text-rose-500 font-bold">{formatCurrency(Number(selectedOrder.total) - Number(selectedOrder.paidAmount))}</span></p>
                        </div>
                        <button onClick={() => setShowPaymentModal(false)}><X className="text-slate-400" /></button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto a Abonar (MXN)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={18} />
                                <input 
                                    type="number" 
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg text-emerald-600"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                            <select 
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700"
                            >
                                <option>Transferencia</option>
                                <option>Efectivo</option>
                                <option>Tarjeta Crédito/Débito</option>
                                <option>Cheque</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleRegisterPayment}
                            disabled={!paymentAmount || isPaying}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 mt-4"
                        >
                            {isPaying ? <Loader2 className="animate-spin" size={16}/> : <Wallet size={16}/>}
                            Confirmar Abono
                        </button>
                    </div>
                </div>
             </div>
          )}

          {/* FISCAL VAULT MODAL (Existing logic kept) */}
          {showFiscalVault && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <Inbox size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Bóveda Fiscal Digital</h3>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Facturas recibidas por n8n (Sin Asignar)</p>
                            </div>
                        </div>
                        <button onClick={() => setShowFiscalVault(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20}/></button>
                    </div>
                    
                    <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                        {vaultItems.length === 0 ? (
                            <div className="text-center py-10">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <p className="text-slate-400 font-bold text-sm">Bóveda Limpia</p>
                                <p className="text-xs text-slate-300 mt-1">Esperando webhooks de N8N...</p>
                            </div>
                        ) : (
                            vaultItems.map((item) => (
                                <div key={item.uuid} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Emisor (Proveedor)</p>
                                            <h4 className="font-black text-slate-800">{item.rfc}</h4>
                                            <p className="text-xs text-slate-500 font-medium">{item.legalName || 'Razón Social Desconocida'}</p>
                                            {item.originEmail && <p className="text-[10px] text-indigo-400 mt-1">📩 {item.originEmail}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-indigo-600">{formatCurrency(Number(item.amount || 0))}</p>
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase">
                                                {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'Hoy'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedOrder ? (
                                            <button 
                                                onClick={() => manualLinkInvoice(item)}
                                                disabled={isLinking}
                                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-70"
                                            >
                                                {isLinking ? <Loader2 className="animate-spin" size={12} /> : <LinkIcon size={12} />} 
                                                Vincular a Orden #{selectedOrder.id}
                                            </button>
                                        ) : (
                                            <p className="text-[9px] text-amber-500 font-bold bg-amber-50 px-3 py-2 rounded-lg flex-1 text-center">
                                                Selecciona una orden de la lista primero
                                            </p>
                                        )}
                                        {item.pdfUrl && (
                                            <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase hover:bg-slate-200 flex items-center gap-2">
                                                <FileText size={12}/> PDF
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
          )}
      </div>
  );
};

export default Sales;

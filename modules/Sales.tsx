import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, CheckCircle, Clock, Truck, DollarSign, Search, Filter, 
  Plus, MoreHorizontal, ChevronRight, FileCheck, CreditCard, Receipt, 
  AlertCircle, X, Calendar, User, ArrowDownCircle, TrendingDown, Printer, 
  Share2, Camera, History, MapPin, Navigation, Phone, MessageSquare, 
  ArrowUpRight, ShieldCheck, Zap, Download, Eye, Info, FileText, FileCode, 
  RefreshCw, Link as LinkIcon, Paperclip, Inbox, Loader2, Send
} from 'lucide-react';
import { Order, FiscalData } from '../types';
import { useNotification } from '../context/NotificationContext';

const N8N_INBOX_MOCK: FiscalData[] = [
  { uuid: 'E45A-1234-5678-90AB', rfc: 'HQU180512AB3', legalName: 'HOTEL QUERETARO SA DE CV', issuedAt: '2024-06-03 10:30', originEmail: 'facturacion@proveedor.com', xmlUrl: '#', pdfUrl: '#' }
];

const Sales: React.FC = () => {
  const { showToast } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFiscalVault, setShowFiscalVault] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [vaultItems, setVaultItems] = useState<FiscalData[]>(N8N_INBOX_MOCK);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateOrder = async (updatedOrder: Order) => {
      try {
          await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  id: updatedOrder.id,
                  paidAmount: updatedOrder.paidAmount,
                  status: updatedOrder.status,
                  cfdiStatus: updatedOrder.cfdiStatus,
                  fiscalData: updatedOrder.fiscalData
              })
          });
          // Update local state
          setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          setSelectedOrder(updatedOrder);
          showToast('Orden actualizada correctamente');
      } catch (e) {
          showToast('Error actualizando la orden', 'error');
      }
  };

  const notifyClient = async (channel: 'whatsapp' | 'chatwoot') => {
      if (!selectedOrder) return;
      setSendingMsg(true);
      try {
          const res = await fetch('/api/notify/external', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  channel,
                  recipient: '524423325814', // En prod usar el del cliente
                  name: selectedOrder.clientName,
                  message: `Hola ${selectedOrder.clientName}, tu orden #${selectedOrder.id} ha sido actualizada. Estado: ${selectedOrder.status}.`
              })
          });
          
          if(res.ok) {
              showToast(`Notificación enviada por ${channel}`, 'success');
          } else {
              throw new Error("Failed");
          }
      } catch (e) {
          showToast(`Error al notificar por ${channel}`, 'error');
      } finally {
          setSendingMsg(false);
      }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toString().includes(searchTerm));
  }, [orders, searchTerm]);

  const stats = {
    totalCollected: orders.reduce((acc, o) => acc + Number(o.paidAmount || 0), 0),
    pendingCollection: orders.reduce((acc, o) => acc + (Number(o.total || 0) - Number(o.paidAmount || 0)), 0),
    activeInstalls: orders.filter(o => o.status === 'Instalando').length,
    pendingInvoices: orders.filter(o => o.cfdiStatus === 'Pendiente' && Number(o.paidAmount) > 0).length
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleRegisterPayment = async () => {
    if (!selectedOrder || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    const updatedOrder = { 
      ...selectedOrder, 
      paidAmount: Math.min(Number(selectedOrder.total), Number(selectedOrder.paidAmount) + amount) 
    };
    
    await updateOrder(updatedOrder);
    setShowPaymentModal(false);
    setPaymentAmount('');
  };

  const manualLinkInvoice = async (fiscalItem: FiscalData) => {
    if (!selectedOrder) return;
    const updatedOrder: Order = {
        ...selectedOrder,
        cfdiStatus: 'Timbrado',
        fiscalData: fiscalItem
    };
    await updateOrder(updatedOrder);
    setVaultItems(vaultItems.filter(v => v.uuid !== fiscalItem.uuid));
    setShowFiscalVault(false);
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48}/></div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Financial KPIs - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Recaudado', value: formatCurrency(stats.totalCollected), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Cuentas x Cobrar', value: formatCurrency(stats.pendingCollection), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Instalaciones', value: stats.activeInstalls, icon: Truck, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Pendiente Facturar', value: stats.pendingInvoices, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 ${card.bg} ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon size={16} />
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
            </div>
            <h3 className="text-lg font-black text-slate-900">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Ventas y Órdenes</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Gestión de flujo y facturación n8n</p>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={() => setShowFiscalVault(true)}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
             >
                <Inbox size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Bóveda ({vaultItems.length})</span>
             </button>
             <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500 transition-all w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {orders.length === 0 ? (
              <div className="text-center p-10 text-slate-400">No hay órdenes registradas.</div>
          ) : (
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <tr>
                    <th className="px-6 py-4">Folio</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Monto</th>
                    <th className="px-6 py-4">Saldo</th>
                    <th className="px-6 py-4">Fiscal (CFDI)</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((order) => {
                    const balance = Number(order.total) - Number(order.paidAmount);
                    return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedOrder(order)}>
                        <td className="px-6 py-4 font-black text-sky-600">#{order.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{order.clientName}</td>
                        <td className="px-6 py-4 font-black">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-4">
                        <span className={`font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {balance === 0 ? 'Liquidada' : formatCurrency(balance)}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                            {order.cfdiStatus === 'Timbrado' ? (
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                                    <FileCheck size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">XML OK</span>
                                </div>
                            ) : order.paidAmount > 0 ? (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit">
                                    <Clock size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Pendiente</span>
                                </div>
                            ) : (
                                <span className="text-slate-300">-</span>
                            )}
                        </td>
                        <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                            order.status === 'Completado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                        }`}>
                            {order.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-slate-300 hover:text-sky-600"><ChevronRight size={18} /></button>
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Modal with Notification Options */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Registrar Cobro</h3>
                 <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="p-6 bg-slate-50 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                    <h4 className="text-2xl font-black text-rose-600">{formatCurrency(selectedOrder.total - selectedOrder.paidAmount)}</h4>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto a Registrar</label>
                    <div className="relative">
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                        type="number" 
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-lg"
                       />
                    </div>
                 </div>
                 
                 {/* Notification Buttons */}
                 <div className="flex gap-2">
                    <button 
                        onClick={() => notifyClient('whatsapp')}
                        disabled={sendingMsg}
                        className="flex-1 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-100 flex items-center justify-center gap-2"
                    >
                        {sendingMsg ? <Loader2 size={14} className="animate-spin"/> : <MessageSquare size={14}/>} Notificar WA
                    </button>
                    <button 
                        onClick={() => notifyClient('chatwoot')}
                        disabled={sendingMsg}
                        className="flex-1 py-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-100 flex items-center justify-center gap-2"
                    >
                        {sendingMsg ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} Notificar CW
                    </button>
                 </div>
              </div>
              <div className="p-8 border-t border-slate-100 flex gap-3 bg-slate-50/50">
                 <button 
                  onClick={handleRegisterPayment}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20"
                 >Confirmar Pago</button>
              </div>
           </div>
        </div>
      )}

      {/* FISCAL VAULT MODAL (Same as before) */}
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
                            <p className="text-xs text-slate-300 mt-1">Todas las facturas han sido asignadas.</p>
                        </div>
                    ) : (
                        vaultItems.map((item) => (
                            <div key={item.uuid} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">RFC Emisor / Receptor</p>
                                        <h4 className="font-black text-slate-800">{item.rfc}</h4>
                                        <p className="text-xs text-slate-500 font-medium">{item.legalName}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase">Recibido {item.issuedAt?.split(' ')[1]}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-4">
                                    <Receipt size={12} /> UUID: {item.uuid}
                                </div>
                                <div className="flex gap-2">
                                    {selectedOrder && (
                                        <button 
                                            onClick={() => manualLinkInvoice(item)}
                                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                        >
                                            <LinkIcon size={12} /> Vincular a Orden Actual
                                        </button>
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
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Inbox, FileText, CheckCircle, X, Receipt, Link as LinkIcon, 
  Loader2, Filter, Search, Calendar, DollarSign
} from 'lucide-react';
import { Order, FiscalData } from '../types';
import { useNotification } from '../context/NotificationContext';

const Sales: React.FC = () => {
  const { showToast } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiscalVault, setShowFiscalVault] = useState(false);
  const [vaultItems, setVaultItems] = useState<FiscalData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch Orders
  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const updateOrder = async (order: Order) => {
    // Mock update locally
    setOrders(orders.map(o => o.id === order.id ? order : o));
    showToast('Orden actualizada');
  };

  const manualLinkInvoice = async (fiscalItem: FiscalData) => {
    if (!selectedOrder) return;
    
    // Update order with fiscal data
    const updatedOrder: Order = {
        ...selectedOrder,
        cfdiStatus: 'Timbrado',
        fiscalData: fiscalItem
    };
    await updateOrder(updatedOrder);
    
    // In a real scenario, we should also call an API to update the fiscal_inbox status
    setVaultItems(vaultItems.filter(v => v.uuid !== fiscalItem.uuid));
    setShowFiscalVault(false);
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
                              <th className="pb-4">Total</th>
                              <th className="pb-4">Pago</th>
                              <th className="pb-4">CFDI</th>
                              <th className="pb-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {orders.map(order => (
                              <tr key={order.id} className="hover:bg-slate-50">
                                  <td className="py-4 font-bold text-slate-700">#{order.id}</td>
                                  <td className="py-4 font-bold text-slate-900">{order.clientName}</td>
                                  <td className="py-4 font-bold text-slate-900">{formatCurrency(order.total)}</td>
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
                                      <button 
                                          onClick={() => { setSelectedOrder(order); setShowFiscalVault(true); }}
                                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                      >
                                          Vincular
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}
          </div>

          {/* FISCAL VAULT MODAL */}
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
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">RFC Receptor</p>
                                            <h4 className="font-black text-slate-800">{item.rfc}</h4>
                                            <p className="text-xs text-slate-500 font-medium">{item.legalName || 'Razón Social Desconocida'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-indigo-600">{formatCurrency(Number(item.amount || 0))}</p>
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase">
                                                {item.issuedAt ? new Date(item.issuedAt).toLocaleDateString() : 'Hoy'}
                                            </span>
                                        </div>
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
                                                <LinkIcon size={12} /> Vincular a Orden #{selectedOrder.id}
                                            </button>
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
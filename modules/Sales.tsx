
import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  CheckCircle, 
  Clock, 
  Truck, 
  DollarSign, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  ChevronRight,
  FileCheck,
  CreditCard,
  Receipt,
  AlertCircle,
  X,
  Calendar,
  User,
  ArrowDownCircle,
  TrendingDown,
  Printer,
  Share2,
  Camera,
  History,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Download,
  Eye,
  Info,
  FileText,
  FileCode,
  RefreshCw,
  Link as LinkIcon,
  Paperclip,
  Inbox
} from 'lucide-react';
import { Order, FiscalData } from '../types';

// Mock Data for the Vault (Invoices captured by n8n but not yet linked)
const N8N_INBOX_MOCK: FiscalData[] = [
  { uuid: 'E45A-1234-5678-90AB', rfc: 'HQU180512AB3', legalName: 'HOTEL QUERETARO SA DE CV', issuedAt: '2024-06-03 10:30', originEmail: 'facturacion@proveedor.com', xmlUrl: '#', pdfUrl: '#' },
  { uuid: 'B221-9988-7766-5544', rfc: 'XAXX010101000', legalName: 'VENTAS PUBLICO GENERAL', issuedAt: '2024-06-04 14:15', originEmail: 'pagos@superair.com.mx', xmlUrl: '#', pdfUrl: '#' }
];

const Sales: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFiscalVault, setShowFiscalVault] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // State for Orders
  const [orders, setOrders] = useState<Order[]>([
    { 
      id: 'ORD-1004', 
      quoteId: 'COT-2024-012', 
      clientName: 'Hotel Querétaro', 
      total: 245000, 
      paidAmount: 122500, 
      status: 'Instalando', 
      installationDate: '2024-06-02',
      cfdiStatus: 'Pendiente'
    },
    { 
      id: 'ORD-1001', 
      quoteId: 'COT-2024-002', 
      clientName: 'Corporativo Nexus', 
      total: 82000, 
      paidAmount: 41000, 
      status: 'Instalando', 
      installationDate: '2024-05-20',
      cfdiStatus: 'Pendiente'
    },
    { 
      id: 'ORD-1002', 
      quoteId: 'COT-2024-005', 
      clientName: 'Ana Martínez', 
      total: 12500, 
      paidAmount: 12500, 
      status: 'Completado', 
      installationDate: '2024-05-15',
      cfdiStatus: 'Timbrado',
      fiscalData: {
        uuid: 'A1B2-C3D4-E5F6-7890',
        rfc: 'MATA880120H25',
        legalName: 'ANA MARTINEZ LOPEZ',
        issuedAt: '2024-05-15 16:20',
        originEmail: 'ana.m@gmail.com'
      }
    },
    { 
      id: 'ORD-1003', 
      quoteId: 'COT-2024-009', 
      clientName: 'Residencial Lomas', 
      total: 14500, 
      paidAmount: 7250, 
      status: 'Pendiente', 
      installationDate: '2024-05-25',
      cfdiStatus: 'Pendiente'
    },
  ]);

  const [vaultItems, setVaultItems] = useState<FiscalData[]>(N8N_INBOX_MOCK);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [orders, searchTerm]);

  const stats = {
    totalCollected: orders.reduce((acc, o) => acc + o.paidAmount, 0),
    pendingCollection: orders.reduce((acc, o) => acc + (o.total - o.paidAmount), 0),
    activeInstalls: orders.filter(o => o.status === 'Instalando').length,
    pendingInvoices: orders.filter(o => o.cfdiStatus === 'Pendiente' && o.paidAmount > 0).length
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  const handleRegisterPayment = () => {
    if (!selectedOrder || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    const updatedOrder = { 
      ...selectedOrder, 
      paidAmount: Math.min(selectedOrder.total, selectedOrder.paidAmount + amount) 
    };
    
    setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    setShowPaymentModal(false);
    setPaymentAmount('');
  };

  const simulateN8nSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      // Simulate finding a match for ORD-1004 (Hotel Queretaro) from the Vault
      const targetOrderId = 'ORD-1004';
      const vaultMatchIndex = vaultItems.findIndex(v => v.rfc === 'HQU180512AB3'); // Matching based on logic

      if (vaultMatchIndex > -1) {
        const fiscalData = vaultItems[vaultMatchIndex];
        
        // Update Orders
        const newOrders = orders.map(o => {
          if (o.id === targetOrderId) {
            return { ...o, cfdiStatus: 'Timbrado' as const, fiscalData };
          }
          return o;
        });
        setOrders(newOrders);
        
        // Remove from Vault
        const newVault = [...vaultItems];
        newVault.splice(vaultMatchIndex, 1);
        setVaultItems(newVault);

        // If currently viewing that order, update it
        if (selectedOrder && selectedOrder.id === targetOrderId) {
            setSelectedOrder({ ...selectedOrder, cfdiStatus: 'Timbrado', fiscalData });
        }
        
        alert(`¡n8n encontró una coincidencia! Factura asignada automáticamente a ${targetOrderId} basada en el RFC.`);
      } else {
        alert('Sincronización completada. No se encontraron nuevas facturas coincidentes en el correo.');
      }
      setIsSyncing(false);
    }, 2000);
  };

  const manualLinkInvoice = (fiscalItem: FiscalData) => {
    if (!selectedOrder) return;
    
    const updatedOrder: Order = {
        ...selectedOrder,
        cfdiStatus: 'Timbrado',
        fiscalData: fiscalItem
    };

    setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    
    // Remove from vault
    setVaultItems(vaultItems.filter(v => v.uuid !== fiscalItem.uuid));
    setShowFiscalVault(false);
  };

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
             <button className="p-2 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl"><Filter size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
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
                const balance = order.total - order.paidAmount;
                const percentPaid = (order.paidAmount / order.total) * 100;
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <td className="px-6 py-4 font-black text-sky-600">{order.id}</td>
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
        </div>
      </div>

      {/* FIXED FULL SCREEN ORDER RECORD */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-7xl h-full max-h-[92vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
              
              {/* Header Section */}
              <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                       <FileCheck size={32} />
                    </div>
                    <div className="space-y-1">
                       <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedOrder.id}</h3>
                          <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                            selectedOrder.status === 'Completado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                          }`}>{selectedOrder.status}</span>
                       </div>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <User size={12} className="text-sky-500" /> {selectedOrder.clientName} <span className="text-slate-200">|</span> <Clock size={12}/> 12 May 2024
                       </p>
                    </div>
                 </div>

                 {/* Stepper (Simplified for brevity) */}
                 <div className="hidden lg:flex items-center gap-12 flex-1 justify-center max-w-xl">
                    <div className="flex items-center gap-2 text-slate-900">
                       <CheckCircle size={20} className="text-sky-500"/> <span className="text-[10px] font-black uppercase tracking-widest">Activo</span>
                    </div>
                 </div>

                 <button onClick={() => setSelectedOrder(null)} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400 border border-slate-100">
                   <X size={24} />
                 </button>
              </div>

              {/* Main Content Body */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50">
                 
                 {/* Lateral Column */}
                 <div className="w-full lg:w-[380px] bg-white border-r border-slate-100 overflow-y-auto p-8 space-y-8 custom-scrollbar shrink-0">
                    
                    {/* Estado de Cuenta */}
                    <div className="space-y-4">
                       <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado de Cuenta</h5>
                       <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={60} /></div>
                          <div className="relative z-10">
                             <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-1">Total Proyecto</p>
                             <h4 className="text-3xl font-black mb-6">{formatCurrency(selectedOrder.total)}</h4>
                             <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-bold">
                                   <span className="text-slate-400 uppercase">Pagado</span>
                                   <span className="text-emerald-400">{formatCurrency(selectedOrder.paidAmount)}</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                   <div className="h-full bg-emerald-500" style={{ width: `${(selectedOrder.paidAmount / selectedOrder.total) * 100}%` }} />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* WIDGET: Bóveda Fiscal (CFDI) */}
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                           <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documentos Fiscales</h5>
                           <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[8px] font-bold text-emerald-600 uppercase">n8n Sync</span>
                           </div>
                       </div>
                       
                       {selectedOrder.cfdiStatus === 'Timbrado' && selectedOrder.fiscalData ? (
                           <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl relative overflow-hidden group">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white text-emerald-600 rounded-xl shadow-sm"><FileCheck size={20} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-800 uppercase">Factura Vinculada</p>
                                        <p className="text-[8px] font-bold text-emerald-600 truncate w-32">{selectedOrder.fiscalData.uuid}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all">
                                        <FileText size={12} /> PDF
                                    </button>
                                    <button className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all">
                                        <FileCode size={12} /> XML
                                    </button>
                                </div>
                                <div className="mt-3 text-[8px] text-center text-emerald-500 font-medium">
                                    Recibido el {selectedOrder.fiscalData.issuedAt}
                                </div>
                           </div>
                       ) : (
                           <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center space-y-3">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border border-slate-100">
                                    <Paperclip size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Sin Comprobante Fiscal</p>
                                    <p className="text-[9px] text-slate-400 leading-tight mt-1">Esperando recepción de correo con XML/PDF adjunto.</p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button 
                                        onClick={simulateN8nSync}
                                        disabled={isSyncing}
                                        className="flex-1 py-2 bg-sky-100 text-sky-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-200 flex items-center justify-center gap-1"
                                    >
                                        <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> Sync
                                    </button>
                                    <button 
                                        onClick={() => setShowFiscalVault(true)}
                                        className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50"
                                    >
                                        Vincular
                                    </button>
                                </div>
                           </div>
                       )}
                    </div>
                 </div>

                 {/* Main Details Panel */}
                 <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {/* Items Section */}
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <h5 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                             <Zap size={18} className="text-sky-500" /> Partidas y Equipamiento
                          </h5>
                          <button className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                             <Plus size={12}/> Añadir Insumo
                          </button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { n: 'Mini Split Inverter 18k BTU', s: 'SN-4458-XY', c: 'Unidad AC', p: 18500 },
                            { n: 'Instalación Básica', s: 'SV-01', c: 'Servicio', p: 2500 },
                          ].map((item, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                               <div>
                                  <p className="text-[8px] font-black text-slate-300 uppercase mb-0.5">{item.c}</p>
                                  <h6 className="text-xs font-black text-slate-800">{item.n}</h6>
                                  <p className="text-[9px] font-mono text-slate-400 mt-1 uppercase tracking-widest">S/N: {item.s}</p>
                               </div>
                               <div className="text-right">
                                  <p className="text-xs font-black text-slate-900">{formatCurrency(item.p)}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="px-10 py-6 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 gap-6">
                 <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-800 transition-all">
                       <Printer size={16}/> Imprimir
                    </button>
                 </div>
                 <div className="flex gap-4 flex-1 justify-end">
                    <button 
                      onClick={() => setShowPaymentModal(true)}
                      className="flex items-center gap-2 px-10 py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                    >
                       <CreditCard size={18}/> Registrar Cobro de Liquidación
                    </button>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* Payment Modal */}
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

      {/* FISCAL VAULT MODAL (The Inbox for n8n) */}
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
                                    <button className="px-4 py-2 bg-slate-50 hover:bg-white border border-slate-100 rounded-xl text-[9px] font-black text-slate-500 uppercase flex items-center gap-2">
                                        <Eye size={12} /> Ver XML
                                    </button>
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

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        Webhook n8n Activo
                    </div>
                    <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Configurar Reglas</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

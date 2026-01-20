
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Search, Truck, Loader2, X, Save, 
  CheckCircle2, DollarSign, Package, User, Barcode, ClipboardList,
  AlertCircle, Download, FileText, Calendar, Wallet, ChevronRight, Boxes,
  BrainCircuit, Sparkles, Receipt, Link as LinkIcon, TrendingUp, History
} from 'lucide-react';
import { Vendor, Purchase, Product, Warehouse, FiscalData } from '../types';

const Purchases: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'vendors'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fiscalInbox, setFiscalInbox] = useState<FiscalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showFiscalVault, setShowFiscalVault] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
      vendor_id: '', warehouse_id: '1', status: 'Borrador', items: [] as any[], total: 0, fiscal_uuid: ''
  });

  const [vendorForm, setVendorForm] = useState({
      name: '', rfc: '', email: '', phone: '', credit_days: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
        const [pRes, vRes, prodRes, whRes, fiscRes] = await Promise.all([
            fetch('/api/purchases'), fetch('/api/vendors'), fetch('/api/products'), 
            fetch('/api/warehouses'), fetch('/api/fiscal/inbox')
        ]);
        if (pRes.ok) setPurchases(await pRes.json());
        if (vRes.ok) setVendors(await vRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
        if (whRes.ok) setWarehouses(await whRes.json());
        if (fiscRes.ok) setFiscalInbox(await fiscRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAISuggest = async () => {
      setAiLoading(true);
      try {
          const res = await fetch('/api/purchases/ai-suggest');
          const data = await res.json();
          if (data.suggested_items) {
              const newItems = data.suggested_items.map((si: any) => {
                  const p = products.find(prod => prod.id.toString() === si.product_id.toString());
                  return { product_id: si.product_id, quantity: si.quantity, cost: p?.cost || 0, serials: [] };
              });
              setPurchaseForm({ ...purchaseForm, items: [...purchaseForm.items, ...newItems] });
              alert("La IA ha añadido productos con stock crítico a la orden.");
          }
      } catch (e) { console.error(e); }
      finally { setAiLoading(false); }
  };

  const handleSaveVendor = async () => {
      try {
          const res = await fetch('/api/vendors', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(vendorForm)
          });
          if (res.ok) {
              setShowVendorModal(false);
              fetchData();
              setVendorForm({ name: '', rfc: '', email: '', phone: '', credit_days: 0 });
          }
      } catch (e) { console.error(e); }
  };

  const receivePurchase = async (id: string | number) => {
      if (!confirm("¿Confirmar recepción? Esto afectará stock y costos promedio.")) return;
      setLoading(true);
      try {
          const res = await fetch(`/api/purchases/${id}/receive`, { method: 'POST' });
          if (res.ok) {
              alert("Mercancía recibida. Stock actualizado.");
              fetchData();
          }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ingeniería de Suministros</h2>
          <p className="text-slate-500 text-sm font-medium">Control de adquisiciones, costeo ponderado y cumplimiento fiscal.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
            <button onClick={() => setActiveTab('purchases')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'purchases' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Órdenes de Compra</button>
            <button onClick={() => setActiveTab('vendors')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'vendors' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Proveedores</button>
        </div>
      </div>

      {activeTab === 'purchases' ? (
          <div className="space-y-6">
              <div className="flex justify-end gap-3">
                  <button onClick={handleAISuggest} disabled={aiLoading} className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 border border-indigo-100">
                      {aiLoading ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={16} />} Sugerir Faltantes (IA)
                  </button>
                  <button onClick={() => { setPurchaseForm({ vendor_id:'', warehouse_id:'1', status:'Borrador', items:[], total:0, fiscal_uuid:'' }); setShowPurchaseModal(true); }} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all shadow-xl">
                      <Plus size={18} /> Nueva Compra
                  </button>
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
                  <table className="w-full text-left">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                              <th className="pb-4">Orden</th>
                              <th className="pb-4">Proveedor</th>
                              <th className="pb-4">Monto</th>
                              <th className="pb-4">Vinculación Fiscal</th>
                              <th className="pb-4">Estatus</th>
                              <th className="pb-4 text-right">Acción</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {purchases.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-5 font-black text-slate-400">#{p.id}</td>
                                  <td className="py-5">
                                      <div className="font-bold text-slate-900">{p.vendor_name}</div>
                                      <div className="text-[9px] text-slate-400 uppercase font-black">{p.warehouse_name}</div>
                                  </td>
                                  <td className="py-5 font-black text-slate-900">{formatCurrency(Number(p.total))}</td>
                                  <td className="py-5">
                                      {p.fiscal_uuid ? (
                                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
                                              <Receipt size={14}/> Conciliado
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[10px] uppercase">
                                              <LinkIcon size={14}/> Pendiente
                                          </div>
                                      )}
                                  </td>
                                  <td className="py-5">
                                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${
                                          p.status === 'Recibido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                      }`}>{p.status}</span>
                                  </td>
                                  <td className="py-5 text-right">
                                      {p.status === 'Borrador' && (
                                          <button onClick={() => receivePurchase(p.id)} className="px-4 py-2 bg-sky-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-sky-700 shadow-lg">Confirmar Recepción</button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vendors.map(v => (
                  <div key={v.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                      <div className="flex justify-between items-start mb-6">
                          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg"><Truck size={24}/></div>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${v.status === 'Activo' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{v.status}</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 uppercase mb-1">{v.name}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">{v.rfc || 'Sin RFC'}</p>
                      
                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                          <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Crédito</p>
                              <p className="font-black text-slate-700">{v.credit_days} días</p>
                          </div>
                          <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
                              <p className="font-black text-rose-600">{formatCurrency(Number(v.current_balance || 0))}</p>
                          </div>
                      </div>
                  </div>
              ))}
              <button onClick={() => setShowVendorModal(true)} className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-sky-600 hover:border-sky-300 transition-all bg-slate-50/30 min-h-[250px]">
                  <Plus size={48} />
                  <span className="font-black uppercase text-xs tracking-widest">Añadir Socio Comercial</span>
              </button>
          </div>
      )}

      {/* MODAL PROVEEDOR */}
      {showVendorModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Alta de Proveedor</h3>
                      <button onClick={() => setShowVendorModal(false)}><X className="text-slate-400"/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                          <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={vendorForm.name} onChange={e=>setVendorForm({...vendorForm, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC</label>
                              <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold uppercase" value={vendorForm.rfc} onChange={e=>setVendorForm({...vendorForm, rfc: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Días de Crédito</label>
                              <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={vendorForm.credit_days} onChange={e=>setVendorForm({...vendorForm, credit_days: parseInt(e.target.value)})} />
                          </div>
                      </div>
                      <button onClick={handleSaveVendor} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Guardar Proveedor</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL COMPRA CON CONCILIACIÓN FISCAL */}
      {showPurchaseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase">Orden de Abastecimiento</h3>
                          <div className="flex gap-4 mt-1">
                              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Receipt size={12}/> Control de Cuentas por Pagar</span>
                          </div>
                      </div>
                      <button onClick={() => setShowPurchaseModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl"><X size={24} /></button>
                  </div>
                  
                  <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor Maestro</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={purchaseForm.vendor_id} onChange={e=>setPurchaseForm({...purchaseForm, vendor_id: e.target.value})}>
                                  <option value="">Seleccionar...</option>
                                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Almacén Destino</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={purchaseForm.warehouse_id} onChange={e=>setPurchaseForm({...purchaseForm, warehouse_id: e.target.value})}>
                                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                          </div>
                          <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conciliación con Factura (XML)</label>
                              <div className="flex gap-2">
                                  <select className="flex-1 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl font-bold text-emerald-700" value={purchaseForm.fiscal_uuid} onChange={e=>setPurchaseForm({...purchaseForm, fiscal_uuid: e.target.value})}>
                                      <option value="">No vincular todavía...</option>
                                      {fiscalInbox.map(f => <option key={f.uuid} value={f.uuid}>{f.legalName} - {formatCurrency(f.amount)}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <h4 className="text-sm font-black text-slate-900 uppercase">Partidas de Ingeniería</h4>
                              <button onClick={() => setPurchaseForm({...purchaseForm, items: [...purchaseForm.items, {product_id:'', quantity:1, cost:0, serials:[]}]})} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">+ Agregar Producto</button>
                          </div>
                          <div className="space-y-3">
                              {purchaseForm.items.map((item, idx) => (
                                  <div key={idx} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 grid grid-cols-12 gap-4 items-center">
                                      <div className="col-span-6">
                                          <select value={item.product_id} onChange={e => {
                                              const newItems = [...purchaseForm.items];
                                              const p = products.find(prod => prod.id.toString() === e.target.value);
                                              newItems[idx] = { ...newItems[idx], product_id: e.target.value, cost: p?.cost || 0 };
                                              setPurchaseForm({ ...purchaseForm, items: newItems });
                                          }} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold">
                                              <option value="">Producto...</option>
                                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                          </select>
                                      </div>
                                      <div className="col-span-2">
                                          <input type="number" placeholder="Cant" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center font-black" value={item.quantity} onChange={e => {
                                              const newItems = [...purchaseForm.items];
                                              newItems[idx].quantity = parseInt(e.target.value);
                                              setPurchaseForm({ ...purchaseForm, items: newItems });
                                          }}/>
                                      </div>
                                      <div className="col-span-3">
                                          <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                                              <input type="number" placeholder="Costo" className="w-full pl-7 p-3 bg-white border border-slate-200 rounded-xl font-bold" value={item.cost} onChange={e => {
                                                  const newItems = [...purchaseForm.items];
                                                  newItems[idx].cost = parseFloat(e.target.value);
                                                  setPurchaseForm({ ...purchaseForm, items: newItems });
                                              }}/>
                                          </div>
                                      </div>
                                      <div className="col-span-1 flex justify-end">
                                          <button onClick={() => setPurchaseForm({...purchaseForm, items: purchaseForm.items.filter((_,i)=>i!==idx)})} className="p-2 text-slate-300 hover:text-rose-600"><X size={18}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Inversión</p>
                          <p className="text-3xl font-black text-slate-900">{formatCurrency(purchaseForm.items.reduce((acc,i)=>acc+(Number(i.quantity)*Number(i.cost)), 0))}</p>
                      </div>
                      <button onClick={async () => {
                          const res = await fetch('/api/purchases', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...purchaseForm, total: purchaseForm.items.reduce((acc,i)=>acc+(Number(i.quantity)*Number(i.cost)), 0)}) });
                          if (res.ok) { setShowPurchaseModal(false); fetchData(); }
                      }} className="px-10 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-sky-600/20">Generar Orden</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Purchases;

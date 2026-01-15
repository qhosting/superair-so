
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Search, Truck, Loader2, X, Save, 
  CheckCircle2, DollarSign, Package, User, Barcode, ClipboardList,
  AlertCircle, Download, FileText, Calendar, Wallet, ChevronRight, Boxes
} from 'lucide-react';
import { Vendor, Purchase, Product, Warehouse } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Purchases: React.FC = () => {
  const [activeView, setActiveView] = useState<'purchases' | 'vendors'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
      vendor_id: '',
      warehouse_id: '1',
      status: 'Borrador',
      items: [] as any[],
      total: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
        const [pRes, vRes, prodRes, whRes] = await Promise.all([
            fetch('/api/purchases'),
            fetch('/api/vendors'),
            fetch('/api/products'),
            fetch('/api/warehouses')
        ]);
        if (pRes.ok) setPurchases(await pRes.json());
        if (vRes.ok) setVendors(await vRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
        if (whRes.ok) setWarehouses(await whRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const addPurchaseItem = () => {
      setPurchaseForm({
          ...purchaseForm,
          items: [...purchaseForm.items, { product_id: '', quantity: 1, cost: 0, serials: [] }]
      });
  };

  const updatePurchaseItem = (idx: number, field: string, value: any) => {
      const newItems = [...purchaseForm.items];
      if (field === 'product_id') {
          const prod = products.find(p => p.id.toString() === value.toString());
          newItems[idx] = { ...newItems[idx], product_id: value, requires_serial: prod?.requires_serial || false };
      } else {
          newItems[idx] = { ...newItems[idx], [field]: value };
      }
      const total = newItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.cost)), 0);
      setPurchaseForm({ ...purchaseForm, items: newItems, total });
  };

  const handleSavePurchase = async () => {
      if (!purchaseForm.vendor_id || purchaseForm.items.length === 0) return;
      setLoading(true);
      const res = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseForm)
      });
      if (res.ok) {
          setShowPurchaseModal(false);
          fetchData();
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Compras</h2>
          <p className="text-slate-500 text-sm font-medium">Abastecimiento industrial y recepción en almacenes.</p>
        </div>
        <button 
            onClick={() => { setPurchaseForm({ vendor_id: '', warehouse_id: '1', status: 'Borrador', items: [], total: 0 }); setShowPurchaseModal(true); }}
            className="bg-sky-600 hover:bg-sky-700 text-white rounded-2xl px-8 py-3 flex items-center gap-3 transition-all shadow-xl shadow-sky-600/20 font-black uppercase text-[10px] tracking-widest"
        >
            <Plus size={18} /> Nueva Orden
        </button>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
          {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600"/></div> : (
              <table className="w-full text-left">
                  <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                          <th className="pb-4">Folio</th>
                          <th className="pb-4">Proveedor</th>
                          <th className="pb-4">Destino</th>
                          <th className="pb-4">Total</th>
                          <th className="pb-4">Estado</th>
                          <th className="pb-4 text-right">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {purchases.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="py-4 font-bold text-slate-700">#{p.id}</td>
                              <td className="py-4 font-bold text-slate-900">{p.vendor_name}</td>
                              <td className="py-4 text-[10px] font-black text-slate-500 uppercase"><span className="flex items-center gap-1"><Boxes size={12}/> {p.warehouse_name}</span></td>
                              <td className="py-4 font-black text-slate-900">{formatCurrency(p.total)}</td>
                              <td className="py-4">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${p.status === 'Recibido' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                      {p.status}
                                  </span>
                              </td>
                              <td className="py-4 text-right">
                                  <button className="p-2 text-slate-300 hover:text-sky-600 group-hover:bg-white rounded-xl shadow-sm transition-all"><ChevronRight size={18}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {/* MODAL COMPRA ENHANCED */}
      {showPurchaseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase">Orden de Entrada</h3>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Recepción de Mercancía</p>
                      </div>
                      <button onClick={() => setShowPurchaseModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all"><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                              <select value={purchaseForm.vendor_id} onChange={e => setPurchaseForm({...purchaseForm, vendor_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                                  <option value="">Seleccionar...</option>
                                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Almacén Destino</label>
                              <select value={purchaseForm.warehouse_id} onChange={e => setPurchaseForm({...purchaseForm, warehouse_id: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold">
                                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estatus</label>
                              <select value={purchaseForm.status} onChange={e => setPurchaseForm({...purchaseForm, status: e.target.value as any})} className={`w-full p-4 border rounded-2xl font-black ${purchaseForm.status === 'Recibido' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                  <option value="Borrador">Pendiente</option>
                                  <option value="Recibido">Recibido (Afecta Stock)</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-center px-2"><h4 className="text-sm font-black text-slate-900 uppercase">Partidas de la Orden</h4></div>
                          <div className="space-y-3">
                              {purchaseForm.items.map((item, idx) => (
                                  <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                                      <div className="flex gap-4 items-center">
                                          <select value={item.product_id} onChange={e => updatePurchaseItem(idx, 'product_id', e.target.value)} className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm">
                                              <option value="">Buscar Producto...</option>
                                              {products.map(p => <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>)}
                                          </select>
                                          <input type="number" placeholder="Cant" className="w-24 p-3 bg-white border border-slate-200 rounded-xl text-center font-black" value={item.quantity} onChange={e => updatePurchaseItem(idx, 'quantity', e.target.value)}/>
                                          <input type="number" placeholder="Costo" className="w-32 p-3 bg-white border border-slate-200 rounded-xl font-bold" value={item.cost} onChange={e => updatePurchaseItem(idx, 'cost', e.target.value)}/>
                                          <button onClick={() => setPurchaseForm({...purchaseForm, items: purchaseForm.items.filter((_,i)=>i!==idx)})} className="p-2 text-slate-300 hover:text-rose-500"><X size={18}/></button>
                                      </div>
                                      {item.requires_serial && (
                                          <div className="space-y-2">
                                              <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest ml-1">Números de Serie (Separados por coma o espacio)</label>
                                              <textarea 
                                                className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-[10px] font-mono font-bold h-16" 
                                                placeholder="SN123, SN124, SN125..."
                                                value={item.serials.join(', ')}
                                                onChange={e => updatePurchaseItem(idx, 'serials', e.target.value.split(/[ ,]+/).filter(Boolean))}
                                              />
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                          <button onClick={addPurchaseItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50">+ Agregar Concepto</button>
                      </div>
                  </div>
                  <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                      <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de la Compra</p><p className="text-3xl font-black text-slate-900">{formatCurrency(purchaseForm.total)}</p></div>
                      <button onClick={handleSavePurchase} className="px-10 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-sky-600/20 hover:bg-sky-700 transition-all">Registrar Compra</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Purchases;

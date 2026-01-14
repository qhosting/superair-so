
import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Search, Truck, Loader2, X, Save, 
  CheckCircle2, DollarSign, Package, User, Barcode, ClipboardList,
  AlertCircle
} from 'lucide-react';
import { Vendor, Purchase, Product } from '../types';

const Purchases: React.FC = () => {
  const [activeView, setActiveView] = useState<'purchases' | 'vendors'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);

  // Forms
  const [vendorForm, setVendorForm] = useState<Partial<Vendor>>({ name: '', rfc: '', contact_name: '', phone: '', email: '', credit_days: 0 });
  const [purchaseForm, setPurchaseForm] = useState({
      vendor_id: '',
      status: 'Borrador',
      items: [] as any[],
      total: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [pRes, vRes, prodRes] = await Promise.all([
            fetch('/api/purchases'),
            fetch('/api/vendors'),
            fetch('/api/products')
        ]);
        if (pRes.ok) setPurchases(await pRes.json());
        if (vRes.ok) setVendors(await vRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSaveVendor = async () => {
      await fetch('/api/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vendorForm)
      });
      setShowVendorModal(false);
      fetchData();
  };

  const addPurchaseItem = () => {
      setPurchaseForm({
          ...purchaseForm,
          items: [...purchaseForm.items, { product_id: '', quantity: 1, cost: 0, serials: [] }]
      });
  };

  const updatePurchaseItem = (idx: number, field: string, value: any) => {
      const newItems = [...purchaseForm.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      
      // If product changes, check if it requires serials
      if (field === 'product_id') {
          const prod = products.find(p => p.id.toString() === value.toString());
          if (prod?.requires_serial) {
              newItems[idx].requires_serial = true;
          }
      }

      // Calculate totals
      const total = newItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.cost)), 0);
      setPurchaseForm({ ...purchaseForm, items: newItems, total });
  };

  const handleSavePurchase = async () => {
      if (!purchaseForm.vendor_id || purchaseForm.items.length === 0) return;
      
      setLoading(true);
      await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(purchaseForm)
      });
      setShowPurchaseModal(false);
      fetchData();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Módulo de Compras</h2>
          <p className="text-slate-500 text-sm font-medium">Abastecimiento y Control de Proveedores.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setActiveView('purchases')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'purchases' ? 'bg-white shadow-md text-sky-600' : 'text-slate-500'}`}>Órdenes</button>
            <button onClick={() => setActiveView('vendors')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'vendors' ? 'bg-white shadow-md text-sky-600' : 'text-slate-500'}`}>Proveedores</button>
        </div>
      </div>

      {activeView === 'purchases' ? (
          <div className="space-y-6">
              <div className="flex gap-4">
                  <button onClick={() => { setPurchaseForm({ vendor_id: '', status: 'Borrador', items: [], total: 0 }); setShowPurchaseModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 shadow-lg transition-all">
                      <Plus size={16} /> Generar Compra
                  </button>
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : (
                      <table className="w-full text-left">
                          <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                  <th className="pb-4">Folio</th>
                                  <th className="pb-4">Proveedor</th>
                                  <th className="pb-4">Fecha</th>
                                  <th className="pb-4">Total</th>
                                  <th className="pb-4">Estado</th>
                                  <th className="pb-4 text-right">Acciones</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {purchases.map(p => (
                                  <tr key={p.id} className="hover:bg-slate-50">
                                      <td className="py-4 font-bold text-slate-700">#{p.id}</td>
                                      <td className="py-4 font-bold text-slate-900">{p.vendor_name}</td>
                                      <td className="py-4 text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                      <td className="py-4 font-black text-slate-900">{formatCurrency(p.total)}</td>
                                      <td className="py-4">
                                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${p.status === 'Recibido' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                              {p.status}
                                          </span>
                                      </td>
                                      <td className="py-4 text-right">
                                          <button className="p-2 text-slate-400 hover:text-sky-600"><ClipboardList size={18}/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>
      ) : (
          <div className="space-y-6">
              <button onClick={() => setShowVendorModal(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">
                  <Plus size={16} /> Nuevo Proveedor
              </button>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {vendors.map(v => (
                      <div key={v.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-sky-300 transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                                  <Truck size={24} />
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.rfc}</span>
                          </div>
                          <h4 className="font-black text-slate-900 text-lg">{v.name}</h4>
                          <p className="text-xs text-slate-500 mb-4">{v.contact_name}</p>
                          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crédito: {v.credit_days} días</span>
                              <button className="text-[10px] font-black text-sky-600 uppercase">Ver detalles</button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* PURCHASE MODAL */}
      {showPurchaseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Registrar Compra / Entrada</h3>
                      <button onClick={() => setShowPurchaseModal(false)}><X size={24} /></button>
                  </div>
                  <div className="p-8 space-y-6 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                              <select 
                                  value={purchaseForm.vendor_id}
                                  onChange={e => setPurchaseForm({...purchaseForm, vendor_id: e.target.value})}
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                              >
                                  <option value="">Seleccionar Proveedor...</option>
                                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                              <select 
                                  value={purchaseForm.status}
                                  onChange={e => setPurchaseForm({...purchaseForm, status: e.target.value as any})}
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                              >
                                  <option value="Borrador">Borrador (OC)</option>
                                  <option value="Recibido">Recibido (Entra a Stock)</option>
                              </select>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Partidas de Factura</h4>
                          <div className="space-y-3">
                              {purchaseForm.items.map((item, idx) => (
                                  <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                                      <div className="flex gap-4 items-center">
                                          <select 
                                              value={item.product_id}
                                              onChange={e => updatePurchaseItem(idx, 'product_id', e.target.value)}
                                              className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-bold"
                                          >
                                              <option value="">Producto...</option>
                                              {products.filter(p => p.type === 'product').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                          </select>
                                          <input 
                                              type="number" 
                                              placeholder="Cant" 
                                              className="w-20 p-3 bg-white border border-slate-200 rounded-xl text-center font-bold"
                                              value={item.quantity}
                                              onChange={e => updatePurchaseItem(idx, 'quantity', e.target.value)}
                                          />
                                          <input 
                                              type="number" 
                                              placeholder="Costo" 
                                              className="w-32 p-3 bg-white border border-slate-200 rounded-xl font-bold"
                                              value={item.cost}
                                              onChange={e => updatePurchaseItem(idx, 'cost', e.target.value)}
                                          />
                                      </div>
                                      {item.requires_serial && (
                                          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
                                              <p className="text-[9px] font-black text-amber-600 uppercase mb-2">Requiere Números de Serie ({item.quantity})</p>
                                              <textarea 
                                                placeholder="Ingresa los números de serie separados por coma o línea..."
                                                className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-mono"
                                                onChange={e => updatePurchaseItem(idx, 'serials', e.target.value.split(','))}
                                              />
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                          <button onClick={addPurchaseItem} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs hover:bg-slate-50">+ Agregar Producto</button>
                      </div>
                  </div>
                  <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                      <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Compra (Estimado)</p>
                          <p className="text-2xl font-black text-slate-900">{formatCurrency(purchaseForm.total)}</p>
                      </div>
                      <button onClick={handleSavePurchase} className="px-10 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Confirmar y Guardar</button>
                  </div>
              </div>
          </div>
      )}

      {/* VENDOR MODAL */}
      {showVendorModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900 uppercase">Nuevo Proveedor</h3>
                      <button onClick={() => setShowVendorModal(false)}><X /></button>
                  </div>
                  <div className="space-y-4">
                      <input placeholder="Nombre / Razón Social" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={vendorForm.name} onChange={e=>setVendorForm({...vendorForm, name: e.target.value})} />
                      <input placeholder="RFC" className="w-full p-4 bg-slate-50 border rounded-2xl uppercase font-mono" value={vendorForm.rfc} onChange={e=>setVendorForm({...vendorForm, rfc: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Teléfono" className="w-full p-4 bg-slate-50 border rounded-2xl" value={vendorForm.phone} onChange={e=>setVendorForm({...vendorForm, phone: e.target.value})} />
                        <input placeholder="Días de Crédito" type="number" className="w-full p-4 bg-slate-50 border rounded-2xl" value={vendorForm.credit_days} onChange={e=>setVendorForm({...vendorForm, credit_days: parseInt(e.target.value)})} />
                      </div>
                      <button onClick={handleSaveVendor} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Guardar Proveedor</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Purchases;

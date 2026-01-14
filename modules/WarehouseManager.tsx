
import React, { useState, useEffect } from 'react';
import { 
  Warehouse, Plus, Truck, ArrowRight, Loader2, X, Move, Boxes, User, CheckCircle2,
  Package, MapPin, Search
} from 'lucide-react';
import { Warehouse as WarehouseType, User as UserType, Product } from '../types';

const WarehouseManager: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);
  const [warehouseLevels, setWarehouseLevels] = useState<any[]>([]);
  
  // Form States
  const [warehouseForm, setWarehouseForm] = useState<Partial<WarehouseType>>({ name: '', type: 'Unidad Móvil', responsible_id: '' });
  const [transferForm, setTransferForm] = useState({
      from: '1', // Central default
      to: '',
      items: [{ product_id: '', quantity: 1 }]
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [wRes, uRes, pRes] = await Promise.all([
            fetch('/api/warehouses'),
            fetch('/api/users'),
            fetch('/api/products')
        ]);
        if (wRes.ok) setWarehouses(await wRes.json());
        if (uRes.ok) setUsers(await uRes.json());
        if (pRes.ok) setProducts(await pRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadLevels = async (id: string) => {
      setLoading(true);
      const res = await fetch(`/api/inventory/levels/${id}`);
      if (res.ok) setWarehouseLevels(await res.json());
      setLoading(false);
  };

  const handleCreateWarehouse = async () => {
      await fetch('/api/warehouses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(warehouseForm)
      });
      setShowAddModal(false);
      fetchData();
  };

  const handleTransfer = async () => {
      if (!transferForm.to) return;
      await fetch('/api/inventory/transfer', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(transferForm)
      });
      setShowTransferModal(false);
      fetchData();
      alert("Traspaso completado correctamente.");
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Almacenes y Logística</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión multi-inventario y carga de unidades.</p>
        </div>
        <div className="flex gap-4">
            <button onClick={() => { setTransferForm({ from: '1', to: '', items: [{ product_id: '', quantity: 1 }] }); setShowTransferModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                <Move size={16} /> Realizar Traspaso
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">
                <Plus size={16} /> Nueva Unidad
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Listado de Almacenes */}
          <div className="xl:col-span-1 space-y-4 overflow-y-auto max-h-[70vh] pr-2">
              {warehouses.map(w => (
                  <div 
                    key={w.id} 
                    onClick={() => { setSelectedWarehouse(w); loadLevels(w.id); }}
                    className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${selectedWarehouse?.id === w.id ? 'bg-sky-50 border-sky-400' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                  >
                      <div className="flex justify-between items-center mb-4">
                          <div className={`p-3 rounded-2xl ${w.type === 'Central' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'}`}>
                              <Warehouse size={24} />
                          </div>
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${w.type === 'Central' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{w.type}</span>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{w.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><User size={12}/> Resp: {w.responsible_name || 'Almacenista Central'}</p>
                  </div>
              ))}
          </div>

          {/* Detalle de Stock en Almacén Seleccionado */}
          <div className="xl:col-span-2 bg-white rounded-[3rem] border border-slate-200 shadow-sm p-8 h-full flex flex-col">
              {selectedWarehouse ? (
                  <>
                      <div className="flex justify-between items-center mb-8">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-900 text-white rounded-2xl"><Package size={24}/></div>
                              <div>
                                  <h3 className="text-xl font-black text-slate-900 uppercase">Existencias en {selectedWarehouse.name}</h3>
                                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Auditoría en tiempo real</p>
                              </div>
                          </div>
                      </div>

                      {loading ? <Loader2 className="animate-spin m-auto" /> : (
                          <div className="flex-1 overflow-y-auto custom-scrollbar">
                              <table className="w-full text-left">
                                  <thead className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 bg-white pb-4">
                                      <tr>
                                          <th className="pb-4">Código</th>
                                          <th className="pb-4">Producto</th>
                                          <th className="pb-4">Categoría</th>
                                          <th className="pb-4 text-center">Stock</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {warehouseLevels.map(l => (
                                          <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                                              <td className="py-4 font-mono text-[10px] text-slate-400">{l.code || 'S/C'}</td>
                                              <td className="py-4 font-black text-slate-800 text-sm">{l.name}</td>
                                              <td className="py-4 text-[10px] font-bold text-slate-500 uppercase">{l.category}</td>
                                              <td className="py-4 text-center">
                                                  <span className={`text-lg font-black ${l.stock > 0 ? 'text-sky-600' : 'text-slate-300'}`}>{l.stock}</span>
                                              </td>
                                          </tr>
                                      ))}
                                      {warehouseLevels.length === 0 && (
                                          <tr><td colSpan={4} className="py-10 text-center text-slate-300 font-bold uppercase">Sin inventario en esta unidad</td></tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                      <Search size={64} className="mb-4" />
                      <p className="font-black uppercase text-sm">Selecciona un almacén para ver stock</p>
                  </div>
              )}
          </div>
      </div>

      {/* ADD WAREHOUSE MODAL */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900 uppercase">Nueva Unidad / Almacén</h3>
                      <button onClick={() => setShowAddModal(false)}><X /></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre (Ej: Camioneta Nissan 1)</label>
                          <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={warehouseForm.name} onChange={e=>setWarehouseForm({...warehouseForm, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable (Técnico)</label>
                          <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={warehouseForm.responsible_id} onChange={e=>setWarehouseForm({...warehouseForm, responsible_id: e.target.value})}>
                              <option value="">Seleccionar Personal...</option>
                              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                      </div>
                      <button onClick={handleCreateWarehouse} className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Registrar Almacén</button>
                  </div>
              </div>
          </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900 uppercase">Transferencia de Inventario</h3>
                      <button onClick={() => setShowTransferModal(false)}><X /></button>
                  </div>
                  <div className="space-y-6 overflow-y-auto flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origen</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={transferForm.from} onChange={e=>setTransferForm({...transferForm, from: e.target.value})}>
                                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino</label>
                              <select className="w-full p-4 bg-sky-50 border border-sky-200 rounded-2xl font-bold text-sky-900" value={transferForm.to} onChange={e=>setTransferForm({...transferForm, to: e.target.value})}>
                                  <option value="">Seleccionar destino...</option>
                                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artículos a Traspasar</h4>
                          {transferForm.items.map((item, idx) => (
                              <div key={idx} className="flex gap-4">
                                  <select className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold" value={item.product_id} onChange={e => {
                                      const newItems = [...transferForm.items];
                                      newItems[idx].product_id = e.target.value;
                                      setTransferForm({...transferForm, items: newItems});
                                  }}>
                                      <option value="">Producto...</option>
                                      {products.filter(p => p.type === 'product').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                  <input type="number" className="w-24 p-4 bg-slate-50 border rounded-2xl font-black text-center" value={item.quantity} onChange={e => {
                                      const newItems = [...transferForm.items];
                                      newItems[idx].quantity = parseInt(e.target.value);
                                      setTransferForm({...transferForm, items: newItems});
                                  }} />
                              </div>
                          ))}
                          <button onClick={() => setTransferForm({...transferForm, items: [...transferForm.items, {product_id: '', quantity: 1}]})} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-400">+ Añadir Ítem</button>
                      </div>
                  </div>
                  <div className="pt-8 border-t border-slate-100 flex gap-4">
                      <button onClick={handleTransfer} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Completar Traspaso</button>
                      <button onClick={() => setShowTransferModal(false)} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WarehouseManager;

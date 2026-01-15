
import React, { useState, useEffect } from 'react';
import { 
  Warehouse as WarehouseIcon, Plus, Truck, ArrowRight, Loader2, X, Move, Boxes, User as UserIcon, CheckCircle2,
  Package, MapPin, Search, RefreshCw, AlertTriangle, UserPlus, UserCheck, Shield
} from 'lucide-react';
import { Warehouse as WarehouseType, User as UserType, Product, UserRole } from '../types';

const WarehouseManager: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any | null>(null);
  const [warehouseLevels, setWarehouseLevels] = useState<any[]>([]);
  
  const [warehouseForm, setWarehouseForm] = useState<Partial<WarehouseType>>({ 
    name: '', 
    type: 'Unidad Móvil', 
    responsible_id: '' 
  });
  
  const [transferForm, setTransferForm] = useState({ 
    from: '1', 
    to: '', 
    items: [{ product_id: '', quantity: 1 }] 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
        const [wRes, uRes, pRes] = await Promise.all([
            fetch('/api/warehouses'),
            fetch('/api/users'),
            fetch('/api/products')
        ]);
        if (wRes.ok) setWarehouses(await wRes.json());
        if (uRes.ok) {
            const allUsers = await uRes.json();
            // Filtrar solo técnicos e instaladores para asignar a unidades móviles
            setUsers(allUsers.filter((u: UserType) => u.role === UserRole.INSTALLER || u.role === UserRole.ADMIN));
        }
        if (pRes.ok) setProducts(await pRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const loadLevels = async (id: string) => {
      setLoading(true);
      try {
          const res = await fetch(`/api/inventory/levels/${id}`);
          if (res.ok) setWarehouseLevels(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  const handleCreateWarehouse = async () => {
      if (warehouseForm.type === 'Unidad Móvil' && !warehouseForm.responsible_id) {
          alert("Debes asignar un Instalador responsable para esta unidad móvil.");
          return;
      }
      
      let finalName = warehouseForm.name;
      if (!finalName && warehouseForm.responsible_id) {
          const resp = users.find(u => u.id.toString() === warehouseForm.responsible_id?.toString());
          finalName = `Unidad - ${resp?.name || 'Técnico'}`;
      }

      const res = await fetch('/api/warehouses', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ ...warehouseForm, name: finalName })
      });

      if (res.ok) {
          setShowAddModal(false);
          setWarehouseForm({ name: '', type: 'Unidad Móvil', responsible_id: '' });
          fetchData();
      }
  };

  const handleTransfer = async () => {
      if (!transferForm.to || !transferForm.from || transferForm.items.some(i => !i.product_id)) {
          alert("Por favor completa todos los campos del traspaso.");
          return;
      }
      setLoading(true);
      try {
          const res = await fetch('/api/inventory/transfer', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(transferForm)
          });
          if (res.ok) {
              setShowTransferModal(false);
              alert("Movimiento de inventario realizado con éxito.");
              fetchData();
              if (selectedWarehouse) loadLevels(selectedWarehouse.id);
          }
      } catch (e) { alert("Error en el traspaso"); }
      finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Logística de Instaladores</h2>
          <p className="text-slate-500 text-sm font-medium">Control de stock móvil asignado a personal técnico.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => { setTransferForm({ from: '1', to: '', items: [{ product_id: '', quantity: 1 }] }); setShowTransferModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all">
                <Move size={16} /> Cargar Camioneta
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all">
                <UserPlus size={16} /> Vincular Técnico
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Listado de Unidades / Técnicos */}
          <div className="xl:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {warehouses.map((w: any) => {
                  const isAssigned = !!w.responsible_id;
                  const isActive = selectedWarehouse?.id === w.id;
                  
                  return (
                    <div 
                        key={w.id} 
                        onClick={() => { setSelectedWarehouse(w); loadLevels(w.id); }}
                        className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${isActive ? 'bg-sky-50 border-sky-400 shadow-xl shadow-sky-900/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <div className={`p-3 rounded-2xl ${w.type === 'Central' ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                {w.type === 'Central' ? <WarehouseIcon size={24} /> : <Truck size={24} />}
                            </div>
                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${w.type === 'Central' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'}`}>
                                {w.type === 'Central' ? 'Bodega' : 'Móvil'}
                            </span>
                        </div>
                        
                        <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight relative z-10 leading-tight">
                            {w.name}
                        </h4>
                        
                        <div className="flex items-center gap-2 mt-3 relative z-10">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isAssigned ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'}`}>
                                <UserIcon size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Custodio</p>
                                <p className={`text-xs font-bold ${isAssigned ? 'text-slate-700' : 'text-slate-300 italic'}`}>
                                    {w.responsible_name || 'Sin asignar'}
                                </p>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        {w.type !== 'Central' && (
                            <Truck size={100} className={`absolute -bottom-6 -right-6 transition-all duration-500 ${isActive ? 'text-sky-200/40 rotate-12 scale-110' : 'text-slate-50 opacity-20 group-hover:opacity-40'}`} />
                        )}
                    </div>
                  );
              })}
          </div>

          {/* Inventario Detallado de la Unidad */}
          <div className="xl:col-span-2 bg-white rounded-[3rem] border border-slate-200 shadow-sm p-8 h-full flex flex-col min-h-[500px]">
              {selectedWarehouse ? (
                  <>
                      <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
                          <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl">
                                  <Package size={28}/>
                              </div>
                              <div>
                                  <h3 className="text-xl font-black text-slate-900 uppercase">Auditando: {selectedWarehouse.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsabilidad de:</span>
                                      <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                          {selectedWarehouse.responsible_name || 'Almacén General'}
                                      </span>
                                  </div>
                              </div>
                          </div>
                          <button onClick={() => loadLevels(selectedWarehouse.id)} className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
                              <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                          </button>
                      </div>

                      {loading ? (
                        <div className="m-auto flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-sky-600" size={40}/>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando carga...</p>
                        </div>
                      ) : (
                          <div className="flex-1 overflow-y-auto custom-scrollbar">
                              <table className="w-full text-left">
                                  <thead className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 bg-white pb-4">
                                      <tr>
                                          <th className="pb-4">SKU</th>
                                          <th className="pb-4">Descripción del Material</th>
                                          <th className="pb-4 text-center">Stock</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {warehouseLevels.map(l => (
                                          <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                              <td className="py-4 font-mono text-[10px] text-slate-400 font-bold">{l.code || 'S/SKU'}</td>
                                              <td className="py-4">
                                                  <p className="font-black text-slate-800 text-sm">{l.name}</p>
                                                  <p className="text-[9px] text-slate-400 font-black uppercase">{l.category}</p>
                                              </td>
                                              <td className="py-4 text-center">
                                                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-sm ${l.stock > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-200 border border-slate-100'}`}>
                                                      {l.stock}
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                      {warehouseLevels.length === 0 && (
                                          <tr>
                                              <td colSpan={3} className="py-32 text-center">
                                                  <div className="flex flex-col items-center opacity-10">
                                                      <Boxes size={64} />
                                                      <p className="font-black uppercase text-sm mt-4 tracking-widest">Unidad sin Carga</p>
                                                  </div>
                                              </td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 p-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                          <Truck size={40} className="opacity-20" />
                      </div>
                      <p className="font-black uppercase text-xs tracking-[0.2em] opacity-30">Selecciona un técnico o almacén para auditar existencias en tiempo real</p>
                  </div>
              )}
          </div>
      </div>

      {/* MODAL VINCULAR TÉCNICO */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300 border border-white/20">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Nueva Unidad Móvil</h3>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Asignación de responsabilidad de inventario</p>
                      </div>
                      <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] flex items-center gap-4">
                          <Shield className="text-indigo-600" size={32} />
                          <p className="text-[10px] font-bold text-indigo-700 leading-relaxed uppercase tracking-wide">
                              Cada instalador puede tener su propia unidad móvil asignada. El stock transferido a esta unidad será responsabilidad directa del técnico.
                          </p>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instalador Responsable</label>
                          <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                            value={warehouseForm.responsible_id}
                            onChange={e => setWarehouseForm({...warehouseForm, responsible_id: e.target.value})}
                          >
                              <option value="">Seleccionar del Staff...</option>
                              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                          </select>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador de Camioneta (Opcional)</label>
                          <input 
                            placeholder="Ej: Camioneta Blanca 01"
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none"
                            value={warehouseForm.name}
                            onChange={e => setWarehouseForm({...warehouseForm, name: e.target.value})}
                          />
                      </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-100">
                      <button 
                        onClick={handleCreateWarehouse}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 hover:bg-sky-600 transition-all"
                      >
                          Confirmar Vínculo
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL CARGAR CAMIONETA (TRASPASO) */}
      {showTransferModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-8 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><Move size={24}/></div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase">Cargar Unidad Móvil</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Traspaso de Bodega a Técnico</p>
                          </div>
                      </div>
                      <button onClick={() => setShowTransferModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl"><X size={24}/></button>
                  </div>

                  <div className="space-y-6 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origen (Sale de:)</label>
                              <select className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold" value={transferForm.from} onChange={e=>setTransferForm({...transferForm, from: e.target.value})}>
                                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.type === 'Central' ? '🏢' : '🚚'} {w.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino (Entra a:)</label>
                              <select className="w-full p-4 bg-sky-50 border border-sky-200 rounded-2xl font-bold text-sky-900" value={transferForm.to} onChange={e=>setTransferForm({...transferForm, to: e.target.value})}>
                                  <option value="">Seleccionar Técnico/Unidad...</option>
                                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.type === 'Central' ? '🏢' : '🚚'} {w.name}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Materiales a Transferir</h4>
                          {transferForm.items.map((item, idx) => (
                              <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-left-2">
                                  <select className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-sky-500" value={item.product_id} onChange={e => {
                                      const newItems = [...transferForm.items];
                                      newItems[idx].product_id = e.target.value;
                                      setTransferForm({...transferForm, items: newItems});
                                  }}>
                                      <option value="">Buscar Articulo...</option>
                                      {products.filter(p => p.type === 'product').map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock} en {warehouses.find((w:any)=>w.id.toString()===transferForm.from)?.name})</option>)}
                                  </select>
                                  <div className="w-24">
                                      <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-center outline-none focus:ring-2 focus:ring-sky-500" value={item.quantity} onChange={e => {
                                          const newItems = [...transferForm.items];
                                          newItems[idx].quantity = parseInt(e.target.value);
                                          setTransferForm({...transferForm, items: newItems});
                                      }} />
                                  </div>
                                  <button onClick={() => setTransferForm({...transferForm, items: transferForm.items.filter((_,i)=>i!==idx)})} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={18}/></button>
                              </div>
                          ))}
                          <button onClick={() => setTransferForm({...transferForm, items: [...transferForm.items, {product_id: '', quantity: 1}]})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-widest hover:bg-slate-50 hover:text-sky-600 hover:border-sky-200 transition-all">+ Añadir más Material</button>
                      </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex gap-4 shrink-0">
                      <button onClick={handleTransfer} disabled={loading} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-600/20 flex items-center justify-center gap-2 hover:bg-sky-700 disabled:opacity-50">
                          {loading ? <Loader2 className="animate-spin" size={16}/> : <UserCheck size={16}/>} Procesar Carga
                      </button>
                      <button onClick={() => setShowTransferModal(false)} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all">Cerrar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WarehouseManager;


import React, { useState, useEffect, useMemo } from 'react';
import { 
  Warehouse as WarehouseIcon, Plus, Truck, ArrowRight, Loader2, X, Move, Boxes, User as UserIcon, CheckCircle2,
  Package, MapPin, Search, RefreshCw, AlertTriangle, UserPlus, UserCheck, Shield, Layers, LayoutList, 
  Trash2, Save, ShoppingCart, ArrowDownLeft, Info, CheckCircle, Clock
} from 'lucide-react';
import { Warehouse as WarehouseType, User as UserType, Product, UserRole, InventoryKit, InventoryTransfer } from '../types';
import { useNotification } from '../context/NotificationContext';

const WarehouseManager: React.FC = () => {
  const { showToast } = useNotification();
  const [activeView, setActiveView] = useState<'stock' | 'pending' | 'kits'>('stock');
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<InventoryKit[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showKitModal, setShowKitModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any | null>(null);
  const [warehouseLevels, setWarehouseLevels] = useState<any[]>([]);
  
  // Forms
  const [warehouseForm, setWarehouseForm] = useState<Partial<WarehouseType>>({ name: '', type: 'Unidad Móvil', responsible_id: '' });
  const [transferForm, setTransferForm] = useState({ from: '1', to: '', items: [{ product_id: '', quantity: 1 }] });
  const [kitForm, setKitForm] = useState<Partial<InventoryKit>>({ name: '', description: '', items: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
        const [wRes, uRes, pRes, kRes] = await Promise.all([
            fetch('/api/warehouses'), fetch('/api/users'), fetch('/api/products'), fetch('/api/inventory/kits')
        ]);
        if (wRes.ok) setWarehouses(await wRes.json());
        if (uRes.ok) setUsers((await uRes.json()).filter((u: UserType) => u.role === UserRole.INSTALLER || u.role === UserRole.ADMIN));
        if (pRes.ok) setProducts(await pRes.json());
        if (kRes.ok) setKits(await kRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const loadLevels = async (id: string) => {
      setLoading(true);
      try {
          const [levelsRes, pendingRes] = await Promise.all([
              fetch(`/api/inventory/levels/${id}`),
              fetch(`/api/inventory/transfers/pending/${id}`)
          ]);
          if (levelsRes.ok) setWarehouseLevels(await levelsRes.json());
          if (pendingRes.ok) setPendingTransfers(await pendingRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
  };

  const applyKitToTransfer = (kit: InventoryKit) => {
      const newItems = kit.items.map(ki => ({ product_id: ki.product_id.toString(), quantity: ki.quantity }));
      setTransferForm({ ...transferForm, items: newItems });
      showToast(`Kit "${kit.name}" cargado al traspaso`);
  };

  const handleConfirmTransfer = async (transferId: string | number) => {
      setLoading(true);
      try {
          const res = await fetch(`/api/inventory/transfers/${transferId}/confirm`, { method: 'POST' });
          if (res.ok) {
              showToast("Recepción confirmada. Stock actualizado en la unidad.");
              if (selectedWarehouse) loadLevels(selectedWarehouse.id);
              fetchData();
          }
      } catch (e) { showToast("Error al confirmar", "error"); }
      finally { setLoading(false); }
  };

  const handleTransfer = async () => {
      if (!transferForm.to || !transferForm.from || transferForm.items.some(i => !i.product_id)) {
          showToast("Datos incompletos", "error");
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
              showToast("Material enviado. En tránsito hasta que el técnico confirme.");
              setShowTransferModal(false);
              fetchData();
              if (selectedWarehouse) loadLevels(selectedWarehouse.id);
          }
      } catch (e) { showToast("Error en traspaso", "error"); }
      finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Logístico */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Logística & Unidades Móviles</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión de activos en campo con custodia técnica garantizada.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowKitModal(true)} className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">
                <Layers size={16} /> Configurar Kits
            </button>
            <button onClick={() => { setTransferForm({ from: '1', to: '', items: [{ product_id: '', quantity: 1 }] }); setShowTransferModal(true); }} className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-amber-600 transition-all">
                <Move size={16} /> Cargar Camioneta
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Sidebar: Flota / Almacenes */}
          <div className="xl:col-span-1 space-y-4">
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mb-6">
                  <button onClick={() => setActiveView('stock')} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'stock' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Unidades</button>
                  <button onClick={() => setActiveView('kits')} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'kits' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Kartas Kit</button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {warehouses.map((w: any) => (
                    <div 
                        key={w.id} 
                        onClick={() => { setSelectedWarehouse(w); loadLevels(w.id); setActiveView('stock'); }}
                        className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${selectedWarehouse?.id === w.id ? 'bg-sky-50 border-sky-400 shadow-xl shadow-sky-900/5' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="flex justify-between items-center mb-4 relative z-10">
                            <div className={`p-3 rounded-2xl ${w.type === 'Central' ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                {w.type === 'Central' ? <WarehouseIcon size={24} /> : <Truck size={24} />}
                            </div>
                            {pendingTransfers.length > 0 && selectedWarehouse?.id === w.id && (
                                <span className="bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black animate-bounce shadow-lg">!</span>
                            )}
                        </div>
                        <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight relative z-10">{w.name}</h4>
                        <div className="flex items-center gap-2 mt-2 relative z-10 text-slate-400">
                             <UserIcon size={12}/>
                             <span className="text-[10px] font-bold uppercase tracking-widest">{w.responsible_name || 'Almacén General'}</span>
                        </div>
                    </div>
                  ))}
                  <button onClick={() => setShowAddModal(true)} className="w-full p-6 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-black uppercase text-[10px] tracking-widest hover:border-sky-300 hover:text-sky-600 transition-all flex items-center justify-center gap-2">
                      <UserPlus size={18}/> Vincular Técnico
                  </button>
              </div>
          </div>

          {/* Main Panel: Auditoría o Kits */}
          <div className="xl:col-span-3 bg-white rounded-[3.5rem] border border-slate-200 shadow-sm p-10 h-full min-h-[600px] flex flex-col">
              {activeView === 'stock' && selectedWarehouse ? (
                  <>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-slate-100">
                          <div className="flex items-center gap-5">
                              <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl">
                                  <Package size={32}/>
                              </div>
                              <div>
                                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Auditando Unidad: {selectedWarehouse.name}</h3>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Custodio: <span className="text-indigo-600">{selectedWarehouse.responsible_name || 'Master'}</span></p>
                              </div>
                          </div>
                          
                          <div className="flex gap-3">
                               <button onClick={() => loadLevels(selectedWarehouse.id)} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''}/></button>
                               <button className="flex items-center gap-2 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100">
                                   <AlertTriangle size={16}/> Reportar Incidencia
                               </button>
                          </div>
                      </div>

                      {/* INBOX DE TRASPASOS PENDIENTES */}
                      {pendingTransfers.length > 0 && (
                          <div className="mb-10 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"/>
                                  <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Materiales en Tránsito (Por Confirmar)</h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {pendingTransfers.map(pt => (
                                      <div key={pt.id} className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex flex-col justify-between">
                                          <div className="mb-4">
                                              <p className="text-[9px] font-black text-amber-700 uppercase mb-2">Envío desde: {pt.from_name}</p>
                                              <div className="space-y-1">
                                                  {pt.items.map((i: any, idx: number) => (
                                                      <div key={idx} className="flex justify-between text-xs font-bold text-slate-700">
                                                          <span>{i.name}</span>
                                                          <span>x{i.quantity}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                          <button 
                                              onClick={() => handleConfirmTransfer(pt.id)}
                                              className="w-full py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-amber-700 shadow-lg flex items-center justify-center gap-2"
                                          >
                                              <CheckCircle size={14}/> Confirmar Recepción
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                           <table className="w-full text-left">
                               <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-white pb-6 border-b border-slate-50">
                                   <tr>
                                       <th className="pb-4">Descripción del Material</th>
                                       <th className="pb-4">U.M.</th>
                                       <th className="pb-4 text-center">Existencia</th>
                                       <th className="pb-4 text-right">Estatus</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                   {warehouseLevels.map(l => (
                                       <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                           <td className="py-6">
                                               <p className="font-black text-slate-800 text-sm">{l.name}</p>
                                               <p className="text-[9px] text-slate-400 font-bold uppercase">{l.code || 'S/SKU'}</p>
                                           </td>
                                           <td className="py-6">
                                               <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500 uppercase">{l.unit_of_measure}</span>
                                           </td>
                                           <td className="py-6 text-center">
                                               <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-lg ${l.stock > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm' : 'bg-slate-50 text-slate-300'}`}>
                                                   {l.stock}
                                               </div>
                                           </td>
                                           <td className="py-6 text-right">
                                               {l.stock <= 0 ? (
                                                   <span className="text-[9px] font-black text-rose-500 uppercase bg-rose-50 px-3 py-1 rounded-lg">Agotado</span>
                                               ) : l.stock < 5 ? (
                                                   <span className="text-[9px] font-black text-amber-500 uppercase bg-amber-50 px-3 py-1 rounded-lg">Bajo</span>
                                               ) : (
                                                   <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 px-3 py-1 rounded-lg">Óptimo</span>
                                               )}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                      </div>
                  </>
              ) : activeView === 'kits' ? (
                  <div className="space-y-10">
                      <div className="flex justify-between items-center mb-8">
                           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                               <Layers className="text-sky-600" size={32}/> Kits de Carga Estándar
                           </h3>
                           <button onClick={() => { setKitForm({ name: '', description: '', items: [] }); setShowKitModal(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Crear Plantilla</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {kits.map(kit => (
                              <div key={kit.id} className="bg-slate-50 border-2 border-slate-100 p-8 rounded-[3rem] hover:border-sky-400 transition-all group relative overflow-hidden">
                                  <Layers size={120} className="absolute -bottom-8 -right-8 text-slate-200/50 group-hover:text-sky-100 transition-colors" />
                                  <div className="relative z-10">
                                      <h4 className="text-xl font-black text-slate-900 uppercase mb-2">{kit.name}</h4>
                                      <p className="text-xs text-slate-500 mb-6 font-medium">{kit.description}</p>
                                      
                                      <div className="space-y-2 mb-8">
                                          {kit.items.map((item, i) => (
                                              <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                                                  <span className="text-slate-400 uppercase tracking-widest">{item.product_name}</span>
                                                  <span className="text-slate-900 bg-white px-2 py-1 rounded-lg shadow-sm">x{item.quantity}</span>
                                              </div>
                                          ))}
                                      </div>

                                      <button 
                                          onClick={() => { applyKitToTransfer(kit); setShowTransferModal(true); }}
                                          className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
                                      >
                                          <ShoppingCart size={16}/> Usar para Carga
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 p-20 text-center opacity-40">
                      <Truck size={100} className="mb-6" />
                      <p className="font-black uppercase text-sm tracking-[0.3em]">Selecciona una unidad móvil o administra kits para comenzar</p>
                  </div>
              )}
          </div>
      </div>

      {/* MODAL TRASPASO SEGURO (CON KITS) */}
      {showTransferModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-8 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><Move size={24}/></div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase">Salida de Material (Carga)</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">El stock quedará "En Tránsito" hasta su confirmación.</p>
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
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino (Responsable:)</label>
                              <select className="w-full p-4 bg-sky-50 border border-sky-200 rounded-2xl font-bold text-sky-900" value={transferForm.to} onChange={e=>setTransferForm({...transferForm, to: e.target.value})}>
                                  <option value="">Seleccionar Unidad...</option>
                                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.type === 'Central' ? '🏢' : '🚚'} {w.name}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Items del Traspaso</h4>
                              <div className="relative group">
                                  <button className="flex items-center gap-2 text-[9px] font-black text-sky-600 bg-sky-50 px-4 py-2 rounded-xl hover:bg-sky-100">
                                      <Layers size={14}/> Cargar un Kit
                                  </button>
                                  <div className="absolute right-0 mt-2 w-56 bg-white border rounded-2xl shadow-2xl p-2 hidden group-hover:block z-20">
                                      {kits.map(kit => (
                                          <button key={kit.id} onClick={() => applyKitToTransfer(kit)} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl font-bold text-xs flex justify-between">
                                              {kit.name} <ShoppingCart size={12}/>
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          {transferForm.items.map((item, idx) => (
                              <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-left-2">
                                  <select className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-sky-500" value={item.product_id} onChange={e => {
                                      const newItems = [...transferForm.items];
                                      newItems[idx].product_id = e.target.value;
                                      setTransferForm({...transferForm, items: newItems});
                                  }}>
                                      <option value="">Buscar Articulo...</option>
                                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                          <button onClick={() => setTransferForm({...transferForm, items: [...transferForm.items, {product_id: '', quantity: 1}]})} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-widest hover:bg-slate-50 hover:text-sky-600 hover:border-sky-200 transition-all">+ Añadir Item</button>
                      </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex gap-4 shrink-0">
                      <button onClick={handleTransfer} disabled={loading} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-600/20 flex items-center justify-center gap-2 hover:bg-sky-700 disabled:opacity-50">
                          {loading ? <Loader2 className="animate-spin" size={16}/> : <Truck size={16}/>} Procesar Salida
                      </button>
                      <button onClick={() => setShowTransferModal(false)} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all">Cerrar</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL CONFIGURAR KITS */}
      {showKitModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Nueva Karta de Kit</h3>
                      <button onClick={() => setShowKitModal(false)}><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Kit</label>
                          <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Ej: Mantenimiento 1 Ton" value={kitForm.name} onChange={e=>setKitForm({...kitForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                          <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-24" placeholder="Combo básico para servicios preventivos..." value={kitForm.description} onChange={e=>setKitForm({...kitForm, description: e.target.value})} />
                      </div>
                      
                      <div className="space-y-3">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artículos en Kit</p>
                           <button onClick={async () => {
                               const res = await fetch('/api/inventory/kits', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(kitForm) });
                               if(res.ok) { setShowKitModal(false); fetchData(); }
                           }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Guardar Plantilla Kit</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL VINCULAR TÉCNICO */}
      {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Nueva Unidad Móvil</h3>
                      <button onClick={() => setShowAddModal(false)}><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnico Responsable</label>
                          <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={warehouseForm.responsible_id} onChange={e=>setWarehouseForm({...warehouseForm, responsible_id: e.target.value})}>
                              <option value="">Seleccionar del Staff...</option>
                              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la Unidad</label>
                          <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Ej: Camioneta 01" value={warehouseForm.name} onChange={e=>setWarehouseForm({...warehouseForm, name: e.target.value})} />
                      </div>
                      <button onClick={async () => {
                          const res = await fetch('/api/warehouses', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(warehouseForm) });
                          if(res.ok) { setShowAddModal(false); fetchData(); }
                      }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs">Vincular e Inicializar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WarehouseManager;

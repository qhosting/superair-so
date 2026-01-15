
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  Edit3, Filter, X, Warehouse, Boxes, Tag, Loader2, Trash2, Printer, 
  ChevronRight, Activity, TrendingUp, Info, Barcode
} from 'lucide-react';
import { Product, Warehouse as WarehouseType } from '../types';

const Inventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWH, setSelectedWH] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetails, setProductDetails] = useState<{breakdown: any[], movements: any[], serials: any[]} | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [prodRes, whRes] = await Promise.all([
            fetch(`/api/products?warehouse_id=${selectedWH}`),
            fetch('/api/warehouses')
        ]);
        if(prodRes.ok) setProducts(await prodRes.json());
        if(whRes.ok) setWarehouses(await whRes.json());
    } catch(e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedWH]);

  const fetchProductDetails = async (product: Product) => {
      setSelectedProduct(product);
      setDetailsLoading(true);
      try {
          const [breakdownRes, moveRes, serialRes] = await Promise.all([
              fetch(`/api/inventory/breakdown/${product.id}`),
              fetch(`/api/inventory/movements/${product.id}`),
              fetch(`/api/inventory/serials/${product.id}`)
          ]);
          setProductDetails({ 
              breakdown: await breakdownRes.json(), 
              movements: await moveRes.json(),
              serials: await serialRes.json()
          });
      } catch (e) { console.error(e); } 
      finally { setDetailsLoading(false); }
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term) || (p.code && p.code.toLowerCase().includes(term)));
  }, [products, searchTerm]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Inventario Industrial</h2>
          <p className="text-slate-500 text-sm font-medium">Control de stock multialmacén y trazabilidad de seriales.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <select 
                value={selectedWH}
                onChange={e => setSelectedWH(e.target.value)}
                className="px-4 py-2 bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer"
            >
                <option value="all">🌐 Todas las Unidades</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.type === 'Central' ? '🏢' : '🚚'} {w.name}</option>)}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex items-center gap-4 bg-slate-50/30">
             <Search className="text-slate-400" />
             <input 
                placeholder="Buscar SKU, Nombre o Modelo..." 
                className="w-full bg-transparent outline-none font-bold text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
         </div>
         {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600"/></div> : (
             <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                     <tr>
                         <th className="px-8 py-5">Código / SKU</th>
                         <th className="px-8 py-5">Descripción</th>
                         <th className="px-8 py-5">Existencia</th>
                         <th className="px-8 py-5">Costo Prom.</th>
                         <th className="px-8 py-5 text-right">Detalle</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredProducts.map(p => (
                         <tr key={p.id} onClick={() => fetchProductDetails(p)} className="hover:bg-sky-50/30 cursor-pointer transition-all group">
                             <td className="px-8 py-5 font-mono font-bold text-slate-400 text-xs">{p.code || 'S/N'}</td>
                             <td className="px-8 py-5">
                                 <div className="font-bold text-slate-900">{p.name}</div>
                                 <div className="text-[10px] text-slate-400 uppercase font-black">{p.category}</div>
                             </td>
                             <td className="px-8 py-5">
                                 <div className="flex items-center gap-2">
                                     <span className={`text-lg font-black ${Number(p.stock) < Number(p.min_stock) ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock}</span>
                                     {Number(p.stock) < Number(p.min_stock) && <AlertTriangle size={14} className="text-rose-500 animate-pulse" />}
                                 </div>
                             </td>
                             <td className="px-8 py-5 text-xs font-bold text-slate-500">{formatCurrency(Number(p.cost || 0))}</td>
                             <td className="px-8 py-5 text-right">
                                 <button className="p-2 text-slate-300 hover:text-sky-500 group-hover:bg-white rounded-xl shadow-sm transition-all"><ChevronRight size={20}/></button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         )}
      </div>

      {/* DRAWER DETALLE PRODUCTO */}
      {selectedProduct && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[150] flex justify-end">
              <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                  <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                      <div className="flex items-center gap-5">
                          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg"><Package size={28}/></div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedProduct.name}</h3>
                              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Kardex Global • SKU: {selectedProduct.code || 'S/N'}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-white rounded-2xl shadow-sm"><X size={24} className="text-slate-400" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                      {detailsLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-600" size={32}/></div> : (
                          <>
                              {/* Stock por Almacén */}
                              <div>
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                      <Warehouse size={18} className="text-sky-600"/> Distribución de Existencias
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {productDetails?.breakdown.map((wh, i) => (
                                          <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                              <div><p className="font-bold text-slate-800 text-sm">{wh.warehouse_name}</p><p className="text-[10px] text-slate-400 uppercase font-black">{wh.type}</p></div>
                                              <span className={`text-xl font-black ${wh.stock > 0 ? 'text-sky-600' : 'text-slate-300'}`}>{wh.stock}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              {/* Números de Serie Disponibles */}
                              {selectedProduct.requires_serial && (
                                  <div>
                                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                          <Barcode size={18} className="text-indigo-600"/> Seriales en Stock
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                          {productDetails?.serials.map((s, i) => (
                                              <div key={i} className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-mono font-bold text-indigo-700">
                                                  {s.serial} <span className="opacity-50 ml-1">({s.warehouse_name})</span>
                                              </div>
                                          ))}
                                          {productDetails?.serials.length === 0 && <p className="text-xs text-slate-400 font-bold">Sin seriales registrados.</p>}
                                      </div>
                                  </div>
                              )}

                              {/* Kardex */}
                              <div>
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                      <Activity size={18} className="text-emerald-600"/> Historial de Movimientos
                                  </h4>
                                  <div className="space-y-3">
                                      {productDetails?.movements.map((m, i) => (
                                          <div key={i} className="p-4 rounded-2xl border border-slate-50 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                              <div className={`p-2 rounded-xl ${m.type === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                  {m.type === 'Entrada' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                                              </div>
                                              <div className="flex-1">
                                                  <div className="flex justify-between">
                                                      <p className="font-bold text-slate-800 text-xs">{m.reason}</p>
                                                      <span className={`font-black text-xs ${m.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                          {m.type === 'Entrada' ? '+' : '-'}{m.quantity}
                                                      </span>
                                                  </div>
                                                  <p className="text-[10px] text-slate-400 mt-1">Por {m.user_name} • {new Date(m.created_at).toLocaleString()}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;

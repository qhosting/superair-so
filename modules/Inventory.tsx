
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  Edit3, Filter, X, Warehouse, Boxes, Tag, Loader2, Trash2, Printer, 
  ChevronRight, Activity, TrendingUp, Info, Barcode, Camera, Smartphone,
  Zap, QrCode, AlertCircle, Save, DollarSign, Wallet, RefreshCcw, CheckCircle2,
  FileUp, Download, Table
} from 'lucide-react';
import { Product, Warehouse as WarehouseType } from '../types';
import { useNotification } from '../context/NotificationContext';

const Inventory: React.FC = () => {
  const { showToast } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWH, setSelectedWH] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form States
  const [productForm, setProductForm] = useState<Partial<Product>>({
      code: '', name: '', price: 0, cost: 0, stock: 0, min_stock: 5, category: '', unit_of_measure: 'Pza'
  });
  const [adjustData, setAdjustData] = useState({ newStock: 0, reason: 'Auditoría Física' });
  const [isSaving, setIsSaving] = useState(false);

  // Import State
  const [importData, setImportData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

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

  const handleSaveProduct = async () => {
      setIsSaving(true);
      try {
          const method = productForm.id ? 'PUT' : 'POST';
          const url = productForm.id ? `/api/products/${productForm.id}` : '/api/products';
          const res = await fetch(url, {
              method,
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(productForm)
          });
          if (res.ok) {
              showToast(productForm.id ? "Producto actualizado" : "Producto creado");
              setShowProductModal(false);
              fetchData();
          }
      } catch (e) { showToast("Error al guardar producto", "error"); }
      finally { setIsSaving(false); }
  };

  const handleAdjustStock = async () => {
      if (!selectedProduct) return;
      setIsSaving(true);
      try {
          const res = await fetch('/api/inventory/adjust', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ productId: selectedProduct.id, ...adjustData })
          });
          if (res.ok) {
              showToast("Stock ajustado correctamente");
              setShowAdjustModal(false);
              fetchData();
          }
      } catch (e) { showToast("Error al ajustar", "error"); }
      finally { setIsSaving(false); }
  };

  const handleDeleteProduct = async (id: string | number) => {
      if (!confirm("¿Eliminar este producto del catálogo permanentemente?")) return;
      try {
          const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
          if (res.ok) {
              showToast("Producto eliminado");
              fetchData();
          }
      } catch (e) { showToast("Error al eliminar", "error"); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const rows = text.split('\n').slice(1);
          const parsed = rows.filter(r => r.trim()).map(row => {
              const [code, name, category, cost, price, stock] = row.split(',');
              return { code, name, category, cost: parseFloat(cost), price: parseFloat(price), stock: parseInt(stock) || 0 };
          });
          setImportData(parsed);
      };
      reader.readAsText(file);
  };

  const processImport = async () => {
      setIsImporting(true);
      try {
          const res = await fetch('/api/products/bulk', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ products: importData })
          });
          if (res.ok) {
              showToast(`Importación exitosa: ${importData.length} productos`);
              setShowImportModal(false);
              setImportData([]);
              fetchData();
          }
      } catch (e) { showToast("Error al importar CSV", "error"); }
      finally { setIsImporting(false); }
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term) || (p.code && p.code.toLowerCase().includes(term)));
  }, [products, searchTerm]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Catálogo e Inventario</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión masiva y control de existencias en tiempo real.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                <FileUp size={16} /> Importar CSV
            </button>
            <button onClick={() => { setProductForm({code:'', name:'', price:0, cost:0, stock:0, min_stock:5, category:'', unit_of_measure:'Pza'}); setShowProductModal(true); }} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all shadow-xl">
                <Plus size={18} /> Nuevo Producto
            </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row items-center gap-6">
             <div className="flex-1 flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 w-full">
                 <Search className="text-slate-400" />
                 <input 
                    placeholder="Buscar por SKU, Nombre o Categoría..." 
                    className="w-full bg-transparent outline-none font-bold text-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
             <select className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest outline-none" value={selectedWH} onChange={e => setSelectedWH(e.target.value)}>
                <option value="all">Stock Global</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
             </select>
         </div>

         {loading ? <div className="p-32 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={40}/></div> : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-10 py-6">Producto</th>
                            <th className="px-10 py-6">SKU / Código</th>
                            <th className="px-10 py-6 text-center">Existencia</th>
                            <th className="px-10 py-6">Precio Venta</th>
                            <th className="px-10 py-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map(p => (
                            <tr key={p.id} className={`hover:bg-sky-50/20 transition-all group ${p.stock < p.min_stock ? 'bg-rose-50/20' : ''}`}>
                                <td className="px-10 py-6">
                                    <div className="font-black text-slate-900 text-sm">{p.name}</div>
                                    <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{p.category}</div>
                                </td>
                                <td className="px-10 py-6 font-mono font-bold text-slate-400 text-[11px]">{p.code}</td>
                                <td className="px-10 py-6 text-center">
                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-black text-sm border ${p.stock < p.min_stock ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        {p.stock} {p.unit_of_measure}
                                        {p.stock < p.min_stock && <AlertCircle size={14} className="animate-pulse" />}
                                    </div>
                                </td>
                                <td className="px-10 py-6 font-black text-slate-900">${Number(p.price).toLocaleString()}</td>
                                <td className="px-10 py-6 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setSelectedProduct(p); setAdjustData({newStock: p.stock, reason: 'Auditoría'}); setShowAdjustModal(true); }} className="p-2.5 bg-white text-amber-500 rounded-xl shadow-sm border border-slate-100 hover:bg-amber-50" title="Ajustar Stock"><RefreshCcw size={16}/></button>
                                        <button onClick={() => { setProductForm(p); setShowProductModal(true); }} className="p-2.5 bg-white text-sky-600 rounded-xl shadow-sm border border-slate-100 hover:bg-sky-50"><Edit3 size={16}/></button>
                                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 bg-white text-rose-500 rounded-xl shadow-sm border border-slate-100 hover:bg-rose-50"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
         )}
      </div>

      {/* MODAL PRODUCTO (Crear/Editar) */}
      {showProductModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">{productForm.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                      <button onClick={() => setShowProductModal(false)}><X className="text-slate-400" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Descriptivo</label>
                          <input className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={productForm.name} onChange={e=>setProductForm({...productForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Código</label>
                          <input className="w-full p-4 bg-slate-50 border rounded-2xl font-mono uppercase" value={productForm.code} onChange={e=>setProductForm({...productForm, code: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                          <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={productForm.category} onChange={e=>setProductForm({...productForm, category: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              <option>Equipos AC</option>
                              <option>Material de Instalación</option>
                              <option>Refacciones</option>
                              <option>Herramientas</option>
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo (Compra)</label>
                          <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-rose-600" value={productForm.cost} onChange={e=>setProductForm({...productForm, cost: parseFloat(e.target.value)})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio (Venta)</label>
                          <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-emerald-600" value={productForm.price} onChange={e=>setProductForm({...productForm, price: parseFloat(e.target.value)})} />
                      </div>
                  </div>
                  <button onClick={handleSaveProduct} disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                      Confirmar y Guardar en Catálogo
                  </button>
              </div>
          </div>
      )}

      {/* MODAL AJUSTE DE STOCK */}
      {showAdjustModal && selectedProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Ajuste de Auditoría</h3>
                      <button onClick={() => setShowAdjustModal(false)}><X className="text-slate-400" /></button>
                  </div>
                  <div className="space-y-6">
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Producto</p>
                          <p className="font-bold text-slate-800">{selectedProduct.name}</p>
                          <p className="text-xs text-slate-500 mt-2">Existencia Actual: <span className="font-black text-slate-900">{selectedProduct.stock} {selectedProduct.unit_of_measure}</span></p>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Existencia Física</label>
                          <input type="number" className="w-full p-5 bg-white border-2 border-amber-200 rounded-3xl font-black text-3xl text-center outline-none focus:border-amber-500" value={adjustData.newStock} onChange={e=>setAdjustData({...adjustData, newStock: parseInt(e.target.value)})} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo del Ajuste</label>
                          <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={adjustData.reason} onChange={e=>setAdjustData({...adjustData, reason: e.target.value})}>
                              <option>Auditoría Física</option>
                              <option>Merma / Daño</option>
                              <option>Error de Captura</option>
                              <option>Donación / Cortesía</option>
                          </select>
                      </div>
                      <button onClick={handleAdjustStock} disabled={isSaving} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2">
                          {isSaving ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} 
                          Validar Ajuste de Inventario
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL IMPORTACIÓN CSV */}
      {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <div className="flex justify-between items-center mb-8 shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl"><Table size={24}/></div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase">Importación Masiva</h3>
                      </div>
                      <button onClick={() => setShowImportModal(false)}><X className="text-slate-400" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center mb-8 hover:border-sky-400 transition-all group relative">
                          <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                          <FileUp size={48} className="mx-auto mb-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                          <p className="font-bold text-slate-600">Arrastra tu archivo CSV aquí o haz clic</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2">Solo archivos .csv delimitados por comas</p>
                      </div>

                      {importData.length > 0 && (
                          <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pre-visualización de Datos ({importData.length} items)</h4>
                              <div className="bg-white border rounded-2xl overflow-hidden">
                                  <table className="w-full text-[10px] font-bold text-left">
                                      <thead className="bg-slate-50 text-slate-400 uppercase">
                                          <tr><th className="p-3">SKU</th><th className="p-3">Nombre</th><th className="p-3">Precio</th><th className="p-3">Stock</th></tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {importData.slice(0, 5).map((row, i) => (
                                              <tr key={i}><td className="p-3">{row.code}</td><td className="p-3">{row.name}</td><td className="p-3">${row.price}</td><td className="p-3">{row.stock}</td></tr>
                                          ))}
                                          {importData.length > 5 && <tr><td colSpan={4} className="p-3 text-center text-slate-300 italic">... y {importData.length - 5} filas más</td></tr>}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex justify-end gap-4 shrink-0">
                      <button onClick={() => setShowImportModal(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
                      <button 
                        onClick={processImport} 
                        disabled={isImporting || importData.length === 0}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl disabled:opacity-50 flex items-center gap-2"
                      >
                        {isImporting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                        Confirmar Importación
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;

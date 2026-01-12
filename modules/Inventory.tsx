
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  Edit3, Filter, X, Warehouse, Boxes, Tag, Loader2, Trash2, Printer, 
  Calculator, FileSpreadsheet, Wrench, Briefcase, History, Download
} from 'lucide-react';
import { Product } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface Movement {
    id: number;
    product_name: string;
    user_name: string;
    type: 'Entrada' | 'Salida';
    quantity: number;
    reason: string;
    created_at: string;
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  
  // State for Print Mode
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, cost: 0, price_wholesale: 0, price_vip: 0,
    stock: 0, category: 'Refacción', type: 'product', min_stock: 5
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/products');
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        if(Array.isArray(data)) setProducts(data);
    } catch(e) { console.error("Failed to load inventory"); } 
    finally { setLoading(false); }
  };

  const fetchHistory = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/inventory/movements');
          const data = await res.json();
          if(Array.isArray(data)) setMovements(data);
      } catch(e) { console.error("Failed to load history"); }
      finally { setLoading(false); }
  };

  useEffect(() => { 
      if(activeTab === 'inventory') fetchProducts();
      if(activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
        alert("El nombre y precio público son obligatorios");
        return;
    }
    try {
        const payload = {
            ...newProduct,
            price: Number(newProduct.price) || 0,
            cost: Number(newProduct.cost) || 0,
            stock: newProduct.type === 'service' ? 0 : (Number(newProduct.stock) || 0),
            price_wholesale: Number(newProduct.price_wholesale) || 0,
            price_vip: Number(newProduct.price_vip) || 0
        };
        const res = await fetch('/api/products', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
        });
        if(res.ok) {
            setShowAddModal(false);
            setNewProduct({ name: '', description: '', price: 0, cost: 0, stock: 0, category: 'Refacción', type: 'product', min_stock: 5, price_wholesale: 0, price_vip: 0 });
            fetchProducts(); 
        }
    } catch(e) { alert("Error guardando producto."); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este ítem permanentemente?")) return;
    try {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        setProducts(products.filter(p => p.id !== id));
    } catch(e) { alert("Error al eliminar producto"); }
  };

  const calculatePrices = () => {
      const base = Number(newProduct.price) || 0;
      if (base <= 0) return;
      setNewProduct(prev => ({ ...prev, price_wholesale: Number((base * 0.90).toFixed(2)), price_vip: Number((base * 0.85).toFixed(2)) }));
  };

  const calculateMargin = (price: number, cost: number) => {
      if (!price || price === 0) return 0;
      return ((price - cost) / price) * 100;
  };

  // --- PDF GENERATION FOR INVENTORY SHEETS ---
  const generatePDF = () => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.text('Hoja de Conteo de Inventario', 14, 20);
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text('SuperAir ERP', 160, 20);

      // Filter only physical products
      const itemsToPrint = products.filter(p => p.type === 'product');

      const tableColumn = ["ID", "Categoría", "Producto", "Sistema", "Físico (Conteo)"];
      const tableRows: any[] = [];

      itemsToPrint.forEach((item) => {
          tableRows.push([
              item.id,
              item.category,
              item.name,
              item.stock,
              "__________" // Blank line for writing
          ]);
      });

      (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 35,
          theme: 'grid',
          headStyles: { fillColor: [14, 165, 233] },
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: {
              0: { cellWidth: 15 },
              3: { halign: 'center' },
              4: { halign: 'center' }
          }
      });

      doc.save(`Inventario_Conteo_${new Date().toISOString().slice(0,10)}.pdf`);
      setShowPrintModal(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const stats = {
    totalValue: products.filter(p => p.type === 'product').reduce((acc, p) => acc + (Number(p.cost || 0) * Number(p.stock)), 0),
    potentialProfit: products.filter(p => p.type === 'product').reduce((acc, p) => acc + ((Number(p.price) - Number(p.cost || 0)) * Number(p.stock)), 0),
    lowStock: products.filter(p => p.type === 'product' && Number(p.stock) < 5).length
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Inventario y Servicios</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión de activos, costos y listas de precios.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setActiveTab('inventory')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'inventory' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                Stock Actual
            </button>
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                Kardex (Historial)
            </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <>
            {/* Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <Boxes size={80} className="text-sky-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Costo Inventario Actual</p>
                <h3 className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalValue)}</h3>
                </div>
                
                <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <ArrowUpRight size={80} className="text-emerald-600" />
                </div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Utilidad Potencial Est.</p>
                <h3 className="text-3xl font-black text-emerald-900">{formatCurrency(stats.potentialProfit)}</h3>
                </div>

                <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <AlertTriangle size={80} className="text-rose-600" />
                </div>
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Stock Bajo / Crítico</p>
                <h3 className="text-3xl font-black text-rose-900">{stats.lowStock} Ítems</h3>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex gap-4">
                        <button onClick={() => setShowPrintModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200"><Printer size={16}/> Hojas de Conteo</button>
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-xl font-bold text-xs hover:bg-sky-700 shadow-lg shadow-sky-600/20"><Plus size={16}/> Nuevo Ítem</button>
                    </div>
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500 transition-all w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={32}/></div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                        <th className="px-8 py-5">Ítem</th>
                        <th className="px-8 py-5">Tipo</th>
                        <th className="px-8 py-5">Existencia</th>
                        <th className="px-8 py-5">Costo Unit.</th>
                        <th className="px-8 py-5">Precio Público</th>
                        <th className="px-8 py-5">Margen</th>
                        <th className="px-8 py-5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map((p) => {
                            const margin = calculateMargin(Number(p.price), Number(p.cost || 0));
                            return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${p.type === 'service' ? 'bg-purple-50 text-purple-500' : 'bg-slate-100 text-slate-400'}`}>
                                    {p.type === 'service' ? <Wrench size={18}/> : <Tag size={18} />}
                                    </div>
                                    <div>
                                    <p className="font-black text-slate-900">{p.name}</p>
                                    <p className="text-[10px] font-mono text-slate-400 uppercase">{p.category}</p>
                                    </div>
                                </div>
                                </td>
                                <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    p.type === 'service' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                                }`}>
                                    {p.type === 'service' ? 'Servicio' : 'Físico'}
                                </span>
                                </td>
                                <td className="px-8 py-6">
                                {p.type === 'service' ? (
                                    <span className="text-slate-300 font-bold">-</span>
                                ) : (
                                    <span className={`text-lg font-black ${Number(p.stock) < (p.min_stock || 5) ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock}</span>
                                )}
                                </td>
                                <td className="px-8 py-6 font-medium text-slate-500 text-xs">
                                {formatCurrency(Number(p.cost || 0))}
                                </td>
                                <td className="px-8 py-6 font-black text-slate-900">
                                {formatCurrency(Number(p.price))}
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`text-xs font-black ${margin < 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {margin.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleDeleteProduct(p.id)}
                                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>
                )}
            </div>
        </>
      ) : (
          /* HISTORY VIEW */
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8 animate-in fade-in">
              <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><History size={24}/></div>
                  <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">Kardex de Movimientos</h3>
                      <p className="text-xs text-slate-500">Auditoría completa de entradas y salidas.</p>
                  </div>
              </div>
              
              {loading ? <Loader2 className="animate-spin mx-auto text-indigo-600"/> : (
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              <tr>
                                  <th className="pb-4">Fecha</th>
                                  <th className="pb-4">Producto</th>
                                  <th className="pb-4">Tipo</th>
                                  <th className="pb-4">Cantidad</th>
                                  <th className="pb-4">Usuario</th>
                                  <th className="pb-4">Razón / Referencia</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {movements.map(m => (
                                  <tr key={m.id} className="hover:bg-slate-50">
                                      <td className="py-4 text-xs font-bold text-slate-500">
                                          {new Date(m.created_at).toLocaleDateString()} <span className="text-[9px] text-slate-400">{new Date(m.created_at).toLocaleTimeString()}</span>
                                      </td>
                                      <td className="py-4 font-black text-slate-800">{m.product_name}</td>
                                      <td className="py-4">
                                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                                              m.type === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                          }`}>
                                              {m.type}
                                          </span>
                                      </td>
                                      <td className="py-4 font-black text-slate-900">{m.quantity}</td>
                                      <td className="py-4 text-xs font-medium text-slate-600">{m.user_name}</td>
                                      <td className="py-4 text-xs text-slate-500 italic">{m.reason}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Hojas de Conteo</h3>
                      <button onClick={() => setShowPrintModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <p className="text-sm text-slate-500 leading-relaxed">
                          Genera un PDF listo para imprimir con la lista actual de productos físicos.
                          Útil para realizar auditorías de inventario manual.
                      </p>
                      
                      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-3">
                          <Package className="text-sky-600" size={24}/>
                          <div>
                              <p className="font-bold text-sky-900 text-sm">{products.filter(p => p.type === 'product').length} Productos Físicos</p>
                              <p className="text-xs text-sky-600">Se excluirán servicios.</p>
                          </div>
                      </div>

                      <button 
                          onClick={generatePDF}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-800 shadow-xl transition-all"
                      >
                          <Download size={16}/> Descargar PDF
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Nuevo Ítem</h3>
                 <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 {/* Row 1: Basic Info */}
                 <div className="grid grid-cols-3 gap-6">
                     <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Producto / Servicio</label>
                        <input 
                            value={newProduct.name}
                            onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                        <select 
                            value={newProduct.type}
                            onChange={e => setNewProduct({...newProduct, type: e.target.value as any})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        >
                           <option value="product">Producto Físico</option>
                           <option value="service">Servicio</option>
                        </select>
                     </div>
                 </div>

                 {/* Row 2: Category & Costs */}
                 <div className="grid grid-cols-3 gap-6">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                        <select 
                            value={newProduct.category}
                            onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        >
                           <option>Unidad AC</option>
                           <option>Refacción</option>
                           <option>Insumo</option>
                           <option>Herramienta</option>
                           <option>Servicio</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Unitario ($)</label>
                        <input type="number" value={newProduct.cost} onChange={e => setNewProduct({...newProduct, cost: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Público ($)</label>
                        <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sky-600" />
                     </div>
                 </div>

                 {/* Margin Display */}
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-500">Margen Esperado:</span>
                    <span className="font-black text-lg text-emerald-600">
                        {calculateMargin(Number(newProduct.price), Number(newProduct.cost)).toFixed(1)}%
                    </span>
                 </div>

                 {/* Row 3: Price Lists */}
                 <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Listas de Precios</h4>
                        <button 
                            onClick={calculatePrices}
                            type="button"
                            className="flex items-center gap-2 text-[10px] font-black text-sky-600 uppercase tracking-widest hover:bg-sky-50 px-3 py-1 rounded-lg transition-all"
                        >
                            <Calculator size={14}/> Calcular Automático
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Mayoreo (-10%)</label>
                            <input type="number" value={newProduct.price_wholesale} onChange={e => setNewProduct({...newProduct, price_wholesale: parseFloat(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio VIP (-15%)</label>
                            <input type="number" value={newProduct.price_vip} onChange={e => setNewProduct({...newProduct, price_vip: parseFloat(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                        </div>
                    </div>
                 </div>

                 {/* Row 4: Stock (Conditional) */}
                 {newProduct.type === 'product' && (
                     <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Inicial</label>
                            <input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alerta Mínimo</label>
                            <input type="number" value={newProduct.min_stock} onChange={e => setNewProduct({...newProduct, min_stock: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                        </div>
                     </div>
                 )}
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button onClick={handleSaveProduct} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20">Guardar en Base de Datos</button>
                 <button onClick={() => setShowAddModal(false)} className="px-10 py-4 bg-white text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

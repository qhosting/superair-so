import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  Edit3, Filter, X, Warehouse, Boxes, Tag, Loader2, Trash2
} from 'lucide-react';
import { Product } from '../types';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', stock: '', category: 'Refacción', min_stock: 5
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/products');
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        if(Array.isArray(data)) setProducts(data);
    } catch(e) { 
        console.error("Failed to load inventory");
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
        alert("El nombre y precio son obligatorios");
        return;
    }

    try {
        const payload = {
            ...newProduct,
            price: parseFloat(newProduct.price) || 0,
            stock: parseInt(newProduct.stock) || 0
        };

        const res = await fetch('/api/products', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            setShowAddModal(false);
            setNewProduct({ name: '', description: '', price: '', stock: '', category: 'Refacción', min_stock: 5 });
            fetchProducts(); 
        } else {
            throw new Error("Save Failed");
        }
    } catch(e) { 
        alert("Error guardando producto.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto permanentemente?")) return;
    try {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        setProducts(products.filter(p => p.id !== id));
    } catch(e) {
        alert("Error al eliminar producto");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const stats = {
    totalValue: products.reduce((acc, p) => acc + (Number(p.price) * Number(p.stock)), 0),
    lowStock: products.filter(p => Number(p.stock) < 5).length,
    totalItems: products.reduce((acc, p) => acc + Number(p.stock), 0)
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Inventario Central</h2>
          <p className="text-slate-500 text-sm font-medium">Control de activos en Base de Datos en Tiempo Real.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
              <Boxes size={80} className="text-sky-600" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total Activos</p>
           <h3 className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalValue)}</h3>
        </div>
        
        <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-10">
              <AlertTriangle size={80} className="text-rose-600" />
           </div>
           <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Stock Bajo / Crítico</p>
           <h3 className="text-3xl font-black text-rose-900">{stats.lowStock} Ítems</h3>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5">
              <Warehouse size={80} className="text-slate-600" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unidades Totales</p>
           <h3 className="text-3xl font-black text-slate-900">{stats.totalItems}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button className="flex items-center gap-3 px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white shadow-lg text-sky-600">
              <Package size={16} /> Stock Actual
            </button>
          </div>

          <div className="flex gap-4">
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
        </div>

        {loading ? (
             <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={32}/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Producto</th>
                  <th className="px-8 py-5">Categoría</th>
                  <th className="px-8 py-5">Existencia</th>
                  <th className="px-8 py-5">Precio Unit.</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-black">
                          <Tag size={18} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{p.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{p.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                         {p.category}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`text-lg font-black ${Number(p.stock) < 5 ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock}</span>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-900">
                      {formatCurrency(Number(p.price))}
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
                ))}
                {filteredProducts.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center p-10 text-slate-400">No hay productos en inventario.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Nuevo Producto</h3>
                 <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 grid grid-cols-2 gap-6">
                 <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</label>
                    <input 
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                    <select 
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                    >
                       <option>Unidad AC</option>
                       <option>Refacción</option>
                       <option>Insumo</option>
                       <option>Herramienta</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio</label>
                    <input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Inicial</label>
                    <input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                 </div>
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
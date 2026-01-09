
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  ArrowUpDown, 
  ChevronDown, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Edit3, 
  Trash2, 
  Filter, 
  MoreHorizontal,
  X,
  Warehouse,
  Truck,
  ShieldCheck,
  QrCode,
  Tag,
  Boxes,
  ClipboardList
} from 'lucide-react';
import { Product } from '../types';

interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'Entrada' | 'Salida';
  quantity: number;
  reason: string;
  date: string;
  user: string;
}

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showMovementModal, setShowMovementModal] = useState<{type: 'Entrada' | 'Salida', product: Product} | null>(null);

  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Mini Split Inverter 12k BTU', description: 'Unidad Solo Frío R410', price: 8500, stock: 12, category: 'Unidad AC' },
    { id: '2', name: 'Compresor Rotativo 1HP', description: 'Universal para 12k BTU', price: 3200, stock: 3, category: 'Refacción' },
    { id: '3', name: 'Gas Refrigerante R410a (11kg)', description: 'Boyon estándar', price: 2800, stock: 5, category: 'Insumo' },
    { id: '4', name: 'Tubería Cobre 1/4 (Rollo)', description: 'Tramo de 15 metros', price: 950, stock: 45, category: 'Insumo' },
  ]);

  const [movements] = useState<InventoryMovement[]>([
    { id: 'M1', productId: '1', productName: 'Mini Split Inverter 12k BTU', type: 'Salida', quantity: 2, reason: 'Instalación ORD-1001', date: '2024-05-18 10:30', user: 'Admin' },
    { id: 'M2', productId: '3', productName: 'Gas Refrigerante R410a', type: 'Entrada', quantity: 10, reason: 'Compra Proveedor HVAC-MX', date: '2024-05-17 15:45', user: 'Admin' },
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const stats = {
    totalValue: products.reduce((acc, p) => acc + (p.price * p.stock), 0),
    lowStock: products.filter(p => p.stock < 5).length,
    totalItems: products.reduce((acc, p) => acc + p.stock, 0)
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Inventario Central</h2>
          <p className="text-slate-500 text-sm font-medium">Control de activos, refacciones e insumos de instalación.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl">
            <QrCode size={18} className="text-sky-400" />
            Escanear QR
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Analytics Mini-Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
              <Boxes size={80} className="text-sky-600" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Total Activos</p>
           <h3 className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalValue)}</h3>
           <div className="mt-4 flex items-center gap-2 text-emerald-500 font-bold text-xs">
              <ArrowUpRight size={14} /> +2.4% vs mes anterior
           </div>
        </div>
        
        <div className="bg-rose-50 p-8 rounded-[2.5rem] border border-rose-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-10">
              <AlertTriangle size={80} className="text-rose-600" />
           </div>
           <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Stock Bajo / Crítico</p>
           <h3 className="text-3xl font-black text-rose-900">{stats.lowStock} Ítems</h3>
           <p className="mt-4 text-rose-500 text-xs font-bold uppercase tracking-widest">Requiere compra urgente</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5">
              <Warehouse size={80} className="text-slate-600" />
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unidades Totales</p>
           <h3 className="text-3xl font-black text-slate-900">{stats.totalItems}</h3>
           <p className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-widest">En 3 ubicaciones activas</p>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-3 px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'stock' ? 'bg-white shadow-lg text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Package size={16} /> Stock Actual
            </button>
            <button 
              onClick={() => setActiveTab('movements')}
              className={`flex items-center gap-3 px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'movements' ? 'bg-white shadow-lg text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <History size={16} /> Kardex / Movimientos
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
             <button className="p-3 bg-slate-50 border border-slate-200 text-slate-400 rounded-2xl hover:text-slate-600">
                <Filter size={20} />
             </button>
          </div>
        </div>

        {activeTab === 'stock' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Producto / SKU</th>
                  <th className="px-8 py-5">Categoría</th>
                  <th className="px-8 py-5">Ubicación</th>
                  <th className="px-8 py-5">Existencia</th>
                  <th className="px-8 py-5">Precio Unit.</th>
                  <th className="px-8 py-5 text-right">Ajuste Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center font-black group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                          <Tag size={18} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{p.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">SKU: SUP-{p.id.padStart(4, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                         {p.category}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                          <Warehouse size={14} className="text-slate-400" /> Bodega A-1
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          <span className={`text-lg font-black ${p.stock < 5 ? 'text-rose-600' : 'text-slate-900'}`}>{p.stock}</span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Piezas</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-900">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => setShowMovementModal({type: 'Entrada', product: p})}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Entrada de Almacén"
                          >
                             <ArrowDownLeft size={18} />
                          </button>
                          <button 
                            onClick={() => setShowMovementModal({type: 'Salida', product: p})}
                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                            title="Salida / Obra"
                          >
                             <ArrowUpRight size={18} />
                          </button>
                          <button className="p-2 text-slate-300 hover:text-sky-600 transition-colors">
                             <Edit3 size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5">Fecha / Hora</th>
                  <th className="px-8 py-5">Producto</th>
                  <th className="px-8 py-5">Tipo</th>
                  <th className="px-8 py-5">Cant.</th>
                  <th className="px-8 py-5">Razón / Referencia</th>
                  <th className="px-8 py-5">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-mono text-slate-400 text-xs">{m.date}</td>
                    <td className="px-8 py-5 font-black text-slate-800">{m.productName}</td>
                    <td className="px-8 py-5">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                         m.type === 'Entrada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                       }`}>
                         {m.type}
                       </span>
                    </td>
                    <td className="px-8 py-5 font-black text-slate-900">{m.quantity}</td>
                    <td className="px-8 py-5 text-slate-500 font-medium">{m.reason}</td>
                    <td className="px-8 py-5 font-bold text-slate-400">{m.user}</td>
                  </tr>
                ))}
              </tbody>
             </table>
          </div>
        )}
      </div>

      {/* Movement Modal (Entradas/Salidas) */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${showMovementModal.type === 'Entrada' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                       {showMovementModal.type === 'Entrada' ? <ArrowDownLeft size={24}/> : <ArrowUpRight size={24}/>}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{showMovementModal.type} de Almacén</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{showMovementModal.product.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowMovementModal(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              
              <div className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                       <input 
                        type="number" 
                        placeholder="0"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-black text-xl"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación Destino</label>
                       <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                          <option>Bodega Central</option>
                          <option>Unidad Servicio 01</option>
                          <option>Unidad Servicio 02</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón o Folio de Referencia</label>
                    <textarea 
                      placeholder="Ej: Compra a proveedor, Ajuste de inventario, Salida para Obra #..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-24 resize-none font-medium"
                    />
                 </div>
              </div>

              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={() => setShowMovementModal(null)}
                  className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${
                    showMovementModal.type === 'Entrada' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                 >Confirmar Registro</button>
                 <button 
                  onClick={() => setShowMovementModal(null)}
                  className="px-10 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                 >Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* Product Detail / Add Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Configurar Producto</h3>
                 <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 grid grid-cols-2 gap-6">
                 <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Producto / Insumo</label>
                    <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                       <option>Unidad AC</option>
                       <option>Refacción</option>
                       <option>Insumo</option>
                       <option>Herramienta</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidad de Medida</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                       <option>Pieza (PZA)</option>
                       <option>Metro (M)</option>
                       <option>Kilogramo (KG)</option>
                       <option>Litro (L)</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo de Venta (MXN)</label>
                    <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Mínimo Alerta</label>
                    <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20">Guardar en Catálogo</button>
                 <button onClick={() => setShowAddModal(false)} className="px-10 py-4 bg-white text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* Low Stock Warning Banner */}
      {stats.lowStock > 0 && (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500 blur-[100px] rounded-full"></div>
           </div>
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-amber-500 text-slate-900 rounded-3xl flex items-center justify-center animate-pulse">
                 <AlertTriangle size={32} />
              </div>
              <div>
                 <h4 className="text-xl font-black uppercase tracking-tighter">Atención: Inventario Crítico</h4>
                 <p className="text-slate-400 text-sm font-medium">Hay {stats.lowStock} productos por debajo del stock mínimo. ¿Deseas generar una orden de compra?</p>
              </div>
           </div>
           <button className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-sky-50 transition-all relative z-10">
              Generar Reabastecimiento
           </button>
        </div>
      )}
    </div>
  );
};

export default Inventory;

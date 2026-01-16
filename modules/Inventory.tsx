
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const [showScanner, setShowScanner] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const rows = text.split('\n').slice(1); // Omitir cabecera
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

  const downloadTemplate = () => {
      const csv = "sku,nombre,categoria,costo,precio,stock_inicial\nHV-SAMPLE,Carrier 1 Ton,Equipos AC,5000,8500,10";
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', 'plantilla_superair.csv');
      a.click();
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
            <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 shadow-xl shadow-sky-600/20">
                <Barcode size={16} /> Scanner
            </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-10 border-b border-slate-100 flex items-center gap-6">
             <div className="flex-1 flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
                 <Search className="text-slate-400" />
                 <input 
                    placeholder="Buscar por SKU, Nombre o Categoría..." 
                    className="w-full bg-transparent outline-none font-bold text-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
         </div>

         {loading ? <div className="p-32 flex justify-center"><Loader2 className="animate-spin text-sky-600" size={40}/></div> : (
             <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="px-10 py-6">Producto</th>
                        <th className="px-10 py-6">SKU</th>
                        <th className="px-10 py-6">Stock Global</th>
                        <th className="px-10 py-6">Precio (MXN)</th>
                        <th className="px-10 py-6 text-right">Detalles</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-sky-50/20 cursor-pointer group transition-all">
                            <td className="px-10 py-6">
                                <div className="font-black text-slate-900 text-sm">{p.name}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-black">{p.category}</div>
                            </td>
                            <td className="px-10 py-6 font-mono font-bold text-slate-400 text-[11px]">{p.code}</td>
                            <td className="px-10 py-6 font-black text-slate-900 text-lg">{p.stock}</td>
                            <td className="px-10 py-6 font-black text-emerald-600">${Number(p.price).toLocaleString()}</td>
                            <td className="px-10 py-6 text-right">
                                <button className="p-3 text-slate-200 group-hover:text-sky-500 group-hover:bg-white rounded-2xl shadow-sm transition-all"><ChevronRight size={20}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
         )}
      </div>

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

                  <div className="pt-8 border-t border-slate-100 flex justify-between items-center shrink-0">
                      <button onClick={downloadTemplate} className="flex items-center gap-2 text-[10px] font-black uppercase text-sky-600 hover:underline">
                          <Download size={14} /> Descargar Plantilla
                      </button>
                      <div className="flex gap-4">
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
          </div>
      )}
    </div>
  );
};

export default Inventory;

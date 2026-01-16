
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Plus, Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  Edit3, Filter, X, Warehouse, Boxes, Tag, Loader2, Trash2, Printer, 
  ChevronRight, Activity, TrendingUp, Info, Barcode, Camera, Smartphone,
  Zap, QrCode, AlertCircle, Save, DollarSign, Wallet, RefreshCcw, CheckCircle2
} from 'lucide-react';
import { Product, Warehouse as WarehouseType, UnitOfMeasure } from '../types';
import { useNotification } from '../context/NotificationContext';

const Inventory: React.FC = () => {
  const { showToast } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWH, setSelectedWH] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  
  // Advanced States
  const [showScanner, setShowScanner] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showValuation, setShowValuation] = useState(false);
  const [valuationData, setValuationData] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetails, setProductDetails] = useState<{breakdown: any[], movements: any[], serials: any[]} | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
      product_id: '', warehouse_id: '1', quantity: 1, type: 'Ajuste', reason: '', unit: 'Pza'
  });
  const [isAdjusting, setIsAdjusting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [prodRes, whRes, valRes] = await Promise.all([
            fetch(`/api/products?warehouse_id=${selectedWH}`),
            fetch('/api/warehouses'),
            fetch('/api/inventory/valuation')
        ]);
        if(prodRes.ok) setProducts(await prodRes.json());
        if(whRes.ok) setWarehouses(await whRes.json());
        if(valRes.ok) setValuationData(await valRes.json());
    } catch(e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedWH]);

  const startScanner = async () => {
      setIsScanning(true);
      setShowScanner(true);
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      } catch (err) {
          showToast("Error al acceder a la cámara", "error");
          setShowScanner(false);
      }
  };

  const stopScanner = () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsScanning(false);
      setShowScanner(false);
  };

  const handleLookup = async (code: string) => {
      stopScanner();
      setLoading(true);
      try {
          const res = await fetch(`/api/inventory/lookup/${code}`);
          if (res.ok) {
              const prod = await res.json();
              fetchProductDetails(prod);
          } else {
              showToast("SKU no encontrado", "error");
          }
      } catch (e) { showToast("Error de búsqueda", "error"); }
      finally { setLoading(false); }
  };

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

  const handleAdjustInventory = async () => {
      if (!adjustForm.reason || !adjustForm.product_id) return;
      setIsAdjusting(true);
      try {
          const res = await fetch('/api/inventory/adjust', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(adjustForm)
          });
          if (res.ok) {
              showToast("Inventario actualizado correctamente");
              setShowAdjustModal(false);
              fetchData();
          }
      } catch (e) { showToast("Error al ajustar", "error"); }
      finally { setIsAdjusting(false); }
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term) || (p.code && p.code.toLowerCase().includes(term)));
  }, [products, searchTerm]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="space-y-8 pb-20 relative animate-in fade-in duration-500">
      
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Logística & Suministros</h2>
          <p className="text-slate-500 text-sm font-medium">Control de activos HVAC con trazabilidad industrial.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <button 
                onClick={startScanner} 
                className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
            >
                <Camera size={16} /> Scanner Campo
            </button>
            <button 
                onClick={() => {
                    setAdjustForm({ ...adjustForm, product_id: '', type: 'Merma', reason: '' });
                    setShowAdjustModal(true);
                }} 
                className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all"
            >
                <AlertTriangle size={16} /> Reportar Merma
            </button>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                <select 
                    value={selectedWH}
                    onChange={e => setSelectedWH(e.target.value)}
                    className="px-4 py-2 bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer"
                >
                    <option value="all">🌐 Todas las Bodegas</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.type === 'Central' ? '🏢' : '🚚'} {w.name}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* Valuation Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-44">
             <DollarSign size={140} className="absolute -right-10 -bottom-10 opacity-5" />
             <div>
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-1">Valor de Inventario (MXN)</p>
                <h4 className="text-4xl font-black">{formatCurrency(valuationData?.total || 0)}</h4>
             </div>
             <p className="text-[10px] text-slate-400 font-bold uppercase">Costo Promedio Ponderado</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between h-44">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items en Stock Crítico</p>
                <div className="flex items-center gap-3">
                    <h4 className={`text-4xl font-black ${valuationData?.critical > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{valuationData?.critical || 0}</h4>
                    {valuationData?.critical > 0 && <AlertCircle size={24} className="text-rose-500 animate-pulse" />}
                </div>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-rose-500 h-full" style={{ width: `${Math.min((valuationData?.critical / products.length) * 100 || 0, 100)}%` }} />
                 </div>
             </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-between h-44">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rotación de Unidades</p>
                <div className="flex items-center gap-2">
                    <TrendingUp size={24} className="text-sky-500" />
                    <h4 className="text-4xl font-black text-slate-900">Alta</h4>
                </div>
             </div>
             <p className="text-[10px] text-slate-400 font-bold uppercase">Tendencia 7 días</p>
          </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-10 border-b border-slate-100 flex items-center gap-6 bg-slate-50/20">
             <div className="flex-1 flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
                 <Search className="text-slate-400" />
                 <input 
                    placeholder="Buscar SKU, Nombre, Modelo o Categoría..." 
                    className="w-full bg-transparent outline-none font-bold text-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
             <button onClick={() => setShowValuation(!showValuation)} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"><Info size={20}/></button>
         </div>

         {loading ? <div className="p-32 flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-sky-600" size={40}/><p className="text-xs font-black text-slate-300 uppercase tracking-widest">Sincronizando Almacenes...</p></div> : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-10 py-6">Material / Equipo</th>
                            <th className="px-10 py-6">SKU Maestro</th>
                            <th className="px-10 py-6">U.M.</th>
                            <th className="px-10 py-6">Existencia</th>
                            <th className="px-10 py-6">Valor Real</th>
                            <th className="px-10 py-6 text-right">Detalle</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map(p => (
                            <tr key={p.id} onClick={() => fetchProductDetails(p)} className="hover:bg-sky-50/20 cursor-pointer transition-all group">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 group-hover:text-sky-600 transition-colors">
                                            {p.category.includes('Aire') ? <Zap size={20} /> : <Boxes size={20} />}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-sm group-hover:text-sky-600 transition-colors">{p.name}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-black">{p.category}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-6 font-mono font-bold text-slate-400 text-[11px]">{p.code || 'S/N'}</td>
                                <td className="px-10 py-6">
                                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500 uppercase">{p.unit_of_measure || 'Pza'}</span>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xl font-black ${Number(p.stock) <= Number(p.min_stock) ? 'text-rose-600' : 'text-slate-900'}`}>
                                            {p.stock % 1 === 0 ? p.stock : Number(p.stock).toFixed(2)}
                                        </span>
                                        {Number(p.stock) <= Number(p.min_stock) && <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
                                    </div>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="text-sm font-black text-slate-700">{formatCurrency(Number(p.stock) * Number(p.cost))}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Costo: {formatCurrency(Number(p.cost))}</div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <button className="p-3 text-slate-200 group-hover:text-sky-500 group-hover:bg-white rounded-2xl shadow-sm transition-all"><ChevronRight size={20}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
         )}
      </div>

      {/* BARCODE SCANNER MODAL */}
      {showScanner && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[300] flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-lg space-y-8 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center text-white">
                      <h3 className="text-2xl font-black uppercase tracking-tight">Escaneo de Campo</h3>
                      <button onClick={stopScanner} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><X size={24}/></button>
                  </div>

                  <div className="relative aspect-square w-full rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-black">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      {/* Scanning Animation */}
                      <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none">
                          <div className="w-full h-full border-2 border-sky-400/50 rounded-2xl relative">
                              <div className="absolute top-0 left-0 w-full h-1 bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] animate-scan-line" />
                          </div>
                      </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 text-center">
                      <p className="text-white text-xs font-bold uppercase tracking-widest mb-6">Alinea el código de barras o QR dentro del recuadro</p>
                      <div className="flex gap-4">
                          <input 
                            placeholder="Introducir SKU Manual..." 
                            className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none font-bold"
                            value={scannedCode}
                            onChange={e => setScannedCode(e.target.value)}
                          />
                          <button onClick={() => handleLookup(scannedCode)} className="p-4 bg-sky-500 text-white rounded-2xl font-black uppercase text-xs">Identificar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ADJUSTMENT MODAL (Supports Fractional Units & Merma) */}
      {showAdjustModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Ajuste de Existencias</h3>
                      <button onClick={() => setShowAdjustModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Producto / Insumo</label>
                          <select 
                            className="w-full p-4 bg-slate-50 border rounded-2xl font-bold"
                            value={adjustForm.product_id}
                            onChange={e => {
                                const p = products.find(prod => prod.id.toString() === e.target.value);
                                setAdjustForm({...adjustForm, product_id: e.target.value, unit: p?.unit_of_measure || 'Pza'});
                            }}
                          >
                              <option value="">Seleccionar Artículo...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit_of_measure})</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo Movimiento</label>
                              <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={adjustForm.type} onChange={e=>setAdjustForm({...adjustForm, type: e.target.value})}>
                                  <option>Entrada</option>
                                  <option>Salida</option>
                                  <option>Merma</option>
                                  <option>Ajuste</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad ({adjustForm.unit})</label>
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-2xl" 
                                value={adjustForm.quantity} 
                                onChange={e=>setAdjustForm({...adjustForm, quantity: parseFloat(e.target.value)})} 
                              />
                          </div>
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo / Justificación Técnica</label>
                          <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-24 resize-none" placeholder="Ej: Daño en transporte, ajuste por inventario cíclico..." value={adjustForm.reason} onChange={e=>setAdjustForm({...adjustForm, reason: e.target.value})} />
                      </div>

                      <button onClick={handleAdjustInventory} disabled={isAdjusting} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2">
                          {isAdjusting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                          Confirmar Movimiento
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* DRAWER DETALLE PRODUCTO + GENERADOR QR */}
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
                      {/* ACCIONES RÁPIDAS PRODUCTO */}
                      <div className="grid grid-cols-2 gap-4">
                          <button className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-sky-50 hover:border-sky-200 transition-all group">
                              <QrCode size={32} className="text-slate-400 group-hover:text-sky-600 mb-2"/>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-sky-700">Imprimir Etiqueta</span>
                          </button>
                          <button onClick={() => { setShowAdjustModal(true); setAdjustForm({...adjustForm, product_id: selectedProduct.id.toString(), unit: selectedProduct.unit_of_measure}); }} className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-amber-50 hover:border-amber-200 transition-all group">
                              <Activity size={32} className="text-slate-400 group-hover:text-amber-600 mb-2"/>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-amber-700">Ajustar Stock</span>
                          </button>
                      </div>

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
                                              <span className={`text-xl font-black ${wh.stock > 0 ? 'text-sky-600' : 'text-slate-300'}`}>
                                                  {wh.stock} <span className="text-[10px] opacity-40 uppercase">{selectedProduct.unit_of_measure}</span>
                                              </span>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              {/* Kardex (Incluyendo Mermas) */}
                              <div>
                                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                      <Activity size={18} className="text-emerald-600"/> Historial de Movimientos
                                  </h4>
                                  <div className="space-y-3">
                                      {productDetails?.movements.map((m, i) => (
                                          <div key={i} className="p-4 rounded-2xl border border-slate-50 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                              <div className={`p-2 rounded-xl ${
                                                  m.type === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 
                                                  m.type === 'Merma' ? 'bg-rose-50 text-rose-600' : 
                                                  'bg-amber-50 text-amber-600'
                                              }`}>
                                                  {m.type === 'Entrada' ? <ArrowDownLeft size={16}/> : m.type === 'Merma' ? <AlertCircle size={16}/> : <ArrowUpRight size={16}/>}
                                              </div>
                                              <div className="flex-1">
                                                  <div className="flex justify-between">
                                                      <div>
                                                          <p className="font-bold text-slate-800 text-xs">{m.reason}</p>
                                                          <span className="text-[9px] font-black uppercase text-slate-400">{m.type}</span>
                                                      </div>
                                                      <span className={`font-black text-xs ${m.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                          {m.type === 'Entrada' ? '+' : '-'}{m.quantity} {selectedProduct.unit_of_measure}
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

      {/* Custom Animations for Scanner */}
      <style>{`
          @keyframes scanLine {
              0% { top: 0%; }
              100% { top: 100%; }
          }
          .animate-scan-line {
              animation: scanLine 2s linear infinite;
          }
      `}</style>
    </div>
  );
};

export default Inventory;

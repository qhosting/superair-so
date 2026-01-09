
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  MessageSquare, 
  Globe, 
  Mail, 
  ShieldCheck, 
  CreditCard, 
  ExternalLink, 
  ChevronRight, 
  Workflow, 
  Zap, 
  CheckCircle2, 
  Image as ImageIcon, 
  Palette, 
  FileText, 
  Lock, 
  Clock, 
  Save, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  Trash2, 
  Bell, 
  Languages, 
  DollarSign, 
  // Added missing Percent icon from lucide-react
  Percent
} from 'lucide-react';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'facturacion' | 'integrations' | 'seguridad'>('general');
  const [n8nStatus, setN8nStatus] = useState<'connected' | 'disconnected'>('connected');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => {
    return localStorage.getItem('superair_is_published') === 'false';
  });

  const handleMaintenanceToggle = () => {
    const newState = !isMaintenanceMode;
    setIsMaintenanceMode(newState);
    localStorage.setItem('superair_is_published', (!newState).toString());
  };

  const [companyInfo, setCompanyInfo] = useState({
    name: 'SuperAir de México S.A. de C.V.',
    rfc: 'SAM180512HVA',
    email: 'contacto@superair.com.mx',
    phone: '442 332 5814',
    address: 'Av. de la Luz 402, Juriquilla, Qro.',
    currency: 'MXN',
    timezone: 'America/Mexico_City'
  });

  const [billingInfo, setBillingInfo] = useState({
    taxRate: 16,
    quotePrefix: 'COT',
    orderPrefix: 'ORD',
    invoicePrefix: 'FACT',
    nextQuoteNumber: 1024,
    defaultTerms: '50/50'
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Tab Navigation High End */}
      <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap md:flex-nowrap gap-2">
        {[
          { id: 'general', label: 'General y Marca', icon: Globe },
          { id: 'facturacion', label: 'Facturación y Folios', icon: FileText },
          { id: 'integrations', label: 'Integraciones APIs', icon: Zap },
          { id: 'seguridad', label: 'Seguridad y Logs', icon: ShieldCheck },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Configuration Area */}
        <div className="lg:col-span-2 space-y-8 animate-in fade-in duration-500">
          
          {activeTab === 'general' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Perfil de Empresa</h3>
                 <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl"><Globe size={24}/></div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="col-span-2 flex items-center gap-8 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <div className="w-24 h-24 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-500 transition-all cursor-pointer group">
                       <ImageIcon size={32} />
                       <span className="text-[8px] font-black uppercase mt-2">Subir Logo</span>
                    </div>
                    <div>
                       <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg">Logotipo Institucional</h4>
                       <p className="text-xs text-slate-400 font-medium">Se utilizará en Cotizaciones, Facturas y Web.</p>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                    <input 
                      type="text" 
                      value={companyInfo.name}
                      onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC</label>
                    <input type="text" value={companyInfo.rfc} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Ventas</label>
                    <input type="email" value={companyInfo.email} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Principal</label>
                    <input type="text" value={companyInfo.phone} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                 </div>
                 <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Fiscal / Bodega</label>
                    <input type="text" value={companyInfo.address} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                 <button className="flex items-center gap-3 px-10 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20 hover:bg-sky-700 transition-all">
                    <Save size={18} /> Guardar Configuración
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'facturacion' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Impuestos y Folios</h3>
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24}/></div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Percent className="text-sky-500" size={16} /> Impuestos Locales
                    </h5>
                    <div className="flex items-center gap-4">
                       <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Tasa IVA (%)</label>
                          <input 
                            type="number" 
                            value={billingInfo.taxRate}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-sky-600"
                          />
                       </div>
                       <div className="flex-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Moneda Default</label>
                          <select className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black">
                             <option>MXN</option>
                             <option>USD</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <FileText className="text-sky-500" size={16} /> Serie y Folios
                    </h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Prefijo Cotiz.</label>
                          <input type="text" value={billingInfo.quotePrefix} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black" />
                       </div>
                       <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Siguiente No.</label>
                          <input type="number" value={billingInfo.nextQuoteNumber} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/10 rounded-2xl text-sky-400"><Languages size={24}/></div>
                    <h4 className="font-black text-lg uppercase tracking-tight">Región y Formatos</h4>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase">Zona Horaria (Field Jobs)</label>
                       <select className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold text-slate-200 outline-none">
                          <option>America/Mexico_City (GMT-6)</option>
                          <option>America/Tijuana (GMT-8)</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase">Formato de Fecha</label>
                       <select className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold text-slate-200 outline-none">
                          <option>DD / MM / YYYY</option>
                          <option>MM / DD / YYYY</option>
                       </select>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-8">
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                     <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Conexiones de Terceros</h3>
                     <button className="flex items-center gap-2 px-6 py-2 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest border border-slate-100 hover:text-sky-600 transition-all">
                        <RefreshCw size={14} /> Refrescar Todas
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* n8n */}
                     <div className="p-8 bg-orange-50/30 border border-orange-100 rounded-[2.5rem] group hover:border-orange-500 transition-all">
                        <div className="flex items-center justify-between mb-6">
                           <div className="p-3 bg-white shadow-sm rounded-2xl text-orange-600"><Workflow size={24}/></div>
                           <div className="flex items-center gap-2 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Activo
                           </div>
                        </div>
                        <h5 className="font-black text-slate-900 uppercase tracking-tight text-lg">Workflows n8n</h5>
                        <p className="text-xs text-slate-500 font-medium mb-6">Automatizaciones de CRM y Chatwoot activas.</p>
                        <button className="w-full py-3 bg-white border border-orange-200 text-orange-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-sm">Configurar Webhooks</button>
                     </div>

                     {/* Chatwoot */}
                     <div className="p-8 bg-indigo-50/30 border border-indigo-100 rounded-[2.5rem] group hover:border-indigo-500 transition-all">
                        <div className="flex items-center justify-between mb-6">
                           <div className="p-3 bg-white shadow-sm rounded-2xl text-indigo-600"><MessageSquare size={24}/></div>
                           <div className="flex items-center gap-2 bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Conectado
                           </div>
                        </div>
                        <h5 className="font-black text-slate-900 uppercase tracking-tight text-lg">Chatwoot Omni</h5>
                        <p className="text-xs text-slate-500 font-medium mb-6">WhatsApp y LiveChat sincronizados.</p>
                        <button className="w-full py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Ver API Keys</button>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 border-dashed flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-white rounded-2xl text-slate-400"><Bell size={24}/></div>
                     <div>
                        <h5 className="font-black text-slate-800 uppercase tracking-tight">Notificaciones Push</h5>
                        <p className="text-xs text-slate-500 font-medium">Envía alertas a los técnicos cuando tengan una nueva cita.</p>
                     </div>
                  </div>
                  <button className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl">Habilitar OneSignal</button>
               </div>
            </div>
          )}

          {activeTab === 'seguridad' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Seguridad del Sistema</h3>
                 <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Lock size={24}/></div>
              </div>

              <div className="space-y-8">
                 <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white rounded-2xl text-slate-400"><Clock size={24}/></div>
                       <div>
                          <h5 className="font-black text-slate-800 uppercase tracking-tight">Sesión Automática</h5>
                          <p className="text-xs text-slate-500 font-medium">Cerrar sesión tras inactividad.</p>
                       </div>
                    </div>
                    <select className="bg-white border border-slate-200 rounded-xl p-3 font-black text-xs outline-none">
                       <option>30 minutos</option>
                       <option>2 horas</option>
                       <option>Nunca</option>
                    </select>
                 </div>

                 <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white rounded-2xl text-slate-400"><ShieldCheck size={24}/></div>
                       <div>
                          <h5 className="font-black text-slate-800 uppercase tracking-tight">Registro de Auditoría</h5>
                          <p className="text-xs text-slate-500 font-medium">Guardar todas las acciones de usuarios (Logs).</p>
                       </div>
                    </div>
                    <div className="w-14 h-8 bg-sky-600 rounded-full p-1 cursor-pointer">
                       <div className="w-6 h-6 bg-white rounded-full ml-auto" />
                    </div>
                 </div>

                 <div className="p-8 bg-rose-50 rounded-[2.5rem] border border-rose-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-white rounded-2xl text-rose-500"><Trash2 size={24}/></div>
                       <div>
                          <h5 className="font-black text-rose-900 uppercase tracking-tight">Borrado de Datos</h5>
                          <p className="text-xs text-rose-500 font-medium">Eliminar permanentemente todos los registros demo.</p>
                       </div>
                    </div>
                    <button className="px-8 py-3 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-rose-600/20">Reiniciar Sistema</button>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Status & Quick Toggles */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
               <AlertTriangle size={120} />
            </div>
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-6">
                  <h4 className="font-black text-lg uppercase tracking-tight">Status Público</h4>
                  <div className={`w-3 h-3 rounded-full ${isMaintenanceMode ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
               </div>
               <p className="text-xs text-slate-400 mb-8 leading-relaxed font-medium">
                 El sitio web de SuperAir está actualmente <strong>{isMaintenanceMode ? 'en Mantenimiento' : 'Público y Operativo'}</strong>.
               </p>
               <button 
                onClick={handleMaintenanceToggle}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  isMaintenanceMode 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-white text-slate-900 hover:bg-sky-50'
                }`}
               >
                  {isMaintenanceMode ? 'Habilitar Sitio Web' : 'Activar Mantenimiento'}
               </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
             <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg">Salud del ERP</h4>
             <div className="space-y-4">
                {[
                  { label: 'Base de Datos', status: 'Excelente', color: 'text-emerald-500' },
                  { label: 'Almacenamiento (Cloud)', status: '85% Libre', color: 'text-sky-500' },
                  { label: 'Uptime Sistema', status: '99.9%', color: 'text-emerald-500' },
                  { label: 'API Gemini', status: 'Latencia: 140ms', color: 'text-emerald-500' },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                     <span className={`text-[10px] font-black uppercase ${item.color}`}>{item.status}</span>
                  </div>
                ))}
             </div>
             <button className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all">Ver Reporte Técnico</button>
          </div>

          <div className="bg-sky-600 p-8 rounded-[3rem] text-white shadow-xl shadow-sky-600/30 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <Palette size={32} />
             </div>
             <h4 className="font-black text-lg uppercase tracking-tight mb-2">Editor de Temas</h4>
             <p className="text-xs text-sky-100 mb-6 font-medium leading-relaxed">Personaliza el diseño de tus correos y el dashboard administrativo.</p>
             <button className="px-8 py-3 bg-white text-sky-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-sky-50 transition-all">Abrir Editor UI</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

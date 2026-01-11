import React, { useState, useEffect } from 'react';
import { 
  Globe, Save, AlertTriangle, CheckCircle2, Image as ImageIcon, 
  RefreshCw, DollarSign, Wallet, MapPin, Clock, Calendar, BarChart3, 
  Search, BrainCircuit, LayoutTemplate, Database, Power,
  Landmark, CreditCard
} from 'lucide-react';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[200] ${type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'}`}>
            {type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertTriangle size={20} />}
            <span className="font-bold text-xs uppercase tracking-widest">{message}</span>
        </div>
    );
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'treasury' | 'marketing' | 'operations' | 'system'>('general');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => localStorage.getItem('superair_is_published') === 'false');

  // Configuration States
  const [companyInfo, setCompanyInfo] = useState({
    name: '', rfc: '', email: '', phone: '', address: '', website: '', brandColor: '#0ea5e9'
  });
  
  const [treasuryInfo, setTreasuryInfo] = useState({
    bankName: '', accountNumber: '', clabe: '', beneficiary: '', reference: ''
  });

  const [marketingInfo, setMarketingInfo] = useState({
    seoTitle: '', seoDescription: '', seoKeywords: '', googleAnalyticsId: '', aiTone: 'Profesional', aiTopics: ''
  });

  const [geoInfo, setGeoInfo] = useState({
    lat: 0, lng: 0, mapsUrl: ''
  });

  const [scheduleInfo, setScheduleInfo] = useState({
    monday: { open: '09:00', close: '18:00', active: true },
    tuesday: { open: '09:00', close: '18:00', active: true },
    wednesday: { open: '09:00', close: '18:00', active: true },
    thursday: { open: '09:00', close: '18:00', active: true },
    friday: { open: '09:00', close: '18:00', active: true },
    saturday: { open: '09:00', close: '14:00', active: true },
    sunday: { open: '00:00', close: '00:00', active: false }
  });

  useEffect(() => {
    const loadData = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            
            if (data.company_info) setCompanyInfo(prev => ({ ...prev, ...data.company_info }));
            if (data.treasury_info) setTreasuryInfo(prev => ({ ...prev, ...data.treasury_info }));
            if (data.marketing_info) setMarketingInfo(prev => ({ ...prev, ...data.marketing_info }));
            if (data.geo_info) setGeoInfo(prev => ({ ...prev, ...data.geo_info }));
            if (data.schedule_info) setScheduleInfo(prev => ({ ...prev, ...data.schedule_info }));
        } catch (e) { console.error("Error loading settings", e); }
    };
    loadData();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const saveSettings = async (category: string, data: any) => {
      setIsSaving(true);
      try {
          await fetch('/api/settings', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ category, data })
          });
          showToast('Configuración guardada correctamente');
      } catch(e) {
          showToast('Error al guardar cambios', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const toggleMaintenance = () => {
      const newState = !isMaintenanceMode;
      setIsMaintenanceMode(newState);
      localStorage.setItem('superair_is_published', (!newState).toString());
      showToast(newState ? 'Sitio puesto en Mantenimiento' : 'Sitio publicado exitosamente');
  };

  // --- TAB RENDERERS ---

  const renderCompany = () => (
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <Globe size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Identidad Corporativa</h3>
                  <p className="text-slate-400 font-medium text-xs">Datos visibles en documentos y pie de página.</p>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                  <input value={companyInfo.name} onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC</label>
                  <input value={companyInfo.rfc} onChange={e => setCompanyInfo({...companyInfo, rfc: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                  <input value={companyInfo.phone} onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Fiscal</label>
                  <textarea value={companyInfo.address} onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold h-24 resize-none" />
              </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => saveSettings('company_info', companyInfo)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} Guardar
              </button>
          </div>
      </div>
  );

  const renderTreasury = () => (
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                  <Landmark size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Tesorería y Pagos</h3>
                  <p className="text-slate-400 font-medium text-xs">Datos bancarios para transferencias SPEI.</p>
              </div>
          </div>
          <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 mb-6">
              <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm mb-2">
                  <Wallet size={18} />
                  <span>Información Pública</span>
              </div>
              <p className="text-xs text-emerald-600/80 leading-relaxed">
                  Estos datos aparecerán automáticamente en las cotizaciones y órdenes de venta PDF para que tus clientes realicen el pago.
              </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banco</label>
                  <input placeholder="Ej. BBVA Bancomer" value={treasuryInfo.bankName} onChange={e => setTreasuryInfo({...treasuryInfo, bankName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuenta</label>
                  <input placeholder="1234567890" value={treasuryInfo.accountNumber} onChange={e => setTreasuryInfo({...treasuryInfo, accountNumber: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CLABE Interbancaria</label>
                  <input placeholder="18 dígitos" value={treasuryInfo.clabe} onChange={e => setTreasuryInfo({...treasuryInfo, clabe: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Beneficiario</label>
                  <input value={treasuryInfo.beneficiary} onChange={e => setTreasuryInfo({...treasuryInfo, beneficiary: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referencia Predeterminada</label>
                  <input value={treasuryInfo.reference} onChange={e => setTreasuryInfo({...treasuryInfo, reference: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="Ej. NUMERO DE PEDIDO" />
              </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => saveSettings('treasury_info', treasuryInfo)} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} Actualizar Datos
              </button>
          </div>
      </div>
  );

  const renderMarketing = () => (
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                  <BarChart3 size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Marketing & SEO</h3>
                  <p className="text-slate-400 font-medium text-xs">Visibilidad web y configuración del Asistente IA.</p>
              </div>
          </div>

          {/* SEO Section */}
          <div className="space-y-6">
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                  <Search size={16} className="text-indigo-500"/> Optimización de Búsqueda (SEO)
              </h4>
              <div className="grid grid-cols-1 gap-6">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta Title</label>
                      <input value={marketingInfo.seoTitle} onChange={e => setMarketingInfo({...marketingInfo, seoTitle: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="SuperAir - Expertos en Aire Acondicionado" />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta Description</label>
                      <textarea value={marketingInfo.seoDescription} onChange={e => setMarketingInfo({...marketingInfo, seoDescription: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm h-24 resize-none" placeholder="Breve descripción que aparecerá en Google..." />
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Analytics ID</label>
                      <input value={marketingInfo.googleAnalyticsId} onChange={e => setMarketingInfo({...marketingInfo, googleAnalyticsId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-sm" placeholder="G-XXXXXXXXXX" />
                  </div>
              </div>
          </div>

          <div className="border-t border-slate-100 my-6"></div>

          {/* AI Persona Section */}
          <div className="space-y-6">
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                  <BrainCircuit size={16} className="text-purple-500"/> Personalidad Asistente IA
              </h4>
              <div className="grid grid-cols-2 gap-6">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tono de Voz</label>
                      <select value={marketingInfo.aiTone} onChange={e => setMarketingInfo({...marketingInfo, aiTone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                          <option>Profesional y Técnico</option>
                          <option>Amigable y Cercano</option>
                          <option>Vendedor Agresivo</option>
                          <option>Minimalista</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temas Clave</label>
                      <input value={marketingInfo.aiTopics} onChange={e => setMarketingInfo({...marketingInfo, aiTopics: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" placeholder="Ahorro, Confort, Tecnología..." />
                  </div>
              </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => saveSettings('marketing_info', marketingInfo)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} Guardar Configuración
              </button>
          </div>
      </div>
  );

  const renderOperations = () => (
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                  <Clock size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Operaciones</h3>
                  <p className="text-slate-400 font-medium text-xs">Horarios de atención y ubicación geográfica.</p>
              </div>
          </div>

          {/* Schedule Builder */}
          <div className="space-y-4">
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm mb-4">Horario Semanal</h4>
              {Object.entries(scheduleInfo).map(([day, config]: [string, any]) => (
                  <div key={day} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-24 font-black text-xs uppercase text-slate-500">{day}</div>
                      <div className="flex items-center gap-2">
                          <input type="time" value={config.open} onChange={(e) => setScheduleInfo({...scheduleInfo, [day]: { ...config, open: e.target.value }})} className="p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white" disabled={!config.active} />
                          <span className="text-slate-400 text-[10px] font-black">A</span>
                          <input type="time" value={config.close} onChange={(e) => setScheduleInfo({...scheduleInfo, [day]: { ...config, close: e.target.value }})} className="p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white" disabled={!config.active} />
                      </div>
                      <button 
                          onClick={() => setScheduleInfo({...scheduleInfo, [day]: { ...config, active: !config.active }})}
                          className={`ml-auto px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${config.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}
                      >
                          {config.active ? 'Abierto' : 'Cerrado'}
                      </button>
                  </div>
              ))}
          </div>

          <div className="border-t border-slate-100 my-6"></div>

          {/* Geo */}
          <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm mb-4 flex items-center gap-2">
                      <MapPin size={16} className="text-amber-500"/> Ubicación Geográfica
                  </h4>
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Latitud</label>
                  <input type="number" value={geoInfo.lat} onChange={e => setGeoInfo({...geoInfo, lat: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Longitud</label>
                  <input type="number" value={geoInfo.lng} onChange={e => setGeoInfo({...geoInfo, lng: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Maps Link</label>
                  <input value={geoInfo.mapsUrl} onChange={e => setGeoInfo({...geoInfo, mapsUrl: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sky-600" />
              </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                  <button onClick={() => { saveSettings('schedule_info', scheduleInfo); saveSettings('geo_info', geoInfo); }} className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
                      {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} Actualizar Operaciones
                  </button>
              </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Panel de Configuración</h2>
            <p className="text-slate-500 text-sm font-medium">Administración integral del negocio.</p>
        </div>
        
        {/* Nav Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full shadow-inner">
            {[
                { id: 'general', label: 'Empresa', icon: Globe },
                { id: 'treasury', label: 'Tesorería', icon: Landmark },
                { id: 'marketing', label: 'Marketing', icon: BarChart3 },
                { id: 'operations', label: 'Operaciones', icon: Clock },
                { id: 'system', label: 'Sistema', icon: Database },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                >
                    <tab.icon size={16} className={activeTab === tab.id ? 'text-sky-600' : 'text-slate-400'} />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
              {activeTab === 'general' && renderCompany()}
              {activeTab === 'treasury' && renderTreasury()}
              {activeTab === 'marketing' && renderMarketing()}
              {activeTab === 'operations' && renderOperations()}
              
              {activeTab === 'system' && (
                  <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                          <h3 className="text-2xl font-black uppercase tracking-tight mb-6">Estado del Sistema</h3>
                          <div className="space-y-6">
                              <div className="flex justify-between items-center p-4 bg-white/10 rounded-2xl border border-white/10">
                                  <div>
                                      <h4 className="font-bold text-sm">Modo Mantenimiento</h4>
                                      <p className="text-xs text-slate-400">Desactiva el acceso público a la Landing Page.</p>
                                  </div>
                                  <button 
                                      onClick={toggleMaintenance}
                                      className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isMaintenanceMode ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}
                                  >
                                      {isMaintenanceMode ? 'Activo' : 'Inactivo'}
                                  </button>
                              </div>
                              <div className="flex justify-between items-center p-4 bg-white/10 rounded-2xl border border-white/10">
                                  <div>
                                      <h4 className="font-bold text-sm">Versión Actual</h4>
                                      <p className="text-xs text-slate-400">v3.5.0 (Producción)</p>
                                  </div>
                                  <div className="px-4 py-2 bg-slate-800 rounded-xl font-mono text-xs text-sky-400">
                                      Stable Build
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
              <div className="bg-sky-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-20"><Wallet size={120}/></div>
                  <h4 className="font-black text-xl uppercase tracking-tight mb-2 relative z-10">Facturación Simplificada</h4>
                  <p className="text-xs text-sky-100 leading-relaxed relative z-10 font-medium">
                      Este sistema opera en modo "Gestión Interna". No requiere conexión con PAC ni sellos digitales. Las órdenes generan comprobantes PDF simples.
                  </p>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-900 uppercase tracking-tight mb-4">Accesos Rápidos</h4>
                  <div className="space-y-3">
                      <button className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 text-left px-4 flex items-center justify-between group">
                          Ver Landing Page <Globe size={14} className="text-slate-400 group-hover:text-sky-600"/>
                      </button>
                      <button className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 text-left px-4 flex items-center justify-between group">
                          Backup Manual <Database size={14} className="text-slate-400 group-hover:text-emerald-600"/>
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;
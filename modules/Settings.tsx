import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Globe, Mail, ShieldCheck, CreditCard, 
  Workflow, Zap, CheckCircle2, Image as ImageIcon, Palette, FileText, 
  Lock, Clock, Save, AlertTriangle, RefreshCw, Eye, Trash2, 
  Languages, DollarSign, Percent, Download, LayoutTemplate, 
  Edit, UploadCloud, Database, Server, Smartphone, Key, X, Link as LinkIcon
} from 'lucide-react';
import { Template } from '../types';

// --- Components ---

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 ${type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'}`}>
            {type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertTriangle size={20} />}
            <span className="font-bold text-xs uppercase tracking-widest">{message}</span>
        </div>
    );
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'templates' | 'system' | 'integrations'>('general');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(() => localStorage.getItem('superair_is_published') === 'false');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  // Data State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Config State
  const [companyInfo, setCompanyInfo] = useState({
    name: '', rfc: '', email: '', phone: '', address: '', website: '', brandColor: '#0ea5e9'
  });
  const [billingInfo, setBillingInfo] = useState({
    taxRate: 16, quotePrefix: 'COT', nextQuoteNumber: 1000, csdUploaded: false
  });
  const [integrationsInfo, setIntegrationsInfo] = useState({
      n8n_sync_client: '',
      n8n_new_quote: '',
      n8n_order_paid: ''
  });
  const [showN8nConfig, setShowN8nConfig] = useState(false);

  // PWA
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Load Initial Data
    const loadData = async () => {
        try {
            const [tplRes, setRes] = await Promise.all([fetch('/api/templates'), fetch('/api/settings')]);
            const tplData = await tplRes.json();
            const setData = await setRes.json();

            if(Array.isArray(tplData)) {
                setTemplates(tplData);
                if(tplData.length > 0) setSelectedTemplate(tplData[0]);
            }
            if (setData.company_info) setCompanyInfo(prev => ({ ...prev, ...setData.company_info }));
            if (setData.billing_info) setBillingInfo(prev => ({ ...prev, ...setData.billing_info }));
            if (setData.integrations) setIntegrationsInfo(prev => ({ ...prev, ...setData.integrations }));
        } catch (e) { console.error("Error init settings", e); }
    };
    loadData();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const handleSaveConfig = async () => {
      setIsSaving(true);
      try {
          await fetch('/api/settings', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ category: 'company_info', data: companyInfo })
          });
          await fetch('/api/settings', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ category: 'billing_info', data: billingInfo })
          });
          showToast('Configuración guardada correctamente');
      } catch(e) {
          showToast('Error al guardar cambios', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveIntegrations = async () => {
      setIsSaving(true);
      try {
          await fetch('/api/settings', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ category: 'integrations', data: integrationsInfo })
          });
          showToast('Integraciones actualizadas correctamente');
          setShowN8nConfig(false);
      } catch(e) {
          showToast('Error guardando integraciones', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveTemplate = async () => {
      if (!selectedTemplate) return;
      setIsSaving(true);
      try {
          await fetch(`/api/templates/${selectedTemplate.code}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  subject: selectedTemplate.subject,
                  content: selectedTemplate.content
              })
          });
          showToast('Plantilla actualizada');
          // Update local
          setTemplates(templates.map(t => t.id === selectedTemplate.id ? selectedTemplate : t));
      } catch (e) {
          showToast('Error al actualizar plantilla', 'error');
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

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') setIsInstallable(false);
      setDeferredPrompt(null);
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header & Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Configuración</h2>
            <p className="text-slate-500 text-sm font-medium">Administración global del sistema ERP.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full">
            {[
                { id: 'general', label: 'Empresa', icon: Globe },
                { id: 'billing', label: 'Fiscal', icon: FileText },
                { id: 'templates', label: 'Plantillas', icon: LayoutTemplate },
                { id: 'integrations', label: 'Apps', icon: Zap },
                { id: 'system', label: 'Sistema', icon: Server },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeTab === tab.id ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <tab.icon size={16} className={activeTab === tab.id ? 'text-sky-600' : ''} />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="p-10 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identidad Corporativa</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">Información visible en documentos y web.</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <Globe size={24} />
                        </div>
                    </div>
                    <div className="p-10 space-y-8">
                        <div className="flex gap-8 items-start">
                            <div className="group relative w-32 h-32 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-sky-500 transition-all">
                                <ImageIcon size={32} className="text-slate-300 group-hover:text-sky-500 transition-colors mb-2" />
                                <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-sky-600">Subir Logo</span>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Color de Marca</label>
                                    <div className="flex items-center gap-3 mt-2">
                                        <input 
                                            type="color" 
                                            value={companyInfo.brandColor}
                                            onChange={(e) => setCompanyInfo({...companyInfo, brandColor: e.target.value})}
                                            className="w-12 h-12 rounded-2xl border-none cursor-pointer bg-transparent"
                                        />
                                        <div className="flex-1">
                                            <input 
                                                value={companyInfo.brandColor}
                                                onChange={(e) => setCompanyInfo({...companyInfo, brandColor: e.target.value})}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                                <input 
                                    value={companyInfo.name}
                                    onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC</label>
                                <input 
                                    value={companyInfo.rfc}
                                    onChange={(e) => setCompanyInfo({...companyInfo, rfc: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                                <input 
                                    value={companyInfo.phone}
                                    onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Fiscal</label>
                                <input 
                                    value={companyInfo.address}
                                    onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button onClick={handleSaveConfig} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-lg">
                            {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />}
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Parámetros Fiscales</h3>
                                <p className="text-xs text-slate-400 font-bold mt-1">Configuración para CFDI 4.0</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                                <div className="flex items-center gap-3 text-slate-800 font-black text-sm uppercase">
                                    <Percent size={16} className="text-emerald-500"/> Tasa Impuesto
                                </div>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number" 
                                        value={billingInfo.taxRate}
                                        onChange={(e) => setBillingInfo({...billingInfo, taxRate: parseFloat(e.target.value)})}
                                        className="flex-1 p-3 bg-white border border-slate-200 rounded-xl font-black text-lg outline-none"
                                    />
                                    <span className="font-bold text-slate-400">%</span>
                                </div>
                            </div>
                            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                                <div className="flex items-center gap-3 text-slate-800 font-black text-sm uppercase">
                                    <FileText size={16} className="text-sky-500"/> Serie Facturación
                                </div>
                                <input 
                                    type="text" 
                                    value={billingInfo.quotePrefix}
                                    onChange={(e) => setBillingInfo({...billingInfo, quotePrefix: e.target.value})}
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-lg outline-none"
                                />
                            </div>
                        </div>

                        {/* CSD Vault Simulation */}
                        <div className="border-t border-slate-100 pt-8">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Key size={16} className="text-amber-500"/> Certificados Digitales (CSD)
                            </h4>
                            
                            {billingInfo.csdUploaded ? (
                                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 size={20}/></div>
                                        <div>
                                            <p className="font-bold text-emerald-900 text-xs uppercase">Certificados Activos</p>
                                            <p className="text-[10px] text-emerald-700 font-mono">Vence: 12/2026</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setBillingInfo({...billingInfo, csdUploaded: false})} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg"><Trash2 size={16}/></button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center hover:border-amber-400 hover:bg-amber-50/10 transition-all cursor-pointer" onClick={() => setBillingInfo({...billingInfo, csdUploaded: true})}>
                                    <UploadCloud size={32} className="text-slate-300 mb-2"/>
                                    <p className="text-xs font-bold text-slate-500">Click para cargar .CER y .KEY</p>
                                    <p className="text-[9px] text-slate-400 mt-1">Requerido para timbrar facturas.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleSaveConfig} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-lg">
                            {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />}
                            Actualizar Fiscal
                        </button>
                    </div>
                </div>
            )}

            {/* TEMPLATES TAB */}
            {activeTab === 'templates' && (
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300 p-10 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Motor de Plantillas</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">Personaliza la comunicación automática.</p>
                        </div>
                        <div className="flex gap-2">
                            {templates.map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        selectedTemplate?.id === t.id 
                                        ? 'bg-indigo-600 text-white border-indigo-600' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedTemplate ? (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            <input 
                                value={selectedTemplate.subject || ''}
                                onChange={(e) => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                                placeholder="Asunto del correo"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 shrink-0"
                            />
                            <textarea 
                                value={selectedTemplate.content}
                                onChange={(e) => setSelectedTemplate({...selectedTemplate, content: e.target.value})}
                                className="flex-1 w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 overflow-y-auto custom-scrollbar"
                            />
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shrink-0">
                                <div className="flex gap-2">
                                    {selectedTemplate.variables.map(v => (
                                        <span key={v} className="px-2 py-1 bg-white border border-slate-200 rounded text-[9px] font-mono text-indigo-500">{v}</span>
                                    ))}
                                </div>
                                <button onClick={handleSaveTemplate} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-indigo-700 transition-all">
                                    <Save size={14} /> Guardar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-300 flex-col">
                            <LayoutTemplate size={48} className="mb-4"/>
                            <p className="text-xs font-bold uppercase">Selecciona una plantilla</p>
                        </div>
                    )}
                </div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === 'integrations' && (
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300 p-10">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Conectores y Apps</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl border border-orange-200 hover:shadow-lg transition-all group bg-orange-50/20">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-orange-100 text-orange-600">
                                    <Workflow size={24} />
                                </div>
                                <div className={`w-3 h-3 rounded-full ${integrationsInfo.n8n_sync_client ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </div>
                            <h4 className="font-black text-slate-900 text-sm uppercase tracking-wide">n8n Workflow</h4>
                            <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">Automatización de procesos y webhooks para CRM, cotizaciones y más.</p>
                            <button 
                                onClick={() => setShowN8nConfig(true)}
                                className="w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest bg-orange-600 text-white hover:bg-orange-700 transition-all"
                            >
                                Configurar Webhooks
                            </button>
                        </div>

                        {[
                            { name: 'Google Workspace', desc: 'Sync con Calendar y Drive.', icon: Globe, color: 'text-blue-500', connected: true },
                            { name: 'Chatwoot', desc: 'Omnicanalidad para soporte.', icon: Zap, color: 'text-indigo-500', connected: false },
                            { name: 'Stripe Payments', desc: 'Pasarela de pagos en línea.', icon: CreditCard, color: 'text-violet-500', connected: false },
                        ].map((app, idx) => (
                            <div key={idx} className="p-6 rounded-3xl border border-slate-100 hover:shadow-lg transition-all group bg-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl bg-slate-50 ${app.color} group-hover:scale-110 transition-transform`}>
                                        <app.icon size={24} />
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${app.connected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-200'}`} />
                                </div>
                                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wide">{app.name}</h4>
                                <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">{app.desc}</p>
                                <button className={`w-full py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${
                                    app.connected 
                                    ? 'border-slate-200 text-slate-400 hover:bg-slate-50' 
                                    : 'bg-slate-900 text-white border-transparent hover:bg-slate-800'
                                }`}>
                                    {app.connected ? 'Configurar' : 'Conectar'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SYSTEM TAB */}
            {activeTab === 'system' && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-900 text-white rounded-[3rem] shadow-2xl p-10 relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Centro de Respaldos</h3>
                                <p className="text-slate-400 text-sm mt-1">Snapshots de la base de datos PostgreSQL.</p>
                            </div>
                            <Database size={48} className="text-slate-700" />
                        </div>
                        <div className="mt-8 grid grid-cols-3 gap-4 relative z-10">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col gap-2">
                                    <div className="flex justify-between text-[10px] font-mono text-sky-400">
                                        <span>BACKUP_{1000+i}.SQL</span>
                                        <span>24MB</span>
                                    </div>
                                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 w-full" />
                                    </div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Hace {i*12} Horas</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-8 border-t border-slate-800 flex justify-end gap-4 relative z-10">
                            <button className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest transition-all">
                                Restaurar Versión
                            </button>
                            <button className="px-6 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-500 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                <Download size={14}/> Crear Backup Manual
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10 flex items-center justify-between">
                        <div>
                            <h4 className="font-black text-slate-900 uppercase tracking-tighter text-lg">Modo Mantenimiento</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-md">Si se activa, la Landing Page mostrará una pantalla de "En Construcción" y solo el staff podrá acceder al login.</p>
                        </div>
                        <button 
                            onClick={toggleMaintenance}
                            className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 ${
                                isMaintenanceMode 
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            <PowerSwitch active={isMaintenanceMode} />
                            {isMaintenanceMode ? 'Mantenimiento Activo' : 'Sitio Operativo'}
                        </button>
                    </div>
                </div>
            )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                    <Smartphone size={32} className="text-slate-400" />
                    {isInstallable && <span className="absolute top-0 right-0 w-4 h-4 bg-sky-500 rounded-full animate-ping" />}
                </div>
                <h4 className="font-black text-slate-900 uppercase tracking-tight">App Instalable</h4>
                <p className="text-xs text-slate-400 mt-2 mb-6 px-4">Instala SuperAir en tu dispositivo para acceso rápido y offline.</p>
                {isInstallable ? (
                    <button onClick={handleInstallClick} className="w-full py-4 bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/20">
                        Instalar Ahora
                    </button>
                ) : (
                    <button disabled className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-default">
                        Ya Instalada / No Disponible
                    </button>
                )}
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-xl">
                <h4 className="font-black uppercase tracking-tight text-lg mb-6">Salud del Sistema</h4>
                <div className="space-y-4">
                    {[
                        { label: 'Base de Datos', val: 'Conectada', color: 'text-emerald-400' },
                        { label: 'Latencia API', val: '24ms', color: 'text-sky-400' },
                        { label: 'Almacenamiento', val: '45% Libre', color: 'text-amber-400' },
                        { label: 'Versión', val: 'v3.2.0 (Prod)', color: 'text-slate-400' },
                    ].map((m, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</span>
                            <span className={`text-xs font-black uppercase ${m.color}`}>{m.val}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>

      {/* N8N Config Modal */}
      {showN8nConfig && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-orange-50">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-500 text-white rounded-2xl"><Workflow size={24}/></div>
                          <div>
                              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Configurar n8n</h3>
                              <p className="text-orange-600 text-[10px] font-bold uppercase tracking-widest">Webhooks de Automatización</p>
                          </div>
                      </div>
                      <button onClick={() => setShowN8nConfig(false)} className="p-2 hover:bg-orange-100 rounded-xl transition-all"><X size={20}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <LinkIcon size={12}/> Webhook: Sincronizar Cliente
                          </label>
                          <input 
                              value={integrationsInfo.n8n_sync_client}
                              onChange={(e) => setIntegrationsInfo({...integrationsInfo, n8n_sync_client: e.target.value})}
                              placeholder="https://n8n.tu-server.com/webhook/client-sync"
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <LinkIcon size={12}/> Webhook: Nueva Cotización
                          </label>
                          <input 
                              value={integrationsInfo.n8n_new_quote}
                              onChange={(e) => setIntegrationsInfo({...integrationsInfo, n8n_new_quote: e.target.value})}
                              placeholder="https://n8n.tu-server.com/webhook/new-quote"
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <LinkIcon size={12}/> Webhook: Orden Pagada
                          </label>
                          <input 
                              value={integrationsInfo.n8n_order_paid}
                              onChange={(e) => setIntegrationsInfo({...integrationsInfo, n8n_order_paid: e.target.value})}
                              placeholder="https://n8n.tu-server.com/webhook/order-paid"
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs"
                          />
                      </div>
                  </div>
                  <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                      <button onClick={handleSaveIntegrations} className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all">
                          Guardar Webhooks
                      </button>
                      <button onClick={() => setShowN8nConfig(false)} className="px-8 py-4 bg-white text-slate-500 rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-200">
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// Subcomponent for the switch visual
const PowerSwitch: React.FC<{active: boolean}> = ({ active }) => (
    <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-amber-500' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${active ? 'left-4.5' : 'left-0.5'}`} style={{ left: active ? 'calc(100% - 14px)' : '2px' }} />
    </div>
);

export default Settings;
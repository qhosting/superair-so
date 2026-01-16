
import React, { useState, useEffect } from 'react';
import { 
  Globe, Save, AlertTriangle, CheckCircle2, Image as ImageIcon, 
  RefreshCw, DollarSign, Wallet, MapPin, Clock, Calendar, BarChart3, 
  Search, BrainCircuit, LayoutTemplate, Database, Power,
  Landmark, CreditCard, Bot, Building2, Upload, FileText, Receipt
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
  const [activeTab, setActiveTab] = useState<'general' | 'treasury' | 'marketing'>('general');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // States
  const [marketingInfo, setMarketingInfo] = useState({
    seoTitle: '', seoDescription: '', aiTone: 'Profesional', aiTopics: '', aiProvider: 'gemini'
  });
  
  const [generalInfo, setGeneralInfo] = useState({
      companyName: 'SuperAir',
      logoUrl: '',
      contactEmail: '',
      isMaintenance: false
  });

  const [treasuryInfo, setTreasuryInfo] = useState({
      rfc: '',
      legalName: '',
      taxRegime: '601 - General de Ley Personas Morales',
      bankName: '',
      accountNumber: '',
      clabe: ''
  });

  // Load Data
  useEffect(() => {
    const loadData = async () => {
        try {
            const res = await fetch('/api/settings');
            if (!res.ok) throw new Error("Status " + res.status);
            const data = await res.json();
            
            if (data.marketing_info) setMarketingInfo(prev => ({ ...prev, ...data.marketing_info }));
            if (data.general_info) {
                setGeneralInfo(prev => ({ ...prev, ...data.general_info }));
                localStorage.setItem('superair_is_published', (!data.general_info.isMaintenance).toString());
                if (data.general_info.logoUrl) localStorage.setItem('superair_logo', data.general_info.logoUrl);
            }
            if (data.treasury_info) setTreasuryInfo(prev => ({ ...prev, ...data.treasury_info }));

        } catch (e) { 
            console.error("Error loading settings:", e.message);
            // Si falla la carga, mantenemos los estados por defecto
        }
    };
    loadData();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const saveSettings = async (category: string, data: any) => {
      setIsSaving(true);
      try {
          const res = await fetch('/api/settings', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ category, data })
          });
          
          if(!res.ok) throw new Error("Fail");

          if(category === 'general_info') {
              localStorage.setItem('superair_is_published', (!data.isMaintenance).toString());
              if (data.logoUrl) {
                  localStorage.setItem('superair_logo', data.logoUrl);
              } else {
                  localStorage.removeItem('superair_logo');
              }
              window.dispatchEvent(new Event('storage'));
          }

          showToast('Configuración guardada correctamente');
      } catch(e) {
          showToast('Error al guardar cambios', 'error');
      } finally {
          setIsSaving(false);
      }
  };

  const handleLogoUpload = async (files: FileList | null) => {
      if (!files || !files[0]) return;
      const formData = new FormData();
      formData.append('file', files[0]);
      
      try {
          const res = await fetch('/api/upload', {
             method: 'POST',
             body: formData
          });
          if(res.ok) {
              const data = await res.json();
              setGeneralInfo(prev => ({ ...prev, logoUrl: data.url }));
              showToast('Logo subido correctamente');
          }
      } catch(e) { showToast('Error subiendo imagen', 'error'); }
  };

  const renderGeneral = () => (
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500">
                  <Building2 size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Información General</h3>
                  <p className="text-slate-400 font-medium text-xs">Identidad de marca y estado del sitio.</p>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                      <input 
                        value={generalInfo.companyName}
                        onChange={e => setGeneralInfo({...generalInfo, companyName: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" 
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Contacto (Público)</label>
                      <input 
                        value={generalInfo.contactEmail}
                        onChange={e => setGeneralInfo({...generalInfo, contactEmail: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium" 
                      />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logotipo del Sistema</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-slate-50 transition-colors relative h-48">
                      {generalInfo.logoUrl ? (
                          <img src={generalInfo.logoUrl} alt="Logo" className="h-full object-contain" />
                      ) : (
                          <div className="text-center text-slate-400">
                              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                              <p className="text-xs font-bold">Arrastra o selecciona imagen</p>
                          </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => handleLogoUpload(e.target.files)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                  </div>
              </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${generalInfo.isMaintenance ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          <Power size={24} />
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-900">Modo Mantenimiento</h4>
                          <p className="text-xs text-slate-500 max-w-sm">
                              {generalInfo.isMaintenance 
                                ? "El sitio web público está desactivado." 
                                : "El sitio web está público y accesible."}
                          </p>
                      </div>
                  </div>
                  <button 
                    onClick={() => setGeneralInfo({...generalInfo, isMaintenance: !generalInfo.isMaintenance})}
                    className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${generalInfo.isMaintenance ? 'bg-amber-500' : 'bg-slate-300'}`}
                  >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${generalInfo.isMaintenance ? 'left-9' : 'left-1'}`} />
                  </button>
              </div>
          </div>

          <div className="flex justify-end pt-4">
              <button onClick={() => saveSettings('general_info', generalInfo)} className="px-8 py-3 bg-sky-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 transition-all flex items-center gap-2 shadow-lg shadow-sky-600/20">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} Guardar Cambios
              </button>
          </div>
      </div>
  );

  const renderTreasury = () => (
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                  <Landmark size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Datos Fiscales y Bancarios</h3>
                  <p className="text-slate-400 font-medium text-xs">Información para emisión de cotizaciones y facturas.</p>
              </div>
          </div>

          <div className="space-y-6">
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                  <Receipt size={16} className="text-emerald-500"/> Identidad Fiscal
              </h4>
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                      <input 
                        value={treasuryInfo.legalName}
                        onChange={e => setTreasuryInfo({...treasuryInfo, legalName: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        placeholder="Ej: SUPER AIR MEXICO SA DE CV"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RFC Emisor</label>
                      <input 
                        value={treasuryInfo.rfc}
                        onChange={e => setTreasuryInfo({...treasuryInfo, rfc: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold uppercase"
                        placeholder="ABC123456XYZ"
                      />
                  </div>
              </div>
          </div>

          <div className="flex justify-end pt-4">
              <button onClick={() => saveSettings('treasury_info', treasuryInfo)} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20">
                  {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} Guardar Datos
              </button>
          </div>
      </div>
  );

  const renderMarketing = () => (
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                  <BarChart3 size={32} />
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Marketing & IA</h3>
                  <p className="text-slate-400 font-medium text-xs">Configuración del Agente Inteligente y SEO.</p>
              </div>
          </div>

          <div className="space-y-6">
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm flex items-center gap-2">
                  <BrainCircuit size={16} className="text-purple-500"/> Cerebro de IA
              </h4>
              <div className="grid grid-cols-2 gap-6">
                  <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tono de Voz</label>
                      <select value={marketingInfo.aiTone} onChange={e => setMarketingInfo({...marketingInfo, aiTone: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                          <option>Profesional y Técnico</option>
                          <option>Amigable y Cercano</option>
                          <option>Vendedor Agresivo</option>
                      </select>
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 relative">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Configuración</h2>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full shadow-inner">
            <button onClick={() => setActiveTab('general')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>
                <Building2 size={16} /> General
            </button>
            <button onClick={() => setActiveTab('treasury')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'treasury' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>
                <Landmark size={16} /> Tesorería
            </button>
            <button onClick={() => setActiveTab('marketing')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'marketing' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>
                <BarChart3 size={16} /> Marketing & IA
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
              {activeTab === 'general' && renderGeneral()}
              {activeTab === 'treasury' && renderTreasury()}
              {activeTab === 'marketing' && renderMarketing()}
          </div>
          
          <div className="space-y-6">
              <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden">
                  <div className="relative z-10">
                      <h4 className="font-black text-lg uppercase mb-2">Estado del Sistema</h4>
                      <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"/>
                          <span className="text-xs font-bold text-emerald-300">Base de Datos Conectada</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest">
                          Toda configuración de marketing impacta directamente en el asistente IA operativo y el SEO del portal público.
                      </p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Settings;

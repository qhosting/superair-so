
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, 
  MapPin, User, ExternalLink, X, Truck, Wrench, Camera, ClipboardList, 
  Phone, MessageSquare, Loader2, CheckCircle2, AlertTriangle, CalendarCheck, Edit3, Save,
  Briefcase, RefreshCw, Link as LinkIcon, Globe, Navigation
} from 'lucide-react';
import { Appointment, User as UserType, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Appointments: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useNotification();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  
  const isInstaller = user?.role === UserRole.INSTALLER;
  const [selectedTechFilter, setSelectedTechFilter] = useState(isInstaller ? user.name : 'Todos');

  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [installers, setInstallers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  const [newApt, setNewApt] = useState({
      client_id: '',
      technician_id: isInstaller ? user.id : '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      type: 'Instalación',
      notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
        const token = localStorage.getItem('superair_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [aptsRes, cliRes, uRes] = await Promise.all([
            fetch('/api/appointments', { headers }),
            fetch('/api/clients', { headers }),
            fetch('/api/users', { headers })
        ]);

        if (aptsRes.status === 401 || cliRes.status === 401 || uRes.status === 401) {
            logout();
            return;
        }

        if (aptsRes.ok) setAppointments(await aptsRes.json());
        if (cliRes.ok) setClients(await cliRes.json());
        if (uRes.ok) {
            const users = await uRes.json();
            setInstallers(users.filter((u:any) => u.role === 'Instalador' || u.role === 'Admin'));
        }
    } catch (e) { showToast("Error cargando agenda", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string | number, newStatus: string) => {
      try {
          const token = localStorage.getItem('superair_token');
          const res = await fetch(`/api/appointments/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
              showToast(`Servicio ${newStatus === 'En Proceso' ? 'en camino' : 'completado'}`);
              fetchData();
              setSelectedApt(null);
          }
      } catch(e) { console.error(e); }
  };

  // Calendar Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month, firstDay, daysInMonth]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Gestión de Campo</h2>
          <p className="text-slate-500 text-sm font-medium">Cronograma de servicios técnicos y despacho de unidades.</p>
        </div>
        <div className="flex gap-3">
            <select value={selectedTechFilter} onChange={e => setSelectedTechFilter(e.target.value)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest outline-none">
                <option value="Todos">Toda la Flota</option>
                {installers.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
            </select>
            <button onClick={() => setShowNewAptModal(true)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-600 transition-all shadow-xl">
                Nueva Cita
            </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black uppercase tracking-tighter text-sky-600">{new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(currentDate)}</h3>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={18}/></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-[10px] font-black uppercase">Hoy</button>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
              </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-3xl overflow-hidden border border-slate-100 shadow-inner">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d} className="bg-slate-50 p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
              {calendarDays.map((day, idx) => {
                  if (!day) return <div key={idx} className="bg-slate-50/30 h-32" />;
                  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayApts = appointments.filter(a => a.date.substring(0,10) === dateStr && (selectedTechFilter === 'Todos' || a.technician === selectedTechFilter));
                  return (
                      <div key={idx} className="bg-white h-32 p-3 border-r border-b border-slate-50 group hover:bg-sky-50/20 transition-all cursor-default">
                          <span className={`text-xs font-black ${day === new Date().getDate() && month === new Date().getMonth() ? 'text-sky-600' : 'text-slate-300'}`}>{day}</span>
                          <div className="mt-2 space-y-1">
                              {dayApts.map(a => (
                                  <button key={a.id} onClick={() => setSelectedApt(a)} className={`w-full text-left p-1.5 rounded-lg text-[8px] font-black uppercase truncate border ${a.status === 'Completada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : a.status === 'En Proceso' ? 'bg-sky-50 text-sky-600 border-sky-100 animate-pulse' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                      {a.time.substring(0,5)} {a.client_name}
                                  </button>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* DETALLE DE CITA / DESPACHO */}
      {selectedApt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex justify-end">
              <div className="w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-200">
                  <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                      <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${selectedApt.status === 'Completada' ? 'bg-emerald-500' : 'bg-slate-900'}`}>
                              {selectedApt.type === 'Instalación' ? <Wrench size={24}/> : <CalendarCheck size={24}/>}
                          </div>
                          <div>
                              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Orden de Servicio</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID #{selectedApt.id} • {selectedApt.status}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedApt(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                      <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente y Ubicación</p>
                          <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative group">
                              <h4 className="text-xl font-black text-slate-900 uppercase mb-2">{selectedApt.client_name}</h4>
                              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">{selectedApt.client_address || 'Sin dirección registrada'}</p>
                              
                              {selectedApt.client_address ? (
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedApt.client_address)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                  >
                                      <Navigation size={16}/> Abrir en Navegador (Ruta GPS)
                                  </a>
                              ) : (
                                  <div className="flex items-center gap-3 w-full py-4 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest justify-center cursor-not-allowed">
                                      <AlertTriangle size={16}/> Dirección No Registrada
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Asignado</p>
                              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sky-600 shadow-sm"><User size={20}/></div>
                                  <p className="font-bold text-slate-700">{selectedApt.technician}</p>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horario</p>
                              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm"><Clock size={20}/></div>
                                  <p className="font-bold text-slate-700">{selectedApt.time.substring(0,5)} HRS</p>
                              </div>
                          </div>
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                          {selectedApt.status === 'Programada' && (
                              <button onClick={() => updateStatus(selectedApt.id, 'En Proceso')} className="w-full py-5 bg-sky-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 hover:bg-sky-700">
                                  <Truck size={20}/> Notificar: Voy en camino
                              </button>
                          )}
                          {selectedApt.status === 'En Proceso' && (
                              <button onClick={() => updateStatus(selectedApt.id, 'Completada')} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 hover:bg-emerald-700">
                                  <CheckCircle2 size={20}/> Finalizar y Registrar Evidencia
                              </button>
                          )}
                          {selectedApt.status === 'Completada' && (
                              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 text-emerald-600">
                                  <CheckCircle2 size={24}/>
                                  <p className="font-black uppercase text-xs tracking-widest">Servicio Cerrado con Éxito</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL NUEVA CITA */}
      {showNewAptModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
              <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 uppercase">Programar Servicio</h3>
                      <button onClick={() => setShowNewAptModal(false)}><X className="text-slate-400" /></button>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Solicitante</label>
                          <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newApt.client_id} onChange={e=>setNewApt({...newApt, client_id: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                              <input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newApt.date} onChange={e=>setNewApt({...newApt, date: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                              <input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newApt.time} onChange={e=>setNewApt({...newApt, time: e.target.value})} />
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignar Técnico</label>
                          <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newApt.technician_id} onChange={e=>setNewApt({...newApt, technician_id: e.target.value})}>
                              <option value="">-- Sin Asignar --</option>
                              {installers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                      </div>
                      <button 
                        onClick={async () => {
                            if (!newApt.client_id || !newApt.technician_id) return;
                            const token = localStorage.getItem('superair_token');
                            const res = await fetch('/api/appointments', {
                                method: 'POST',
                                headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${token}`},
                                body: JSON.stringify(newApt)
                            });
                            if (res.ok) { setShowNewAptModal(false); fetchData(); }
                            else { const err = await res.json(); alert(err.error); }
                        }}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl"
                      >
                        Confirmar Cita en Agenda
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Appointments;

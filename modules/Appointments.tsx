
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, 
  MapPin, User, ExternalLink, X, Truck, Wrench, Camera, ClipboardList, 
  Phone, MessageSquare, Loader2, CheckCircle2, AlertTriangle, CalendarCheck, Edit3, Save,
  Briefcase
} from 'lucide-react';
import { Appointment, User as UserType } from '../types';

const Appointments: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  
  // Filter & Edit State
  const [selectedTechFilter, setSelectedTechFilter] = useState('Todos');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Data State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [installers, setInstallers] = useState<UserType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  const [newApt, setNewApt] = useState({
      client_id: '',
      technician: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      type: 'Instalación',
      status: 'Programada'
  });

  useEffect(() => {
    const fetchData = async () => {
        try {
            // Fetch Appointments
            const aptsRes = await fetch('/api/appointments');
            const aptsData = await aptsRes.json();
            
            // Fetch Clients
            const clientsRes = await fetch('/api/clients');
            const clientsData = await clientsRes.json();

            // Fetch Users (Installers)
            const usersRes = await fetch('/api/users');
            const usersData = await usersRes.json();

            if (Array.isArray(aptsData)) setAppointments(aptsData);
            if (Array.isArray(clientsData)) setClients(clientsData);
            
            if (Array.isArray(usersData)) {
                // Filter users who are active and have the role 'Instalador' or 'Admin' (in case admins do field work)
                const techList = usersData.filter(u => (u.role === 'Instalador' || u.role === 'Admin') && u.status === 'Activo');
                setInstallers(techList);
                
                // Set default technician if list not empty
                if (techList.length > 0 && !newApt.technician) {
                    setNewApt(prev => ({ ...prev, technician: techList[0].name }));
                }
            }
        } catch (e) {
            console.error("Failed to fetch calendar data", e);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, []);

  const handleSaveAppointment = async () => {
      if (!newApt.client_id) {
          alert("Por favor selecciona un cliente de la lista.");
          return;
      }
      if (!newApt.technician) {
          alert("Por favor asigna un técnico responsable.");
          return;
      }

      try {
          // Prepare safe payload
          const payload = {
              ...newApt,
              client_id: parseInt(newApt.client_id, 10), // CRITICAL: Ensure INT for DB
              duration: parseInt(newApt.duration.toString(), 10) || 60
          };

          const res = await fetch('/api/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if(res.ok) {
              const savedApt = await res.json();
              const client = clients.find(c => c.id == savedApt.client_id);
              savedApt.client_name = client ? client.name : 'Cliente';
              setAppointments([...appointments, savedApt]);
              setShowNewAptModal(false);
              // Reset duration/time but keep technician
              setNewApt(prev => ({...prev, client_id: '', duration: 60, time: '10:00'})); 
          } else {
              const err = await res.json();
              throw new Error(err.error || "Error desconocido al guardar");
          }
      } catch(e: any) {
          alert(`No se pudo guardar la cita: ${e.message}`);
      }
  };

  const updateStatus = async (id: string, newStatus: string) => {
      try {
          const res = await fetch(`/api/appointments/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
          });
          
          if (res.ok) {
              // Update local state
              setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
              if (selectedApt && selectedApt.id === id) {
                  setSelectedApt(prev => ({ ...prev, status: newStatus }));
              }
              
              if (newStatus === 'En Proceso') {
                  alert('✅ Estatus actualizado a "En Proceso".\n\nSe ha enviado notificación automática por WhatsApp al cliente.');
              }
          } else {
              alert('Error al actualizar estatus');
          }
      } catch(e) {
          console.error(e);
      }
  };

  const saveReschedule = async () => {
      if (!selectedApt) return;
      try {
          // Format date if needed
          const payload = {
              date: editForm.date,
              time: editForm.time,
              technician: editForm.technician,
              status: selectedApt.status // Mantener status original o permitir cambiarlo si se requiere
          };

          const res = await fetch(`/api/appointments/${selectedApt.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              // Actualizar estado local
              setAppointments(prev => prev.map(a => a.id === selectedApt.id ? { ...a, ...payload } : a));
              setSelectedApt({ ...selectedApt, ...payload });
              setIsRescheduling(false);
              alert("Cita reprogramada exitosamente.");
          } else {
              const err = await res.json();
              alert(`Error al guardar cambios: ${err.error}`);
          }
      } catch(e) {
          alert("Error de conexión");
      }
  };

  const startReschedule = () => {
      // Clean date string to YYYY-MM-DD
      const dateStr = selectedApt.date ? selectedApt.date.substring(0, 10) : '';
      setEditForm({
          date: dateStr,
          time: selectedApt.time,
          technician: selectedApt.technician
      });
      setIsRescheduling(true);
  };

  const handleConnectGoogle = () => {
      setIsConnectingGoogle(true);
      setTimeout(() => {
          setIsGoogleConnected(true);
          setIsConnectingGoogle(false);
      }, 2000);
  };

  // Lógica de Calendario
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(currentDate);
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month, firstDayOfMonth, daysInMonth]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const getAptsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return appointments.filter(a => {
        const isSameDate = a.date && a.date.substring(0,10) === dateStr;
        const isSameTech = selectedTechFilter === 'Todos' || a.technician === selectedTechFilter;
        return isSameDate && isSameTech;
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completada': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'En Proceso': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'Cancelada': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-full pb-20">
      
      {/* Principal: Calendario */}
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter capitalize">{monthName} {year}</h2>
              <div className="flex items-center gap-4 mt-2">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Vista de Técnico:</p>
                  <select 
                    value={selectedTechFilter}
                    onChange={e => setSelectedTechFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500"
                  >
                      <option value="Todos">Todos los Técnicos</option>
                      {installers.map(ins => (
                          <option key={ins.id} value={ins.name}>{ins.name}</option>
                      ))}
                  </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white hover:shadow-lg rounded-xl transition-all text-slate-600"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-sky-600">Hoy</button>
                <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white hover:shadow-lg rounded-xl transition-all text-slate-600"><ChevronRight size={20} /></button>
              </div>
              <button 
                onClick={() => setShowNewAptModal(true)}
                className="flex items-center gap-2 px-8 py-3.5 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
              >
                <Plus size={18} /> Nueva Cita
              </button>
            </div>
          </div>

          {loading ? (
             <div className="h-96 flex items-center justify-center bg-slate-50 rounded-[2rem]">
                <Loader2 className="animate-spin text-sky-600" size={32} />
             </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2rem] overflow-hidden shadow-inner">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="bg-slate-50 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {day}
                </div>
                ))}
                {calendarDays.map((day, idx) => {
                const dayApts = getAptsForDay(day);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                return (
                    <div key={idx} className={`bg-white h-40 p-4 group hover:bg-slate-50/80 transition-all cursor-pointer relative border-r border-b border-slate-50 ${!day ? 'bg-slate-50/30' : ''}`}>
                    {day && (
                        <>
                        <span className={`text-sm font-black transition-all ${isToday ? 'bg-sky-600 text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-lg' : 'text-slate-300 group-hover:text-slate-900'}`}>
                            {day}
                        </span>
                        <div className="mt-3 space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar">
                            {dayApts.map(apt => (
                            <div 
                                key={apt.id} 
                                onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); setIsRescheduling(false); }}
                                className={`text-[9px] p-2 rounded-lg font-black uppercase tracking-tighter truncate border shadow-sm transition-transform hover:scale-105 ${getStatusColor(apt.status)}`}
                            >
                                <div className="flex items-center gap-1">
                                <Clock size={10} /> {apt.time}
                                </div>
                                <div className="mt-0.5 truncate">{apt.client_name || 'Cliente'}</div>
                            </div>
                            ))}
                        </div>
                        </>
                    )}
                    </div>
                );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Lateral: Agenda y Google Sync */}
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform">
             <CalendarCheck size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white border border-slate-100 shadow-sm rounded-2xl">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="GCal" className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-lg uppercase tracking-tighter leading-none text-slate-900">Google<br/>Calendar</h4>
                </div>
                {isGoogleConnected && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ONLINE
                    </div>
                )}
            </div>
            
            {isGoogleConnected ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Cuenta Vinculada</p>
                    <p className="text-sm font-bold text-slate-700 truncate">agenda.tecnicos@superair.com.mx</p>
                    <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500"/> Sincronizando eventos bidireccionalmente.
                    </div>
                </div>
            ) : (
                <p className="text-xs text-slate-400 mb-8 leading-relaxed font-medium">Sincroniza automáticamente las rutas de tus técnicos con sus calendarios móviles.</p>
            )}

            <button 
                onClick={handleConnectGoogle}
                disabled={isGoogleConnected || isConnectingGoogle}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${
                    isGoogleConnected 
                    ? 'bg-slate-100 text-slate-400 cursor-default' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200'
                }`}
            >
               {isConnectingGoogle ? <Loader2 className="animate-spin" size={16}/> : isGoogleConnected ? 'Sincronización Activa' : 'Conectar Cuenta Google'}
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Detail Sidebar (Drawer) */}
      {selectedApt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex justify-end">
           <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${getStatusColor(selectedApt.status).split(' ')[1] === 'text-sky-600' ? 'bg-sky-600' : 'bg-slate-900'}`}>
                       {selectedApt.type === 'Instalación' ? <Truck size={28}/> : <Wrench size={28}/>}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Detalle de Servicio</h3>
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{selectedApt.client_name}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedApt(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} className="text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                 {/* Operational Controls */}
                 <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estatus de la Orden</h5>
                       <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(selectedApt.status)}`}>
                         {selectedApt.status}
                       </span>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="grid grid-cols-2 gap-3">
                        {selectedApt.status === 'Programada' && (
                            <button 
                                onClick={() => updateStatus(selectedApt.id, 'En Proceso')}
                                className="col-span-2 py-3 bg-sky-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Truck size={16} /> Iniciar Ruta (Notificar Cliente)
                            </button>
                        )}
                        {selectedApt.status === 'En Proceso' && (
                            <button 
                                onClick={() => updateStatus(selectedApt.id, 'Completada')}
                                className="col-span-2 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Finalizar Servicio
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo & Duración</h5>
                        <div className="text-right">
                            <p className="font-black text-slate-800 text-sm">{selectedApt.type}</p>
                            <p className="text-xs text-slate-500 font-medium">Est. {selectedApt.duration || 60} minutos</p>
                        </div>
                    </div>
                    
                    {/* Google Calendar Link Button */}
                    {selectedApt.google_event_link && (
                        <a 
                            href={selectedApt.google_event_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full text-center py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all"
                        >
                            Ver en Google Calendar
                        </a>
                    )}
                 </div>

                 {/* Information Grid / Edit Mode */}
                 {isRescheduling ? (
                     <div className="bg-white border-2 border-dashed border-sky-200 rounded-[2.5rem] p-8 space-y-6 animate-in fade-in">
                         <div className="flex items-center gap-2 mb-2">
                             <Edit3 size={18} className="text-sky-500"/>
                             <h4 className="font-black text-lg text-slate-900 uppercase">Reprogramar Cita</h4>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nueva Fecha</label>
                                 <input 
                                    type="date" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                                    value={editForm.date}
                                    onChange={e => setEditForm({...editForm, date: e.target.value})}
                                 />
                             </div>
                             <div>
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nueva Hora</label>
                                 <input 
                                    type="time" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                                    value={editForm.time}
                                    onChange={e => setEditForm({...editForm, time: e.target.value})}
                                 />
                             </div>
                         </div>
                         <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reasignar Técnico</label>
                             <select 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm"
                                value={editForm.technician}
                                onChange={e => setEditForm({...editForm, technician: e.target.value})}
                             >
                                {installers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                             </select>
                         </div>

                         <div className="flex gap-2 pt-2">
                             <button onClick={() => setIsRescheduling(false)} className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl font-bold text-xs">Cancelar</button>
                             <button onClick={saveReschedule} className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-sky-700 flex items-center justify-center gap-2">
                                 <Save size={16}/> Guardar
                             </button>
                         </div>
                     </div>
                 ) : (
                    <div className="grid grid-cols-2 gap-10 relative">
                        <button 
                            onClick={startReschedule}
                            className="absolute -top-8 right-0 text-[10px] font-bold text-sky-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                            <Edit3 size={12}/> Editar / Reprogramar
                        </button>

                        <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <User size={18} className="text-sky-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnico Asignado</p>
                        </div>
                        <p className="font-black text-slate-800 pl-7">{selectedApt.technician}</p>
                        </div>
                        <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-sky-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario Programado</p>
                        </div>
                        <p className="font-black text-slate-800 pl-7">{selectedApt.time} HRS</p>
                        <p className="text-xs text-slate-400 font-bold pl-7 uppercase">{selectedApt.date ? new Date(selectedApt.date).toLocaleDateString() : ''}</p>
                        </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Modal Nueva Cita - IMPROVED DESIGN & RESPONSIVENESS */}
      {showNewAptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              {/* Modal Header - Fixed */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Programar Cita</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Asignación de servicio técnico</p>
                 </div>
                 <button onClick={() => setShowNewAptModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} className="text-slate-400"/></button>
              </div>
              
              {/* Modal Body - Scrollable */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
                 {/* Cliente Select */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Prospecto</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-700 appearance-none"
                            value={newApt.client_id}
                            onChange={(e) => setNewApt({...newApt, client_id: e.target.value})}
                        >
                        <option value="">Seleccionar Cliente</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        </select>
                    </div>
                    {clients.length === 0 && (
                        <p className="text-[10px] text-amber-500 font-bold ml-1 flex items-center gap-1">
                            <AlertTriangle size={10} /> No hay clientes registrados. Ve al módulo de Clientes.
                        </p>
                    )}
                 </div>
                 
                 {/* Grid para Fecha y Hora */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                       <div className="relative">
                           <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                           <input 
                                type="date" 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-700"
                                value={newApt.date}
                                onChange={(e) => setNewApt({...newApt, date: e.target.value})}
                           />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Inicio</label>
                       <div className="relative">
                           <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                           <input 
                                type="time" 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-700"
                                value={newApt.time}
                                onChange={(e) => setNewApt({...newApt, time: e.target.value})}
                            />
                       </div>
                    </div>
                 </div>

                 {/* Grid para Tipo y Duración */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Servicio</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-700 appearance-none"
                                value={newApt.type}
                                onChange={(e) => setNewApt({...newApt, type: e.target.value})}
                            >
                                <option value="Instalación">Instalación</option>
                                <option value="Mantenimiento">Mantenimiento</option>
                                <option value="Reparación">Reparación</option>
                                <option value="Visita Técnica">Visita Técnica</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiempo Estimado</label>
                        <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-700"
                            value={newApt.duration}
                            onChange={(e) => setNewApt({...newApt, duration: parseInt(e.target.value)})}
                        >
                            <option value="30">30 min (Rápida)</option>
                            <option value="60">1 Hora (Estándar)</option>
                            <option value="90">1.5 Horas</option>
                            <option value="120">2 Horas (Completa)</option>
                            <option value="240">4 Horas (Medio día)</option>
                            <option value="480">8 Horas (Día completo)</option>
                        </select>
                    </div>
                 </div>

                 {/* Técnico */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Responsable</label>
                    <div className="relative">
                        <Wrench className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold text-slate-700 appearance-none"
                            value={newApt.technician}
                            onChange={(e) => setNewApt({...newApt, technician: e.target.value})}
                        >
                        {installers.length === 0 ? (
                            <option value="">No hay instaladores activos</option>
                        ) : (
                            installers.map(u => (
                                <option key={u.id} value={u.name}>{u.name}</option>
                            ))
                        )}
                        </select>
                    </div>
                    {installers.length === 0 && (
                        <p className="text-[9px] text-amber-600 font-bold ml-1 mt-1 flex items-center gap-1">
                            <AlertTriangle size={10}/> Registra usuarios con rol 'Instalador' en el módulo de Usuarios.
                        </p>
                    )}
                 </div>
              </div>

              {/* Modal Footer - Fixed */}
              <div className="p-6 md:p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 shrink-0 sticky bottom-0 z-10">
                 <button 
                  onClick={handleSaveAppointment}
                  disabled={!newApt.client_id || !newApt.technician}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20 disabled:opacity-50 hover:bg-sky-700 transition-all flex items-center justify-center gap-2"
                 >
                    <Save size={16} /> Confirmar Agendamiento
                 </button>
                 <button 
                  onClick={() => setShowNewAptModal(false)}
                  className="px-10 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all"
                 >Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;

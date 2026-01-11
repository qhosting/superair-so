import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, 
  MapPin, User, ExternalLink, X, Truck, Wrench, Camera, ClipboardList, 
  Phone, MessageSquare, Loader2, CheckCircle2, AlertTriangle, CalendarCheck
} from 'lucide-react';
import { Appointment } from '../types';

const Appointments: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  const [newApt, setNewApt] = useState({
      client_id: '',
      technician: 'Carlos Rodríguez',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      type: 'Instalación',
      status: 'Programada'
  });

  useEffect(() => {
    Promise.all([
        fetch('/api/appointments').then(r => r.json()),
        fetch('/api/clients').then(r => r.json())
    ]).then(([aptsData, clientsData]) => {
        setAppointments(Array.isArray(aptsData) ? aptsData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
        setLoading(false);
    }).catch(e => {
        console.error("Failed to fetch calendar data", e);
        setLoading(false);
    });
  }, []);

  const handleSaveAppointment = async () => {
      try {
          const res = await fetch('/api/appointments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newApt)
          });
          if(res.ok) {
              const savedApt = await res.json();
              const client = clients.find(c => c.id == savedApt.client_id);
              savedApt.client_name = client ? client.name : 'Cliente';
              setAppointments([...appointments, savedApt]);
              setShowNewAptModal(false);
              // Reset duration to default
              setNewApt(prev => ({...prev, duration: 60})); 
          } else {
              throw new Error("Save Failed");
          }
      } catch(e) {
          alert('Error al guardar cita en base de datos.');
      }
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
    return appointments.filter(a => a.date && a.date.substring(0,10) === dateStr);
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
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestión de Campo y Logística</p>
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
                                onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-end">
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

                 {/* Information Grid */}
                 <div className="grid grid-cols-2 gap-10">
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
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal Nueva Cita */}
      {showNewAptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Programar Cita</h3>
                 <button onClick={() => setShowNewAptModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Prospecto</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        value={newApt.client_id}
                        onChange={(e) => setNewApt({...newApt, client_id: e.target.value})}
                    >
                       <option value="">Seleccionar Cliente</option>
                       {clients.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                       ))}
                    </select>
                 </div>
                 
                 {/* Grid para Fecha y Hora */}
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                       <input 
                            type="date" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                            value={newApt.date}
                            onChange={(e) => setNewApt({...newApt, date: e.target.value})}
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Inicio</label>
                       <input 
                            type="time" 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                            value={newApt.time}
                            onChange={(e) => setNewApt({...newApt, time: e.target.value})}
                        />
                    </div>
                 </div>

                 {/* Grid para Tipo y Duración */}
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Servicio</label>
                        <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                            value={newApt.type}
                            onChange={(e) => setNewApt({...newApt, type: e.target.value})}
                        >
                        <option value="Instalación">Instalación</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                        <option value="Reparación">Reparación</option>
                        <option value="Visita Técnica">Visita Técnica</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiempo Estimado</label>
                        <select 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
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

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Responsable</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        value={newApt.technician}
                        onChange={(e) => setNewApt({...newApt, technician: e.target.value})}
                    >
                       <option value="Carlos Rodríguez">Carlos Rodríguez</option>
                       <option value="Miguel Acevedo">Miguel Acevedo</option>
                       <option value="Juan Pérez">Juan Pérez</option>
                    </select>
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={handleSaveAppointment}
                  disabled={!newApt.client_id}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20 disabled:opacity-50"
                 >Confirmar Agendamiento</button>
                 <button 
                  onClick={() => setShowNewAptModal(false)}
                  className="px-10 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                 >Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  User,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wrench,
  Camera,
  ClipboardList,
  ChevronDown,
  Navigation,
  Phone,
  MessageSquare
} from 'lucide-react';
import { Appointment } from '../types';

const Appointments: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showNewAptModal, setShowNewAptModal] = useState(false);

  // Mock data con estatus operativos
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: 'APT-001', clientId: '1', technician: 'Carlos Rodríguez', date: '2025-05-12', time: '10:00', type: 'Instalación', status: 'En Proceso' },
    { id: 'APT-002', clientId: '2', technician: 'Miguel Acevedo', date: '2025-05-12', time: '14:30', type: 'Mantenimiento', status: 'Programada' },
    { id: 'APT-003', clientId: '3', technician: 'Carlos Rodríguez', date: '2025-05-13', time: '09:00', type: 'Reparación', status: 'Programada' },
  ]);

  // Lógica de Calendario
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(currentDate);
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const calendarDays = useMemo(() => {
    const days = [];
    // Padding días mes anterior
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    // Días mes actual
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [year, month, firstDayOfMonth, daysInMonth]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const getAptsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(a => a.date === dateStr);
  };

  const updateAptStatus = (id: string, newStatus: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    if (selectedApt?.id === id) setSelectedApt(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const getStatusColor = (status: Appointment['status']) => {
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
                      <div className="mt-3 space-y-1.5">
                        {dayApts.map(apt => (
                          <div 
                            key={apt.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); }}
                            className={`text-[9px] p-2 rounded-lg font-black uppercase tracking-tighter truncate border shadow-sm transition-transform hover:scale-105 ${getStatusColor(apt.status)}`}
                          >
                            <div className="flex items-center gap-1">
                               <Clock size={10} /> {apt.time}
                            </div>
                            <div className="mt-0.5 truncate">{apt.type}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lateral: Agenda y Google Sync */}
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-lg">Próximas Citas</h3>
            <span className="text-[10px] font-black bg-sky-100 text-sky-600 px-3 py-1 rounded-full uppercase">Hoy</span>
          </div>
          
          <div className="space-y-6">
            {appointments.filter(a => a.date === '2025-05-12').map((apt, idx) => (
              <div 
                key={apt.id} 
                className="group relative pl-8 border-l-2 border-slate-100 hover:border-sky-500 transition-all cursor-pointer"
                onClick={() => setSelectedApt(apt)}
              >
                <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full transition-all ${apt.status === 'En Proceso' ? 'bg-sky-500 animate-pulse scale-150' : 'bg-slate-200 group-hover:bg-sky-500'}`} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{apt.time} {apt.type}</p>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group-hover:bg-sky-50 group-hover:border-sky-200 transition-all shadow-sm">
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-tight">Orden #{apt.id}</h4>
                  <div className="flex flex-col gap-2 mt-4 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2"><User size={14} className="text-sky-500" /> {apt.technician}</span>
                    <span className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> Residencial Lomas</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
             <CalendarIcon size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-white/10 rounded-2xl">
                  <ExternalLink size={24} className="text-sky-400" />
               </div>
               <h4 className="font-black text-lg uppercase tracking-tighter leading-none">Google<br/>Calendar</h4>
            </div>
            <p className="text-xs text-slate-400 mb-8 leading-relaxed font-medium">Sincroniza automáticamente las rutas de tus técnicos con sus calendarios móviles.</p>
            <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-sky-50 transition-all shadow-xl">
               Conectar Cuenta 
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
                       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{selectedApt.id} • {selectedApt.type}</p>
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
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                        onClick={() => updateAptStatus(selectedApt.id, 'En Proceso')}
                        className="py-3 bg-sky-100 text-sky-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-sky-600 hover:text-white transition-all"
                       >Marcar en Sitio</button>
                       <button 
                        onClick={() => updateAptStatus(selectedApt.id, 'Completada')}
                        className="py-3 bg-emerald-100 text-emerald-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
                       >Finalizar Trabajo</button>
                    </div>
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

                 {/* Customer Location */}
                 <div className="space-y-6">
                    <h5 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-3">
                       <MapPin size={20} className="text-rose-500" /> Ubicación del Servicio
                    </h5>
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Dirección</p>
                          <p className="text-sm font-bold text-slate-200">Av. de las Ciencias 123, Juriquilla, Qro.</p>
                       </div>
                       <button className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-sky-400">
                          <Navigation size={24} />
                       </button>
                    </div>
                 </div>

                 {/* Checklist técnico */}
                 <div className="space-y-6">
                    <h5 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-3">
                       <ClipboardList size={20} className="text-sky-500" /> Checklist de Calidad
                    </h5>
                    <div className="space-y-3">
                       {['Verificación de voltaje', 'Revisión de tubería de desagüe', 'Prueba de estanqueidad', 'Limpieza de área de trabajo'].map((item, idx) => (
                         <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <input type="checkbox" className="w-5 h-5 rounded-lg text-sky-600 focus:ring-sky-500" />
                            <span className="text-sm font-bold text-slate-700">{item}</span>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Evidencia Fotográfica */}
                 <div className="space-y-6">
                    <h5 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-3">
                       <Camera size={20} className="text-sky-500" /> Evidencia Fotográfica
                    </h5>
                    <div className="grid grid-cols-3 gap-4">
                       <div className="aspect-square bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-500 transition-all cursor-pointer">
                          <Plus size={24} />
                          <span className="text-[9px] font-black uppercase tracking-widest mt-2">Agregar</span>
                       </div>
                       <div className="aspect-square bg-slate-200 rounded-3xl overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070" className="w-full h-full object-cover" alt="Service" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2">
                    <Phone size={18} /> Contactar Cliente
                 </button>
                 <button className="px-10 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 flex items-center justify-center gap-2">
                    <MessageSquare size={16} /> WhatsApp
                 </button>
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
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                       <option>Residencial Lomas (Ana Martínez)</option>
                       <option>Corporativo Nexus</option>
                       <option>Nuevo Cliente...</option>
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                       <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                       <input type="time" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico Responsable</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                       <option>Carlos Rodríguez (Disponible)</option>
                       <option>Miguel Acevedo (Ocupado)</option>
                       <option>Juan Pérez (Disponible)</option>
                    </select>
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={() => setShowNewAptModal(false)}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20"
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

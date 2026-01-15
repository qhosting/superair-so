
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, 
  MapPin, User, ExternalLink, X, Truck, Wrench, Camera, ClipboardList, 
  Phone, MessageSquare, Loader2, CheckCircle2, AlertTriangle, CalendarCheck, Edit3, Save,
  Briefcase
} from 'lucide-react';
import { Appointment, User as UserType, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  
  // Filter & Edit State
  const isInstaller = user?.role === UserRole.INSTALLER;
  const [selectedTechFilter, setSelectedTechFilter] = useState(isInstaller ? user.name : 'Todos');
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
      technician: isInstaller ? user.name : '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      duration: 60,
      type: 'Instalación',
      status: 'Programada'
  });

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [aptsRes, clientsRes, usersRes] = await Promise.all([
                fetch('/api/appointments'),
                fetch('/api/clients'),
                fetch('/api/users')
            ]);
            
            const aptsData = await aptsRes.json();
            const clientsData = await clientsRes.json();
            const usersData = await usersRes.json();

            if (Array.isArray(aptsData)) setAppointments(aptsData);
            if (Array.isArray(clientsData)) setClients(clientsData);
            if (Array.isArray(usersData)) {
                const techList = usersData.filter(u => (u.role === 'Instalador' || u.role === 'Admin') && u.status === 'Activo');
                setInstallers(techList);
                if (!isInstaller && techList.length > 0 && !newApt.technician) {
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
  }, [user, isInstaller]);

  const handleSaveAppointment = async () => {
      if (!newApt.client_id || !newApt.technician) return;
      try {
          const payload = { ...newApt, client_id: parseInt(newApt.client_id, 10), duration: parseInt(newApt.duration.toString(), 10) || 60 };
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
          }
      } catch(e) { alert("Error al guardar"); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
      try {
          const res = await fetch(`/api/appointments/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
              setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
              if (selectedApt && selectedApt.id === id) setSelectedApt(prev => ({ ...prev, status: newStatus }));
          }
      } catch(e) { console.error(e); }
  };

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
      <div className="xl:col-span-3 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter capitalize">{monthName} {year}</h2>
              {!isInstaller && (
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Vista de Técnico:</p>
                    <select value={selectedTechFilter} onChange={e => setSelectedTechFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500">
                        <option value="Todos">Todos los Técnicos</option>
                        {installers.map(ins => <option key={ins.id} value={ins.name}>{ins.name}</option>)}
                    </select>
                  </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-3 hover:bg-white hover:shadow-lg rounded-xl transition-all text-slate-600"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-sky-600">Hoy</button>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-3 hover:bg-white hover:shadow-lg rounded-xl transition-all text-slate-600"><ChevronRight size={20} /></button>
              </div>
              {!isInstaller && (
                  <button onClick={() => setShowNewAptModal(true)} className="flex items-center gap-2 px-8 py-3.5 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all">
                    <Plus size={18} /> Nueva Cita
                  </button>
              )}
            </div>
          </div>

          {loading ? <div className="h-96 flex items-center justify-center bg-slate-50 rounded-[2rem]"><Loader2 className="animate-spin text-sky-600" size={32} /></div> : (
            <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2rem] overflow-hidden shadow-inner">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => <div key={day} className="bg-slate-50 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</div>)}
                {calendarDays.map((day, idx) => {
                const dayApts = getAptsForDay(day);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                return (
                    <div key={idx} className={`bg-white h-40 p-4 group hover:bg-slate-50/80 transition-all cursor-pointer relative border-r border-b border-slate-50 ${!day ? 'bg-slate-50/30' : ''}`}>
                    {day && (
                        <>
                        <span className={`text-sm font-black transition-all ${isToday ? 'bg-sky-600 text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-lg' : 'text-slate-300 group-hover:text-slate-900'}`}>{day}</span>
                        <div className="mt-3 space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar">
                            {dayApts.map(apt => (
                            <div key={apt.id} onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); setIsRescheduling(false); }} className={`text-[9px] p-2 rounded-lg font-black uppercase tracking-tighter truncate border shadow-sm transition-transform hover:scale-105 ${getStatusColor(apt.status)}`}>
                                <div className="flex items-center gap-1"><Clock size={10} /> {apt.time}</div>
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

      <div className="space-y-6">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
            <h4 className="font-black text-lg uppercase mb-4">Información Operativa</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {isInstaller ? "Como instalador, solo puedes ver tus propios servicios asignados. Inicia ruta para notificar al cliente vía WhatsApp." : "Gestiona las rutas y servicios de todo el personal técnico."}
            </p>
        </div>
      </div>

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
                 <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                    <div className="flex items-center justify-between">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estatus de la Orden</h5>
                       <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(selectedApt.status)}`}>{selectedApt.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {selectedApt.status === 'Programada' && (
                            <button onClick={() => updateStatus(selectedApt.id, 'En Proceso')} className="col-span-2 py-3 bg-sky-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 shadow-lg flex items-center justify-center gap-2">
                                <Truck size={16} /> Iniciar Ruta (Notificar Cliente)
                            </button>
                        )}
                        {selectedApt.status === 'En Proceso' && (
                            <button onClick={() => updateStatus(selectedApt.id, 'Completada')} className="col-span-2 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> Finalizar Servicio
                            </button>
                        )}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3"><User size={18} className="text-sky-500" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnico Asignado</p></div>
                        <p className="font-black text-slate-800 pl-7">{selectedApt.technician}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3"><Clock size={18} className="text-sky-500" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario Programado</p></div>
                        <p className="font-black text-slate-800 pl-7">{selectedApt.time} HRS</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showNewAptModal && !isInstaller && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                 <div><h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Programar Cita</h3></div>
                 <button onClick={() => setShowNewAptModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} className="text-slate-400"/></button>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" value={newApt.client_id} onChange={(e) => setNewApt({...newApt, client_id: e.target.value})}>
                        <option value="">Seleccionar Cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</label><input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newApt.date} onChange={(e) => setNewApt({...newApt, date: e.target.value})}/></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</label><input type="time" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newApt.time} onChange={(e) => setNewApt({...newApt, time: e.target.value})}/></div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnico</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newApt.technician} onChange={(e) => setNewApt({...newApt, technician: e.target.value})}>
                        {installers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                 </div>
              </div>
              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50 shrink-0">
                 <button onClick={handleSaveAppointment} disabled={!newApt.client_id || !newApt.technician} className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl disabled:opacity-50">Confirmar Cita</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;

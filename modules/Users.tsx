
import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Shield, 
  MoreVertical, 
  Key, 
  UserCheck, 
  UserX, 
  Settings2,
  Lock,
  Eye,
  X,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Trash2,
  Mail,
  User as UserIcon,
  Check,
  ChevronRight,
  Fingerprint
} from 'lucide-react';
import { User, UserRole } from '../types';

const Users: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos los roles');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'Admin Principal', email: 'admin@superair.com.mx', role: UserRole.SUPER_ADMIN, status: 'Activo', lastLogin: 'Hoy, 08:30' },
    { id: '2', name: 'Carlos Rodríguez', email: 'carlos.r@superair.com.mx', role: UserRole.INSTALLER, status: 'Activo', lastLogin: 'Ayer, 16:20' },
    { id: '3', name: 'Laura Gómez', email: 'ventas@superair.com.mx', role: UserRole.ADMIN, status: 'Activo', lastLogin: '12 May, 10:15' },
    { id: '4', name: 'Miguel Acevedo', email: 'm.acevedo@superair.com.mx', role: UserRole.INSTALLER, status: 'Inactivo', lastLogin: '05 May, 09:00' },
    { id: '5', name: 'Roberto Garza (Cliente)', email: 'r.garza@test.com', role: UserRole.CLIENT, status: 'Activo', lastLogin: 'Hoy, 09:45' },
  ]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'Todos los roles' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'bg-purple-50 text-purple-600 border-purple-100';
      case UserRole.ADMIN: return 'bg-blue-50 text-blue-600 border-blue-100';
      case UserRole.INSTALLER: return 'bg-amber-50 text-amber-600 border-amber-100';
      case UserRole.CLIENT: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const toggleUserStatus = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Activo' ? 'Inactivo' : 'Activo' } : u));
  };

  const deleteUser = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este acceso? Esta acción no se puede deshacer.')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const permissionsMatrix = [
    { module: 'Dashboard', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTALLER] },
    { module: 'Clientes (CRM)', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { module: 'Inventario', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTALLER] },
    { module: 'Cotizaciones', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    { module: 'Ventas y Cobros', roles: [UserRole.SUPER_ADMIN] },
    { module: 'Configuración Sistema', roles: [UserRole.SUPER_ADMIN] },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Usuarios y Seguridad</h2>
          <p className="text-slate-500 text-sm font-medium">Control de acceso y auditoría del staff SuperAir.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings2 size={18} />
            Roles y Permisos
          </button>
          <button 
            onClick={() => setShowNewUserModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
          >
            <UserPlus size={18} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Super Admins', count: users.filter(u => u.role === UserRole.SUPER_ADMIN).length, color: 'bg-purple-500' },
          { label: 'Administradores', count: users.filter(u => u.role === UserRole.ADMIN).length, color: 'bg-blue-500' },
          { label: 'Instaladores', count: users.filter(u => u.role === UserRole.INSTALLER).length, color: 'bg-amber-500' },
          { label: 'Clientes Web', count: users.filter(u => u.role === UserRole.CLIENT).length, color: 'bg-emerald-500' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-1.5 h-12 rounded-full ${item.color}`} />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
              <h4 className="text-2xl font-black text-slate-900">{item.count}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option>Todos los roles</option>
              {Object.values(UserRole).map(role => <option key={role}>{role}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5">Rol Asignado</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5">Última Actividad</th>
                <th className="px-8 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedUser(user)}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-inner ${
                        user.role === UserRole.SUPER_ADMIN ? 'bg-purple-500' :
                        user.role === UserRole.ADMIN ? 'bg-blue-500' :
                        user.role === UserRole.INSTALLER ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-black text-slate-900">{user.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black border uppercase tracking-widest ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${user.status === 'Activo' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${user.status === 'Activo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-400 font-mono text-xs">
                    {user.lastLogin}
                  </td>
                  <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="p-2.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all" 
                        title="Ver Expediente"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" 
                        title="Reset Contraseña"
                      >
                        <Lock size={18} />
                      </button>
                      <button 
                        onClick={() => toggleUserStatus(user.id)}
                        className={`p-2.5 rounded-xl transition-all ${user.status === 'Activo' ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} 
                        title={user.status === 'Activo' ? 'Desactivar' : 'Activar'}
                      >
                        {user.status === 'Activo' ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
             <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><ShieldCheck size={28} /></div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Matriz de Permisos</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Configuración del Control de Acceso (RBAC)</p>
                   </div>
                </div>
                <button onClick={() => setShowPermissionsModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             <div className="p-10">
                <table className="w-full text-left">
                   <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                         <th className="pb-6">Módulo / Función</th>
                         {Object.values(UserRole).map(role => (
                           <th key={role} className="pb-6 text-center">{role}</th>
                         ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {permissionsMatrix.map((item, i) => (
                        <tr key={i} className="group">
                           <td className="py-5 font-black text-slate-700 text-sm group-hover:text-sky-600 transition-colors">{item.module}</td>
                           {Object.values(UserRole).map(role => (
                             <td key={role} className="py-5 text-center">
                                <div className="flex justify-center">
                                   {item.roles.includes(role) ? (
                                     <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><Check size={14} strokeWidth={4} /></div>
                                   ) : (
                                     <div className="w-6 h-6 bg-slate-50 text-slate-200 rounded-lg flex items-center justify-center"><X size={14} /></div>
                                   )}
                                </div>
                             </td>
                           ))}
                        </tr>
                      ))}
                   </tbody>
                </table>
                <div className="mt-10 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-center gap-4">
                   <ShieldAlert className="text-amber-600 shrink-0" size={24} />
                   <p className="text-xs font-bold text-amber-800 leading-relaxed uppercase tracking-tight">
                      Nota: Los cambios en los permisos afectan inmediatamente a las sesiones activas. Los Super Admins tienen bypass de seguridad en todos los módulos.
                   </p>
                </div>
             </div>
             <div className="p-10 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowPermissionsModal(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-slate-800">Cerrar Matriz</button>
             </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Nuevo Miembro Staff</h3>
                 <button onClick={() => setShowNewUserModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative">
                       <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" placeholder="Ej: Juan Pérez" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Institucional</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" placeholder="usuario@superair.com.mx" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                       <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold">
                          {Object.values(UserRole).map(role => <option key={role}>{role}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Temporal</label>
                       <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input type="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={() => setShowNewUserModal(false)}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20"
                 >Generar Credenciales</button>
                 <button 
                  onClick={() => setShowNewUserModal(false)}
                  className="px-10 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                 >Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140] flex justify-end">
           <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black shadow-lg ${
                       selectedUser.role === UserRole.SUPER_ADMIN ? 'bg-purple-600' : 'bg-slate-900'
                    }`}>
                       {selectedUser.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedUser.name}</h3>
                       <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{selectedUser.email}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedUser(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                 {/* Quick Actions */}
                 <div className="grid grid-cols-2 gap-4">
                    <button className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center group hover:border-sky-500 transition-all">
                       <Fingerprint className="mx-auto mb-3 text-slate-300 group-hover:text-sky-500 transition-colors" size={32} />
                       <h5 className="font-black text-xs text-slate-800 uppercase tracking-widest">Forzar MFA</h5>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Doble Autenticación</p>
                    </button>
                    <button className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center group hover:border-rose-500 transition-all">
                       <ShieldAlert className="mx-auto mb-3 text-slate-300 group-hover:text-rose-500 transition-colors" size={32} />
                       <h5 className="font-black text-xs text-slate-800 uppercase tracking-widest">Revocar Acceso</h5>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Cerrar Sesiones</p>
                    </button>
                 </div>

                 {/* Activity Feed */}
                 <div className="space-y-8">
                    <h5 className="font-black text-slate-900 uppercase tracking-tighter text-lg flex items-center gap-3">
                       <Activity size={20} className="text-sky-500" /> Log de Auditoría
                    </h5>
                    <div className="space-y-6">
                       {[
                         { action: 'Login Exitoso', target: 'Navegador Chrome', date: 'Hoy, 08:30', status: 'OK' },
                         { action: 'Actualizó Inventario', target: 'Mini Split Inverter', date: 'Ayer, 16:45', status: 'OK' },
                         { action: 'Cambio de Estatus Cita', target: 'ORD-1001', date: '12 May, 11:20', status: 'OK' },
                         { action: 'Intento de Acceso Fallido', target: 'IP: 192.168.1.1', date: '10 May, 03:15', status: 'ERR' },
                       ].map((log, i) => (
                         <div key={i} className="flex gap-6 items-start">
                            <div className="pt-1">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.status === 'OK' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                  <Activity size={18} />
                               </div>
                            </div>
                            <div className="flex-1 pb-6 border-b border-slate-100 last:border-0">
                               <div className="flex justify-between mb-1">
                                  <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{log.action}</p>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.date}</span>
                               </div>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{log.target}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={() => deleteUser(selectedUser.id)}
                  className="px-8 py-4 bg-white text-rose-600 border border-rose-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-50 transition-all"
                 >Eliminar Cuenta</button>
                 <button className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 shadow-xl transition-all">Editar Perfil</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Users;

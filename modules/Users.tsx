import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserPlus, Search, Shield, MoreVertical, Key, UserCheck, UserX, Settings2, 
  Lock, Eye, X, ShieldCheck, ShieldAlert, Activity, Trash2, Mail, User as UserIcon, 
  Check, ChevronRight, Fingerprint, Loader2
} from 'lucide-react';
import { User, UserRole } from '../types';

const Users: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos los roles');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Admin' });

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateUser = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newUser)
      });
      if(res.ok) {
        alert('Usuario creado con éxito');
        setShowNewUserModal(false);
        // Refresh
        window.location.reload(); 
      } else {
        alert('Error al crear usuario');
      }
    } catch(e) { alert('Error de red'); }
  };

  const deleteUser = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este acceso? Esta acción no se puede deshacer.')) {
      try {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        setUsers(users.filter(u => u.id !== id));
      } catch(e) { alert('Error eliminando usuario'); }
    }
  };

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

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48}/></div>;

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
          {filteredUsers.length === 0 ? (
              <div className="p-10 text-center text-slate-400">No hay usuarios encontrados.</div>
          ) : (
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
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                            onClick={() => deleteUser(user.id)}
                            className="p-2.5 rounded-xl transition-all text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Eliminar"
                        >
                            <Trash2 size={18} />
                        </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          )}
        </div>
      </div>

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
                       <input 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                        placeholder="Ej: Juan Pérez"
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Institucional</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                        placeholder="usuario@superair.com.mx"
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                       <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                       >
                          {Object.values(UserRole).map(role => <option key={role}>{role}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Temporal</label>
                       <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="password" 
                            placeholder="••••••••" 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                            value={newUser.password}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={handleCreateUser}
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
    </div>
  );
};

export default Users;
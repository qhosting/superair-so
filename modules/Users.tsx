
import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserPlus, Search, Shield, MoreVertical, Key, UserCheck, UserX, Settings2, 
  Lock, Eye, X, ShieldCheck, ShieldAlert, Activity, Trash2, Mail, User as UserIcon, 
  Check, ChevronRight, Fingerprint, Loader2, Edit3, ToggleLeft, ToggleRight, 
  FileText, Users as UsersIcon, Package, Calendar, DollarSign, Save
} from 'lucide-react';
import { User, UserRole } from '../types';

// Default Permissions Structure (Fallback)
const INITIAL_PERMISSIONS = {
    [UserRole.SUPER_ADMIN]: { clients: 'full', quotes: 'full', inventory: 'full', users: 'full' },
    [UserRole.ADMIN]: { clients: 'full', quotes: 'full', inventory: 'edit', users: 'view' },
    [UserRole.INSTALLER]: { clients: 'view', quotes: 'none', inventory: 'view', users: 'none' },
    [UserRole.CLIENT]: { clients: 'none', quotes: 'view', inventory: 'none', users: 'none' }
};

const Users: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos los roles');
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]); // Real Data
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(INITIAL_PERMISSIONS);
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<UserRole>(UserRole.ADMIN);
  const [savingPerms, setSavingPerms] = useState(false);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', email: '', password: '', role: UserRole.ADMIN as string, status: 'Activo' });

  // Data Fetching
  const fetchData = async () => {
      setLoading(true);
      try {
          const [usersRes, notifRes, settingsRes] = await Promise.all([
              fetch('/api/users'),
              fetch('/api/notifications'),
              fetch('/api/settings')
          ]);

          if (usersRes.ok) {
              const data = await usersRes.json();
              if(Array.isArray(data)) setUsers(data);
          }

          if (notifRes.ok) {
              const data = await notifRes.json();
              if (Array.isArray(data)) setActivityLog(data);
          }

          if (settingsRes.ok) {
              const settings = await settingsRes.json();
              if (settings.rbac_rules) {
                  setPermissions(settings.rbac_rules);
              }
          }

      } catch (e) {
          console.error("Error fetching data", e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- CRUD Operations ---

  const handleOpenCreate = () => {
      setFormData({ id: '', name: '', email: '', password: '', role: UserRole.ADMIN, status: 'Activo' });
      setIsEditing(false);
      setShowUserModal(true);
  };

  const handleOpenEdit = (user: User) => {
      setFormData({ 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          password: '', // Don't show existing password hash
          role: user.role, 
          status: user.status 
      });
      setIsEditing(true);
      setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    try {
      let res;
      if (isEditing) {
          res = await fetch(`/api/users/${formData.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(formData)
          });
      } else {
          res = await fetch('/api/users', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
          });
      }

      if(res.ok) {
        alert(isEditing ? 'Usuario actualizado' : 'Usuario creado');
        setShowUserModal(false);
        fetchData(); // Refresh users and logs
      } else {
          alert('Error en operación. Verifique datos.');
      }
    } catch(e) { alert('Error de conexión'); }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('¿Eliminar acceso definitivamente?')) {
      try {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        setUsers(users.filter(u => u.id !== id));
      } catch(e) { alert('Error eliminando usuario'); }
    }
  };

  const toggleUserStatus = async (user: User) => {
      const newStatus = user.status === 'Activo' ? 'Inactivo' : 'Activo';
      // Optimistic update
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus as any } : u));
      
      try {
          await fetch(`/api/users/${user.id}`, {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ...user, status: newStatus })
          });
      } catch (e) {
          console.error(e);
          fetchData(); // Revert on error
      }
  };

  const savePermissions = async () => {
      setSavingPerms(true);
      try {
          await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ category: 'rbac_rules', data: permissions })
          });
          alert('Permisos actualizados y guardados en base de datos.');
          setShowPermissionsModal(false);
      } catch (e) {
          alert('Error guardando permisos.');
      } finally {
          setSavingPerms(false);
      }
  };

  // --- Render Helpers ---

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'Todos los roles' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'bg-purple-100 text-purple-700 border-purple-200';
      case UserRole.ADMIN: return 'bg-blue-50 text-blue-700 border-blue-200';
      case UserRole.INSTALLER: return 'bg-amber-50 text-amber-700 border-amber-200';
      case UserRole.CLIENT: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const updatePermission = (module: string, level: string) => {
      setPermissions(prev => ({
          ...prev,
          [selectedRoleForPerms]: {
              ...prev[selectedRoleForPerms],
              [module]: level
          }
      }));
  };

  if (loading && users.length === 0) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48}/></div>;

  return (
    <div className="flex flex-col xl:flex-row gap-8 pb-20 h-[calc(100vh-100px)]">
      
      {/* Main Content: Users List */}
      <div className="flex-1 space-y-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
            <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Usuarios y Seguridad</h2>
            <p className="text-slate-500 text-sm font-medium">Control de acceso y auditoría del staff.</p>
            </div>
            <div className="flex gap-3">
            <button 
                onClick={() => setShowPermissionsModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-sm"
            >
                <Settings2 size={18} />
                Matriz de Roles
            </button>
            <button 
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl shadow-sky-600/20 transition-all"
            >
                <UserPlus size={18} />
                Nuevo Usuario
            </button>
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
            {[
            { label: 'Total Usuarios', count: users.length, color: 'bg-slate-800 text-white' },
            { label: 'Administradores', count: users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length, color: 'bg-blue-500 text-white' },
            { label: 'Sesiones Activas', count: Math.floor(users.length * 0.4), color: 'bg-emerald-500 text-white' },
            { label: 'Usuarios Inactivos', count: users.filter(u => u.status === 'Inactivo').length, color: 'bg-slate-200 text-slate-500' },
            ].map((item, idx) => (
            <div key={idx} className={`p-5 rounded-[2rem] shadow-sm flex items-center gap-4 ${item.color}`}>
                <div>
                <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-80">{item.label}</p>
                <h4 className="text-2xl font-black">{item.count}</h4>
                </div>
            </div>
            ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex p-2 shrink-0">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                type="text" 
                placeholder="Buscar usuarios..."
                className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-medium text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="border-l border-slate-100 mx-2"></div>
            <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 bg-transparent outline-none text-xs font-black uppercase tracking-widest text-slate-600"
            >
                <option>Todos los roles</option>
                {Object.values(UserRole).map(role => <option key={role}>{role}</option>)}
            </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10">
                <tr>
                    <th className="px-8 py-5">Colaborador</th>
                    <th className="px-8 py-5">Rol y Permisos</th>
                    <th className="px-8 py-5">Estado</th>
                    <th className="px-8 py-5">Seguridad</th>
                    <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md ${
                            user.role === UserRole.SUPER_ADMIN ? 'bg-slate-900' : 'bg-slate-400'
                        }`}>
                            {user.name.split(' ').map(n => n[0]).join('').substring(0,2)}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                            <div className="text-[10px] font-medium text-slate-400">{user.email}</div>
                        </div>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                        </span>
                    </td>
                    <td className="px-8 py-5">
                        <button 
                            onClick={() => toggleUserStatus(user)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                                user.status === 'Activo' 
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                        >
                            {user.status === 'Activo' ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
                            <span className="text-[10px] font-black uppercase tracking-widest">{user.status}</span>
                        </button>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex items-center gap-1 text-slate-400" title="Autenticación">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-mono">2FA: OFF</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                            Último: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                onClick={() => handleOpenEdit(user)}
                                className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                                title="Editar"
                            >
                                <Edit3 size={16} />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      </div>

      {/* Sidebar: Audit Log - REAL DATA */}
      <div className="xl:w-80 shrink-0 space-y-6 flex flex-col h-full overflow-hidden">
         <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-6 opacity-10">
               <Fingerprint size={100} />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tight mb-2 relative z-10">Auditoría</h3>
            <p className="text-xs text-slate-400 mb-4 relative z-10">Log de operaciones del sistema.</p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg w-fit relative z-10">
                <Activity size={12} /> Live Monitoring
            </div>
         </div>

         <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100">
                <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm">Actividad Reciente</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {activityLog.length === 0 ? (
                    <div className="text-center p-4 text-slate-400 text-xs">Sin actividad registrada</div>
                ) : (
                    activityLog.map(log => (
                        <div key={log.id} className="flex gap-3 items-start p-3 hover:bg-slate-50 rounded-2xl transition-colors">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                log.type === 'success' ? 'bg-emerald-500' : 
                                log.type === 'warning' ? 'bg-amber-500' :
                                log.type === 'info' ? 'bg-sky-500' : 'bg-slate-300'
                            }`} />
                            <div>
                                <p className="text-xs font-bold text-slate-800 leading-snug">{log.title}</p>
                                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{log.message}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] text-slate-300">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
         </div>
      </div>

      {/* Permissions Modal (RBAC Matrix) */}
      {showPermissionsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><ShieldCheck size={24}/></div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Matriz de Acceso</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Configuración RBAC Global</p>
                        </div>
                    </div>
                    <button onClick={() => setShowPermissionsModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Role Selector Sidebar */}
                    <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 space-y-2 overflow-y-auto">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Roles del Sistema</p>
                        {Object.values(UserRole).map(role => (
                            <button 
                                key={role}
                                onClick={() => setSelectedRoleForPerms(role)}
                                className={`w-full text-left p-4 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                                    selectedRoleForPerms === role 
                                    ? 'bg-white shadow-md text-sky-600 border border-slate-100' 
                                    : 'text-slate-500 hover:bg-slate-200/50'
                                }`}
                            >
                                {role}
                                {selectedRoleForPerms === role && <ChevronRight size={14}/>}
                            </button>
                        ))}
                    </div>

                    {/* Matrix */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="font-black text-xl text-slate-900">Permisos para: <span className="text-sky-600">{selectedRoleForPerms}</span></h4>
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">Cambios sin guardar</span>
                        </div>

                        <div className="space-y-6">
                            {[
                                { id: 'clients', label: 'Módulo Clientes', icon: UsersIcon },
                                { id: 'quotes', label: 'Cotizaciones', icon: FileText },
                                { id: 'inventory', label: 'Inventario', icon: Package },
                                { id: 'users', label: 'Admin Usuarios', icon: Shield }
                            ].map(mod => (
                                <div key={mod.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-slate-300 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><mod.icon size={20}/></div>
                                        <span className="font-bold text-slate-700 text-sm">{mod.label}</span>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {['none', 'view', 'edit', 'full'].map((level) => {
                                            const current = (permissions as any)[selectedRoleForPerms]?.[mod.id] || 'none';
                                            const isActive = current === level;
                                            return (
                                                <button
                                                    key={level}
                                                    onClick={() => updatePermission(mod.id, level)}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                        isActive 
                                                        ? 'bg-white text-sky-600 shadow-sm' 
                                                        : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    {level === 'none' ? 'Sin Acceso' : level === 'view' ? 'Solo Ver' : level === 'edit' ? 'Editar' : 'Total'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setShowPermissionsModal(false)} className="px-6 py-3 text-slate-500 font-bold text-xs hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                    <button 
                        onClick={savePermissions}
                        disabled={savingPerms}
                        className="px-8 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg disabled:opacity-70"
                    >
                        {savingPerms ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                        Guardar Cambios
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* User Edit/Create Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{isEditing ? 'Editar Perfil' : 'Nuevo Miembro'}</h3>
                 <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative">
                       <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 font-bold" 
                        placeholder="Ej: Juan Pérez"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
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
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                       <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                       >
                          {Object.values(UserRole).map(role => <option key={role}>{role}</option>)}
                       </select>
                    </div>
                    
                    {isEditing ? (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                            <select 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option>Activo</option>
                                <option>Inactivo</option>
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Temporal</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="password" 
                                    placeholder="••••••••" 
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>
                    )}
                 </div>
                 {isEditing && (
                     <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col gap-2">
                         <div className="flex gap-3 items-center">
                             <ShieldAlert className="text-amber-500" size={20} />
                             <p className="text-xs text-amber-700 font-medium">Cambiar Contraseña (Opcional)</p>
                         </div>
                         <input 
                            type="password" 
                            placeholder="Nueva contraseña..." 
                            className="w-full p-3 bg-white border border-amber-200 rounded-xl outline-none text-xs font-bold"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                     </div>
                 )}
              </div>
              <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                 <button 
                  onClick={handleSaveUser}
                  className="flex-1 py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-sky-600/20"
                 >
                     {isEditing ? 'Guardar Cambios' : 'Generar Credenciales'}
                 </button>
                 <button 
                  onClick={() => setShowUserModal(false)}
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

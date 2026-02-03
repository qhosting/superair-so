
import React, { useState, useMemo, useEffect } from 'react';
import {
    UserPlus, Search, Shield, MoreVertical, Key, UserCheck, UserX, Settings2,
    Lock, Eye, X, ShieldCheck, ShieldAlert, Activity, Trash2, Mail, User as UserIcon,
    Check, ChevronRight, Fingerprint, Loader2, Edit3, ToggleLeft, ToggleRight,
    FileText, Users as UsersIcon, Package, Calendar, DollarSign, Save, Ghost, HeartPulse,
    AlertTriangle, ArrowRight, Monitor, History, Terminal, CheckCircle2
} from 'lucide-react';
import { User, UserRole, AuditLog, SecurityHealth } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const INITIAL_PERMISSIONS = [
    { module: 'Ventas', roles: { [UserRole.SUPER_ADMIN]: 'Full', [UserRole.ADMIN]: 'Edit', [UserRole.INSTALLER]: 'None', [UserRole.CLIENT]: 'View' } },
    { module: 'Inventario', roles: { [UserRole.SUPER_ADMIN]: 'Full', [UserRole.ADMIN]: 'Edit', [UserRole.INSTALLER]: 'View', [UserRole.CLIENT]: 'None' } },
    { module: 'Usuarios', roles: { [UserRole.SUPER_ADMIN]: 'Full', [UserRole.ADMIN]: 'View', [UserRole.INSTALLER]: 'None', [UserRole.CLIENT]: 'None' } },
    { module: 'Reportes', roles: { [UserRole.SUPER_ADMIN]: 'Full', [UserRole.ADMIN]: 'Full', [UserRole.INSTALLER]: 'None', [UserRole.CLIENT]: 'None' } },
];

const Users: React.FC = () => {
    const { user: currentUser, login, logout } = useAuth();
    const { showToast } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('Todos los roles');
    const [activeTab, setActiveTab] = useState<'users' | 'health'>('users');

    // Modals
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);

    const [users, setUsers] = useState<User[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [securityHealth, setSecurityHealth] = useState<SecurityHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState<string | null>(null);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: '', name: '', email: '', password: '', role: UserRole.ADMIN as string, status: 'Activo' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('superair_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [usersRes, auditRes, healthRes] = await Promise.all([
                fetch('/api/users', { headers }),
                fetch('/api/audit-logs', { headers }),
                fetch('/api/security/health', { headers })
            ]);

            if (usersRes.status === 401 || auditRes.status === 401 || healthRes.status === 401) {
                logout();
                return;
            }

            if (usersRes.ok) setUsers(await usersRes.json());
            if (auditRes.ok) setAuditLogs(await auditRes.json());
            if (healthRes.ok) setSecurityHealth(await healthRes.json());

        } catch (e) {
            console.error("Error fetching data", e);
            showToast("Error de conexión", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleImpersonate = async (user: User) => {
        if (!confirm(`¿Deseas entrar al sistema como ${user.name}? Se registrará en la auditoría.`)) return;
        setIsImpersonating(user.id);
        try {
            const res = await fetch(`/api/auth/impersonate/${user.id}`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                login(data, false);
                showToast(`Sustituyendo identidad: ${user.name}`, "success");
                setTimeout(() => {
                    window.location.hash = '#/dashboard';
                    window.location.reload();
                }, 1000);
            } else {
                showToast("Error de impersonación", "error");
            }
        } catch (e) { showToast("Error de red", "error"); }
        finally { setIsImpersonating(null); }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`¿Estás seguro de eliminar a ${user.name}? Esta acción es irreversible.`)) return;
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('superair_token')}` }
            });
            if (res.ok) {
                showToast("Usuario eliminado correctamente", "success");
                fetchData();
            } else {
                showToast("Error al eliminar", "error");
            }
        } catch (e) { showToast("Error de red", "error"); }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'Todos los roles' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case UserRole.SUPER_ADMIN: return 'bg-slate-900 text-white border-slate-900';
            case UserRole.ADMIN: return 'bg-sky-50 text-sky-700 border-sky-200';
            case UserRole.INSTALLER: return 'bg-amber-50 text-amber-700 border-amber-200';
            case UserRole.CLIENT: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    if (loading && users.length === 0) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={48} /></div>;

    return (
        <div className="flex flex-col xl:flex-row gap-8 pb-20 h-[calc(100vh-100px)]">

            {/* Main Content */}
            <div className="flex-1 space-y-8 overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Usuarios y Seguridad</h2>
                        <div className="flex gap-4 mt-2">
                            <button onClick={() => setActiveTab('users')} className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'users' ? 'text-sky-600 border-b-2 border-sky-600' : 'text-slate-400 hover:text-slate-600'}`}>Gestión de Staff</button>
                            <button onClick={() => setActiveTab('health')} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${activeTab === 'health' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-400 hover:text-slate-600'}`}><HeartPulse size={12} /> Salud de Seguridad</button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowPermissionsModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <Settings2 size={18} /> Matriz RBAC
                        </button>
                        <button
                            onClick={() => { setFormData({ id: '', name: '', email: '', password: '', role: UserRole.ADMIN, status: 'Activo' }); setIsEditing(false); setShowUserModal(true); }}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-sky-700 shadow-xl transition-all"
                        >
                            <UserPlus size={18} /> Nuevo Usuario
                        </button>
                    </div>
                </div>

                {activeTab === 'users' ? (
                    <>
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm flex p-2 shrink-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar usuarios por nombre o correo..."
                                    className="w-full pl-12 pr-4 py-3 bg-transparent outline-none font-medium text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-4 bg-transparent outline-none text-xs font-black uppercase tracking-widest text-slate-600"
                            >
                                <option>Todos los roles</option>
                                {Object.values(UserRole).map(role => <option key={role}>{role}</option>)}
                            </select>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                            <div className="overflow-x-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest sticky top-0 z-10">
                                        <tr>
                                            <th className="px-8 py-5">Colaborador</th>
                                            <th className="px-8 py-5">Rol Maestro</th>
                                            <th className="px-8 py-5">Estado Operativo</th>
                                            <th className="px-8 py-5 text-right">Acciones Forenses</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md ${user.role === UserRole.SUPER_ADMIN ? 'bg-slate-900' : 'bg-slate-400'}`}>
                                                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                                                            <div className="text-[10px] font-medium text-slate-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${getRoleBadgeColor(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${user.status === 'Activo' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                        <span className="text-[10px] font-black uppercase text-slate-500">{user.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {currentUser?.role === UserRole.SUPER_ADMIN && user.id !== currentUser.id && (
                                                            <button
                                                                onClick={() => handleImpersonate(user)}
                                                                disabled={isImpersonating === user.id}
                                                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                                                title="Impersonar Usuario"
                                                            >
                                                                {isImpersonating === user.id ? <Loader2 size={16} className="animate-spin" /> : <Ghost size={16} />}
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setFormData({ ...user, password: '' }); setIsEditing(true); setShowUserModal(true); }} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"><Edit3 size={16} /></button>
                                                        {currentUser?.role === UserRole.SUPER_ADMIN && user.id !== currentUser.id && (
                                                            <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="space-y-8 animate-in fade-in duration-500 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden">
                            <HeartPulse size={160} className="absolute -right-8 -bottom-8 opacity-5" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter">Security Score</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Auditoría Proactiva de Riesgos</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-6xl font-black text-rose-500">{securityHealth?.score || 0}</span>
                                        <span className="text-slate-500 font-bold">/100</span>
                                    </div>
                                </div>
                                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                                    <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${securityHealth?.score || 0}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {securityHealth?.issues.map((issue, idx) => (
                                <div key={idx} className={`p-8 rounded-[2.5rem] border-2 bg-white flex gap-6 items-start ${issue.severity === 'high' ? 'border-rose-100' : 'border-slate-50'}`}>
                                    <div className={`p-4 rounded-2xl ${issue.severity === 'high' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 uppercase tracking-tight mb-2">{issue.title}</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed mb-4">{issue.description}</p>
                                        <button className="text-[10px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1 hover:underline">Resolver ahora <ArrowRight size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar: Auditoría Forense (Diffs) */}
            <div className="xl:w-96 shrink-0 flex flex-col h-full overflow-hidden gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between mb-4">
                        <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm flex items-center gap-2"><Terminal size={16} className="text-sky-500" /> Logs Forenses</h4>
                        <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase animate-pulse">Live</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                        {auditLogs.map(log => (
                            <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-sky-200 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{log.action}</span>
                                    <span className="text-[9px] font-bold text-slate-300">{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-800 mb-1">{log.user_name}</p>
                                <p className="text-[10px] text-slate-500 mb-3">{log.resource}: <span className="font-mono bg-slate-200 px-1 rounded text-slate-600">#{log.resource_id}</span></p>

                                {log.changes && log.changes.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-200">
                                        {log.changes.map((c, i) => (
                                            <div key={i} className="text-[9px] leading-tight">
                                                <p className="font-black text-slate-400 uppercase tracking-tighter mb-1">{c.field}</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="line-through text-rose-400 bg-rose-50 px-1 rounded">{String(c.old)}</span>
                                                    <ArrowRight size={8} className="text-slate-300" />
                                                    <span className="text-emerald-600 bg-emerald-50 px-1 rounded font-black">{String(c.new)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-3 flex items-center gap-1 text-[8px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Monitor size={10} /> IP: {log.ip_address}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Add/Edit Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h3>
                            <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <input
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</label>
                                <input
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option>Activo</option>
                                        <option>Inactivo</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña {isEditing && '(Dejar en blanco para mantener)'}</label>
                                <input
                                    type="password"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    if (!formData.name || !formData.email || (!isEditing && !formData.password)) {
                                        showToast("Completa los campos obligatorios", "error");
                                        return;
                                    }

                                    try {
                                        const method = isEditing ? 'PUT' : 'POST';
                                        const url = isEditing ? `/api/users/${formData.id}` : '/api/users';
                                        const res = await fetch(url, {
                                            method,
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${localStorage.getItem('superair_token')}`
                                            },
                                            body: JSON.stringify(formData)
                                        });

                                        if (res.ok) {
                                            showToast(isEditing ? "Usuario actualizado correctamente" : "Usuario creado exitosamente", "success");
                                            fetchData();
                                            setShowUserModal(false);
                                        } else {
                                            const err = await res.json();
                                            showToast(err.error || "Error al guardar", "error");
                                        }
                                    } catch (e) {
                                        showToast("Error de comunicación con el servidor", "error");
                                    }
                                }}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-sky-600 transition-all mt-4"
                            >
                                {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permissions Matrix Modal */}
            {showPermissionsModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><ShieldCheck size={24} /></div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase">Matriz de Acceso RBAC</h3>
                            </div>
                            <button onClick={() => setShowPermissionsModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="pb-6">Módulo / Capacidad</th>
                                        {Object.values(UserRole).map(role => (
                                            <th key={role} className="pb-6 text-center">{role}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {INITIAL_PERMISSIONS.map(row => (
                                        <tr key={row.module} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-6 font-bold text-slate-800 uppercase tracking-tight text-sm">{row.module}</td>
                                            {Object.values(UserRole).map(role => (
                                                <td key={role} className="py-6 text-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${row.roles[role] === 'Full' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        row.roles[role] === 'Edit' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                                                            row.roles[role] === 'View' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                                                                'bg-slate-100 text-slate-300 border-transparent opacity-30'
                                                        }`}>
                                                        {row.roles[role]}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-12 p-8 bg-slate-900 rounded-[2rem] text-white">
                                <div className="flex items-center gap-4 mb-4">
                                    <Lock className="text-sky-400" size={24} />
                                    <h4 className="font-black uppercase text-sm">Política de Privacidad de Datos</h4>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    La edición de esta matriz está restringida al rol **Super Admin**. Cualquier cambio generará una alerta de seguridad nivel 5 y notificará a la dirección general vía cifrado.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;

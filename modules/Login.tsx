import React, { useState, useEffect } from 'react';
import { 
  Wind, Lock, Mail, ChevronRight, AlertCircle, ArrowLeft, Loader2, 
  CheckCircle2, Eye, EyeOff, HelpCircle, X, Send, Key
} from 'lucide-react';
import { Link, useNavigate } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem('superair_logo'));

  // Efecto único para manejar la redirección tras autenticación exitosa
  useEffect(() => {
    if (isAuthenticated) {
        navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setSuccess(true);
        // El login actualiza el estado, el useEffect de arriba hará la navegación
        login(data, rememberMe); 
      } else {
        setError(data.error || 'Credenciales incorrectas');
        setLoading(false);
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor.');
      setLoading(false);
    }
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecovering(true);
    setTimeout(() => {
        setIsRecovering(false);
        alert(`Solicitud enviada a ${recoveryEmail}`);
        setShowRecovery(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 overflow-hidden relative font-sans">
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors">
            <ArrowLeft size={16} /> Volver al sitio
          </Link>
          <div className="flex items-center gap-2 font-black text-2xl text-sky-400">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 object-contain" /> : <><Wind size={28} /><span>SuperAir</span></>}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-2xl border border-slate-700/50 p-10 rounded-[2.5rem] shadow-2xl">
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Acceso Staff</h2>
          <p className="text-slate-400 text-sm mb-8 font-medium">Gestiona el sistema SuperAir.</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Email Institucional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-600"
                  placeholder="admin@qhosting.net"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-sky-600 border-sky-600' : 'border-slate-600 group-hover:border-slate-50'}`}>
                        {rememberMe && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                    <span className="text-xs text-slate-400 font-medium">Mantener sesión</span>
                </label>
                <button type="button" onClick={() => setShowRecovery(true)} className="text-xs font-bold text-sky-400 hover:text-sky-300">¿Olvidaste tu contraseña?</button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-pulse">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <div>
                  <p className="text-red-400 text-xs font-black uppercase tracking-widest">Error de Acceso</p>
                  <p className="text-red-300/80 text-[10px] font-medium mt-1">{error}</p>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || success}
              className={`w-full py-5 font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 ${
                  success ? 'bg-emerald-500 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {loading ? (success ? "AUTORIZADO" : <Loader2 className="animate-spin" size={20} />) : <>INGRESAR AL ERP <ChevronRight size={18} /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-700/50">
             <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <Key className="text-sky-400" size={18}/>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuenta Administrador</p>
                    <p className="text-xs font-mono text-slate-200">admin@qhosting.net</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showRecovery && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <div className="bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-700 animate-in zoom-in">
                <div className="p-8 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-black text-white uppercase flex items-center gap-2"><HelpCircle size={24} className="text-sky-400"/> Recuperar</h3>
                    <button onClick={() => setShowRecovery(false)} className="p-2 text-slate-400 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-8">
                    <form onSubmit={handleRecovery} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Email</label>
                            <input 
                                type="email" 
                                value={recoveryEmail}
                                onChange={(e) => setRecoveryEmail(e.target.value)}
                                className="w-full p-4 bg-slate-900 border border-slate-600 rounded-2xl text-white outline-none"
                                placeholder="usuario@qhosting.net"
                                required
                            />
                        </div>
                        <button type="submit" disabled={isRecovering} className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2">
                            {isRecovering ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />} Enviar Enlace
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Login;
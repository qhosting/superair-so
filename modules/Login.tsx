
import React, { useState } from 'react';
import { Wind, Lock, Mail, ChevronRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulación de login con credenciales estáticas
    setTimeout(() => {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === 'admin@superair.com.mx' && password === 'admin123') {
        localStorage.setItem('superair_auth', 'true');
        // Usamos navigate en lugar de window.location.href para evitar recargar la app
        navigate('/dashboard');
      } else {
        setError('Credenciales inválidas. Revisa tu correo o contraseña.');
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Background patterns */}
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
            <Wind size={28} />
            <span>SuperAir</span>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-2xl border border-slate-700/50 p-10 rounded-[2.5rem] shadow-2xl">
          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Acceso Staff</h2>
          <p className="text-slate-400 text-sm mb-8 font-medium">Introduce tus credenciales para gestionar el sistema.</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Email Institucional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder="admin@superair.com.mx"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in shake duration-500">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-red-400 text-xs font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-sky-900/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  INGRESAR AL ERP <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-700/50 flex flex-col gap-4">
            <div className="text-slate-500 text-[10px] text-center mb-2">
              <p>Demo: admin@superair.com.mx</p>
              <p>Pass: admin123</p>
            </div>
            <button className="text-slate-500 hover:text-sky-400 text-xs font-bold uppercase tracking-widest transition-colors text-center">
              ¿Olvidaste tu contraseña?
            </button>
            <p className="text-[10px] text-slate-600 text-center font-bold uppercase tracking-[0.2em]">
              Sistema de Gestión SuperAir v1.2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

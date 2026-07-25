import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, ArrowRight, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Supabase por defecto requiere verificación por email. Informar al usuario.
        if (data?.user && data?.session === null) {
          setSuccessMsg('¡Registro completado! Por favor, revisa tu correo electrónico para confirmar tu cuenta.');
        } else {
          setSuccessMsg('¡Registro completado e inicio de sesión exitoso!');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado durante la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <Activity className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">Aterpe</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
            Plataforma de Salud & Depuración
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-xl font-black text-white mb-6">
            {isSignUp ? 'Crear una cuenta.' : 'Iniciar Sesión.'}
          </h2>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start space-x-3 text-emerald-400">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2 pl-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2 pl-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] flex items-center justify-center space-x-2 transition-all mt-4 hover:scale-[1.01]"
            >
              <span>{loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Entrar'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Toggle link */}
          <div className="mt-8 text-center border-t border-slate-800/50 pt-6">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              {isSignUp ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

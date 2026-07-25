import React, { useState } from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, Key, LogOut, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ActivateToken({ userId, onActivationSuccess }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleActivation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formattedToken = token.trim().toUpperCase();

    if (!formattedToken) {
      setErrorMsg('Por favor, introduce tu código de activación.');
      setLoading(false);
      return;
    }

    try {
      // Llamada RPC a la función SQL que creamos
      const { data, error } = await supabase.rpc('activate_license_token', {
        input_token_code: formattedToken,
        input_user_id: userId
      });

      if (error) throw error;

      // El resultado viene en un array o formato objeto dependiendo de cómo lo devuelva postgrest
      // En tablas de retorno, rpc suele devolver un array de objetos
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success) {
        setSuccessMsg(result.message || '¡Plan activado correctamente!');
        setTimeout(() => {
          if (onActivationSuccess) {
            onActivationSuccess(result.plan_id, result.expires_at);
          }
        }, 1500);
      } else {
        setErrorMsg(result?.message || 'Código inválido o ya utilizado.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-8 shadow-2xl backdrop-blur-md">
          
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-white">Activar Licencia</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">
              Acceso a tu Tratamiento Físico
            </p>
          </div>

          <p className="text-xs text-slate-400 text-center leading-relaxed mb-6">
            Para acceder a los protocolos digitales de tu pack de suplementos, por favor introduce el código de activación impreso en la tarjeta física que se incluye dentro de la caja de tus productos.
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start space-x-3 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
              <p className="text-xs font-bold leading-relaxed">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleActivation} className="space-y-6">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2 pl-1">
                Código de Activación (Ej: ATERPE-XXXX-XXXX)
              </label>
              <input
                type="text"
                required
                placeholder="Escribe tu código de activación..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading || successMsg}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-4 text-center font-black tracking-widest text-white focus:outline-none focus:border-amber-500/50 transition-colors uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-bold text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || successMsg}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.15)] transition-all hover:scale-[1.01]"
            >
              {loading ? 'Validando código...' : 'Activar mi Pack'}
            </button>
          </form>

          {/* Cerrar Sesión */}
          <div className="mt-8 text-center border-t border-slate-800/50 pt-6">
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

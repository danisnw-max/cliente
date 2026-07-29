import React, { useState } from 'react';
import { usePlan } from '../contexts/PlanContext';
import { supabase } from '../supabase';
import { CalendarDays, Target, Clock, Activity, CheckCircle2, LogOut, Check, Layers, Key, Plus, ShieldAlert } from 'lucide-react';

export default function PerfilView() {
  const {
    session,
    profile,
    subscription,
    activeSubscriptions,
    subscriptionHistory,
    getGlobalAdherence,
    selectActivePlan,
    checkSubscription
  } = usePlan();

  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenSuccess, setTokenSuccess] = useState('');

  const globalAdherence = getGlobalAdherence();

  const inactiveHistory = subscriptionHistory.filter(
    sub => !sub.is_active || new Date(sub.expires_at) <= new Date()
  );

  const handleActivateNewToken = async (e) => {
    e.preventDefault();
    setTokenLoading(true);
    setTokenError('');
    setTokenSuccess('');

    const formattedToken = tokenInput.trim().toUpperCase();
    if (!formattedToken) {
      setTokenError('Por favor, introduce el código de activación.');
      setTokenLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('activate_license_token', {
        input_token_code: formattedToken,
        input_user_id: session?.user?.id
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success) {
        setTokenSuccess(result.message || '¡Nuevo tratamiento activado correctamente!');
        setTokenInput('');
        checkSubscription();
        setTimeout(() => {
          setTokenSuccess('');
          setShowTokenInput(false);
        }, 2000);
      } else {
        setTokenError(result?.message || 'Código inválido o ya utilizado.');
      }
    } catch (err) {
      setTokenError(err.message || 'Error de conexión al activar código.');
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-950 text-slate-50 p-6 pb-32 relative overflow-hidden animate-in fade-in duration-500">
      <div className="absolute top-[-5%] left-[-10%] w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none animate-pulse"></div>
      
      <header className="mb-10 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Identidad Digital</p>
        <h2 className="text-4xl font-black italic tracking-tight text-white">Perfil.</h2>
      </header>

      {/* Avatar de Cuenta */}
      <section className="relative z-10 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 shadow-2xl relative overflow-hidden flex items-center space-x-6">
          <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-emerald-500/50 flex items-center justify-center italic font-black text-emerald-500 uppercase">
            {profile?.first_name ? profile.first_name.substring(0, 2) : (session?.user?.email ? session.user.email.substring(0, 2) : 'US')}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xl font-black tracking-tight text-white mb-1 truncate max-w-[200px]">
              {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : (session?.user?.email ? session.user.email.split('@')[0] : 'Usuario')}.
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              {profile?.natura_client_id ? `ID: ${profile.natura_client_id}` : 'Cuenta Online'}
            </p>
          </div>
        </div>
      </section>

      {/* Datos Personales (Natura ERP) */}
      {profile?.natura_client_id && (
        <section className="relative z-10 mb-6 animate-in fade-in duration-300">
          <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6 shadow-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Ficha Natura ERP</p>
            <div className="space-y-4">
              {profile.phone && (
                <div className="flex justify-between items-center text-sm font-black text-white pb-3 border-b border-slate-800/50">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest">
                    Teléfono
                  </span>
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.nif && (
                <div className="flex justify-between items-center text-sm font-black text-white pb-3 border-b border-slate-800/50">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest">
                    NIF / CIF
                  </span>
                  <span>{profile.nif}</span>
                </div>
              )}
              {profile.address && (
                <div className="flex justify-between items-center text-sm font-black text-white pb-3 border-b border-slate-800/50">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest">
                    Dirección
                  </span>
                  <span className="text-right text-xs max-w-[200px] truncate">{profile.address}</span>
                </div>
              )}
              {profile.registration_date && (
                <div className="flex justify-between items-center text-sm font-black text-white pb-3 border-b border-slate-800/50">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest">
                    Alta Cliente
                  </span>
                  <span>{new Date(profile.registration_date).toLocaleDateString('es-ES')}</span>
                </div>
              )}
              {profile.internal_notes && (
                <div className="pt-2">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest block mb-2">
                    Notas Médicas / Historial
                  </span>
                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 text-xs font-bold text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {profile.internal_notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Módulos Activos Simultáneos */}
      <section className="relative z-10 mb-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Módulos Activos ({activeSubscriptions.length})</p>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Adherencia Actual: {globalAdherence}%</span>
          </div>

          <div className="space-y-4">
            {activeSubscriptions.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No hay módulos activos actualmente</p>
            ) : (
              activeSubscriptions.map((sub) => {
                const isSelected = subscription && subscription.id === sub.id;
                
                return (
                  <div 
                    key={sub.id} 
                    className={`rounded-[24px] p-5 border transition-all duration-300 relative overflow-hidden ${
                      isSelected ? 'bg-slate-900 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isSelected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{sub.planTitle}</h4>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">
                            Activado: {new Date(sub.activated_at).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center">
                          <Check className="w-3 h-3 mr-1" /> Activo
                        </span>
                      ) : (
                        <button
                          onClick={() => selectActivePlan(sub)}
                          className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
                        >
                          Seleccionar
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/50 text-xs">
                      <span className="text-slate-400 text-[10px] uppercase tracking-widest flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Vencimiento:
                      </span>
                      <span className="text-amber-400 font-bold text-[11px]">
                        {new Date(sub.expires_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Formulario / Botón de Activación de Nuevo Código */}
            <div className="pt-2 border-t border-slate-800/60">
              {!showTokenInput ? (
                <button
                  onClick={() => setShowTokenInput(true)}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-amber-400 rounded-2xl p-3.5 flex items-center justify-center space-x-2 transition-all cursor-pointer text-xs font-black uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4" />
                  <span>Activar Nuevo Tratamiento / Código</span>
                </button>
              ) : (
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center">
                      <Key className="w-3.5 h-3.5 mr-1.5" /> Activar Código Físico
                    </span>
                    <button
                      onClick={() => { setShowTokenInput(false); setTokenError(''); setTokenSuccess(''); }}
                      className="text-slate-500 hover:text-white text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>

                  {tokenError && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2 text-red-400 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{tokenError}</span>
                    </div>
                  )}

                  {tokenSuccess && (
                    <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{tokenSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleActivateNewToken} className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Código (Ej: ATERPE-XXXX-XXXX)"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      disabled={tokenLoading || !!tokenSuccess}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-center text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      type="submit"
                      disabled={tokenLoading || !!tokenSuccess}
                      className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-md"
                    >
                      {tokenLoading ? 'Validando...' : 'Validar y Añadir Módulo'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Historial de Módulos Pasados */}
      <section className="relative z-10 mb-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Historial de Tratamientos Anteriores</p>
          <div className="space-y-3">
            {inactiveHistory.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No hay tratamientos vencidos previamente</p>
            ) : (
              inactiveHistory.map((sub) => {
                const dateText = new Date(sub.activated_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
                
                return (
                  <div key={sub.id} className="bg-slate-950 border border-slate-800/50 rounded-[20px] p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-slate-900 border-slate-800 text-slate-500">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black text-slate-300">{sub.planTitle}</h4>
                    </div>
                    <span className="text-[8px] font-black text-slate-500 uppercase">{dateText}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Botón de Cerrar Sesión */}
      <section className="relative z-10">
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 rounded-2xl p-4 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cerrar Sesión</span>
        </button>
      </section>
    </div>
  );
}

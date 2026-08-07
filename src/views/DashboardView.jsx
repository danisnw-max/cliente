import React, { useState } from 'react';
import { usePlan } from '../contexts/PlanContext';
import { useNotifications } from '../hooks/useNotifications';
import { 
  Bell, 
  Crosshair, 
  ChevronRight, 
  ChevronDown, 
  Droplet, 
  Activity, 
  AlertTriangle, 
  Star, 
  Heart,
  Layers
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const {
    session,
    profile,
    subscription,
    activeSubscriptions,
    selectActivePlan,
    currentDay,
    setCurrentDay,
    completedTasks,
    planPillars,
    getPhaseConfig,
    getDayProgress,
    todayTasks
  } = usePlan();

  const [showPillars, setShowPillars] = useState(false);

  const currentPhase = getPhaseConfig(currentDay) || {};
  const { permission: notifPermission, requestPermission: requestNotifPermission } = useNotifications(todayTasks, session?.user?.id);
  const progress = getDayProgress(currentDay);

  return (
    <div className="min-h-full bg-slate-950 text-slate-50 p-6 pb-32 relative overflow-hidden animate-in fade-in duration-500">
      {/* Dynamic Background Glow based on active phase */}
      <div className={`absolute top-[-10%] right-[-10%] w-96 h-96 ${currentPhase.bgGlow || 'bg-emerald-500/20'} blur-[100px] rounded-full pointer-events-none transition-colors duration-1000`}></div>
      
      <header className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Usuario Activo</p>
          <h1 className="text-2xl font-black tracking-tight text-white truncate max-w-[220px]">
            {profile?.first_name ? profile.first_name : (session?.user?.email ? session.user.email.split('@')[0] : 'Usuario')}.
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {notifPermission !== 'granted' && (
            <button 
              onClick={requestNotifPermission}
              className="p-2 bg-slate-900/40 border border-slate-800 rounded-full shadow-sm text-slate-400 hover:text-white hover:border-slate-600 transition-all duration-300"
              title="Activar Notificaciones"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center px-4 py-2 bg-slate-900/40 border border-slate-800 rounded-full shadow-sm">
            <span className={`w-2 h-2 ${currentPhase.bgAccent || 'bg-emerald-500'} rounded-full mr-2 animate-pulse`}></span>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">En Línea</span>
          </div>
        </div>
      </header>

      {/* Selector Multi-Plan Activo (si posee más de 1 plan vigente) */}
      {activeSubscriptions && activeSubscriptions.length > 1 && (
        <section className="relative z-10 mb-6 bg-slate-900/60 border border-slate-800 rounded-[20px] p-3.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2 overflow-hidden">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Protocolo:</span>
            <span className="text-xs font-black text-emerald-400 truncate max-w-[130px]">
              {subscription?.planTitle || 'Módulo Activo'}
            </span>
          </div>
          <select
            value={subscription?.id || ''}
            onChange={(e) => selectActivePlan(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 shrink-0"
          >
            {activeSubscriptions.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.planTitle}
              </option>
            ))}
          </select>
        </section>
      )}

      {/* Navegación de Progreso (1 al 21) */}
      <section className="relative z-10 mb-8 bg-slate-900/40 border border-slate-800/80 rounded-[24px] p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 pl-1">Jornadas del Tratamiento</p>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }, (_, i) => i + 1).map((dayNum) => {
            const isSelected = dayNum === currentDay;
            const progressForDay = getDayProgress(dayNum);
            let indicatorClass = 'bg-slate-950 border border-slate-800 text-slate-500';
            if (isSelected) {
              indicatorClass = `${currentPhase.bgAccent || 'bg-emerald-500'} text-slate-950 font-extrabold`;
            } else if (progressForDay === 100) {
              indicatorClass = 'bg-emerald-950 border border-emerald-900 text-emerald-400';
            } else if (progressForDay > 0) {
              indicatorClass = 'bg-slate-900 border border-slate-700 text-slate-300';
            }

            return (
              <button 
                key={dayNum} 
                onClick={() => setCurrentDay(dayNum)}
                className={`text-[9px] py-1.5 rounded-lg text-center transition-all ${indicatorClass}`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </section>

      {/* Panel de Métricas */}
      <section className="relative z-10 mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{currentPhase.subtitle || 'Tratamiento Activo'}</p>
        <div className="flex items-baseline space-x-2 mb-2">
          <span className="text-8xl font-black italic tracking-tighter text-white">
            {currentDay < 10 ? `0${currentDay}` : currentDay}
          </span>
          <span className="text-5xl font-black italic tracking-tighter text-slate-500/80">/21</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Jornadas Totales del Módulo</p>
      </section>

      {/* Tarjeta de Adherencia Diaria */}
      <section className="relative z-10 mb-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6 flex justify-between items-center shadow-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Adherencia del Día</p>
            <p className="text-4xl font-black text-white">{progress}%</p>
          </div>
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-md">
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
              <circle 
                cx="32" cy="32" r="28" 
                stroke="currentColor" 
                strokeWidth="6" 
                fill="transparent" 
                strokeDasharray={28 * 2 * Math.PI} 
                strokeDashoffset={(28 * 2 * Math.PI) - ((progress / 100) * (28 * 2 * Math.PI))} 
                className={`${currentPhase.textColor || 'text-emerald-500'} transition-all duration-1000 ease-out`} 
                strokeLinecap="round" 
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Botón de Ejecución */}
      <button 
        onClick={() => onNavigate('ejecucion')} 
        className="w-full bg-slate-900 border border-slate-800 rounded-[24px] p-5 flex items-center justify-between group transition-colors shadow-lg mb-6 hover:border-slate-700"
      >
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 bg-slate-950 rounded-[16px] flex items-center justify-center border border-slate-800 group-hover:${currentPhase.bgGlow || 'bg-emerald-500/20'}`}>
            <Crosshair className={`w-5 h-5 ${currentPhase.textColor || 'text-emerald-500'}`} />
          </div>
          <div className="text-left">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${currentPhase.textColor || 'text-emerald-500'} mb-0.5`}>Ejecución de Hoy</p>
            <p className="font-bold text-slate-200">Verificar Tomas del Día</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white" />
      </button>

      {/* Pilares Transversales */}
      <section className="relative z-10">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6">
          <button 
            onClick={() => setShowPillars(!showPillars)} 
            className="w-full flex justify-between items-center text-left"
          >
            <div className="flex items-center space-x-3">
              <Droplet className="w-5 h-5 text-indigo-400" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Pilares Transversales del Proceso</h3>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showPillars ? 'rotate-180' : ''}`} />
          </button>

          {showPillars && (
            <div className="mt-5 space-y-4 pt-4 border-t border-slate-800/50 animate-in slide-in-from-top-2 duration-300">
              {planPillars.map((pillar) => {
                const ICON_MAP = { Droplet, Activity, AlertTriangle, Crosshair, Star, Heart };
                const COLOR_MAP = {
                  'Droplet': 'text-indigo-400',
                  'Activity': 'text-emerald-400',
                  'AlertTriangle': 'text-amber-500',
                  'Crosshair': 'text-rose-400',
                  'Star': 'text-yellow-400',
                  'Heart': 'text-red-400'
                };
                
                const Icon = ICON_MAP[pillar.icon] || Droplet;
                const textColor = COLOR_MAP[pillar.icon] || 'text-indigo-400';
                
                return (
                  <div key={pillar.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                    <h4 className={`text-xs font-black uppercase tracking-widest ${textColor} mb-1 flex items-center`}>
                      <Icon className="w-4 h-4 mr-1.5" /> {pillar.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{pillar.description}</p>
                  </div>
                );
              })}
              {planPillars.length === 0 && (
                <div className="text-center text-slate-500 text-xs italic py-4">No hay pilares configurados.</div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

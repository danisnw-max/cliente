import React, { useState } from 'react';
import { usePlan } from '../contexts/PlanContext';
import { Activity, Clock, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';

export default function EjecucionView() {
  const {
    activeSubscriptions,
    currentDay,
    completedTasks,
    telemetryByDay,
    getPhaseConfig,
    toggleTask,
    setTelemetry,
    // Consolidated
    consolidatedAgenda,
    consolidatedTelemetry,
    consolidatedDays,
    toggleConsolidatedTask,
    setConsolidatedTelemetryValue
  } = usePlan();

  const isMultiPlan = activeSubscriptions && activeSubscriptions.length > 1;

  // For multiplan telemetry accordion
  const [openTelemetry, setOpenTelemetry] = useState({});

  const currentPhase = !isMultiPlan ? getPhaseConfig(currentDay) : null;
  const dayCompletions = !isMultiPlan ? (completedTasks[currentDay] || {}) : null;
  const dayTelemetry = !isMultiPlan ? (telemetryByDay[currentDay] || null) : null;

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'suplemento': return 'Suplemento Botánico';
      case 'nutricion': return 'Nutrición / Dieta';
      case 'habito': return 'Hábito / Estilo de Vida';
      case 'ejercicio': return 'Ejercicio / Movimiento';
      default: return cat;
    }
  };

  const toggleAccordion = (planId) => {
    setOpenTelemetry(prev => ({...prev, [planId]: !prev[planId]}));
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 p-6 pb-32 animate-in fade-in duration-500">
      <header className="mb-6">
        {isMultiPlan ? (
          <>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">AGENDA CONSOLIDADA</p>
            <h2 className="text-3xl font-black italic tracking-tight text-slate-950">Múltiples Protocolos Activos.</h2>
          </>
        ) : (
          <>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">PROTOCOLO ACTIVO • DÍA {currentDay}</p>
            <h2 className="text-3xl font-black italic tracking-tight text-slate-950">{currentPhase?.title}.</h2>
          </>
        )}
      </header>

      {/* Telemetría Corporal */}
      {isMultiPlan ? (
        <div className="mb-8 space-y-4">
          {activeSubscriptions.map(sub => {
            const cDay = consolidatedDays[sub.plan_id] || 1;
            const cTel = consolidatedTelemetry[sub.plan_id]?.[cDay] || null;
            const isOpen = openTelemetry[sub.plan_id];
            
            return (
              <div key={sub.plan_id} className="p-4 bg-slate-100 border border-slate-200/60 rounded-[24px] shadow-sm">
                <div 
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleAccordion(sub.plan_id)}
                >
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-indigo-800" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900">
                      Telemetría: {sub.planTitle} (Día {cDay})
                    </h3>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
                
                {isOpen && (
                  <div className="mt-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-full p-2 flex justify-between items-center shadow-sm mb-3">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button 
                          key={num} 
                          onClick={() => setConsolidatedTelemetryValue(num, sub.plan_id, cDay)} 
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black transition-all duration-300 ${
                            cTel === num ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between px-4">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Pesadez</span>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Ligereza</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-8 p-6 bg-slate-100 border border-slate-200/60 rounded-[32px] shadow-sm">
          <div className="flex items-center space-x-2 mb-5 pl-2">
            <Activity className="w-5 h-5 text-indigo-800" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-900">Telemetría Corporal</h3>
          </div>
          <div className="bg-white rounded-full p-2 flex justify-between items-center shadow-sm mb-4">
            {[1, 2, 3, 4, 5].map(num => (
              <button 
                key={num} 
                onClick={() => setTelemetry(num)} 
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black transition-all duration-300 ${
                  dayTelemetry === num ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex justify-between px-4">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Pesadez</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Ligereza</span>
          </div>
        </div>
      )}

      {/* Listado de tareas diarias dinámicas */}
      <div className="space-y-4">
        {isMultiPlan ? (
          // CONSOLIDATED AGENDA TASKS
          consolidatedAgenda.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[24px] border border-slate-200/80 shadow-md">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No hay tareas programadas para hoy.</p>
            </div>
          ) : (
            consolidatedAgenda.map((task) => {
              const isCompleted = task.is_completed;

              return (
                <div 
                  key={`${task.plan_id}-${task.task_id}`} 
                  onClick={() => toggleConsolidatedTask(task.task_id, task.plan_id, task.current_day)} 
                  className={`p-6 rounded-[24px] border-2 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                    isCompleted ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-white shadow-xl'
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-slate-300' : 'bg-indigo-500'}`}></div>
                  
                  <div className="flex justify-between items-start mb-4 pl-2">
                    <div className="flex items-center space-x-2">
                      <Clock className={`w-4 h-4 ${isCompleted ? 'text-slate-400' : 'text-slate-900'}`} />
                      <span className="text-xs font-black tracking-tight text-slate-950">{task.time}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[8px] ${
                      isCompleted ? 'bg-slate-200 text-slate-500' : 'bg-slate-950 text-white'
                    }`}>
                      {getCategoryLabel(task.category || task.type)}
                    </span>
                  </div>
                  
                  <div className="pl-2 mb-2">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1 block">{task.plan_name} (Día {task.current_day})</span>
                    <h4 className={`text-xl font-bold ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                      {task.title}
                    </h4>
                  </div>
                  
                  <p className="text-sm font-medium text-slate-500 pl-2 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between pl-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
                    {isCompleted ? (
                      <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-[12px]">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> 
                        <span className="text-xs font-bold">Verificado</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-400 hover:text-slate-900 transition-colors px-3 py-1.5 border border-slate-200 rounded-[12px]">
                        <Circle className="w-4 h-4 mr-1.5" /> 
                        <span className="text-xs font-bold">Confirmar Toma</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : (
          // SINGLE PLAN TASKS
          currentPhase?.tasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[24px] border border-slate-200/80 shadow-md">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No hay tareas programadas para hoy.</p>
              <p className="text-xs text-slate-400 mt-1">El administrador aún no ha añadido pautas para este día.</p>
            </div>
          ) : (
            currentPhase?.tasks.map((task) => {
              const isCompleted = !!dayCompletions[task.task_id];

              return (
                <div 
                  key={task.id} 
                  onClick={() => toggleTask(task.task_id)} 
                  className={`p-6 rounded-[24px] border-2 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                    isCompleted ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-white shadow-xl'
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-slate-300' : currentPhase.bgAccent}`}></div>
                  
                  <div className="flex justify-between items-start mb-4 pl-2">
                    <div className="flex items-center space-x-2">
                      <Clock className={`w-4 h-4 ${isCompleted ? 'text-slate-400' : 'text-slate-900'}`} />
                      <span className="text-xs font-black tracking-tight text-slate-950">{task.time}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[8px] ${
                      isCompleted ? 'bg-slate-200 text-slate-500' : 'bg-slate-950 text-white'
                    }`}>
                      {getCategoryLabel(task.category || task.type)}
                    </span>
                  </div>
                  
                  <h4 className={`text-xl font-bold pl-2 mb-2 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                    {task.title}
                  </h4>
                  
                  <p className="text-sm font-medium text-slate-500 pl-2 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between pl-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
                    {isCompleted ? (
                      <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-[12px]">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> 
                        <span className="text-xs font-bold">Verificado</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-400 hover:text-slate-900 transition-colors px-3 py-1.5 border border-slate-200 rounded-[12px]">
                        <Circle className="w-4 h-4 mr-1.5" /> 
                        <span className="text-xs font-bold">Confirmar Toma</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}

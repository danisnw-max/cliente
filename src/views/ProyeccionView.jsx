import React, { useState } from 'react';
import { usePlan } from '../contexts/PlanContext';
import { Check, Sparkles } from 'lucide-react';

export default function ProyeccionView() {
  const { currentDay, planPhases, planProducts } = usePlan();
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('ALL');

  const filteredProducts = selectedPhaseFilter === 'ALL' 
    ? planProducts 
    : planProducts.filter(p => p.phase_name === selectedPhaseFilter);

  // Get unique phase names from products for the filter tabs
  const productPhases = [...new Set(planProducts.map(p => p.phase_name).filter(Boolean))];

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 p-6 pb-32 animate-in fade-in duration-500">
      <header className="mb-8">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Estrategia Global</p>
        <h2 className="text-4xl font-black italic tracking-tight text-slate-950">Proyección.</h2>
      </header>

      {/* Stepper del Proceso */}
      <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100 relative mb-8">
        <div className="absolute left-[31px] top-12 bottom-12 w-0.5 bg-slate-100"></div>
        <div className="space-y-10 relative">
          {planPhases.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No hay fases configuradas en este protocolo.</p>
          ) : (
            planPhases.map((phase) => {
              let status = 'future';
              if (currentDay >= phase.day_start && currentDay <= phase.day_end) {
                status = 'current';
              } else if (currentDay > phase.day_end) {
                status = 'completed';
              }

              return (
                <div key={phase.id} className="flex items-start space-x-6">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    status === 'completed' ? 'bg-slate-900' : status === 'current' ? 'bg-emerald-400 shadow-lg ring-4 ring-emerald-50' : 'bg-white border-2 border-slate-100'
                  }`}>
                    {status === 'completed' ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${status === 'current' ? 'bg-white' : 'bg-slate-100'}`} />
                    )}
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase tracking-widest ${status === 'current' ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {phase.label} {status === 'current' ? '(ACTUAL)' : ''}
                    </p>
                    <h3 className={`text-xl font-black tracking-tight ${status === 'current' ? 'text-slate-950 italic' : 'text-slate-300'}`}>
                      {phase.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                      {phase.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Catálogo de Productos y Calidad */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 pl-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Especificaciones de Calidad</h3>
        </div>

        {/* Filtros de Fases */}
        {productPhases.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedPhaseFilter('ALL')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedPhaseFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              Todos
            </button>
            {productPhases.map(phaseName => (
              <button
                key={phaseName}
                onClick={() => setSelectedPhaseFilter(phaseName)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedPhaseFilter === phaseName
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {phaseName}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-slate-500 italic pl-2">No hay productos recomendados.</p>
          ) : (
            filteredProducts.map((prod) => (
              <div key={prod.id} className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm flex justify-between items-start">
                <div>
                  {prod.phase_name && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      {prod.phase_name}
                    </span>
                  )}
                  <h4 className="text-sm font-black text-slate-900 mb-1">{prod.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{prod.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

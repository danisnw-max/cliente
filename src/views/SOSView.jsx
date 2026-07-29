import React, { useState } from 'react';
import { usePlan } from '../contexts/PlanContext';
import { ShieldAlert, ArrowLeft, Search, MessageSquare, Info, ChevronDown, LifeBuoy } from 'lucide-react';

const CONTINGENCIA_DATA = [
  { 
    id: 'c1', 
    title: 'Crisis de Ansiedad / Nerviosismo', 
    scenario: 'Efecto depurativo o estrés del cambio de rutina.',
    steps: [
      'Iniciar ciclo de respiración cuadrada (Inspirar 4s - Mantener 4s - Exhalar 4s - Vacío 4s).',
      'Infusión de manzanilla concentrada fría o infusión digestiva.',
      'Tomar 10 minutos de desconexión lumínica (pantallas apagadas).'
    ]
  },
  { 
    id: 'c2', 
    title: 'Molestias Gastrointestinales / Gases', 
    scenario: 'Común en la Fase 1 debido al cambio microbiano.',
    steps: [
      'Reducir a la mitad la dosis del Extracto de Aloe Vera durante 48h.',
      'Infusión tibia de Hinojo con Anís Verde dando pequeños sorbos.',
      'Aplicar calor seco localizado en la zona abdominal.'
    ]
  },
  { 
    id: 'c3', 
    title: 'Dolor de Cabeza / Crisis de Curación', 
    scenario: 'Normal por la eliminación de toxinas (Fase 2).',
    steps: [
      'Ingerir inmediatamente 500ml de agua de mineralización débil.',
      'Masajear las sienes con una gota de aceite esencial de menta (si se dispone de él).',
      'Asegurar un reposo completo en habitación oscura durante mínimo 30 min.'
    ]
  }
];

export default function SOSView({ sosSubView, setSosSubView }) {
  const { planAlerts } = usePlan();
  const [selectedContingency, setSelectedContingency] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-full bg-slate-950 text-slate-50 p-6 pb-32 relative overflow-hidden animate-in fade-in duration-500">
      
      {sosSubView === 'main' && (
        <div className="flex flex-col items-center justify-center h-full pt-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 blur-[100px] rounded-full pointer-events-none animate-pulse"></div>
          <div className="relative z-10 text-center max-w-sm w-full">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-3xl font-black italic tracking-tight text-white mb-2">Protocolo SOS.</h2>
            <p className="text-sm font-medium text-slate-400 mb-10 leading-relaxed px-10">Gestión de crisis y seguridad de respuesta inmediata.</p>
            
            <div className="space-y-4 w-full px-6">
              <button 
                onClick={() => setSosSubView('contingency')}
                className="w-full bg-amber-400 text-amber-950 py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:scale-[1.02] transition-transform"
              >
                Protocolo de Contingencia
              </button>
              <button 
                onClick={() => setSosSubView('contraindications')}
                className="w-full bg-slate-900 border border-slate-800 text-white py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-colors"
              >
                Contraindicaciones
              </button>
              
              <div className="pt-8">
                <button className="flex items-center justify-center space-x-2 mx-auto text-slate-500 hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Soporte Directo Bio-Tech</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sosSubView === 'contraindications' && (
        <div className="animate-in slide-in-from-right duration-500">
          <header className="mb-8 flex items-center space-x-4">
            <button onClick={() => setSosSubView('main')} className="p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Seguridad de Protocolo</p>
              <h2 className="text-3xl font-black italic tracking-tight text-white">Contraindicaciones.</h2>
            </div>
          </header>

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar fármaco o componente..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-800 rounded-[20px] py-4 pl-12 pr-6 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-colors" 
            />
          </div>

          <div className="space-y-4">
            {planAlerts.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-[24px]">
                <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">No hay alertas activas en este plan.</p>
              </div>
            ) : (
              planAlerts
                .filter(a => 
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (a.contraindication_tags && a.contraindication_tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
                )
                .map(item => {
                  const isDanger = item.type === 'danger';
                  const isWarning = item.type === 'warning';
                  const isInfo = item.type === 'info';
                  const statusColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : isInfo ? 'bg-blue-400' : 'bg-emerald-500';
                  const badgeColor = isDanger ? 'bg-red-500/10 text-red-400' : isWarning ? 'bg-amber-500/10 text-amber-400' : isInfo ? 'bg-blue-400/10 text-blue-300' : 'bg-emerald-500/10 text-emerald-300';
                  
                  return (
                    <div key={item.id} className="bg-slate-900/40 border border-slate-800 rounded-[24px] p-5 relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`}></div>
                      <div className={`flex justify-between items-start ${item.associated_product ? 'mb-1' : 'mb-3'}`}>
                        <h4 className="font-black text-white">{item.title}</h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${badgeColor}`}>
                          {item.type === 'danger' ? 'Contraindicación' : item.type === 'warning' ? 'Precaución' : item.type === 'info' ? 'Aviso Clínico' : 'Consejo'}
                        </span>
                      </div>
                      {item.associated_product && (
                        <div className="text-[10px] text-emerald-400 font-black uppercase tracking-wider mb-3">
                          Producto: <span className="text-slate-300 font-medium normal-case">{item.associated_product}</span>
                        </div>
                      )}
                      <p className="text-xs font-medium text-slate-400 leading-relaxed mb-4">{item.message}</p>
                      <div className="flex justify-between items-center text-slate-500">
                        <div className="flex items-center space-x-2">
                          <Info className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest italic">Días {item.day_start} al {item.day_end}</span>
                        </div>
                        {item.contraindication_tags && item.contraindication_tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {item.contraindication_tags.map((tag, idx) => (
                              <span key={idx} className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800/50">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {sosSubView === 'contingency' && (
        <div className="animate-in slide-in-from-right duration-500">
          <header className="mb-8 flex items-center space-x-4">
            <button onClick={() => {setSosSubView('main'); setSelectedContingency(null);}} className="p-3 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Respuesta Crítica</p>
              <h2 className="text-3xl font-black italic tracking-tight text-white">Contingencia.</h2>
            </div>
          </header>

          <p className="text-sm font-medium text-slate-400 mb-6 leading-relaxed px-2">Seleccione el escenario de crisis actual para activar el protocolo de mitigación.</p>

          <div className="space-y-4">
            {CONTINGENCIA_DATA.map(item => (
              <div 
                key={item.id} 
                className={`border rounded-[32px] transition-all duration-300 overflow-hidden ${
                  selectedContingency === item.id ? 'bg-white border-white shadow-[0_0_50px_rgba(255,255,255,0.1)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <button 
                  onClick={() => setSelectedContingency(selectedContingency === item.id ? null : item.id)}
                  className="w-full p-6 flex justify-between items-center text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-[16px] ${selectedContingency === item.id ? 'bg-amber-100 text-amber-600' : 'bg-slate-950 text-slate-500'}`}>
                      <LifeBuoy className="w-5 h-5" />
                    </div>
                    <h4 className={`text-sm font-black uppercase tracking-tight ${selectedContingency === item.id ? 'text-slate-950' : 'text-slate-200'}`}>
                      {item.title}
                    </h4>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${selectedContingency === item.id ? 'rotate-180 text-slate-950' : 'text-slate-600'}`} />
                </button>

                {selectedContingency === item.id && (
                  <div className="px-6 pb-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 mb-3 italic">Pasos de ejecución obligatoria:</p>
                      <ul className="space-y-4">
                        {item.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start space-x-4">
                            <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-[10px] font-black flex items-center justify-center shrink-0 text-slate-950 shadow-sm">
                              {idx + 1}
                            </span>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{step}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-red-500/5 border border-red-500/20 rounded-[32px] flex items-center space-x-5">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500 leading-relaxed">
              Si experimenta dificultad respiratoria o síntomas graves, contacte inmediatamente con emergencias médicas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

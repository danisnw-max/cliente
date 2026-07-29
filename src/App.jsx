import React, { useState, Component } from 'react';
import Auth from './components/Auth';
import ActivateToken from './components/ActivateToken';
import { PlanProvider, usePlan } from './contexts/PlanContext';
import { Activity, Target, User, ShieldAlert, Crosshair, RefreshCw } from 'lucide-react';

import DashboardView from './views/DashboardView';
import EjecucionView from './views/EjecucionView';
import ProyeccionView from './views/ProyeccionView';
import PerfilView from './views/PerfilView';
import SOSView from './views/SOSView';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-center text-slate-50 font-sans">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Se produjo un aviso inesperado</h2>
          <p className="text-xs text-slate-400 max-w-xs mb-6 leading-relaxed">
            Hemos protegido tu sesión. Pulsa el botón para recargar la aplicación limpiamente.
          </p>
          <button
            onClick={this.handleReload}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center space-x-2 transition-all shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recargar Aplicación</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const { session, authLoading, subscription } = usePlan();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sosSubView, setSosSubView] = useState('main'); // 'main', 'contraindications', 'contingency'

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center font-sans text-slate-50">
        <div className="relative flex flex-col items-center">
          <div className="absolute w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none animate-pulse"></div>
          <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Cargando Aterpe...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (!subscription) {
    return <ActivateToken userId={session.user.id} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-950 min-h-screen relative shadow-2xl overflow-x-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => { setActiveTab(tab); setSosSubView('main'); }} />}
          {activeTab === 'ejecucion' && <EjecucionView />}
          {activeTab === 'proyeccion' && <ProyeccionView />}
          {activeTab === 'sos' && <SOSView sosSubView={sosSubView} setSosSubView={setSosSubView} />}
          {activeTab === 'perfil' && <PerfilView />}
        </main>

        <nav className="fixed bottom-0 w-full max-w-md bg-slate-950 border-t border-slate-800/80 px-4 py-4 pb-safe flex justify-between items-center rounded-t-[40px] shadow-2xl z-50">
          <button onClick={() => { setActiveTab('dashboard'); setSosSubView('main'); }} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'dashboard' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <Activity className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Data</span>
          </button>
          <button onClick={() => { setActiveTab('ejecucion'); setSosSubView('main'); }} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'ejecucion' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <Crosshair className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Ejecutar</span>
          </button>
          <button onClick={() => { setActiveTab('proyeccion'); setSosSubView('main'); }} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'proyeccion' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <Target className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Proyectar</span>
          </button>
          <button onClick={() => { setActiveTab('perfil'); setSosSubView('main'); }} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'perfil' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <User className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Perfil</span>
          </button>
          <button onClick={() => { setActiveTab('sos'); setSosSubView('main'); }} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'sos' ? 'text-amber-400 scale-110' : 'text-slate-600'}`}>
            <ShieldAlert className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Alerta</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <PlanProvider>
        <AppContent />
      </PlanProvider>
    </ErrorBoundary>
  );
}
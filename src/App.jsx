import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import ActivateToken from './components/ActivateToken';
import { 
  Activity, 
  Target, 
  CalendarCheck, 
  User, 
  Bell, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ShieldAlert, 
  Zap, 
  Wind,
  Crosshair,
  ChevronRight,
  Check,
  CalendarDays,
  Smartphone,
  Settings,
  LogOut,
  Search,
  ArrowLeft,
  AlertTriangle,
  Info,
  LifeBuoy,
  MessageSquare,
  ChevronDown,
  Droplet,
  Coffee,
  Sparkles,
  ChevronLeft
} from 'lucide-react';


// Las tareas ahora se cargan dinámicamente desde la tabla plan_days_tasks en Supabase.


const QUALITY_PRODUCTS = [
  { fase: 'Fase 1: Digestiva', name: 'Jugo de Aloe Vera', desc: '100% puro, libre de aloína, preferiblemente certificación ecológica u orgánica.' },
  { fase: 'Fase 1: Digestiva', name: 'Infusión Digestiva', desc: 'Mezcla limpia de Hinojo, Anís Verde, Manzanilla y Regaliz.' },
  { fase: 'Fase 1: Digestiva', name: 'Probiótico Avanzado', desc: 'Mínimo 50 billones de UFC, cepas variadas (Lactobacillus, Bifidobacterium).' },
  { fase: 'Fase 2: Hepática', name: 'Aceite Esencial de Limón', desc: 'Quimiotipado (QT), exclusivamente grado alimentario/oral de alta pureza.' },
  { fase: 'Fase 2: Hepática', name: 'Suplemento Hepático', desc: 'Extracto concentrado de Cardo Mariano (rico en silimarina) y Desmodium.' },
  { fase: 'Fase 2: Hepática', name: 'Infusión Amarga', desc: 'Mezcla de raíz de Diente de León y hojas de Alcachofera de recolección silvestre.' },
  { fase: 'Fase 3: Renal', name: 'Extracto Drenante', desc: 'Tintura o extracto hidroalcohólico de Ortiga Verde y Vara de Oro (Solidago).' },
  { fase: 'Fase 3: Renal', name: 'Infusión Remineralizante', desc: 'Mezcla de Cola de Caballo (rica en silicio orgánico) y Abedul.' }
];


const PHASES = [
  { id: 1, label: 'FASE 01', title: 'Reset Digestivo', description: 'Días 1 al 7. Enfoque en mucosa digestiva y microbiota celular.', range: [1, 7], status: 'completed', themeColor: 'emerald' },
  { id: 2, label: 'FASE 02', title: 'Drenaje Hepático Profundo', description: 'Días 8 al 14. Activación hepatobiliar y procesamiento enzimático de toxinas.', range: [8, 14], status: 'current', themeColor: 'indigo' },
  { id: 3, label: 'FASE 03', title: 'Lavado Renal y Remineralización', description: 'Días 15 al 21. Estimulación de la filtración renal sin desmineralizar.', range: [15, 21], status: 'future', themeColor: 'cyan' }
];

// Las alertas y contraindicaciones se cargan dinámicamente desde la tabla plan_alerts en Supabase.

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


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [sosSubView, setSosSubView] = useState('main'); // 'main', 'contraindications', 'contingency'
  const [selectedContingency, setSelectedContingency] = useState(null);
  
  // --- ESTADOS DE AUTENTICACIÓN Y SUSCRIPCIÓN ---
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [profile, setProfile] = useState(null);

  // --- ESTADO GLOBAL DE SEGUIMIENTO (1 a 21 días) ---
  const [currentDay, setCurrentDay] = useState(1);
  
  // Guardamos las tareas completadas estructuradas por día: { [dia]: { [tareaId]: true/false } }
  const [completedTasks, setCompletedTasks] = useState({});

  // Guardamos la telemetría corporal (bienestar) por día: { [dia]: valor_1_a_5 }
  const [telemetryByDay, setTelemetryByDay] = useState({});

  // --- ESTADOS DE TAREAS Y ALERTAS DE SUPABASE ---
  const [planTasks, setPlanTasks] = useState([]);
  const [planAlerts, setPlanAlerts] = useState([]);
  const [planPhases, setPlanPhases] = useState([]);
  const [planProducts, setPlanProducts] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showPillars, setShowPillars] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState('ALL');

  // Comprobar y cargar/crear perfil en Supabase
  const checkProfile = async (userId, userEmail) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
      } else {
        const newProfile = {
          user_id: userId,
          email: userEmail
        };
        const { data: insertedData, error: insertErr } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .maybeSingle();
        
        if (insertErr) throw insertErr;
        if (insertedData) {
          setProfile(insertedData);
        }
      }
    } catch (err) {
      console.error('Error al comprobar/inicializar perfil:', err);
    }
  };

  // Escucha de sesión de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkSubscription(session.user.id);
        checkProfile(session.user.id, session.user.email);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkSubscription(session.user.id);
        checkProfile(session.user.id, session.user.email);
      } else {
        setSubscription(null);
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Comprobar suscripción activa
  const checkSubscription = async (userId) => {
    try {
      setAuthLoading(true);

      // Fetch planes para mapear nombres
      const { data: plansData } = await supabase.from('plans').select('id, name');
      const plansMap = {};
      if (plansData) {
        plansData.forEach(p => plansMap[p.id] = p.name);
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('activated_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const enrichedHistory = data.map(sub => ({
          ...sub,
          planTitle: plansMap[sub.plan_id] || 'Módulo Aterpe'
        }));
        setSubscriptionHistory(enrichedHistory);

        // Encontrar plan activo
        const activeSub = enrichedHistory.find(sub => sub.is_active && new Date(sub.expires_at) > new Date());

        if (activeSub) {
          setSubscription(activeSub);

          // Calcular el día actual automáticamente basado en la fecha de activación
          const startDate = new Date(activeSub.activated_at);
          const today = new Date();
          // Ponemos la hora a 00:00 para calcular días completos
          startDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          const diffTime = today.getTime() - startDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          // Si el resultado es menor a 1 (por zonas horarias etc), forzamos a 1
          setCurrentDay(Math.max(1, diffDays));

          // Cargar datos de progreso y telemetría si hay suscripción
          await loadUserData(userId, activeSub.plan_id);
        } else {
          setSubscription(null);
        }
      } else {
        setSubscriptionHistory([]);
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error al comprobar suscripción:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Cargar progreso y bienestar guardado de forma unificada (1 sola llamada de red)
  const loadUserData = async (userId, planId) => {
    try {
      const { data, error } = await supabase.rpc('get_user_dashboard_data', {
        input_user_id: userId,
        input_plan_id: planId
      });

      if (error) throw error;

      if (data) {
        // 1. Cargar progreso
        const progressObj = {};
        (data.progress || []).forEach(row => {
          if (!progressObj[row.day]) progressObj[row.day] = {};
          progressObj[row.day][row.task_id] = row.completed;
        });
        setCompletedTasks(progressObj);

        // 2. Cargar telemetría
        const telemetryObj = {};
        (data.telemetry || []).forEach(row => {
          telemetryObj[row.day] = row.value;
        });
        setTelemetryByDay(telemetryObj);

        // 3. Cargar tareas, alertas, fases y productos
        setPlanTasks(data.tasks || []);
        setPlanAlerts(data.alerts || []);
        setPlanPhases(data.phases || []);
        setPlanProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error cargando datos del usuario:', err);
    }
  };

  // --- FORMATO DE CATEGORÍA DE TAREA ---
  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'suplemento': return 'Suplemento Botánico';
      case 'nutricion': return 'Nutrición / Dieta';
      case 'habito': return 'Hábito / Estilo de Vida';
      case 'ejercicio': return 'Ejercicio / Movimiento';
      default: return cat;
    }
  };

  // --- OBTENER FASE Y CONFIGURACIÓN SEGÚN EL DÍA SELECCIONADO ---
  const getPhaseConfig = (day) => {
    const dayTasks = planTasks.filter(t => t.day === day);
    const dbPhaseName = dayTasks.find(t => t.phase)?.phase;

    if (day >= 1 && day <= 7) {
      return {
        key: 'phase1',
        title: dbPhaseName || 'Reset Digestivo',
        subtitle: 'Fase 01: Purificación Intestinal',
        colorClass: 'emerald',
        textColor: 'text-emerald-500',
        borderColor: 'border-emerald-500',
        bgAccent: 'bg-emerald-500',
        bgGlow: 'bg-emerald-500/20',
        tasks: dayTasks
      };
    } else if (day >= 8 && day <= 14) {
      return {
        key: 'phase2',
        title: dbPhaseName || 'Drenaje Hepático Profundo',
        subtitle: 'Fase 02: Purificación Celular',
        colorClass: 'indigo',
        textColor: 'text-indigo-400',
        borderColor: 'border-indigo-500',
        bgAccent: 'bg-indigo-500',
        bgGlow: 'bg-indigo-500/20',
        tasks: dayTasks
      };
    } else {
      return {
        key: 'phase3',
        title: dbPhaseName || 'Lavado Renal y Remineralización',
        subtitle: 'Fase 03: Eliminación e Hidratación',
        colorClass: 'cyan',
        textColor: 'text-cyan-400',
        borderColor: 'border-cyan-500',
        bgAccent: 'bg-cyan-500',
        bgGlow: 'bg-cyan-500/20',
        tasks: dayTasks
      };
    }
  };

  const currentPhase = getPhaseConfig(currentDay);

  // --- CALCULO DE ADHERENCIA DEL DÍA SELECCIONADO ---
  const getDayProgress = (day) => {
    const phaseTasks = getPhaseConfig(day).tasks;
    if (!phaseTasks || phaseTasks.length === 0) return 0;
    const dayCompletions = completedTasks[day] || {};
    const completedCount = phaseTasks.filter(task => dayCompletions[task.task_id]).length;
    return Math.round((completedCount / phaseTasks.length) * 100);
  };

  const progress = getDayProgress(currentDay);

  // --- CALCULO DE ADHERENCIA GLOBAL ---
  const getGlobalAdherence = () => {
    if (!planTasks || planTasks.length === 0) return 0;
    let totalTasksCount = 0;
    let completedTasksCount = 0;
    
    for (let day = 1; day <= 21; day++) {
      const dayTasks = planTasks.filter(t => t.day === day);
      const dayCompletions = completedTasks[day] || {};
      totalTasksCount += dayTasks.length;
      completedTasksCount += dayTasks.filter(task => dayCompletions[task.task_id]).length;
    }
    return totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  };

  const globalAdherence = getGlobalAdherence();

  const toggleTask = async (taskId) => {
    if (!session || !subscription) return;
    const userId = session.user.id;
    const planId = subscription.plan_id;
    const day = currentDay;

    const dayCompletions = completedTasks[day] || {};
    const isCurrentlyCompleted = !!dayCompletions[taskId];
    const newCompletedState = !isCurrentlyCompleted;

    // Optimista local
    setCompletedTasks(prev => {
      const dayCompletions = prev[day] || {};
      return {
        ...prev,
        [day]: {
          ...dayCompletions,
          [taskId]: newCompletedState
        }
      };
    });

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          plan_id: planId,
          day: day,
          task_id: taskId,
          completed: newCompletedState,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, plan_id, day, task_id' });

      if (error) throw error;
    } catch (err) {
      console.error('Error guardando progreso:', err);
      // Revertir optimismo
      setCompletedTasks(prev => {
        const dayCompletions = prev[day] || {};
        return {
          ...prev,
          [day]: {
            ...dayCompletions,
            [taskId]: isCurrentlyCompleted
          }
        };
      });
    }
  };

  const setTelemetry = async (value) => {
    if (!session || !subscription) return;
    const userId = session.user.id;
    const planId = subscription.plan_id;
    const day = currentDay;
    const prevValue = telemetryByDay[day];

    // Optimista local
    setTelemetryByDay(prev => ({
      ...prev,
      [day]: value
    }));

    try {
      const { error } = await supabase
        .from('user_telemetry')
        .upsert({
          user_id: userId,
          plan_id: planId,
          day: day,
          value: value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, plan_id, day' });

      if (error) throw error;
    } catch (err) {
      console.error('Error guardando telemetría:', err);
      if (prevValue !== undefined) {
        setTelemetryByDay(prev => ({
          ...prev,
          [day]: prevValue
        }));
      } else {
        setTelemetryByDay(prev => {
          const updated = { ...prev };
          delete updated[day];
          return updated;
        });
      }
    }
  };


  // --- VIEWS ---

  const DashboardView = () => (
    <div className="min-h-full bg-slate-950 text-slate-50 p-6 pb-32 relative overflow-hidden animate-in fade-in duration-500">
      {/* Dynamic Background Glow based on active phase */}
      <div className={`absolute top-[-10%] right-[-10%] w-96 h-96 ${currentPhase.bgGlow} blur-[100px] rounded-full pointer-events-none transition-colors duration-1000`}></div>
      
      {/* Cabecera Principal */}
      <header className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Usuario Activo</p>
          <h1 className="text-2xl font-black tracking-tight text-white truncate max-w-[220px]">
            {profile?.first_name ? profile.first_name : (session?.user?.email ? session.user.email.split('@')[0] : 'Usuario')}.
          </h1>
        </div>
        <div className="flex items-center px-4 py-2 bg-slate-900/40 border border-slate-800 rounded-full shadow-sm">
          <span className={`w-2 h-2 ${currentPhase.bgAccent} rounded-full mr-2 animate-pulse`}></span>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">En Línea</span>
        </div>
      </header>


      {/* Panel de Métricas */}
      <section className="relative z-10 mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{currentPhase.subtitle}</p>
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
                className={`${currentPhase.textColor} transition-all duration-1000 ease-out`} 
                strokeLinecap="round" 
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Botón de Ejecución */}
      <button 
        onClick={() => setActiveTab('ejecucion')} 
        className="w-full bg-slate-900 border border-slate-800 rounded-[24px] p-5 flex items-center justify-between group transition-colors shadow-lg mb-6 hover:border-slate-700"
      >
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 bg-slate-950 rounded-[16px] flex items-center justify-center border border-slate-800 group-hover:${currentPhase.bgGlow}`}>
            <Crosshair className={`w-5 h-5 ${currentPhase.textColor}`} />
          </div>
          <div className="text-left">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${currentPhase.textColor} mb-0.5`}>Ejecución de Hoy</p>
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
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1 flex items-center">
                  <Droplet className="w-4 h-4 mr-1.5" /> Hidratación de Precisión
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">Mínimo de 2 a 2.5 litros de agua de mineralización débil al día para garantizar la eliminación y dilución efectiva de toxinas.</p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center">
                  <Activity className="w-4 h-4 mr-1.5" /> Complejo Motor Migratorio (CMM)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">Ayuno fisiológico estricto de 12 a 14 horas de reposo nocturno. Activa los mecanismos automáticos de limpieza del tracto digestivo superior.</p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-1 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1.5" /> Restricciones Nutricionales Críticas
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">Suspensión total de azúcares refinados, alcohol, ultraprocesados, harinas y grasas hidrogenadas. Priorizar caldos depurativos de crucíferas.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );


  const EjecucionView = () => {
    const dayCompletions = completedTasks[currentDay] || {};
    const dayTelemetry = telemetryByDay[currentDay] || null;

    return (
      <div className="min-h-full bg-slate-50 text-slate-900 p-6 pb-32 animate-in fade-in duration-500">
        <header className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">PROTOCOLO ACTIVO • DÍA {currentDay}</p>
          <h2 className="text-3xl font-black italic tracking-tight text-slate-950">{currentPhase.title}.</h2>
        </header>

        {/* Telemetría Corporal */}
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

        {/* Listado de tareas diarias dinámicas */}
        <div className="space-y-4">
          {currentPhase.tasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[24px] border border-slate-200/80 shadow-md">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">No hay tareas programadas para hoy.</p>
              <p className="text-xs text-slate-400 mt-1">El administrador aún no ha añadido pautas para este día.</p>
            </div>
          ) : (
            currentPhase.tasks.map((task) => {
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
          )}
        </div>
      </div>
    );
  };


  const ProyeccionView = () => {
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
  };


  const PerfilView = () => (
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

      {/* Datos del Módulo Activo */}
      <section className="relative z-10 mb-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6 shadow-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Datos del Sistema</p>
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-black text-white pb-3 border-b border-slate-800/50">
              <span className="text-slate-400 text-[10px] uppercase tracking-widest flex items-center">
                <CalendarDays className="w-4 h-4 mr-2" /> Inicio Módulo
              </span>
              <span>
                {subscription
                  ? new Date(subscription.activated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pb-3 border-b border-slate-800/50">
              <span className="text-slate-400 text-[10px] uppercase tracking-widest flex items-center">
                <Target className="w-4 h-4 mr-2" /> Módulo Activo
              </span>
              <span className="text-emerald-400">
                {subscription?.plan_id === 'depuracion-deluxe' ? 'Depuración Deluxe' : (subscription?.plan_id || 'Ninguno')}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pb-3 border-b border-slate-800/50">
              <span className="text-slate-400 text-[10px] uppercase tracking-widest flex items-center">
                <Clock className="w-4 h-4 mr-2" /> Vencimiento
              </span>
              <span className="text-amber-400">
                {subscription
                  ? new Date(subscription.expires_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-white">
              <span className="text-slate-400 text-[10px] uppercase tracking-widest flex items-center">
                <Activity className="w-4 h-4 mr-2" /> Adherencia Global
              </span>
              <span className="text-white">{globalAdherence}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Historial de Módulos Pasados */}
      <section className="relative z-10 mb-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Historial de Tratamientos</p>
          <div className="space-y-3">
            {subscriptionHistory.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-4">No hay tratamientos previos</p>
            ) : (
              subscriptionHistory.map((sub) => {
                const isActive = sub.is_active && new Date(sub.expires_at) > new Date();
                const dateText = new Date(sub.activated_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
                
                return (
                  <div key={sub.id} className="bg-slate-950 border border-slate-800/50 rounded-[20px] p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isActive ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                        <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-emerald-400'}`} />
                      </div>
                      <h4 className="text-xs font-black text-white">{sub.planTitle}</h4>
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


  const SOSView = () => (
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
    return (
      <ActivateToken 
        userId={session.user.id} 
        onActivationSuccess={(planId, expiresAt) => checkSubscription(session.user.id)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-950 min-h-screen relative shadow-2xl overflow-x-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'ejecucion' && <EjecucionView />}
          {activeTab === 'proyeccion' && <ProyeccionView />}
          {activeTab === 'sos' && <SOSView />}
          {activeTab === 'perfil' && <PerfilView />}
        </main>

        <nav className="absolute bottom-0 w-full bg-slate-950 border-t border-slate-800/80 px-4 py-4 pb-safe flex justify-between items-center rounded-t-[40px] shadow-2xl z-50">
          <button onClick={() => {setActiveTab('dashboard'); setSosSubView('main');}} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'dashboard' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <Activity className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Data</span>
          </button>
          <button onClick={() => {setActiveTab('ejecucion'); setSosSubView('main');}} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'ejecucion' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <Crosshair className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Ejecutar</span>
          </button>
          <button onClick={() => {setActiveTab('proyeccion'); setSosSubView('main');}} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'proyeccion' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <Target className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Proyectar</span>
          </button>
          <button onClick={() => {setActiveTab('perfil'); setSosSubView('main');}} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'perfil' ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
            <User className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Perfil</span>
          </button>
          <button onClick={() => {setActiveTab('sos'); setSosSubView('main');}} className={`flex flex-col items-center p-2 transition-all ${activeTab === 'sos' ? 'text-amber-400 scale-110' : 'text-slate-600'}`}>
            <ShieldAlert className="w-5 h-5 mb-1" /><span className="text-[7px] font-black uppercase tracking-widest">Alerta</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
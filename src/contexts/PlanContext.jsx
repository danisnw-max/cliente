import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const PlanContext = createContext();

export const usePlan = () => useContext(PlanContext);

export const PlanProvider = ({ children }) => {
  // --- ESTADOS DE AUTENTICACIÓN Y SUSCRIPCIÓN ---
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [subscription, setSubscription] = useState(null); // Suscripción activa seleccionada actualmente
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [profile, setProfile] = useState(null);

  // --- ESTADO GLOBAL DE SEGUIMIENTO (1 a 21 días) ---
  const [currentDay, setCurrentDay] = useState(1);
  const [completedTasks, setCompletedTasks] = useState({});
  const [telemetryByDay, setTelemetryByDay] = useState({});

  // --- ESTADOS CONSOLIDADOS (AGENDA MULTI-PLAN) ---
  const [consolidatedAgenda, setConsolidatedAgenda] = useState([]);
  const [consolidatedTelemetry, setConsolidatedTelemetry] = useState({});
  const [consolidatedProgress, setConsolidatedProgress] = useState({});
  const [consolidatedDays, setConsolidatedDays] = useState({});
  const [todayTasks, setTodayTasks] = useState([]);

  // --- ESTADOS DE TAREAS Y ALERTAS DE SUPABASE ---
  const [planTasks, setPlanTasks] = useState([]);
  const [planPillars, setPlanPillars] = useState([]);
  const [planAlerts, setPlanAlerts] = useState([]);
  const [planPhases, setPlanPhases] = useState([]);
  const [planProducts, setPlanProducts] = useState([]);

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
        setActiveSubscriptions([]);
        setProfile(null);
        setAuthLoading(false);
      }
    });

    return () => {
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Comprobar suscripciones activas (Soporte Multi-Plan)
  const checkSubscription = async (userId) => {
    try {
      setAuthLoading(true);

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

        const activeSubs = enrichedHistory.filter(sub => sub.is_active && new Date(sub.expires_at) > new Date());
        setActiveSubscriptions(activeSubs);

        if (activeSubs.length > 0) {
          // Mantener suscripción previamente seleccionada si aún es válida, o usar la primera
          let currentSelected = activeSubs[0];
          setSubscription(prev => {
            if (prev) {
              const found = activeSubs.find(s => s.id === prev.id);
              if (found) {
                currentSelected = found;
                return found;
              }
            }
            return activeSubs[0];
          });
          await loadUserData(userId, currentSelected);
          await loadConsolidatedData(userId, activeSubs);
        } else {
          setSubscription(null);
        }
      } else {
        setSubscriptionHistory([]);
        setActiveSubscriptions([]);
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error al comprobar suscripciones:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Cambiar entre planes activos manualmente
  const selectActivePlan = async (subOrId) => {
    if (!session) return;
    const targetSub = typeof subOrId === 'object' 
      ? subOrId 
      : activeSubscriptions.find(s => s.id === subOrId || s.plan_id === subOrId);

    if (targetSub) {
      setSubscription(targetSub);
      await loadUserData(session.user.id, targetSub);
    }
  };

  const loadConsolidatedData = async (userId, activeSubs) => {
    if (!activeSubs || activeSubs.length === 0) {
      setConsolidatedAgenda([]);
      setTodayTasks([]);
      return;
    }
    try {
      let agendaItems = [];
      let cTelemetry = {};
      let cProgress = {};
      let cDays = {};
      let tTasks = [];

      for (const sub of activeSubs) {
        const { data, error } = await supabase.rpc('get_user_dashboard_data', {
          input_user_id: userId,
          input_plan_id: sub.plan_id
        });

        if (error || !data) continue;

        const progressObj = {};
        (data.progress || []).forEach(row => {
          if (!progressObj[row.day]) progressObj[row.day] = {};
          progressObj[row.day][row.task_id] = row.completed;
        });
        cProgress[sub.plan_id] = progressObj;

        const telemetryObj = {};
        (data.telemetry || []).forEach(row => {
          telemetryObj[row.day] = row.value;
        });
        cTelemetry[sub.plan_id] = telemetryObj;

        const tasksByDay = {};
        (data.tasks || []).forEach(t => {
           if (!tasksByDay[t.day]) tasksByDay[t.day] = [];
           tasksByDay[t.day].push(t);
        });

        const startDate = new Date(sub.activated_at);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const chronologicalDay = Math.max(1, diffDays);

        if (chronologicalDay <= 21) {
          const realTodayTasks = tasksByDay[chronologicalDay] || [];
          realTodayTasks.forEach(t => {
            tTasks.push({
              ...t,
              plan_id: sub.plan_id,
              plan_name: sub.planTitle,
              current_day: chronologicalDay,
              is_completed: !!(progressObj[chronologicalDay] && progressObj[chronologicalDay][t.task_id])
            });
          });
        }

        let calculatedDay = 1;
        for (let d = 1; d < chronologicalDay; d++) {
          const dayTasks = tasksByDay[d] || [];
          if (dayTasks.length > 0) {
            const dayProgress = progressObj[d] || {};
            const completedCount = dayTasks.filter(t => dayProgress[t.task_id]).length;
            if (completedCount === 0) break;
          }
          calculatedDay = d + 1;
        }

        for (let d = 21; d >= calculatedDay; d--) {
          const dayTasks = tasksByDay[d] || [];
          if (dayTasks.length > 0) {
            const dayProgress = progressObj[d] || {};
            const completedCount = dayTasks.filter(t => dayProgress[t.task_id]).length;
            if (completedCount > 0) {
              calculatedDay = d;
              if (completedCount === dayTasks.length && d < 21) {
                calculatedDay = d + 1;
              }
              break;
            }
          }
        }
        
        const finalDay = Math.min(21, Math.max(1, calculatedDay));
        cDays[sub.plan_id] = finalDay;

        const dayTasks = tasksByDay[finalDay] || [];
        dayTasks.forEach(t => {
          agendaItems.push({
            ...t,
            plan_id: sub.plan_id,
            plan_name: sub.planTitle,
            current_day: finalDay,
            is_completed: !!(progressObj[finalDay] && progressObj[finalDay][t.task_id])
          });
        });
      }

      agendaItems.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      tTasks.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setConsolidatedAgenda(agendaItems);
      setConsolidatedTelemetry(cTelemetry);
      setConsolidatedProgress(cProgress);
      setConsolidatedDays(cDays);
      setTodayTasks(tTasks);
    } catch (err) {
      console.error('Error cargando agenda consolidada:', err);
    }
  };

  const loadUserData = async (userId, activeSub) => {
    try {
      const planId = activeSub.plan_id;
      const { data, error } = await supabase.rpc('get_user_dashboard_data', {
        input_user_id: userId,
        input_plan_id: planId
      });

      if (error) throw error;

      if (data) {
        const progressObj = {};
        (data.progress || []).forEach(row => {
          if (!progressObj[row.day]) progressObj[row.day] = {};
          progressObj[row.day][row.task_id] = row.completed;
        });
        setCompletedTasks(progressObj);

        const telemetryObj = {};
        (data.telemetry || []).forEach(row => {
          telemetryObj[row.day] = row.value;
        });
        setTelemetryByDay(telemetryObj);

        setPlanTasks(data.tasks || []);
        setPlanAlerts(data.alerts || []);
        setPlanPhases(data.phases || []);
        setPlanProducts(data.products || []);
        
        const { data: pillarsData } = await supabase
          .from('plan_pillars')
          .select('*')
          .eq('plan_id', planId)
          .order('order_index');
        setPlanPillars(pillarsData || []);

        const tasksByDay = {};
        (data.tasks || []).forEach(t => {
           if (!tasksByDay[t.day]) tasksByDay[t.day] = [];
           tasksByDay[t.day].push(t);
        });

        const startDate = new Date(activeSub.activated_at);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const chronologicalDay = Math.max(1, diffDays);

        let calculatedDay = 1;

        for (let d = 1; d < chronologicalDay; d++) {
          const dayTasks = tasksByDay[d] || [];
          if (dayTasks.length > 0) {
            const dayProgress = progressObj[d] || {};
            const completedCount = dayTasks.filter(t => dayProgress[t.task_id]).length;
            if (completedCount === 0) {
              break;
            }
          }
          calculatedDay = d + 1;
        }

        for (let d = 21; d >= calculatedDay; d--) {
          const dayTasks = tasksByDay[d] || [];
          if (dayTasks.length > 0) {
            const dayProgress = progressObj[d] || {};
            const completedCount = dayTasks.filter(t => dayProgress[t.task_id]).length;
            if (completedCount > 0) {
              calculatedDay = d;
              if (completedCount === dayTasks.length && d < 21) {
                calculatedDay = d + 1;
              }
              break;
            }
          }
        }

        setCurrentDay(Math.min(21, Math.max(1, calculatedDay)));
      }
    } catch (err) {
      console.error('Error cargando datos del usuario:', err);
    }
  };

  const toggleTask = async (taskId) => {
    if (!session || !subscription) return;
    const userId = session.user.id;
    const planId = subscription.plan_id;
    const day = currentDay;

    const dayCompletions = completedTasks[day] || {};
    const isCurrentlyCompleted = !!dayCompletions[taskId];
    const newCompletedState = !isCurrentlyCompleted;

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

  const toggleConsolidatedTask = async (taskId, planId, day) => {
    if (!session) return;
    const userId = session.user.id;

    const currentProg = (consolidatedProgress[planId] && consolidatedProgress[planId][day]) || {};
    const isCurrentlyCompleted = !!currentProg[taskId];
    const newCompletedState = !isCurrentlyCompleted;

    setConsolidatedAgenda(prev => prev.map(task => {
      if (task.task_id === taskId && task.plan_id === planId && task.current_day === day) {
        return { ...task, is_completed: newCompletedState };
      }
      return task;
    }));
    
    setConsolidatedProgress(prev => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || {}),
        [day]: {
          ...((prev[planId] || {})[day] || {}),
          [taskId]: newCompletedState
        }
      }
    }));
    
    if (subscription && subscription.plan_id === planId && currentDay === day) {
      setCompletedTasks(prev => {
        const dayCompletions = prev[day] || {};
        return { ...prev, [day]: { ...dayCompletions, [taskId]: newCompletedState } };
      });
    }

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
      console.error('Error guardando progreso consolidado:', err);
    }
  };

  const setConsolidatedTelemetryValue = async (value, planId, day) => {
    if (!session) return;
    const userId = session.user.id;

    setConsolidatedTelemetry(prev => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || {}),
        [day]: value
      }
    }));
    
    if (subscription && subscription.plan_id === planId && currentDay === day) {
      setTelemetryByDay(prev => ({ ...prev, [day]: value }));
    }

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
      console.error('Error guardando telemetría consolidada:', err);
    }
  };

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

  const getDayProgress = (day) => {
    const phaseTasks = getPhaseConfig(day).tasks;
    if (!phaseTasks || phaseTasks.length === 0) return 0;
    const dayCompletions = completedTasks[day] || {};
    const completedCount = phaseTasks.filter(task => dayCompletions[task.task_id]).length;
    return Math.round((completedCount / phaseTasks.length) * 100);
  };

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

  const checkSubscriptionManual = () => {
    if(session) checkSubscription(session.user.id);
  };

  const value = {
    session,
    authLoading,
    subscription,
    activeSubscriptions,
    subscriptionHistory,
    profile,
    currentDay,
    setCurrentDay,
    completedTasks,
    telemetryByDay,
    planTasks,
    planPillars,
    planAlerts,
    planPhases,
    planProducts,
    toggleTask,
    setTelemetry,
    getPhaseConfig,
    getDayProgress,
    getGlobalAdherence,
    selectActivePlan,
    consolidatedAgenda,
    consolidatedTelemetry,
    consolidatedDays,
    todayTasks,
    toggleConsolidatedTask,
    setConsolidatedTelemetryValue,
    checkSubscription: checkSubscriptionManual
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

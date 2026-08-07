import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

const MOMENT_HOURS = {
  "Al despertar / En ayunas": "08:00",
  "Post-desayuno": "09:30",
  "Media mañana": "11:30",
  "Pre-almuerzo": "13:30",
  "Post-almuerzo": "15:30",
  "Media tarde": "18:00",
  "Pre-cena": "20:00",
  "Post-cena": "21:30",
  "Antes de dormir": "23:00",
  "Todo el día": "10:00"
};

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return null;
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.warn('Error decodificando VAPID key:', e);
    return null;
  }
}

function getSafeNotificationPermission() {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined') {
      return Notification.permission || 'default';
    }
  } catch (e) {
    console.warn('Notification API restringida en este navegador/móvil:', e);
  }
  return 'unsupported';
}

export function useNotifications(todayTasks = [], userId) {
  const [permission, setPermission] = useState(() => getSafeNotificationPermission());
  const [swRegistration, setSwRegistration] = useState(null);
  const notifiedTasks = useRef(new Set());

  // 1. Registrar Service Worker de forma segura y asegurar suscripción Push
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(async (reg) => {
          setSwRegistration(reg);
          if (getSafeNotificationPermission() === 'granted' && reg.pushManager) {
            try {
              const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
              let subscription = await reg.pushManager.getSubscription().catch(() => null);
              if (!subscription && vapidPublicKey) {
                const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
                if (convertedKey) {
                  subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedKey
                  }).catch(() => null);
                }
              }
              if (subscription) {
                await savePushSubscription(subscription);
              }
            } catch (pErr) {
              console.warn('Verificación automática de suscripción push:', pErr);
            }
          }
        })
        .catch((err) => {
          console.warn('Service Worker no registrado (modo estándar):', err);
        });
    }

    setPermission(getSafeNotificationPermission());
  }, []);

  // 2. Guardar suscripción Push en Supabase
  const savePushSubscription = async (subscription, explicitUserId) => {
    if (!subscription) return;
    try {
      const subJSON = subscription.toJSON();
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = explicitUserId || userId || sessionData?.session?.user?.id;

      if (!currentUserId) {
        console.warn('Suscripción Push aplazada: Esperando identificador de usuario...');
        return;
      }

      const { error } = await supabase.from('user_push_subscriptions').upsert(
        {
          user_id: currentUserId,
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys?.p256dh || '',
          auth: subJSON.keys?.auth || '',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id, endpoint' }
      );

      if (error) {
        console.warn('Nota: Guardado de Push omitido en Supabase:', error.message);
      } else {
        console.log('✅ Suscripción Web Push registrada con éxito para usuario:', currentUserId);
      }
    } catch (err) {
      console.warn('Suscripción Push no persistida:', err);
    }
  };

  // 3. Solicitar permiso de notificación de forma ultrasegura para móviles
  const requestPermission = async () => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || typeof Notification === 'undefined') {
        alert("Las notificaciones nativas no están disponibles en este navegador.");
        return;
      }

      let result = 'default';
      if (typeof Notification.requestPermission === 'function') {
        result = await Notification.requestPermission();
      }
      setPermission(result);

      if (result === 'granted' && 'serviceWorker' in navigator) {
        try {
          const reg = swRegistration || (await navigator.serviceWorker.ready);
          const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          
          if (reg && reg.pushManager) {
            let subscription = await reg.pushManager.getSubscription().catch(() => null);

            if (!subscription && vapidPublicKey) {
              const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
              if (convertedKey) {
                subscription = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: convertedKey
                }).catch(() => null);
              }
            }

            if (subscription) {
              await savePushSubscription(subscription);
            }
          }
        } catch (err) {
          console.warn('Modo Push PWA preparado:', err);
        }
      }
    } catch (err) {
      console.error('Error solicitando permisos de notificación:', err);
    }
  };
  // Sincronizar automáticamente cuando el usuario inicie sesión
  useEffect(() => {
    if (!userId || permission !== 'granted' || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      if (reg && reg.pushManager) {
        const sub = await reg.pushManager.getSubscription().catch(() => null);
        if (sub) {
          await savePushSubscription(sub, userId);
        }
      }
    });
  }, [userId, permission]);

  // 4. Verificación en tiempo real sin crasheos en dispositivos móviles
  useEffect(() => {
    if (permission !== 'granted') return;
    if (!todayTasks || !Array.isArray(todayTasks) || todayTasks.length === 0) return;

    const checkAlarms = () => {
      try {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        todayTasks.forEach((task) => {
          if (!task || !task.time) return;

          let timeStr = task.time;
          if (!timeStr.includes(':')) {
            timeStr = MOMENT_HOURS[timeStr] || "09:00";
          }

          const [taskH, taskM] = timeStr.split(':').map(Number);
          const isPastOrPresent = (currentHours > taskH) || (currentHours === taskH && currentMinutes >= taskM);
          const isCompleted = !!task.is_completed;
          const uniqueId = `${task.plan_id || 'plan'}-${task.task_id || task.id}`;

          if (isPastOrPresent && !isCompleted && !notifiedTasks.current.has(uniqueId)) {
            let shown = false;

            try {
              if (swRegistration && typeof swRegistration.showNotification === 'function') {
                swRegistration.showNotification('Aterpe - Recordatorio de Toma', {
                  body: `Es hora de tu tarea: ${task.title}`,
                  icon: '/logo.svg',
                  badge: '/logo.svg',
                  tag: `task-${uniqueId}`,
                  renotify: true
                });
                shown = true;
              }
            } catch (swErr) {
              console.warn('showNotification de Service Worker no disponible en este dispositivo:', swErr);
            }

            if (!shown) {
              try {
                if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                  new Notification('Aterpe - Recordatorio de Toma', {
                    body: `Es hora de tu tarea: ${task.title}`,
                    icon: '/logo.svg'
                  });
                }
              } catch (notifErr) {
                console.warn('new Notification no ejecutable en este sistema operativo móvil:', notifErr);
              }
            }

            notifiedTasks.current.add(uniqueId);
          }
        });
      } catch (err) {
        console.error('Error durante verificación de alarmas:', err);
      }
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 30000);

    return () => clearInterval(interval);
  }, [permission, todayTasks, swRegistration]);

  return { permission, requestPermission };
}

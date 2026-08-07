import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const SUPABASE_URL = 'https://bamnvcqtjylbmcblbgws.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2rp1pmLCKTZ32DvSNIacnA_0A3sUHYV';

const VAPID_PUBLIC_KEY = 'BJf2eXzqWrsU1HQr4Ynp2ISjtpZc7-QpSMWxl_yhrMp2OPzTkN0EHSyZNb1GzTzlTKmwc-eGqk0coucGDZwm5b0';
const VAPID_PRIVATE_KEY = 'fZHgvcVC6tZhE3wdFGKfaNBleSMRVeyrb6GG_xw7nLQ';

webPush.setVapidDetails(
  'mailto:notificaciones@aterpe.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function dispatchPushNotifications() {
  console.log('--- Comprobando notificaciones Push programadas... ---');
  try {
    const { data: subscriptions, error: subError } = await supabase
      .from('user_push_subscriptions')
      .select('*');

    if (subError) {
      console.warn('Error al obtener suscripciones:', subError.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No hay dispositivos suscritos en user_push_subscriptions.');
      return;
    }

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    for (const subRecord of subscriptions) {
      const userId = subRecord.user_id;

      const { data: userSubs } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!userSubs || userSubs.length === 0) continue;

      for (const activeSub of userSubs) {
        const { data: dashboardData } = await supabase.rpc('get_user_dashboard_data', {
          input_user_id: userId,
          input_plan_id: activeSub.plan_id
        });

        if (!dashboardData) continue;

        const startDate = new Date(activeSub.activated_at);
        startDate.setHours(0, 0, 0, 0);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const chronologicalDay = Math.max(1, diffDays);

        if (chronologicalDay > 21) continue;

        const dayTasks = (dashboardData.tasks || []).filter(t => t.day === chronologicalDay);
        const progressList = (dashboardData.progress || []).filter(p => p.day === chronologicalDay);
        const completedMap = {};
        progressList.forEach(p => completedMap[p.task_id] = p.completed);

        for (const task of dayTasks) {
          let timeStr = task.time || '09:00';
          if (!timeStr.includes(':')) {
            timeStr = MOMENT_HOURS[timeStr] || '09:00';
          }
          const [taskH, taskM] = timeStr.split(':').map(Number);
          const isTimeMatch = (currentHours === taskH && Math.abs(currentMinutes - taskM) <= 15);
          const isCompleted = !!completedMap[task.task_id];

          if (isTimeMatch && !isCompleted) {
            const pushSubscription = {
              endpoint: subRecord.endpoint,
              keys: {
                p256dh: subRecord.p256dh,
                auth: subRecord.auth
              }
            };

            const payload = JSON.stringify({
              title: 'Aterpe - Recordatorio de Toma',
              body: `Es hora de tu toma: ${task.title}`,
              url: '/'
            });

            try {
              await webPush.sendNotification(pushSubscription, payload);
              console.log(`✅ Notificación enviada con éxito a usuario ${userId}: ${task.title}`);
            } catch (err) {
              console.error(`❌ Error enviando Push a usuario ${userId}:`, err.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error general en emisor de push:', err);
  }
}

const isDaemon = process.argv.includes('--daemon');

if (isDaemon) {
  console.log('🚀 Daemon de Notificaciones Push Aterpe iniciado (comprobando cada 60s)...');
  dispatchPushNotifications();
  setInterval(dispatchPushNotifications, 60000);
} else {
  dispatchPushNotifications();
}


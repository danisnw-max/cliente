import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import webPush from 'npm:web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:notificaciones@aterpe.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MOMENT_HOURS: Record<string, string> = {
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

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) return { message: 'No subscriptions found' };

    const now = new Date();
    
    // Forzar la evaluación de la hora a la zona horaria de España (Madrid)
    const formatterStr = new Intl.DateTimeFormat('es-ES', { 
        timeZone: 'Europe/Madrid', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    }).format(now);
    
    const [currentHours, currentMinutes] = formatterStr.split(':').map(Number);
    console.log(`Hora evaluada (Madrid): ${currentHours}:${currentMinutes}`);

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

        const dayTasks = (dashboardData.tasks || []).filter((t: any) => t.day === chronologicalDay);
        const progressList = (dashboardData.progress || []).filter((p: any) => p.day === chronologicalDay);
        const completedMap: Record<string, boolean> = {};
        progressList.forEach((p: any) => completedMap[p.task_id] = p.completed);

        for (const task of dayTasks) {
          let timeStr = task.time || '09:00';
          if (!timeStr.includes(':')) {
            timeStr = MOMENT_HOURS[timeStr] || '09:00';
          }
          const [taskH, taskM] = timeStr.split(':').map(Number);
          
          // 15 minutos de tolerancia
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
              console.log(`✅ Push enviado a ${userId}: ${task.title}`);
            } catch (err: any) {
              console.error(`❌ Error enviando Push a ${userId}:`, err.message);
              if (err.statusCode === 410) {
                 await supabase.from('user_push_subscriptions').delete().eq('endpoint', subRecord.endpoint);
              }
            }
          }
        }
      }
    }
    return { success: true, message: 'Procesado correctamente' };
  } catch (err: any) {
    console.error('Error general:', err);
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const result = await dispatchPushNotifications();
  
  return new Response(
    JSON.stringify(result),
    { headers: { "Content-Type": "application/json" } },
  );
});

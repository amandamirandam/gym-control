import cron from "node-cron";
import { sendNotifications } from "../services/notificationService.js";

/**
 * Agenda o envio automático de notificações para 09:00 diariamente
 * Formato cron: minuto(0-59) hora(0-23) dia(1-31) mês(1-12) dia-semana(0-6)
 */
export function scheduleDailyNotifications() {
  // Executar diariamente às 09:00 (9 horas da manhã)
  const cronExpression = "0 9 * * *";

  const task = cron.schedule(cronExpression, async () => {
    console.log(
      `\n $(new Date().toISOString()) - Executando cron job de notificações...`,
    );
    try {
      await sendNotifications();
    } catch (error) {
      console.error("Erro no cron job:", error.message);
    }
  });

  console.log(`Cron job agendado: Todos os dias às 09:00 (${cronExpression})`);
  return task;
}

/**
 * Agenda o envio em um horário customizado
 * @param {string} time - Horário no formato "HH:MM" (ex: "14:30")
 */
export function scheduleNotificationsAt(time) {
  const [hour, minute] = time.split(":");
  const cronExpression = `${minute} ${hour} * * *`;

  const task = cron.schedule(cronExpression, async () => {
    console.log(
      `\n ${new Date().toISOString()} - Executando notificações agendadas...`,
    );
    try {
      await sendNotifications();
    } catch (error) {
      console.error("Erro no cron job:", error.message);
    }
  });

  console.log(
    `Cron job agendado: Todos os dias às ${time} (${cronExpression})`,
  );
  return task;
}

/**
 * Para um cron job agendado
 */
export function stopScheduledNotifications(task) {
  if (task) {
    task.stop();
    console.log("Cron job parado");
  }
}

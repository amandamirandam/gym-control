import cron from "node-cron";
import { sendNotifications } from "../services/notificationService.js";

/**
 * Agenda o envio automático de notificações
 * Horário configurável via variáveis de ambiente:
 * - CRON_SCHEDULE: Expressão cron completa (ex: "0 9 * * *")
 * - CRON_TIME: Horário simples HH:MM (ex: "09:00")
 * - Padrão: "0 9 * * *" (09:00 diariamente)
 */
export function scheduleDailyNotifications() {
  // Ler horário de variáveis de ambiente
  let cronExpression = process.env.CRON_SCHEDULE || "0 9 * * *";
  
  // Se definiu CRON_TIME (formato simples HH:MM), converte para expressão cron
  if (process.env.CRON_TIME) {
    const [hour, minute] = process.env.CRON_TIME.split(":");
    if (hour && minute) {
      cronExpression = `${minute} ${hour} * * *`;
    }
  }

  const task = cron.schedule(cronExpression, async () => {
    console.log(
      `\n${new Date().toISOString()} - Executando cron job de notificações...`,
    );
    try {
      await sendNotifications();
    } catch (error) {
      console.error("Erro no cron job:", error.message);
    }
  });

  console.log(`⏰ Cron job agendado com a expressão: ${cronExpression}`);
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

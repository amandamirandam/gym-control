import supabase from "../config/supabase.js";
import {
  sendWhatsAppMessage,
  getRemitterMessage,
  getOverdueMessage,
  getDueTodayMessage,
} from "./wapiService.js";
import { differenceInDays, format } from "date-fns";

/**
 * Verifica se uma mensagem do tipo específico já foi enviada para o aluno neste mês
 * IMPORTANTE: Cada aluno pode receber ATÉ 2 mensagens por mês (vencendo + atrasado)
 * - reminder (1 dia antes)
 * - due-today (no dia)
 * - overdue (após vencer)
 * Sistema bloqueia apenas REPETIÇÕES do mesmo tipo no mesmo mês
 */
async function hasMessageBeenSentThisMonth(studentId, messageType) {
  try {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartISO = monthStart.toISOString();

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id, sent_at, type")
      .eq("student_id", studentId)
      .eq("type", messageType)
      .gte("sent_at", monthStartISO);

    if (error) {
      console.warn("Erro ao verificar mensagens anteriores:", error.message);
      return false;
    }

    const count = data?.length || 0;
    return count > 0;
  } catch (error) {
    console.error("Erro ao verificar mensagens:", error.message);
    return false;
  }
}

/**
 * Busca alunos que precisam receber mensagens de cobrança
 */
export async function getStudentsNeedingNotification() {
  try {
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("active", true); // Apenas alunos ativos

    if (studentsError) throw studentsError;

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*");

    if (paymentsError) throw paymentsError;

    const studentsToNotify = [];

    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayStr = format(todayStart, "yyyy-MM");

    console.log(`Processando ${students.length} alunos (mês: ${todayStr})`);

    for (const student of students) {
      // Verifica pagamento no mês
      const paidThisMonth = payments.some(
        (p) => p.student_id === student.id && p.reference_month === todayStr,
      );

      if (paidThisMonth) continue;

      const nextDueDate = getNextDueDate(
        student.due_day,
        paidThisMonth,
        todayStart,
      );

      const dueStart = new Date(nextDueDate.setHours(0, 0, 0, 0));
      const daysUntilDue = differenceInDays(dueStart, todayStart);
      let notificationType = null;
      let message = null;

      // REGRA: Enviar mensagem APENAS no dia do vencimento OU 1 dia após
      // NÃO envia antes do vencimento (daysUntilDue > 0)
      if (daysUntilDue === 0) {
        // Dia do vencimento - PRIMEIRA mensagem
        notificationType = "due-today";
        message = getDueTodayMessage(student.name);
      } else if (daysUntilDue === -1) {
        // 1 dia atrasado - SEGUNDA e ÚLTIMA mensagem
        notificationType = "overdue";
        message = getOverdueMessage(student.name, 1);
      }

      if (notificationType) {
        // Verificar se mensagem DESTE TIPO já foi enviada neste mês
        const alreadySent = await hasMessageBeenSentThisMonth(
          student.id,
          notificationType,
        );

        if (!alreadySent) {
          studentsToNotify.push({
            studentId: student.id,
            name: student.name,
            phone: student.phone,
            type: notificationType,
            message,
            daysUntilDue,
          });
        }
      }
    }

    console.log(`${studentsToNotify.length} alunos precisam de notificação`);

    return studentsToNotify;
  } catch (error) {
    console.error("Erro ao buscar alunos:", error.message);
    throw error;
  }
}

/**
 * Calcula a data de vencimento correta
 * Se não pagou este mês → retorna vencimento deste mês (mesmo se atrasado)
 * Se pagou este mês → retorna vencimento do próximo mês
 */
function getNextDueDate(dueDay, paidThisMonth, today) {
  const year = today.getFullYear();
  const month = today.getMonth();

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(dueDay, lastDayOfMonth);

  let dueDate = new Date(year, month, safeDay);

  // Se já pagou este mês, retorna o vencimento do próximo mês
  if (paidThisMonth) {
    const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
    const nextSafeDay = Math.min(dueDay, nextMonthLastDay);
    dueDate = new Date(year, month + 1, nextSafeDay);
  }
  // Se NÃO pagou, retorna o vencimento deste mês (mesmo se já passou)
  // Isso permite detectar pagamentos atrasados

  return dueDate;
}

/**
 * Envia notificações
 */
export async function sendNotifications() {
  try {
    const startTime = new Date();

    console.log("Iniciando envio de notificações...");

    const studentsToNotify = await getStudentsNeedingNotification();

    if (studentsToNotify.length === 0) {
      console.log("Nenhum aluno precisa de notificação hoje");
      return { total: 0, success: 0, failures: 0 };
    }

    console.log(`Enviando para ${studentsToNotify.length} alunos...`);

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (let index = 0; index < studentsToNotify.length; index++) {
      const student = studentsToNotify[index];

      const result = await sendWhatsAppMessage(
        student.phone,
        student.message,
        student.name,
      );

      if (result && result.success) {
        successCount++;

        await logMessageSent(
          student.studentId,
          student.phone,
          student.message,
          student.type,
          result.data?.messageId,
        );
      } else {
        failureCount++;
        errors.push({ name: student.name, error: result?.error });
      }

      // Delay entre mensagens
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const duration = ((new Date() - startTime) / 1000).toFixed(1);
    console.log(`Finalizado em ${duration}s - Sucesso: ${successCount}, Falhas: ${failureCount}`);
    
    if (errors.length > 0) {
      console.log(`Erros: ${errors.map(e => `${e.name}: ${e.error}`).join(', ')}`);
    }

    return {
      total: studentsToNotify.length,
      success: successCount,
      failures: failureCount,
      duration,
    };
  } catch (error) {
    console.error("Erro ao enviar notificações:", error.message);
    throw error;
  }
}

/**
 * Salva log no banco
 */
async function logMessageSent(studentId, phone, message, type, messageSid) {
  try {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .insert([
        {
          student_id: studentId,
          phone,
          message,
          type,
          message_sid: messageSid,
          sent_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Erro ao salvar log:", error.message);
      throw error;
    }
  } catch (error) {
    console.error("Erro ao salvar log:", error.message);
  }
}

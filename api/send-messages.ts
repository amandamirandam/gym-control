import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { differenceInDays, format } from "date-fns";

// ==========================================
// Funções de mensagens (reutilizadas do wapiService.js)
// ==========================================

function getDueTodayMessage(studentName: string): string {
  return `Olá ${studentName}! 👋\n\nSua mensalidade vence HOJE 📅\n\nSe já realizou o pagamento, pode desconsiderar. 💪`;
}

function getOverdueMessage(studentName: string, daysOverdue: number): string {
  return `Olá ${studentName}! 👋\n\nSua mensalidade está ${daysOverdue} ${daysOverdue === 1 ? "dia" : "dias"} em atraso 💰\n\nPor favor, regularize seu pagamento para continuar treinando! 💪`;
}

async function sendWhatsAppMessage(
  phone: string,
  message: string,
  studentName: string,
  instanceId: string,
  token: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formattedPhone = formatPhoneForWapi(phone);

    // W-API requer instanceId como query param na URL, não no body
    const baseURL = "https://api.w-api.app/v1";
    const url = `${baseURL}/message/send-text?instanceId=${instanceId}`;

    const response = await axios.post(
      url,
      {
        phone: formattedPhone,
        message: message,
        delayMessage: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

function formatPhoneForWapi(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (!cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }

  if (cleaned.length === 13 && cleaned[4] === "9") {
    cleaned = cleaned.slice(0, 4) + cleaned.slice(5);
  }

  return cleaned;
}

// ==========================================
// Lógica principal (reutilizada do notificationService.js)
// ==========================================

async function hasMessageBeenSentThisMonth(
  studentId: string,
  messageType: string,
  supabase: any,
): Promise<boolean> {
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
      console.warn("Erro ao verificar mensagens anteriores:", error);
      return false;
    }

    return (data?.length || 0) > 0;
  } catch (error: any) {
    console.error("Erro ao verificar mensagens:", error.message);
    return false;
  }
}

function getNextDueDate(
  dueDay: number,
  paidThisMonth: boolean,
  today: Date,
): Date {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let targetYear = currentYear;
  let targetMonth = currentMonth;

  if (paidThisMonth) {
    targetMonth = currentMonth + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
  }

  const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const validDueDay = Math.min(dueDay, lastDayOfMonth);

  return new Date(targetYear, targetMonth, validDueDay);
}

async function getStudentsNeedingNotification(supabase: any) {
  try {
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*");

    if (studentsError) throw studentsError;

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("*");

    if (paymentsError) throw paymentsError;

    const studentsToNotify: any[] = [];
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayStr = format(todayStart, "yyyy-MM");

    console.log(`\n========================================`);
    console.log(`Data atual: ${format(todayStart, "dd/MM/yyyy")}`);
    console.log(`Mês de referência: ${todayStr}`);
    console.log(`========================================\n`);

    for (const student of students || []) {
      console.log(`\nVerificando: ${student.name} (dia ${student.due_day})`);

      const paidThisMonth =
        payments?.some(
          (p: any) =>
            p.student_id === student.id && p.reference_month === todayStr,
        ) || false;

      console.log(
        `-> Pagou este mês (${todayStr})? ${paidThisMonth ? "Sim" : "Não"}`,
      );

      if (paidThisMonth) {
        console.log("-> Status: PAGO - Não enviará notificação");
        continue;
      }

      const dueDate = getNextDueDate(
        student.due_day,
        paidThisMonth,
        todayStart,
      );
      const dueDateFormatted = format(dueDate, "dd/MM/yyyy");
      const daysUntilDue = differenceInDays(dueDate, todayStart);

      console.log(`-> Data de vencimento: ${dueDateFormatted}`);
      console.log(`-> Dias até vencimento: ${daysUntilDue}`);

      let notificationType: string | null = null;
      let message = "";

      if (daysUntilDue === 0) {
        notificationType = "due-today";
        message = getDueTodayMessage(student.name);
        console.log(`-> Tipo: VENCENDO HOJE`);
      } else if (daysUntilDue === -1) {
        notificationType = "overdue";
        message = getOverdueMessage(student.name, 1);
        console.log(`-> Tipo: ATRASADO (1 dia)`);
      } else if (daysUntilDue > 0) {
        console.log(
          `-> Sem notificação (vence em ${daysUntilDue} dias) - NÃO envia antes do vencimento`,
        );
      } else {
        const daysOverdue = Math.abs(daysUntilDue);
        console.log(
          `-> Sem notificação (atrasado há ${daysOverdue} dias) - Já enviou as 2 mensagens permitidas`,
        );
      }

      if (notificationType) {
        const alreadySent = await hasMessageBeenSentThisMonth(
          student.id,
          notificationType,
          supabase,
        );

        if (alreadySent) {
          console.log(
            `Pulando ${student.name} - Mensagem de "${notificationType}" já foi enviada este mês`,
          );
          continue;
        }

        console.log(
          `Adicionando ${student.name} para envio de "${notificationType}"`,
        );

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

    console.log(`\n========================================`);
    if (studentsToNotify.length > 0) {
      console.log(
        `Encontrados ${studentsToNotify.length} alunos para notificação:`,
      );
      studentsToNotify.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} - ${s.type} - ${s.phone}`);
      });
    } else {
      console.log(`Nenhum aluno precisa de notificação hoje`);
      console.log(`   - Alunos pagos: não recebem mensagem este mês`);
      console.log(
        `   - Alunos que já receberam: bloqueados por tipo de mensagem`,
      );
    }
    console.log(`========================================\n`);

    return studentsToNotify;
  } catch (error: any) {
    console.error("Erro em getStudentsNeedingNotification:", error.message);
    throw error;
  }
}

async function logMessageSent(
  studentId: string,
  phone: string,
  message: string,
  type: string,
  supabase: any,
  messageId?: string,
): Promise<void> {
  try {
    console.log(`\n📝 Salvando log no banco...`);
    console.log(`   Student ID: ${studentId}`);
    console.log(`   Type: ${type}`);
    console.log(`   Phone: ${phone}`);

    const { data, error } = await supabase.from("whatsapp_messages").insert({
      student_id: studentId,
      phone,
      message,
      type,
      message_sid: messageId || null,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Erro ao registrar mensagem:", error);
      console.error("   Detalhes:", JSON.stringify(error, null, 2));
    } else {
      console.log("Mensagem registrada no banco com sucesso!");
      console.log(`   Data inserida:`, data);
    }
  } catch (error: any) {
    console.error("Erro ao salvar log de mensagem:", error.message);
    console.error("   Stack:", error.stack);
  }
}

async function sendNotifications(
  supabase: any,
  instanceId: string,
  token: string,
) {
  try {
    const startTime = new Date();
    console.log("Iniciando envio de notificações...");

    const studentsToNotify = await getStudentsNeedingNotification(supabase);

    if (studentsToNotify.length === 0) {
      console.log("Nenhum aluno precisa de notificação hoje");
      return { success: true, sent: 0, failed: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    for (let index = 0; index < studentsToNotify.length; index++) {
      const student = studentsToNotify[index];

      console.log(
        `(${index + 1}/${studentsToNotify.length}) Enviando para: ${student.name}`,
      );

      const result = await sendWhatsAppMessage(
        student.phone,
        student.message,
        student.name,
        instanceId,
        token,
      );

      if (result && result.success) {
        console.log(`Mensagem enviada com sucesso!`);
        successCount++;

        console.log(`Chamando logMessageSent para salvar no banco...`);
        await logMessageSent(
          student.studentId,
          student.phone,
          student.message,
          student.type,
          supabase,
          result.data?.messageId,
        );
        console.log(`Log salvo, continuando...`);
      } else {
        failureCount++;
        console.error("Erro envio:", result?.error);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    console.log(`\n========================================`);
    console.log(`Envio concluído em ${duration}s`);
    console.log(`Sucessos: ${successCount}`);
    console.log(`Falhas: ${failureCount}`);
    console.log(`========================================\n`);

    return { success: true, sent: successCount, failed: failureCount };
  } catch (error: any) {
    console.error("Erro ao enviar notificações:", error.message);
    throw error;
  }
}

// ==========================================
// HANDLER SERVERLESS DA VERCEL
// ==========================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Endpoint /api/send-messages chamado");
    console.log("Método:", req.method);

    // Validar variáveis de ambiente
    if (
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.WAPI_INSTANCE_ID ||
      !process.env.WAPI_TOKEN
    ) {
      return res.status(500).json({
        success: false,
        error: "Configuração do servidor incompleta",
      });
    }

    // Criar cliente Supabase dentro da função
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const instanceId = process.env.WAPI_INSTANCE_ID;
    const token = process.env.WAPI_TOKEN;

    // Opcional: autenticação básica via query param ou header
    const authToken = req.headers.authorization || req.query.token;
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authToken !== expectedToken) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Executa a lógica de envio de mensagens
    const result = await sendNotifications(supabase, instanceId, token);

    return res.status(200).json({
      success: true,
      message: "Processamento executado com sucesso",
      result,
    });
  } catch (error: any) {
    console.error("Erro no handler:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}

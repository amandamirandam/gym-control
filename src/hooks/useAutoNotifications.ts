import { useMemo } from "react";
import type {
  StudentWithStatus,
  WhatsAppMessage,
  Payment,
} from "@/types/student";
import {
  shouldSendAutoNotification,
  wasAutoMessageSentToday,
} from "@/utils/billing";

export interface PendingNotification {
  student: StudentWithStatus;
  type: "reminder" | "due-today";
  message: string;
}

export function useAutoNotifications(
  students: StudentWithStatus[],
  messages: WhatsAppMessage[],
  payments: Payment[],
) {
  const pendingNotifications = useMemo<PendingNotification[]>(() => {
    const today = new Date();
    const pending: PendingNotification[] = [];

    for (const student of students) {
      // Pular se já pagou
      if (student.status === "paid") continue;

      // Verificar se precisa de notificação
      const studentPayments = payments.filter(
        (p) => p.studentId === student.id,
      );
      const notificationType = shouldSendAutoNotification(
        student,
        studentPayments,
        today,
      );

      if (!notificationType) continue;

      // Verificar se já enviou hoje
      if (wasAutoMessageSentToday(student.id, messages, today)) continue;

      // Adicionar à lista de pendentes
      const messageText =
        notificationType === "reminder"
          ? `Oi ${student.name}! 😊\nPassando pra lembrar que sua mensalidade vence amanhã.\nQualquer dúvida estou por aqui!`
          : `Oi ${student.name}! 😊\nSua mensalidade vence hoje.\nSe já realizou o pagamento, pode desconsiderar 😉`;

      pending.push({
        student,
        type: notificationType,
        message: messageText,
      });
    }

    return pending;
  }, [students, messages, payments]);

  return {
    pendingNotifications,
    hasPendingNotifications: pendingNotifications.length > 0,
    count: pendingNotifications.length,
  };
}

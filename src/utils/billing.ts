import {
  format,
  differenceInDays,
  setDate,
  isAfter,
  isBefore,
  startOfDay,
  addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  Student,
  Payment,
  StudentStatus,
  StudentWithStatus,
} from "@/types/student";

export function getCurrentDueDate(
  dueDay: number,
  isPaidThisMonth: boolean = false,
  today: Date = new Date(),
): Date {
  let currentMonth = setDate(
    startOfDay(today),
    Math.min(
      dueDay,
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
    ),
  );

  // Se já pagou este mês, mostrar vencimento do próximo mês
  if (isPaidThisMonth) {
    currentMonth = addMonths(currentMonth, 1);
  }

  return currentMonth;
}

export function getCurrentReferenceMonth(today: Date = new Date()): string {
  return format(today, "yyyy-MM");
}

export function isPaidThisMonth(
  payments: Payment[],
  today: Date = new Date(),
): boolean {
  const ref = getCurrentReferenceMonth(today);
  return payments.some((p) => p.referenceMonth === ref);
}

export function getStudentStatus(
  student: Student,
  payments: Payment[],
  today: Date = new Date(),
): StudentStatus {
  const paid = isPaidThisMonth(payments, today);
  if (paid) return "paid";

  const dueDate = getCurrentDueDate(student.dueDay, false, today);
  const todayStart = startOfDay(today);
  const diff = differenceInDays(dueDate, todayStart);

  if (diff < 0) return "overdue";
  if (diff <= 3) return "due-soon";
  return "pending";
}

export function getDaysOverdue(
  dueDay: number,
  isPaidThisMonth: boolean = false,
  today: Date = new Date(),
): number {
  const dueDate = getCurrentDueDate(dueDay, isPaidThisMonth, today);
  const todayStart = startOfDay(today);
  const diff = differenceInDays(todayStart, dueDate);
  return Math.max(0, diff);
}

export function enrichStudent(
  student: Student,
  payments: Payment[],
  today: Date = new Date(),
): StudentWithStatus {
  const studentPayments = payments.filter((p) => p.studentId === student.id);
  const paid = isPaidThisMonth(studentPayments, today);
  const status = getStudentStatus(student, studentPayments, today);
  const currentDueDate = format(
    getCurrentDueDate(student.dueDay, paid, today),
    "yyyy-MM-dd",
  );
  const daysOverdue = getDaysOverdue(student.dueDay, paid, today);
  const lastPayment = studentPayments.sort((a, b) =>
    b.paymentDate.localeCompare(a.paymentDate),
  )[0];

  return { ...student, status, currentDueDate, daysOverdue, lastPayment };
}

export function getStatusLabel(status: StudentStatus): string {
  const labels: Record<StudentStatus, string> = {
    paid: "Pago",
    pending: "Em dia",
    overdue: "Atrasado",
    "due-soon": "Vencendo",
  };
  return labels[status];
}

export function getWhatsAppMessage(
  name: string,
  type: "reminder" | "due-today" | "overdue",
): string {
  const messages = {
    reminder: `Oi ${name}! Passando pra lembrar que sua mensalidade vence amanhã.\nQualquer dúvida estou por aqui!`,
    "due-today": `Oi ${name}! Sua mensalidade vence hoje.\nSe já realizou o pagamento, pode desconsiderar `,
    overdue: `Olá ${name}, sua mensalidade está em atraso.\nRegularize para continuar treinando!`,
  };
  return messages[type];
}

// Verifica se um aluno precisa de notificação automática
export function shouldSendAutoNotification(
  student: Student,
  payments: Payment[],
  today: Date = new Date(),
): "reminder" | "due-today" | null {
  // Não enviar se já pagou
  if (isPaidThisMonth(payments, today)) return null;

  const dueDate = getCurrentDueDate(student.dueDay, false, today);
  const todayStart = startOfDay(today);
  const daysUntilDue = differenceInDays(dueDate, todayStart);

  // 1 dia antes do vencimento
  if (daysUntilDue === 1) return "reminder";

  // No dia do vencimento
  if (daysUntilDue === 0) return "due-today";

  return null;
}

// Verifica se já foi enviada mensagem automática hoje para este aluno
export function wasAutoMessageSentToday(
  studentId: string,
  messages: any[],
  today: Date = new Date(),
): boolean {
  const todayStr = format(today, "yyyy-MM-dd");
  return messages.some(
    (m) =>
      m.studentId === studentId &&
      m.sentAt.startsWith(todayStr) &&
      (m.type === "reminder" || m.type === "due-today"),
  );
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

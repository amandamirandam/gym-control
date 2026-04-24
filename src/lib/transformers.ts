import type { Student, Payment, WhatsAppMessage } from "@/types/student";

/**
 * Transforma dados do Supabase (snake_case) para TypeScript (camelCase)
 */
export function transformStudent(data: any): Student {
  return {
    id: data.id,
    name: data.name,
    cpf: data.cpf,
    phone: data.phone,
    startDate: data.start_date,
    dueDay: data.due_day,
    active: data.active ?? true, // Default true para retrocompatibilidade
    createdAt: data.created_at,
  };
}

export function transformPayment(data: any): Payment {
  return {
    id: data.id,
    studentId: data.student_id,
    paymentDate: data.payment_date,
    referenceMonth: data.reference_month,
    createdAt: data.created_at,
  };
}

export function transformMessage(data: any): WhatsAppMessage {
  return {
    id: data.id,
    studentId: data.student_id,
    studentName: data.student_name,
    phone: data.phone,
    message: data.message,
    sentAt: data.sent_at,
    type: data.type,
  };
}

/**
 * Converte TypeScript (camelCase) para Supabase (snake_case) para inserção
 */
export function toSupabaseStudent(student: Omit<Student, "id" | "createdAt">) {
  return {
    name: student.name,
    cpf: student.cpf,
    phone: student.phone,
    start_date: student.startDate,
    due_day: student.dueDay,
    active: student.active ?? true,
    created_at: new Date().toISOString(),
  };
}

export function toSupabasePayment(payment: Omit<Payment, "id" | "createdAt">) {
  return {
    student_id: payment.studentId,
    payment_date: payment.paymentDate,
    reference_month: payment.referenceMonth,
    created_at: new Date().toISOString(),
  };
}

export function toSupabaseMessage(message: Omit<WhatsAppMessage, "id">) {
  return {
    student_id: message.studentId,
    student_name: message.studentName,
    phone: message.phone,
    message: message.message,
    sent_at: message.sentAt,
    type: message.type,
  };
}

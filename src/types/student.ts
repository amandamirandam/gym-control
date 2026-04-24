export interface Student {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  startDate: string; // ISO date
  dueDay: number; // day of month
  active: boolean; // se o aluno está ativo ou inativo
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  paymentDate: string; // ISO date
  referenceMonth: string; // "YYYY-MM"
  createdAt: string;
}

export type StudentStatus = "paid" | "pending" | "overdue" | "due-soon";

export interface StudentWithStatus extends Student {
  status: StudentStatus;
  currentDueDate: string;
  daysOverdue: number;
  lastPayment?: Payment;
}

export interface WhatsAppMessage {
  id: string;
  studentId: string;
  studentName: string;
  phone: string;
  message: string;
  sentAt: string;
  type: "reminder" | "due-today" | "overdue" | "manual";
}

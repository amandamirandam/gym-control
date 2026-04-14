import { useState, useCallback, useEffect } from "react";
import type { Student, Payment, WhatsAppMessage } from "@/types/student";
import { enrichStudent } from "@/utils/billing";

const STUDENTS_KEY = "gym_students";
const PAYMENTS_KEY = "gym_payments";
const MESSAGES_KEY = "gym_messages";

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(() =>
    loadFromStorage<Student>(STUDENTS_KEY, []),
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    loadFromStorage<Payment>(PAYMENTS_KEY, []),
  );
  const [messages, setMessages] = useState<WhatsAppMessage[]>(() =>
    loadFromStorage<WhatsAppMessage>(MESSAGES_KEY, []),
  );

  useEffect(() => saveToStorage(STUDENTS_KEY, students), [students]);
  useEffect(() => saveToStorage(PAYMENTS_KEY, payments), [payments]);
  useEffect(() => saveToStorage(MESSAGES_KEY, messages), [messages]);

  const addStudent = useCallback(
    (student: Omit<Student, "id" | "createdAt">) => {
      const newStudent: Student = {
        ...student,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      setStudents((prev) => [...prev, newStudent]);
      return newStudent;
    },
    [],
  );

  const updateStudent = useCallback(
    (id: string, data: Partial<Omit<Student, "id" | "createdAt">>) => {
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s)),
      );
    },
    [],
  );

  const removeStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setPayments((prev) => prev.filter((p) => p.studentId !== id));
    setMessages((prev) => prev.filter((m) => m.studentId !== id));
  }, []);

  const addPayment = useCallback(
    (studentId: string, paymentDate: string, referenceMonth: string) => {
      const payment: Payment = {
        id: crypto.randomUUID(),
        studentId,
        paymentDate,
        referenceMonth,
        createdAt: new Date().toISOString(),
      };
      setPayments((prev) => [...prev, payment]);
      return payment;
    },
    [],
  );

  const updatePayment = useCallback(
    (paymentId: string, newPaymentDate: string) => {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, paymentDate: newPaymentDate } : p,
        ),
      );
    },
    [],
  );

  const addMessage = useCallback(
    (msg: Omit<WhatsAppMessage, "id" | "sentAt">) => {
      const message: WhatsAppMessage = {
        ...msg,
        id: crypto.randomUUID(),
        sentAt: new Date().toISOString(),
      };
      setMessages((prev) => [message, ...prev]);
      return message;
    },
    [],
  );

  const getStudentPayments = useCallback(
    (studentId: string) => {
      return payments
        .filter((p) => p.studentId === studentId)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    },
    [payments],
  );

  const enrichedStudents = students.map((s) => enrichStudent(s, payments));

  return {
    students: enrichedStudents,
    payments,
    messages,
    addStudent,
    updateStudent,
    removeStudent,
    addPayment,
    updatePayment,
    addMessage,
    getStudentPayments,
  };
}

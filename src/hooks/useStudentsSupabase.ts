import { useState, useCallback, useEffect } from "react";
import type { Student, Payment } from "@/types/student";
import { enrichStudent } from "@/utils/billing";
import { supabase } from "@/lib/supabase";
import {
  transformStudent,
  transformPayment,
  toSupabaseStudent,
  toSupabasePayment,
} from "@/lib/transformers";

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega todos os dados ao iniciar
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar alunos
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*");

      if (studentsError) throw studentsError;
      setStudents((studentsData || []).map(transformStudent));

      // Carregar pagamentos
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*");

      if (paymentsError) throw paymentsError;
      setPayments((paymentsData || []).map(transformPayment));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar dados";
      setError(message);
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = useCallback(
    async (student: Omit<Student, "id" | "createdAt">) => {
      try {
        const studentData = toSupabaseStudent(student);

        console.log("📥 Enviando para Supabase:", studentData);

        // Verificar se CPF já existe
        const { data: existingStudent, error: checkError } = await supabase
          .from("students")
          .select("id, cpf")
          .eq("cpf", student.cpf)
          .single();

        if (existingStudent) {
          throw new Error(`CPF ${student.cpf} já cadastrado no sistema`);
        }

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Erro ao verificar CPF:", checkError);
        }

        const { data, error } = await supabase
          .from("students")
          .insert([studentData])
          .select()
          .single();

        if (error) {
          console.error("Erro do Supabase:", error);
          if (error.code === "23505") {
            throw new Error(`CPF ${student.cpf} já cadastrado no sistema`);
          }
          throw error;
        }

        console.log("Aluno cadastrado com sucesso:", data);
        const transformedStudent = transformStudent(data);
        setStudents((prev) => [...prev, transformedStudent]);
        return transformedStudent;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao adicionar aluno";
        console.error(message, err);
        // NÃO setar error geral aqui - deixar o componente lidar com o erro localmente
        throw err;
      }
    },
    [],
  );

  const updateStudent = useCallback(
    async (id: string, data: Partial<Omit<Student, "id" | "createdAt">>) => {
      try {
        // Transformar camelCase para snake_case
        const updateData: Record<string, any> = {};
        if (data.name) updateData.name = data.name;
        if (data.cpf) updateData.cpf = data.cpf;
        if (data.phone) updateData.phone = data.phone;
        if (data.startDate) updateData.start_date = data.startDate;
        if (data.dueDay) updateData.due_day = data.dueDay;

        const { error } = await supabase
          .from("students")
          .update(updateData)
          .eq("id", id);

        if (error) throw error;

        setStudents((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...data } : s)),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar aluno";
        console.error(message, err);
        // NÃO setar error geral aqui - deixar o componente lidar com o erro localmente
        throw err;
      }
    },
    [],
  );

  const removeStudent = useCallback(async (id: string) => {
    try {
      // Remover aluno
      const { error: studentError } = await supabase
        .from("students")
        .delete()
        .eq("id", id);

      if (studentError) throw studentError;

      // Remover pagamentos relacionados
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("student_id", id);

      if (paymentsError) throw paymentsError;

      setStudents((prev) => prev.filter((s) => s.id !== id));
      setPayments((prev) => prev.filter((p) => p.studentId !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao remover aluno";
      console.error(message, err);
      // NÃO setar error geral aqui - deixar o componente lidar com o erro localmente
      throw err;
    }
  }, []);

  const addPayment = useCallback(
    async (studentId: string, paymentDate: string, referenceMonth: string) => {
      try {
        const paymentData = {
          student_id: studentId,
          payment_date: paymentDate,
          reference_month: referenceMonth,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("payments")
          .insert([paymentData])
          .select()
          .single();

        if (error) throw error;

        const transformedPayment = transformPayment(data);
        setPayments((prev) => [...prev, transformedPayment]);
        return transformedPayment;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao adicionar pagamento";
        console.error(message, err);
        // NÃO setar error geral aqui - deixar o componente lidar com o erro localmente
        throw err;
      }
    },
    [],
  );

  const updatePayment = useCallback(
    async (paymentId: string, newPaymentDate: string) => {
      try {
        const { error } = await supabase
          .from("payments")
          .update({ payment_date: newPaymentDate })
          .eq("id", paymentId);

        if (error) throw error;

        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId ? { ...p, paymentDate: newPaymentDate } : p,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao atualizar pagamento";
        console.error(message, err);
        // NÃO setar error geral aqui - deixar o componente lidar com o erro localmente
        throw err;
      }
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
    loading,
    error,
    addStudent,
    updateStudent,
    removeStudent,
    addPayment,
    updatePayment,
    getStudentPayments,
    refreshData: loadAllData,
  };
}

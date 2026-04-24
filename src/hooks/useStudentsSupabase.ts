import { useState, useCallback, useEffect, useMemo } from "react";
import type { Student, Payment } from "@/types/student";
import { enrichStudent } from "@/utils/billing";
import { supabase } from "@/lib/supabase";
import {
  transformStudent,
  transformPayment,
  toSupabaseStudent,
  toSupabasePayment,
} from "@/lib/transformers";
import { sendWhatsAppMessage } from "@/utils/whatsapp";

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
        // Buscar estado anterior do aluno
        const previousStudent = students.find((s) => s.id === id);
        const wasActive = previousStudent?.active ?? true;
        const willBeActive = data.active ?? wasActive;

        // Transformar camelCase para snake_case
        const updateData: Record<string, any> = {};
        if (data.name) updateData.name = data.name;
        if (data.cpf) updateData.cpf = data.cpf;
        if (data.phone) updateData.phone = data.phone;
        if (data.startDate) updateData.start_date = data.startDate;
        if (data.dueDay) updateData.due_day = data.dueDay;
        if (data.active !== undefined) updateData.active = data.active;

        const { error } = await supabase
          .from("students")
          .update(updateData)
          .eq("id", id);

        if (error) throw error;

        // Se aluno foi INATIVADO, excluir TODOS os pagamentos
        if (wasActive && !willBeActive) {
          console.log(
            `🗑️ Aluno inativado - excluindo todos os pagamentos de ${id}`,
          );

          const { error: paymentsError } = await supabase
            .from("payments")
            .delete()
            .eq("student_id", id);

          if (paymentsError) {
            console.error("Erro ao excluir pagamentos:", paymentsError);
            throw paymentsError;
          }

          // Atualizar estado local - remover pagamentos
          setPayments((prev) => prev.filter((p) => p.studentId !== id));

          console.log(`✅ Pagamentos excluídos com sucesso`);
        }

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
    [students],
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
        // Estratégia: manter apenas 12 meses de histórico (rolling 12 months)
        // Quando adicionar pagamento para um mês, sobrescrever o mesmo mês do ano anterior

        // Extrair o mês da referência (ex: "2027-01" → "-01")
        const month = referenceMonth.slice(-3); // "-01", "-02", etc.

        // Buscar se já existe um pagamento para este aluno neste mês (qualquer ano)
        const { data: existingPayments, error: searchError } = await supabase
          .from("payments")
          .select("*")
          .eq("student_id", studentId)
          .like("reference_month", `%${month}`);

        if (searchError) throw searchError;

        let transformedPayment;

        if (existingPayments && existingPayments.length > 0) {
          // Existe pagamento para este mês → SOBRESCREVER (UPDATE)
          const existingPayment = existingPayments[0];

          const { data, error } = await supabase
            .from("payments")
            .update({
              payment_date: paymentDate,
              reference_month: referenceMonth,
            })
            .eq("id", existingPayment.id)
            .select()
            .single();

          if (error) throw error;

          transformedPayment = transformPayment(data);

          // Atualizar estado local (substituir o pagamento antigo)
          setPayments((prev) =>
            prev.map((p) =>
              p.id === existingPayment.id ? transformedPayment : p,
            ),
          );

          console.log(
            `Pagamento sobrescrito: ${month} (${existingPayment.reference_month} → ${referenceMonth})`,
          );
        } else {
          // Não existe pagamento para este mês → INSERIR (INSERT)
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

          transformedPayment = transformPayment(data);

          // Adicionar ao estado local
          setPayments((prev) => [...prev, transformedPayment]);

          console.log(`Novo pagamento inserido: ${referenceMonth}`);
        }

        // 🆕 ENVIAR MENSAGEM DE CONFIRMAÇÃO DE PAGAMENTO
        try {
          // Buscar dados do aluno
          const student = students.find((s) => s.id === studentId);

          if (student && student.phone) {
            // Formatar data de pagamento (ex: "23/04/2026")
            const [year, month, day] = paymentDate.split("-");
            const formattedDate = `${day}/${month}/${year}`;

            // Formatar mês de referência (ex: "Abril/2026")
            const [refYear, refMonth] = referenceMonth.split("-");
            const monthNames = [
              "Janeiro",
              "Fevereiro",
              "Março",
              "Abril",
              "Maio",
              "Junho",
              "Julho",
              "Agosto",
              "Setembro",
              "Outubro",
              "Novembro",
              "Dezembro",
            ];
            const formattedMonth = `${monthNames[parseInt(refMonth) - 1]}/${refYear}`;

            const message = `✅ *Pagamento Confirmado!*\n\nOlá, ${student.name}!\n\nSeu pagamento da mensalidade de *${formattedMonth}* foi confirmado com sucesso!\n\n📅 Data do pagamento: ${formattedDate}\n\nObrigado por manter sua mensalidade em dia! 💪`;

            // Enviar mensagem (não bloqueia se falhar)
            sendWhatsAppMessage(student.phone, message, student.name).catch(
              (err) => {
                console.error("Erro ao enviar mensagem de confirmação:", err);
              },
            );

            console.log(
              `📲 Mensagem de confirmação enviada para ${student.name}`,
            );
          }
        } catch (err) {
          // Não propagar erro de mensagem - pagamento já foi registrado
          console.error("Erro ao enviar mensagem de confirmação:", err);
        }

        return transformedPayment;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao adicionar pagamento";
        console.error(message, err);
        // NÃO setar error geral aqui - deixar o componente lidar com o erro localmente
        throw err;
      }
    },
    [students],
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

  const removePayment = useCallback(async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      // Remove do estado local
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));

      console.log(`Pagamento removido: ${paymentId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao remover pagamento";
      console.error(message, err);
      throw err;
    }
  }, []);

  const getStudentPayments = useCallback(
    (studentId: string) => {
      return payments
        .filter((p) => p.studentId === studentId)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    },
    [payments],
  );

  // Usar useMemo para garantir re-renderização quando payments ou students mudarem
  const enrichedStudents = useMemo(
    () => students.map((s) => enrichStudent(s, payments)),
    [students, payments],
  );

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
    removePayment,
    getStudentPayments,
    refreshData: loadAllData,
  };
}

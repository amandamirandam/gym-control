import { supabase } from "@/lib/supabase";
import type { Student, Payment, WhatsAppMessage } from "@/types/student";

/**
 * Migra dados do localStorage para Supabase
 * Use isso uma única vez para transferir dados existentes
 */
export async function migrateLocalStorageToSupabase() {
  try {
    console.log("🚀 Iniciando migração do localStorage para Supabase...");

    // Carregar dados do localStorage
    const students = JSON.parse(
      localStorage.getItem("gym_students") || "[]",
    ) as Student[];
    const payments = JSON.parse(
      localStorage.getItem("gym_payments") || "[]",
    ) as Payment[];
    const messages = JSON.parse(
      localStorage.getItem("gym_messages") || "[]",
    ) as WhatsAppMessage[];

    console.log(`📊 Dados encontrados:
      - ${students.length} alunos
      - ${payments.length} pagamentos
      - ${messages.length} mensagens`);

    // 1. Inserir alunos
    if (students.length > 0) {
      console.log("📝 Inserindo alunos...");
      const { error: studentsError } = await supabase.from("students").insert(
        students.map((s) => ({
          id: s.id,
          name: s.name,
          cpf: s.cpf,
          phone: s.phone,
          start_date: s.startDate,
          due_day: s.dueDay,
          created_at: s.createdAt,
        })),
      );

      if (studentsError)
        throw new Error(`Erro ao inserir alunos: ${studentsError.message}`);
      console.log("✅ Alunos inseridos!");
    }

    // 2. Inserir pagamentos
    if (payments.length > 0) {
      console.log("📝 Inserindo pagamentos...");
      const { error: paymentsError } = await supabase.from("payments").insert(
        payments.map((p) => ({
          id: p.id,
          student_id: p.studentId,
          payment_date: p.paymentDate,
          reference_month: p.referenceMonth,
          created_at: p.createdAt,
        })),
      );

      if (paymentsError)
        throw new Error(`Erro ao inserir pagamentos: ${paymentsError.message}`);
      console.log("✅ Pagamentos inseridos!");
    }

    // 3. Inserir mensagens
    if (messages.length > 0) {
      console.log("📝 Inserindo mensagens...");
      const { error: messagesError } = await supabase.from("messages").insert(
        messages.map((m) => ({
          id: m.id,
          student_id: m.studentId,
          student_name: m.studentName,
          phone: m.phone,
          message: m.message,
          sent_at: m.sentAt,
          type: m.type,
        })),
      );

      if (messagesError)
        throw new Error(`Erro ao inserir mensagens: ${messagesError.message}`);
      console.log("✅ Mensagens inseridas!");
    }

    console.log("✨ Migração concluída com sucesso!");
    console.log(
      "💡 Dica: Agora você pode usar useStudentsSupabase em vez de useStudents",
    );

    return {
      success: true,
      migrated: {
        students: students.length,
        payments: payments.length,
        messages: messages.length,
      },
    };
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    throw error;
  }
}

/**
 * Exporta dados do Supabase para arquivo JSON
 * Útil para backup
 */
export async function exportDataFromSupabase() {
  try {
    console.log("📥 Exportando dados do Supabase...");

    const { data: students } = await supabase.from("students").select("*");
    const { data: payments } = await supabase.from("payments").select("*");
    const { data: messages } = await supabase.from("messages").select("*");

    const exportData = {
      exportedAt: new Date().toISOString(),
      students,
      payments,
      messages,
    };

    // Criar arquivo JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gym_backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    console.log("✅ Backup exportado!");
    return exportData;
  } catch (error) {
    console.error("❌ Erro ao exportar dados:", error);
    throw error;
  }
}

/**
 * Limpa todos os dados do Supabase (CUIDADO!)
 */
export async function clearSupabaseData() {
  const confirmed = window.confirm(
    "⚠️ Tem certeza que deseja deletar TODOS os dados do Supabase? Esta ação não pode ser desfeita!",
  );

  if (!confirmed) return;

  try {
    console.log("🗑️ Limpando dados...");

    // Deletar na ordem correta (com foreign keys)
    await supabase.from("messages").delete().neq("id", "");
    await supabase.from("payments").delete().neq("id", "");
    await supabase.from("students").delete().neq("id", "");

    console.log("✅ Dados deletados!");
  } catch (error) {
    console.error("❌ Erro ao limpar dados:", error);
    throw error;
  }
}

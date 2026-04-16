import { useState, useMemo } from "react";
import { useStudents } from "@/hooks/useStudentsSupabase";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { StudentCard } from "@/components/StudentCard";
import { StudentForm } from "@/components/StudentForm";
import { PaymentHistory } from "@/components/PaymentHistory";
import { DashboardFilters } from "@/components/DashboardFilters";
import { StatsCards } from "@/components/StatsCards";
import { AutoNotificationsPanel } from "@/components/AutoNotificationsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  getWhatsAppMessage,
  getCurrentReferenceMonth,
  formatPhone,
  formatDateBR,
  getCurrentDueDate,
} from "@/utils/billing";
import { sendWhatsAppMessage } from "@/utils/whatsapp";
import type { StudentStatus } from "@/types/student";
import { UserPlus, Dumbbell, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Index() {
  const {
    students,
    payments,
    loading,
    error,
    addStudent,
    updateStudent,
    removeStudent,
    addPayment,
    updatePayment,
    getStudentPayments,
  } = useStudents();

  const [showForm, setShowForm] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [showAutoPanel, setShowAutoPanel] = useState(true);
  const [filter, setFilter] = useState<StudentStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [editStudentId, setEditStudentId] = useState<string | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: students.length,
      paid: students.filter((s) => s.status === "paid").length,
      overdue: students.filter((s) => s.status === "overdue").length,
      "due-soon": students.filter((s) => s.status === "due-soon").length,
      pending: students.filter((s) => s.status === "pending").length,
    }),
    [students],
  );

  const filteredStudents = useMemo(() => {
    let list = students;
    if (filter !== "all") list = list.filter((s) => s.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.phone.includes(q),
      );
    }
    // Sort: overdue first, then due-soon, pending, paid
    const order: Record<StudentStatus, number> = {
      overdue: 0,
      "due-soon": 1,
      pending: 2,
      paid: 3,
    };
    return list.sort((a, b) => order[a.status] - order[b.status]);
  }, [students, filter, search]);

  const historyStudent = historyStudentId
    ? students.find((s) => s.id === historyStudentId)
    : null;

  const handlePayment = (studentId: string) => {
    setPaymentDialog(studentId);
    setPaymentDate(new Date().toISOString().split("T")[0]);
  };

  const confirmPayment = () => {
    if (!paymentDialog || !paymentDate) return;
    addPayment(paymentDialog, paymentDate, getCurrentReferenceMonth());
    const student = students.find((s) => s.id === paymentDialog);

    // Calcular o próximo vencimento (após pagamento, mostra vencimento do próximo mês)
    const nextDueDate = getCurrentDueDate(student?.dueDay || 1, true);
    const nextDueDateFormatted = formatDateBR(
      nextDueDate.toISOString().split("T")[0],
    );

    toast({
      title: "Pagamento registrado!",
      description: `Próximo vencimento atualizado: ${nextDueDateFormatted}`,
    });
    setPaymentDialog(null);
  };

  const handleWhatsApp = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const type =
      student.status === "overdue"
        ? "overdue"
        : student.status === "due-soon"
          ? "due-today"
          : "reminder";
    const message = getWhatsAppMessage(student.name, type);

    // Enviar mensagem via API do servidor
    const result = await sendWhatsAppMessage(
      student.phone,
      message,
      student.name,
    );

    if (result.success) {
      toast({
        title: "Mensagem enviada!",
        description: `Cobrança enviada para ${student.name}`,
      });
    } else {
      toast({
        title: "Erro ao enviar mensagem",
        description: result.error || "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (studentId: string) => {
    setDeleteStudentId(studentId);
  };

  const confirmDelete = () => {
    if (!deleteStudentId) return;
    const student = students.find((s) => s.id === deleteStudentId);
    const studentName = student?.name || "Aluno";

    removeStudent(deleteStudentId);
    setDeleteStudentId(null);
    toast({
      title: "Aluno excluído com sucesso",
      description: `${studentName} foi removido do sistema.`,
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl leading-none">GYM CONTROL</h1>
              <p className="text-xs text-muted-foreground font-body">
                Controle de mensalidades
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowForm(true)}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Aluno</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-r-transparent mb-3" />
            <p className="font-medium">Carregando dados do Supabase...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
            <p className="text-sm text-destructive font-medium">
              Erro ao carregar dados
            </p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <StatsCards students={students} />

            {/* Alunos Atrasados - Controle de Mensagens */}
            {showAutoPanel && (
              <AutoNotificationsPanel
                students={students}
                onSendMessage={handleWhatsApp}
                onClose={() => setShowAutoPanel(false)}
              />
            )}

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <StudentForm
                    onSubmit={async (data) => {
                      try {
                        console.log("Cadastrando aluno:", {
                          name: data.name,
                          cpf: data.cpf,
                          phone: data.phone,
                          cpfLength: data.cpf.length,
                          phoneLength: data.phone.length,
                        });
                        await addStudent(data);
                        setShowForm(false);
                        toast({ title: "Aluno cadastrado!" });
                      } catch (error) {
                        console.error("Erro ao cadastrar:", error);
                        toast({
                          title: "Erro ao cadastrar aluno",
                          description:
                            error instanceof Error
                              ? error.message
                              : "Tente novamente",
                          variant: "destructive",
                        });
                      }
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {historyStudent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <PaymentHistory
                    studentName={historyStudent.name}
                    payments={getStudentPayments(historyStudent.id)}
                    onClose={() => setHistoryStudentId(null)}
                    onEditPayment={(paymentId, newDate) => {
                      updatePayment(paymentId, newDate);
                      toast({ title: "Pagamento atualizado!" });
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filters & Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DashboardFilters
                active={filter}
                onChange={setFilter}
                counts={counts}
              />
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar aluno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mb-3 opacity-30" />
                  <p className="font-medium">
                    {students.length === 0
                      ? "Nenhum aluno cadastrado"
                      : "Nenhum aluno encontrado"}
                  </p>
                  {students.length === 0 && (
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => setShowForm(true)}
                    >
                      Cadastrar primeiro aluno
                    </Button>
                  )}
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <StudentCard
                    key={s.id}
                    student={s}
                    onPayment={handlePayment}
                    onHistory={setHistoryStudentId}
                    onWhatsApp={handleWhatsApp}
                    onEdit={setEditStudentId}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Payment Dialog */}
      <Dialog
        open={!!paymentDialog}
        onOpenChange={() => setPaymentDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl tracking-wider">
              REGISTRAR PAGAMENTO
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Aluno:{" "}
              <span className="font-semibold text-foreground">
                {students.find((s) => s.id === paymentDialog)?.name}
              </span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="payDate">Data do pagamento</Label>
              <Input
                id="payDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmPayment}
              className="bg-status-paid hover:bg-status-paid/90 text-primary-foreground"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditStudentDialog
        student={
          editStudentId
            ? (students.find((s) => s.id === editStudentId) ?? null)
            : null
        }
        open={!!editStudentId}
        onClose={() => setEditStudentId(null)}
        onSave={(id, data) => {
          updateStudent(id, data);
          setEditStudentId(null);
          toast({ title: "Aluno atualizado!" });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteStudentId}
        onOpenChange={() => setDeleteStudentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tem certeza que deseja excluir este aluno?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados do aluno serão
              removidos permanentemente, incluindo:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Histórico de pagamentos</li>
                <li>Mensagens enviadas</li>
                <li>Todos os registros vinculados</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

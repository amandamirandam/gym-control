import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStudents } from "@/hooks/useStudentsSupabase";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { StudentCard } from "@/components/StudentCard";
import { StudentForm } from "@/components/StudentForm";
import { DashboardFilters } from "@/components/DashboardFilters";
import { StatsCards } from "@/components/StatsCards";
import { AutoNotificationsPanel } from "@/components/AutoNotificationsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";
import {
  getWhatsAppMessage,
  getCurrentReferenceMonth,
  formatPhone,
  formatDateBR,
  getCurrentDueDate,
  formatReferenceMonth,
} from "@/utils/billing";
import { sendWhatsAppMessage } from "@/utils/whatsapp";
import type { StudentStatus } from "@/types/student";
import {
  UserPlus,
  Dumbbell,
  Search,
  History,
  CircleAlert,
  MessageSquare,
  X,
  LogOut,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Index() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
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
  const [showAutoPanel, setShowAutoPanel] = useState(true);
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);
  const [filter, setFilter] = useState<StudentStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 9 alunos por página (3x3 grid)
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

  // Resetar para página 1 quando filtros mudarem
  useMemo(() => {
    setCurrentPage(1);
  }, [filter, search]);

  // Calcular total de páginas
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Alunos da página atual
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Alunos atrasados para o dialog
  const overdueStudents = useMemo(() => {
    return students
      .filter((s) => s.status === "overdue")
      .sort((a, b) => {
        // Calcula dias de atraso para ordenar (mais atrasado primeiro)
        const aOverdue = a.daysOverdue || 0;
        const bOverdue = b.daysOverdue || 0;
        return bOverdue - aOverdue;
      });
  }, [students]);

  const handleManualCharge = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    try {
      const message = getWhatsAppMessage(student.name, "overdue");

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
        throw new Error(result.error || "Erro ao enviar mensagem");
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handlePayment = (studentId: string) => {
    setPaymentDialog(studentId);
    setPaymentDate(new Date().toISOString().split("T")[0]);
  };

  const confirmPayment = async () => {
    if (!paymentDialog || !paymentDate) return;

    try {
      // Aguardar o pagamento ser registrado antes de atualizar a UI
      await addPayment(paymentDialog, paymentDate, getCurrentReferenceMonth());

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
    } catch (error) {
      toast({
        title: "Erro ao registrar pagamento",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
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

  const confirmDelete = async () => {
    if (!deleteStudentId) return;
    const student = students.find((s) => s.id === deleteStudentId);
    const studentName = student?.name || "Aluno";

    try {
      await removeStudent(deleteStudentId);

      toast({
        title: "Aluno excluído com sucesso",
        description: `${studentName} foi removido do sistema.`,
        variant: "default",
      });

      setDeleteStudentId(null);
    } catch (error) {
      toast({
        title: "Erro ao excluir aluno",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
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
            {overdueStudents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 relative"
                onClick={() => setShowOverdueDialog(true)}
              >
                <CircleAlert className="h-4 w-4 text-destructive" />
                <span className="hidden sm:inline">Atrasados</span>
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                  {overdueStudents.length}
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate("/historico-pagamentos")}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowForm(true)}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Aluno</span>
            </Button>
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate("/usuarios")}
                title="Gerenciar Usuários"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Usuários</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
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

            {/* Dialog de Alunos Atrasados */}
            <AnimatePresence>
              {showOverdueDialog && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CircleAlert className="h-5 w-5 text-destructive" />
                          <div>
                            <CardTitle className="text-lg">
                              Alunos Atrasados - Controle de Mensagens
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {overdueStudents.length}{" "}
                              {overdueStudents.length === 1
                                ? "aluno está atrasado"
                                : "alunos estão atrasados"}{" "}
                              • Use o botão Cobrar para enviar mensagem manual
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowOverdueDialog(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {overdueStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 bg-card rounded-lg border border-destructive/20"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">
                                  {student.name}
                                </p>
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {student.daysOverdue}{" "}
                                  {student.daysOverdue === 1
                                    ? "dia atrasado"
                                    : "dias atrasados"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {student.phone} • Vencimento: dia{" "}
                                {student.dueDay}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 ml-2 flex-shrink-0 border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleManualCharge(student.id)}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Cobrar
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        <strong>Dica:</strong> O sistema já enviou mensagens
                        automáticas no dia do vencimento e 1 dia após. Use o
                        botão "Cobrar" para enviar mensagens manuais adicionais.
                      </div>
                    </CardContent>
                  </Card>
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

            {/* Contador de resultados */}
            {filteredStudents.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Exibindo{" "}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>
                {" - "}
                <span className="font-semibold text-foreground">
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredStudents.length,
                  )}
                </span>
                {" de "}
                <span className="font-semibold text-foreground">
                  {filteredStudents.length}
                </span>
                {" alunos"}
              </div>
            )}

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
                paginatedStudents.map((s) => (
                  <StudentCard
                    key={s.id}
                    student={s}
                    onPayment={handlePayment}
                    onHistory={(studentId) =>
                      navigate(`/historico-pagamentos?studentId=${studentId}`)
                    }
                    onWhatsApp={handleWhatsApp}
                    onEdit={setEditStudentId}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {/* Paginação */}
            {filteredStudents.length > itemsPerPage && (
              <div className="flex justify-center mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => {
                        // Mostrar apenas algumas páginas para não poluir
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        if (!showPage) {
                          // Mostrar ellipsis apenas uma vez entre grupos
                          if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      },
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
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
            <DialogTitle className="text-xl tracking-wider flex items-center gap-2">
              <CircleAlert className="h-5 w-5 text-yellow-600" />
              CONFIRMAR PAGAMENTO
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Alert className="border-yellow-600/50 bg-yellow-50 dark:bg-yellow-950/20">
              <CircleAlert className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Confirme os dados antes de registrar o pagamento. Esta ação não
                poderá ser desfeita facilmente.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Aluno:</span>
                <span className="font-semibold text-foreground">
                  {students.find((s) => s.id === paymentDialog)?.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Mês referência:
                </span>
                <span className="font-semibold text-foreground">
                  {formatReferenceMonth(getCurrentReferenceMonth())}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="payDate">Data do pagamento</Label>
                <Input
                  id="payDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {formatDateBR(paymentDate)}
                </p>
              </div>
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
              ✓ Confirmar Pagamento
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
        onSave={async (id, data) => {
          try {
            await updateStudent(id, data);
            setEditStudentId(null);
            toast({ title: "Aluno atualizado!" });
          } catch (error) {
            console.error("Erro ao atualizar:", error);
            toast({
              title: "Erro ao atualizar aluno",
              description:
                error instanceof Error ? error.message : "Tente novamente",
              variant: "destructive",
            });
          }
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

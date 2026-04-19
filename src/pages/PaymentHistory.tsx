import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStudents } from "@/hooks/useStudentsSupabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Filter, Search, X, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type PaymentStatus = "em-dia" | "atrasado";

interface PaymentWithStatus {
  id: string;
  referenceMonth: string;
  paymentDate: string;
  status: PaymentStatus;
  daysLate: number;
}

const MONTHLY_VALUE = 100; // R$ 100,00

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { students, payments, loading } = useStudents();

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selecionar aluno automaticamente da URL
  useEffect(() => {
    const studentIdFromUrl = searchParams.get("studentId");
    if (studentIdFromUrl && students.length > 0) {
      const studentExists = students.some((s) => s.id === studentIdFromUrl);
      if (studentExists) {
        setSelectedStudentId(studentIdFromUrl);
      }
    }
  }, [searchParams, students]);

  // Filtrar alunos pela busca
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.cpf.includes(query),
    );
  }, [students, searchQuery]);

  // Obter aluno selecionado
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Resetar filtros para valores padrão quando trocar de aluno
  useEffect(() => {
    if (selectedStudentId) {
      setSelectedYear(new Date().getFullYear().toString());
      setStatusFilter("all");
    }
  }, [selectedStudentId]);

  // Calcular status de cada pagamento
  const paymentsWithStatus = useMemo<PaymentWithStatus[]>(() => {
    if (!selectedStudent) return [];

    const studentPayments = payments.filter(
      (p) => p.studentId === selectedStudentId,
    );

    return studentPayments.map((payment) => {
      const paymentDate = parseISO(payment.paymentDate);
      const [year, month] = payment.referenceMonth.split("-").map(Number);

      // Data de vencimento: dia do aluno no mês de referência
      const dueDate = new Date(year, month - 1, selectedStudent.dueDay);

      // Mês atual no formato YYYY-MM
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      let status: PaymentStatus;
      let diffDays = 0;

      // Se o mês de referência é anterior ao mês atual, sempre marca como "em-dia"
      // porque o pagamento já foi realizado (está no histórico)
      if (payment.referenceMonth < currentMonth) {
        status = "em-dia";
      } else {
        // Para o mês atual, calcula se está em dia ou atrasado
        const diffTime = paymentDate.getTime() - dueDate.getTime();
        diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        status = diffDays <= 0 ? "em-dia" : "atrasado";
      }

      return {
        id: payment.id,
        referenceMonth: payment.referenceMonth,
        paymentDate: payment.paymentDate,
        status,
        daysLate: diffDays > 0 ? diffDays : 0,
      };
    });
  }, [selectedStudentId, selectedStudent, payments]);

  // Filtrar por ano e status
  const filteredPayments = useMemo(() => {
    let filtered = paymentsWithStatus;

    // Filtro de ano
    if (selectedYear) {
      filtered = filtered.filter((p) =>
        p.referenceMonth.startsWith(selectedYear),
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Ordenar por mês (mais recente primeiro)
    return filtered.sort((a, b) =>
      b.referenceMonth.localeCompare(a.referenceMonth),
    );
  }, [paymentsWithStatus, selectedYear, statusFilter]);

  // Lista de anos disponíveis (sempre inclui o ano atual)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const years = new Set(
      paymentsWithStatus.map((p) => p.referenceMonth.substring(0, 4)),
    );
    // Garantir que o ano atual sempre esteja na lista
    years.add(currentYear);
    return Array.from(years).sort().reverse();
  }, [paymentsWithStatus]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = filteredPayments.length;
    const onTime = filteredPayments.filter((p) => p.status === "em-dia").length;
    const late = filteredPayments.filter((p) => p.status === "atrasado").length;
    const totalValue = total * MONTHLY_VALUE;

    return { total, onTime, late, totalValue };
  }, [filteredPayments]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Histórico de Pagamentos
            </h1>
            <p className="text-muted-foreground">
              Visualize o histórico completo de pagamentos por aluno
            </p>
          </div>
        </div>

        {/* Seleção de Aluno */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Aluno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campo de pesquisa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Digite o nome ou CPF do aluno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />

              {/* Lista de sugestões */}
              {searchQuery.trim() && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredStudents.length > 0 ? (
                    filteredStudents
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setSearchQuery("");
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                        >
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {student.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              CPF: {student.cpf} • Vencimento dia{" "}
                              {student.dueDay}
                            </div>
                          </div>
                        </button>
                      ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nenhum aluno encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Aluno selecionado */}
            {selectedStudent && !searchQuery && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <User className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-blue-900">
                    {selectedStudent.name}
                  </div>
                  <div className="text-sm text-blue-700">
                    CPF: {selectedStudent.cpf} • Vencimento dia{" "}
                    {selectedStudent.dueDay}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStudentId("");
                    setSearchQuery("");
                  }}
                  className="shrink-0 h-8 w-8 p-0 hover:bg-blue-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conteúdo - só exibe se aluno selecionado */}
        {selectedStudent && (
          <>
            {/* Filtros e Estatísticas */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ano</label>
                    <Select
                      value={selectedYear}
                      onValueChange={setSelectedYear}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ano...">
                          {selectedYear}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) =>
                        setStatusFilter(value as "all" | PaymentStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um status...">
                          {statusFilter === "all"
                            ? "Todos"
                            : statusFilter === "em-dia"
                              ? "✅ Em dia"
                              : "⚠️ Atrasado"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="em-dia">✅ Em dia</SelectItem>
                        <SelectItem value="atrasado">⚠️ Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Total de pagamentos:
                    </span>
                    <span className="font-semibold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Pagamentos em dia:
                    </span>
                    <span className="font-semibold text-green-600">
                      {stats.onTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Pagamentos atrasados:
                    </span>
                    <span className="font-semibold text-amber-600">
                      {stats.late}
                    </span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Valor total:</span>
                    <span className="font-bold text-lg">
                      R$ {stats.totalValue.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Histórico */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Histórico de Pagamentos - {selectedStudent.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>
                      Nenhum pagamento encontrado com os filtros selecionados.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => {
                          const [year, month] =
                            payment.referenceMonth.split("-");
                          const monthName = format(
                            new Date(parseInt(year), parseInt(month) - 1),
                            "MMMM 'de' yyyy",
                            { locale: ptBR },
                          );

                          return (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium capitalize">
                                {monthName}
                              </TableCell>
                              <TableCell>
                                R$ {MONTHLY_VALUE.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {format(
                                  parseISO(payment.paymentDate),
                                  "dd/MM/yyyy",
                                )}
                              </TableCell>
                              <TableCell>
                                {payment.status === "em-dia" ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-50 text-green-700 border-green-200"
                                  >
                                    ✅ Em dia
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 border-amber-200"
                                  >
                                    ⚠️ Atrasado{" "}
                                    {payment.daysLate > 0 &&
                                      `(${payment.daysLate}d)`}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Mensagem quando nenhum aluno selecionado */}
        {!selectedStudent && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Selecione um aluno acima
              </h3>
              <p className="text-muted-foreground max-w-md">
                Para visualizar o histórico de pagamentos, primeiro selecione um
                aluno na lista acima.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Send, X, MessageSquare } from "lucide-react";
import type { StudentWithStatus } from "@/types/student";
import { formatPhone, getCurrentDueDate } from "@/utils/billing";
import { differenceInDays } from "date-fns";

interface OverdueStudentsPanelProps {
  students: StudentWithStatus[];
  onSendMessage: (studentId: string, studentName: string) => void;
  onClose: () => void;
}

export function AutoNotificationsPanel({
  students,
  onSendMessage,
  onClose,
}: OverdueStudentsPanelProps) {
  // Filtrar apenas alunos atrasados
  const overdueStudents = students.filter((s) => s.status === "overdue");

  if (overdueStudents.length === 0) return null;

  // Calcular dias de atraso para cada aluno
  const studentsWithDays = overdueStudents.map((student) => {
    const dueDate = getCurrentDueDate(student.dueDay);
    const today = new Date();
    const daysOverdue = differenceInDays(today, dueDate);

    return {
      ...student,
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
    };
  });

  // Ordenar por dias de atraso (mais atrasado primeiro)
  studentsWithDays.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle className="text-lg">
                Alunos Atrasados - Controle de Mensagens
              </CardTitle>
              <CardDescription>
                {overdueStudents.length}{" "}
                {overdueStudents.length === 1
                  ? "aluno está atrasado"
                  : "alunos estão atrasados"}{" "}
                • Use o botão Cobrar para enviar mensagem manual
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Lista de alunos atrasados */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {studentsWithDays.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border border-destructive/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{student.name}</p>
                  <Badge variant="destructive" className="text-xs">
                    {student.daysOverdue}{" "}
                    {student.daysOverdue === 1 ? "dia" : "dias"} atrasado
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatPhone(student.phone)} • Vencimento: dia{" "}
                  {student.dueDay}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 ml-2 flex-shrink-0 border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onSendMessage(student.id, student.name)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Cobrar
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <strong>Dica:</strong> O sistema já enviou mensagens automáticas no
          dia do vencimento e 1 dia após. Use o botão "Cobrar" para enviar
          mensagens manuais adicionais.
        </div>
      </CardContent>
    </Card>
  );
}

import { motion } from "framer-motion";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StudentWithStatus } from "@/types/student";
import { formatCPF, formatPhone, formatDateBR } from "@/utils/billing";
import {
  CreditCard,
  History,
  MessageCircle,
  Phone,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";

interface StudentCardProps {
  student: StudentWithStatus;
  onPayment: (id: string) => void;
  onHistory: (id: string) => void;
  onWhatsApp: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function StudentCard({
  student,
  onPayment,
  onHistory,
  onWhatsApp,
  onEdit,
  onDelete,
}: StudentCardProps) {
  const borderColor = !student.active
    ? "border-l-muted-foreground"
    : student.status === "paid"
      ? "border-l-status-paid"
      : student.status === "overdue"
        ? "border-l-status-overdue"
        : student.status === "due-soon"
          ? "border-l-status-due-soon"
          : "border-l-status-pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={`border-l-4 ${borderColor} hover:shadow-md transition-shadow`}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2">
                <h3 className="font-semibold text-lg truncate font-body">
                  {student.name}
                </h3>
                <div className="flex items-center gap-2">
                  {!student.active ? (
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground"
                    >
                      INATIVO
                    </Badge>
                  ) : (
                    <StatusBadge
                      status={student.status}
                      daysOverdue={student.daysOverdue}
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(student.phone)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Vence dia {student.dueDay} ·{" "}
                  {formatDateBR(student.currentDueDate)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!student.active || student.status === "paid"}
                onClick={() => onPayment(student.id)}
                className="gap-1 bg-status-paid hover:bg-status-paid/90 text-primary-foreground"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Pagar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(student.id)}
                className="gap-1"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onHistory(student.id)}
                className="gap-1"
              >
                <History className="h-3.5 w-3.5" />
                Histórico
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onWhatsApp(student.id)}
                disabled={
                  !student.active ||
                  (student.status !== "overdue" &&
                    student.status !== "due-soon")
                }
                className="gap-1"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Cobrar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(student.id)}
                className="gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

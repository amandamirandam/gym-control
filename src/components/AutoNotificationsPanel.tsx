import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, X } from "lucide-react";
import type { PendingNotification } from "@/hooks/useAutoNotifications";
import { formatPhone } from "@/utils/billing";

interface AutoNotificationsPanelProps {
  notifications: PendingNotification[];
  onSendOne: (studentId: string, type: "reminder" | "due-today") => void;
  onClose: () => void;
}

export function AutoNotificationsPanel({
  notifications,
  onSendOne,
  onClose,
}: AutoNotificationsPanelProps) {
  if (notifications.length === 0) return null;

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">
                Mensagens Automáticas Pendentes
              </CardTitle>
              <CardDescription>
                {notifications.length}{" "}
                {notifications.length === 1
                  ? "aluno precisa"
                  : "alunos precisam"}{" "}
                receber mensagem hoje
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Lista de notificações */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {notifications.map((notif) => (
            <div
              key={notif.student.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{notif.student.name}</p>
                  <Badge
                    variant={
                      notif.type === "reminder" ? "secondary" : "default"
                    }
                  >
                    {notif.type === "reminder" ? "Vence amanhã" : "Vence hoje"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatPhone(notif.student.phone)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 ml-2 flex-shrink-0"
                onClick={() => onSendOne(notif.student.id, notif.type)}
              >
                <Send className="h-3.5 w-3.5" />
                Enviar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

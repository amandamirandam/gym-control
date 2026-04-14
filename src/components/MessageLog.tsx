import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WhatsAppMessage } from "@/types/student";
import { X, MessageCircle } from "lucide-react";

interface MessageLogProps {
  messages: WhatsAppMessage[];
  onClose: () => void;
}

export function MessageLog({ messages, onClose }: MessageLogProps) {
  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl tracking-wider">MENSAGENS ENVIADAS</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma mensagem enviada</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.slice(0, 50).map(m => (
              <div key={m.id} className="rounded-lg bg-secondary/50 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">{m.studentName}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.sentAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

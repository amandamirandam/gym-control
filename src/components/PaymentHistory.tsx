import { useState } from "react";
import type { Payment } from "@/types/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDateBR } from "@/utils/billing";
import { X, Receipt, Pencil } from "lucide-react";

interface PaymentHistoryProps {
  studentName: string;
  payments: Payment[];
  onClose: () => void;
  onEditPayment?: (paymentId: string, newDate: string) => void;
}

export function PaymentHistory({ studentName, payments, onClose, onEditPayment }: PaymentHistoryProps) {
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editDate, setEditDate] = useState("");

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setEditDate(payment.paymentDate);
  };

  const confirmEdit = () => {
    if (!editingPayment || !editDate || !onEditPayment) return;
    onEditPayment(editingPayment.id, editDate);
    setEditingPayment(null);
  };

  return (
    <>
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-2xl tracking-wider">HISTÓRICO</CardTitle>
            <p className="text-sm text-muted-foreground font-body">{studentName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">Nenhum pagamento registrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map(p => {
                const [year, month] = p.referenceMonth.split("-");
                const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                const monthLabel = `${monthNames[parseInt(month) - 1]}/${year}`;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">Ref: {monthLabel}</p>
                      <p className="text-xs text-muted-foreground">Pago em {formatDateBR(p.paymentDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-paid-bg px-2.5 py-0.5 text-xs font-semibold text-status-paid">
                        <span className="h-1.5 w-1.5 rounded-full bg-status-paid" />
                        Pago
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl tracking-wider">EDITAR DATA DE PAGAMENTO</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="editPayDate">Nova data de pagamento</Label>
              <Input id="editPayDate" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancelar</Button>
            <Button onClick={confirmEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect } from "react";
import { formatCPF, formatPhone } from "@/utils/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { StudentWithStatus } from "@/types/student";

interface EditStudentDialogProps {
  student: StudentWithStatus | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: { name: string; cpf: string; phone: string; startDate: string; dueDay: number }) => void;
}

export function EditStudentDialog({ student, open, onClose, onSave }: EditStudentDialogProps) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (student) {
      setName(student.name);
      setCpf(student.cpf);
      setPhone(student.phone);
      setStartDate(student.startDate);
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !name || !cpf || !phone || !startDate) return;
    const dueDay = new Date(startDate + "T12:00:00").getDate();
    onSave(student.id, { name, cpf: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, ""), startDate, dueDay });
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl tracking-wider">EDITAR ALUNO</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome completo</Label>
            <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-cpf">CPF</Label>
              <Input id="edit-cpf" value={formatCPF(cpf)} onChange={e => setCpf(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">WhatsApp</Label>
              <Input id="edit-phone" value={formatPhone(phone)} onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-startDate">Data de início</Label>
            <Input id="edit-startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            {startDate && (
              <p className="text-xs text-muted-foreground">
                Vencimento todo dia {new Date(startDate + "T12:00:00").getDate()} de cada mês
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

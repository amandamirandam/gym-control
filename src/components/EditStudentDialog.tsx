import { useState, useEffect } from "react";
import { formatCPF, formatPhone } from "@/utils/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { StudentWithStatus } from "@/types/student";

interface EditStudentDialogProps {
  student: StudentWithStatus | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    data: {
      name: string;
      cpf: string;
      phone: string;
      startDate: string;
      dueDay: number;
      active: boolean;
    },
  ) => Promise<void> | void;
}

export function EditStudentDialog({
  student,
  open,
  onClose,
  onSave,
}: EditStudentDialogProps) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [active, setActive] = useState(true);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setName(student.name);
      setCpf(student.cpf);
      setPhone(student.phone);
      setStartDate(student.startDate);
      setActive(student.active);
    }
  }, [student]);

  const handleActiveToggle = (newActiveState: boolean) => {
    if (!student) return;

    if (newActiveState && !student.active) {
      // Ativando aluno que estava inativo
      setShowActivateDialog(true);
    } else if (!newActiveState && student.active) {
      // Inativando aluno que estava ativo
      setShowDeactivateDialog(true);
    }
  };

  const confirmActivate = () => {
    setActive(true);
    setShowActivateDialog(false);
  };

  const confirmDeactivate = () => {
    setActive(false);
    setShowDeactivateDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!student || !name || !cpf || !phone || !startDate) return;

    setIsSubmitting(true);

    try {
      const dueDay = new Date(startDate + "T12:00:00").getDate();

      // Limpar formatação do telefone (remover parênteses, espaços, traços)
      const cleanPhone = phone.replace(/\D/g, "").slice(0, 11);

      await onSave(student.id, {
        name,
        cpf: cpf.replace(/\D/g, "").slice(0, 11),
        phone: cleanPhone,
        startDate,
        dueDay,
        active,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl tracking-wider">
              EDITAR ALUNO
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Status do Aluno</Label>
                <p className="text-sm text-muted-foreground">
                  {active ? "Aluno ativo" : "Aluno inativo"}
                </p>
              </div>
              <Switch
                checked={active}
                onCheckedChange={handleActiveToggle}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-cpf">CPF</Label>
                <Input
                  id="edit-cpf"
                  value={formatCPF(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">WhatsApp</Label>
                <Input
                  id="edit-phone"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Data de início</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting || !active}
                required
              />
              {startDate && (
                <p className="text-xs text-muted-foreground">
                  Vencimento todo dia{" "}
                  {new Date(startDate + "T12:00:00").getDate()} de cada mês
                </p>
              )}
              {!active && (
                <p className="text-xs text-amber-600">
                  ⚠️ Ative o aluno para alterar a data de início
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar Aluno</AlertDialogTitle>
            <AlertDialogDescription>
              Ao ativar o aluno, uma nova data de início pode ser definida.
              <br />
              <br />
              <strong>
                Certifique-se de atualizar a "Data de início" antes de salvar!
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActive(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivate}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Inativar Aluno</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-destructive">ATENÇÃO:</strong> Ao inativar
              o aluno,{" "}
              <strong>
                TODO o histórico de pagamentos será excluído permanentemente!
              </strong>
              <br />
              <br />
              Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActive(true)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

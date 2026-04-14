import { useState } from "react";
import { formatCPF, formatPhone } from "@/utils/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, X } from "lucide-react";

interface StudentFormProps {
  onSubmit: (student: { name: string; cpf: string; phone: string; startDate: string; dueDay: number }) => void;
  onCancel: () => void;
}

export function StudentForm({ onSubmit, onCancel }: StudentFormProps) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cpf || !phone || !startDate) return;
    const dueDay = new Date(startDate + "T12:00:00").getDate();
    onSubmit({ name, cpf: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, ""), startDate, dueDay });
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl tracking-wider">NOVO ALUNO</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="João da Silva" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="000.000.000-00" value={formatCPF(cpf)} onChange={e => setCpf(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input id="phone" placeholder="(00) 00000-0000" value={formatPhone(phone)} onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de início</Label>
            <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            {startDate && (
              <p className="text-xs text-muted-foreground">
                Vencimento todo dia {new Date(startDate + "T12:00:00").getDate()} de cada mês
              </p>
            )}
          </div>
          <Button type="submit" className="w-full gap-2">
            <UserPlus className="h-4 w-4" />
            Cadastrar Aluno
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

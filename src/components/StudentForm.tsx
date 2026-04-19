import { useState } from "react";
import { formatCPF, formatPhone } from "@/utils/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus, X, AlertCircle } from "lucide-react";

interface StudentFormProps {
  onSubmit: (student: {
    name: string;
    cpf: string;
    phone: string;
    startDate: string;
    dueDay: number;
  }) => Promise<void> | void;
  onCancel: () => void;
}

export function StudentForm({ onSubmit, onCancel }: StudentFormProps) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError(null); // Limpar erro anterior

    console.log("🔵 handleSubmit chamado", { name, cpf, phone, startDate });
    if (!name || !cpf || !phone || !startDate) {
      console.warn("Campos vazios", {
        name: !!name,
        cpf: !!cpf,
        phone: !!phone,
        startDate: !!startDate,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const dueDay = new Date(startDate + "T12:00:00").getDate();

      // Limpar formatação do telefone (remover parênteses, espaços, traços)
      const cleanPhone = phone.replace(/\D/g, "").slice(0, 11);
      console.log(
        "📞 Telefone limpo:",
        cleanPhone,
        "Tamanho:",
        cleanPhone.length,
      );

      console.log("Enviando dados:", {
        name,
        cpf: cpf.replace(/\D/g, "").slice(0, 11),
        phone: cleanPhone,
        startDate,
        dueDay,
      });

      await onSubmit({
        name,
        cpf: cpf.replace(/\D/g, "").slice(0, 11),
        phone: cleanPhone,
        startDate,
        dueDay,
      });
    } catch (err) {
      // Capturar erro localmente e exibir no formulário
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao cadastrar";
      setError(errorMessage);
      console.error("Erro capturado no formulário:", errorMessage);
      // Não re-throw - mantém formulário aberto para correção
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl tracking-wider">NOVO ALUNO</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              placeholder="João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={formatCPF(cpf)}
                onChange={(e) => {
                  setCpf(e.target.value);
                  if (error) setError(null); // Limpar erro ao editar
                }}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={formatPhone(phone)}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de início</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSubmitting}
              required
            />
            {startDate && (
              <p className="text-xs text-muted-foreground">
                Vencimento todo dia{" "}
                {new Date(startDate + "T12:00:00").getDate()} de cada mês
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? "Cadastrando..." : "Cadastrar Aluno"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

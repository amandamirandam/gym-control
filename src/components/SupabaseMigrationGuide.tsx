import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Loader2, Copy } from "lucide-react";
import {
  migrateLocalStorageToSupabase,
  exportDataFromSupabase,
  clearSupabaseData,
} from "@/utils/migrate";
import { toast } from "@/hooks/use-toast";

export function SupabaseMigrationGuide() {
  const [migrating, setMigrating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleMigrate = async () => {
    if (
      !window.confirm(
        "Deseja migrar todos os dados do localStorage para Supabase?",
      )
    ) {
      return;
    }

    setMigrating(true);
    try {
      const result = await migrateLocalStorageToSupabase();
      toast({
        title: "Migração concluída!",
        description: `${result.migrated.students} alunos, ${result.migrated.payments} pagamentos, ${result.migrated.messages} mensagens`,
      });
    } catch (error) {
      toast({
        title: "Erro na migração",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDataFromSupabase();
      toast({
        title: "Backup exportado!",
        description: "O arquivo foi baixado para seu computador",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const sqlTableStudents = `CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  start_date TEXT NOT NULL,
  due_day INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`;

  const sqlTablePayments = `CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_date TEXT NOT NULL,
  reference_month VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`;

  const sqlTableMessages = `CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  type VARCHAR(20) NOT NULL
);`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🗄️ Configuração Supabase</CardTitle>
          <CardDescription>
            Migre seus dados do localStorage para o Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="sql">SQL</TabsTrigger>
              <TabsTrigger value="migrate">Migração</TabsTrigger>
              <TabsTrigger value="tools">Ferramentas</TabsTrigger>
            </TabsList>

            {/* Tab: Setup */}
            <TabsContent value="setup" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Você precisa ter uma conta Supabase antes de continuar
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">1. Criar Conta</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Visite{" "}
                    <code className="bg-muted px-2 py-1 rounded">
                      https://app.supabase.com
                    </code>
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href="https://app.supabase.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ir para Supabase →
                    </a>
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">2. Copiar Credenciais</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Settings → API → Copie PROJECT URL e ANON KEY
                  </p>
                  <div className="space-y-2 text-sm font-mono bg-muted p-2 rounded">
                    <div>VITE_SUPABASE_URL=sua_url_aqui</div>
                    <div>VITE_SUPABASE_ANON_KEY=sua_chave_aqui</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">
                    3. Preencher .env.local
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Edite o arquivo{" "}
                    <code className="bg-muted px-2 py-1 rounded">
                      .env.local
                    </code>{" "}
                    na raiz do projeto
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab: SQL */}
            <TabsContent value="sql" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Execute essas queries no SQL Editor do Supabase
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Tabela: students</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(sqlTableStudents);
                        toast({ title: "Copiado!" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {sqlTableStudents}
                  </pre>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Tabela: payments</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(sqlTablePayments);
                        toast({ title: "Copiado!" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {sqlTablePayments}
                  </pre>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Tabela: messages</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(sqlTableMessages);
                        toast({ title: "Copiado!" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {sqlTableMessages}
                  </pre>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Migração */}
            <TabsContent value="migrate" className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Migre seus dados do localStorage para Supabase
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleMigrate}
                disabled={migrating}
                className="w-full gap-2"
                size="lg"
              >
                {migrating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  "Iniciar Migração"
                )}
              </Button>

              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm">
                  ✅ Todos os alunos, pagamentos e mensagens serão transferidos
                  para o Supabase
                </p>
              </div>
            </TabsContent>

            {/* Tab: Ferramentas */}
            <TabsContent value="tools" className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    "📥 Exportar Backup"
                  )}
                </Button>

                <Button
                  onClick={() => clearSupabaseData()}
                  variant="destructive"
                  className="w-full"
                >
                  🗑️ Limpar Todos os Dados (CUIDADO!)
                </Button>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Sempre faça um backup antes de limpar dados!
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

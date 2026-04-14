# 🗄️ Configuração do Supabase

## 1️⃣ Criar Conta no Supabase

1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Faça login com GitHub ou email
3. Clique em "New project"
4. Preencha os dados:
   - **Project Name**: `gym-control` (ou outro nome)
   - **Database Password**: Escolha uma senha forte
   - **Region**: Escolha a mais próxima (ex: `us-east-1`)
5. Clique em "Create new project" e aguarde

## 2️⃣ Pegue as Credenciais

1. Vá para **Settings → API** no Supabase
2. Copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` (debaixo de Project API keys) → `VITE_SUPABASE_ANON_KEY`
3. Abra o arquivo `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=suas-chave-aqui
```

## 3️⃣ Criar as Tabelas no Supabase

### Tabela: `students`

No Supabase, vá em **SQL Editor** e execute:

```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  start_date TEXT NOT NULL,
  due_day INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_students_cpf ON students(cpf);
CREATE INDEX idx_students_phone ON students(phone);
```

### Tabela: `payments`

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_date TEXT NOT NULL,
  reference_month VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_reference_month ON payments(reference_month);
```

### Tabela: `messages`

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  type VARCHAR(20) NOT NULL
);

-- Índices
CREATE INDEX idx_messages_student_id ON messages(student_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
```

## 4️⃣ Configurar RLS (Row Level Security) - Opcional mas Recomendado

Para permitir acesso aos dados (ainda sem autenticação):

No **SQL Editor**, execute:

```sql
-- Desabilitar RLS para testes (ou configurar policies depois)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

**Nota**: Em produção, configure policies de segurança adequadas.

## 5️⃣ Usar o Supabase no Código

### Opção A: Substituir Completamente localStorage

Edite `/src/pages/Index.tsx`:

```typescript
// Antes:
import { useStudents } from "@/hooks/useStudents";

// Depois:
import { useStudents } from "@/hooks/useStudentsSupabase";
```

### Opção B: Usar Fallback (localStorage se falhar)

Se quiser manter localStorage como backup, você pode criar um hook híbrido.

## 6️⃣ Testar a Conexão

1. Abra o navegador e vá para `http://localhost:5173`
2. Verifique o console (F12) para erros
3. Tente adicionar um aluno
4. Volte no Supabase e vá em **Table Editor**
5. Clique em `students` e veja se apareceu

## ✅ Checklist

- [ ] Conta Supabase criada
- [ ] Projeto criado e ativo
- [ ] URL e Chave copiadas
- [ ] `.env.local` preenchido
- [ ] Tabelas criadas via SQL
- [ ] RLS desabilitado (ou policies configuradas)
- [ ] Hook do Supabase importado no Index
- [ ] Testou adicionar um aluno
- [ ] Dados aparecem no Supabase

## 🐛 Troubleshooting

### Erro: "Missing Supabase credentials"

- ✅ Verifique se `.env.local` existe
- ✅ Reinicie o servidor (`npm run dev`)

### Erro: "relation 'students' does not exist"

- ✅ Você criou as tabelas? Verifique no SQL Editor
- ✅ Está na região correta?

### Dados não sincronizam

- ✅ Verifique as credenciais no `.env.local`
- ✅ Abra a query no Network tab (F12) para ver erros
- ✅ Verifique RLS policies

### Performance lenta

- ✅ Adicione mais índices SQL
- ✅ Use paginação para grandes volumes

## 📚 Documentação Oficial

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Guia Rápido](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

## 🚀 Próximos Passos

1. **Backup**: Exporte dados do localStorage e importe no Supabase
2. **Autenticação**: Adicione login de usuários
3. **RLS**: Configure Row Level Security para dados privados
4. **Backup Automático**: Configure backups no Supabase
5. **Produção**: Use Supabase em produção (domínio próprio)

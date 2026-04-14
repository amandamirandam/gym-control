# 🚀 Quick Start - Supabase

## ⚡ Configuração em 5 minutos

### 1️⃣ Instalar Dependência (Já Feito!)

```bash
npm install @supabase/supabase-js --legacy-peer-deps
```

### 2️⃣ Criar Projeto Supabase

Vá em https://app.supabase.com

- Clique "New project"
- Nome: `gym-control`
- Escolha password e região

### 3️⃣ Copiar Credenciais

Settings → API

- Copie `Project URL`
- Copie `anon public` (em Project API keys)

### 4️⃣ Completar .env.local

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### 5️⃣ Criar Tabelas

Vá em **SQL Editor** no Supabase e execute este script:

```sql
-- Tabela students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  start_date TEXT NOT NULL,
  due_day INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  payment_date TEXT NOT NULL,
  reference_month VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  type VARCHAR(20) NOT NULL
);

-- Desabilitar RLS para acesso simples (depois configure policies)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

### 6️⃣ Usar no Código

Edite `/src/pages/Index.tsx`:

**Antes:**

```typescript
import { useStudents } from "@/hooks/useStudents";
```

**Depois:**

```typescript
import { useStudents } from "@/hooks/useStudentsSupabase";
```

### 7️⃣ Migrar Dados Existentes

No navegador, abra o console e execute:

```javascript
import { migrateLocalStorageToSupabase } from "@/utils/migrate";
await migrateLocalStorageToSupabase();
```

Ou use a Interface Visual em: `/components/SupabaseMigrationGuide.tsx`

## ✅ Pronto!

Seu sistema agora está usando Supabase! 🎉

## 📁 Arquivos Criados

- ✅ `src/lib/supabase.ts` - Configuração do cliente
- ✅ `src/hooks/useStudentsSupabase.ts` - Hook com Supabase
- ✅ `src/utils/migrate.ts` - Funções de migração
- ✅ `.env.local` - Variáveis de ambiente
- ✅ `src/components/SupabaseMigrationGuide.tsx` - Interface de setup
- ✅ `SETUP_SUPABASE.md` - Documentação completa

## 🔧 Estrutura

```
src/
├── lib/
│   └── supabase.ts          ← Inicializa cliente Supabase
├── hooks/
│   ├── useStudents.ts       ← Antigo (localStorage)
│   └── useStudentsSupabase.ts ← Novo (Supabase)
└── utils/
    └── migrate.ts           ← Funções de migração
```

## 🐛 Erros Comuns

| Erro                                 | Solução                 |
| ------------------------------------ | ----------------------- |
| "Missing Supabase credentials"       | Preencha `.env.local`   |
| "relation 'students' does not exist" | Crie as tabelas via SQL |
| Dados não sincronizam                | Verifique RLS policies  |

## 📞 Suporte

- [Docs Supabase](https://supabase.com/docs)
- [Guia Setup](./SETUP_SUPABASE.md)

---

**Status**: ✅ Pronto para usar!

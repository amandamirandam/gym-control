# GymControl

Sistema de controle de academia - Gerenciamento de alunos, pagamentos e notificações automáticas via WhatsApp.

## Funcionalidades

- ✅ Cadastro e gerenciamento de alunos
- ✅ Registro de pagamentos com atualização automática de vencimentos
- ✅ Notificações automáticas de cobrança via WhatsApp
- ✅ Histórico de pagamentos por aluno
- ✅ Filtros por status (pago, vencendo, atrasado)
- ✅ Dashboard com estatísticas em tempo real

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **UI**: Shadcn/ui + Tailwind CSS
- **Styling**: Tailwind CSS + Framer Motion

## Sistema de Notificações (W-API)

Sistema de notificações automáticas via WhatsApp usando **W-API**.

### Tipos de Mensagem

**IMPORTANTE:** Sistema **NÃO envia mensagens antes do vencimento**

1. **Aviso** - No dia do vencimento (Envio Automático) ✅
2. **Cobrança** - 1 dia após vencimento (Envio Automático) ⚠️
3. **Manual** - Botão "Cobrar" na interface (Envio Manual) 🔘

### Regras de Negócio - Envio de Mensagens

**IMPORTANTE:** Sistema **NÃO envia mensagens antes do vencimento**

O sistema calcula automaticamente o status de cada aluno e determina se deve enviar notificação:

#### Cálculo de Status

**Status: VENCENDO (Dia do Vencimento)**

- **Condição**: Hoje é o dia do vencimento E não pagou este mês
- **Exemplo**: Vencimento dia 15, hoje é dia 15, sem pagamento em abril
- **Ação**: Sistema envia mensagem de aviso automaticamente
- **Tipo**: `due-today`

**Status: ATRASADO (1 dia após vencimento)**

- **Condição**: Vencimento foi ontem (1 dia atrás) E não pagou este mês
- **Exemplo**: Vencimento dia 15, hoje é dia 16, sem pagamento em abril
- **Ação**: Sistema envia mensagem de cobrança automaticamente
- **Tipo**: `overdue`

**Status: PAGO**

- **Condição**: Existe pagamento registrado no mês atual
- **Exemplo**: Pagamento feito em 10 de abril
- **Ação**: Sistema **NÃO envia** mensagem este mês
- **Cálculo**: Usa data de vencimento do **próximo mês** (ex: 15 de maio)

#### Lógica de Cálculo por Mês

```javascript
function calcularVencimento(diaDoPagamento, pagouEsteMes) {
  if (pagouEsteMes) {
    // JÁ PAGOU → próximo vencimento é no mês seguinte
    return proximoMes(diaDoPagamento);
  } else {
    // NÃO PAGOU → vencimento é no mês atual (pode estar atrasado)
    return mesAtual(diaDoPagamento);
  }
}
```

#### Exemplo Prático (Mês Atual: Abril/2026)

| Aluno   | Dia Venc. | Pagou Abril? | Hoje   | Status   | Envia Msg?         |
| ------- | --------- | ------------ | ------ | -------- | ------------------ |
| Amanda  | 15        | ❌ Não       | Dia 15 | Vencendo | ✅ Sim (aviso)     |
| Bruno   | 15        | ❌ Não       | Dia 16 | Atrasado | ✅ Sim (cobrança)  |
| Gabriel | 15        | ❌ Não       | Dia 17 | Atrasado | ❌ Não (já enviou) |
| Natan   | 20        | ❌ Não       | Dia 16 | A vencer | ❌ Não (antes)     |
| Carlos  | 10        | ✅ Sim       | Dia 16 | Pago     | ❌ Não             |

#### Cron Job - Envio Automático

O sistema roda **diariamente às 09:00** e:

1. Busca todos os alunos no banco de dados
2. Verifica se existe pagamento no mês atual para cada aluno
3. Calcula a data de vencimento baseado na regra acima
4. Determina o tipo de notificação:
   - ❌ **ANTES do vencimento** → NÃO envia
   - ✅ **No dia do vencimento** → Envia mensagem de aviso (`due-today`)
   - ✅ **1 dia após vencimento** → Envia mensagem de cobrança (`overdue`)
   - ❌ **2+ dias atrasado** → NÃO envia (já enviou as 2 mensagens)
5. Verifica se mensagem **deste tipo específico** já foi enviada este mês
6. Envia via W-API apenas para alunos que precisam

#### 🚫 Prevenção de Duplicatas

**Regra:** Cada aluno recebe **EXATAMENTE 2 mensagens por mês** (máximo)

- ✅ Sistema registra mensagens na tabela `whatsapp_messages` com o `type`
- ✅ Bloqueia **repetições do mesmo tipo** no mesmo mês
- ✅ Permite **tipos diferentes** para o mesmo aluno (max 2)
- ✅ Alunos que pagam param de receber mensagens automaticamente
- ❌ **NÃO envia antes** do vencimento
- ❌ **NÃO envia mais** após 1 dia de atraso

**Exemplo de fluxo correto:**

```
📅 Dia 14 (antes do vencimento):
  → Não envia nada ❌ (sistema não envia antes)

📅 Dia 15 (dia do vencimento):
  → Envia "due-today" para Amanda ✅
  → Registra no banco: type = "due-today"

📅 Dia 16 (1 dia atrasado):
  → Verifica: já enviou "overdue"? NÃO
  → Envia "overdue" para Amanda ✅
  → Registra no banco: type = "overdue"

📅 Dia 17 (2 dias atrasado):
  → Verifica: já enviou "overdue"? SIM
  → NÃO envia (bloqueado) ✋

📅 Próximo mês (maio):
  → Contador reseta
  → Volta a enviar normalmente (dia 15 = vence, dia 16 = atrasado)
```

📅 Dia 16 (2 dias atrasado):
→ Verifica: já enviou "overdue"? SIM
→ NÃO envia (bloqueado)
→ So envia manualmente pelo botao ('COBRAR') na tela

📅 Próximo mês (maio):
→ Contador reseta
→ Volta a enviar normalmente

# GymControl

Sistema de controle de academia - Gerenciamento de alunos, pagamentos e notificações automáticas via WhatsApp.

## Funcionalidades

- ✅ Cadastro e gerenciamento de alunos
- ✅ Registro de pagamentos com atualização automática de vencimentos
- ✅ Notificações automáticas de cobrança via WhatsApp
- ✅ Histórico de pagamentos por aluno
- ✅ Filtros por status (pago, vencendo, atrasado)
- ✅ Dashboard com estatísticas em tempo real

## Gestão de Histórico de Pagamentos

O sistema mantém **apenas 12 meses de histórico** por aluno (rolling 12 months):

### Política de Armazenamento

- ✅ **Máximo**: 12 registros de pagamento por aluno (um por mês)
- 🔄 **Sobrescrita automática**: Ao pagar um mês, sobrescreve o mesmo mês do ano anterior
- 📅 **Exemplo prático**:
  - Janeiro 2026 → armazenado
  - Janeiro 2027 → **sobrescreve** Janeiro 2026
  - Fevereiro 2027 → **sobrescreve** Fevereiro 2026

### Como Funciona

```javascript
// Quando aluno paga mensalidade:
1. Sistema verifica se já existe pagamento para aquele mês (ex: "janeiro")
2. Se SIM → UPDATE (sobrescreve registro do ano anterior)
3. Se NÃO → INSERT (cria novo registro)

// Exemplo Timeline:
Abr/2026 → Mai/2026 → Jun/2026 → ... → Jan/2027 → Fev/2027
                                         ↓           ↓
                                   substitui    substitui
                                   Jan/2026     Fev/2026
```

### Benefícios

- ✅ **Performance**: Banco de dados leve (máximo 12 registros/aluno)
- ✅ **Simplicidade**: Lógica de consulta mais rápida
- ✅ **Custo**: Reduz armazenamento em Supabase (plano free tem limite)
- ℹ️ **Histórico útil**: 12 meses são suficientes para análise de inadimplência

### Consulta de Histórico

Na tela **Histórico de Pagamentos**:

- Mostra até 12 meses por aluno
- Filtros por ano e status
- Status calculado: "Em dia" ou "Atrasado"
- Busca por nome/CPF com autocomplete

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

---

## 🚀 Deploy no Render

Este projeto está configurado para deploy no [Render.com](https://render.com) com suporte completo a **backend (Express) e frontend (React/Vite)**.

### Arquitetura no Render

- **Backend**: Web Service rodando Express com cron job integrado
- **Frontend**: Static Site com React/Vite
- **Cron Job**: Execução automática diária às 09:00 (via node-cron no backend)

### Deploy Rápido

1. **Crie uma conta no [Render](https://render.com)**

2. **Conecte seu repositório Git**

3. **Use Blueprint (Recomendado)**:
   - O projeto inclui `render.yaml` para deploy automático
   - No Dashboard do Render: **New** → **Blueprint**
   - Selecione o repositório
   - Configure as variáveis de ambiente
   - Clique em **Apply**

4. **Configurar variáveis de ambiente**:

**Backend (gym-control-server)**:
  - `WAPI_INSTANCE_ID`
  - `WAPI_TOKEN`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`

**Frontend (gym-control-frontend)**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### URLs dos Serviços

- **Frontend**: `https://gym-control-frontend.onrender.com`
- **Backend**: `https://gym-control-server.onrender.com`
- **Health Check**: `https://gym-control-server.onrender.com/health`

### Documentação Completa

Para instruções detalhadas, consulte: **[DEPLOY-RENDER.md](./DEPLOY-RENDER.md)**

Inclui:
- ✅ Passo a passo detalhado
- ✅ Configuração de variáveis de ambiente
- ✅ Deploy manual vs automático
- ✅ Troubleshooting
- ✅ Monitoramento e logs

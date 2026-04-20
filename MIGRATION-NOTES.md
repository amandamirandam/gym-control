# Migração Vercel → Render - Resumo

## ✅ Arquivos Criados

1. **`render.yaml`** - Blueprint para deploy automático no Render
   - Configura backend (Express) e frontend (React/Vite)
   - Define variáveis de ambiente necessárias
   - Configura health check e rotas

2. **`DEPLOY-RENDER.md`** - Documentação completa de deploy
   - Guia passo a passo
   - Configuração de variáveis
   - Troubleshooting
   - Dicas e boas práticas

3. **`.env.render.example`** - Template de variáveis de ambiente
   - Lista todas as variáveis necessárias
   - Comentários explicativos
   - Instruções de segurança

## 📝 Arquivos Modificados

1. **`server/package.json`**
   - Adicionado script `build` para compatibilidade

2. **`README.md`**
   - Substituída seção "Deploy na Vercel" por "Deploy no Render"
   - Atualizada documentação de deploy
   - Referência ao guia completo (DEPLOY-RENDER.md)

## 🗑️ Arquivos Obsoletos (pode remover)

- **`vercel.json`** - Não é mais necessário
- **`api/send-messages.ts`** - Serverless function específica do Vercel
- **`api/whatsapp/send.ts`** - Função específica do Vercel

> **Nota**: Esses arquivos não foram removidos para manter histórico. Você pode deletá-los manualmente quando confirmar que o deploy no Render está funcionando.

## 🎯 Próximos Passos

### 1. Remover Dependências do Vercel (Opcional)

```bash
npm uninstall @vercel/node
```

### 2. Commitar as Mudanças

```bash
git add .
git commit -m "feat: migração do Vercel para Render.com"
git push origin main
```

### 3. Fazer Deploy no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **New** → **Blueprint**
3. Conecte o repositório GitHub
4. Configure as variáveis de ambiente (ver `.env.render.example`)
5. Clique em **Apply**

### 4. Configurar Variáveis de Ambiente

No Dashboard do Render, configure:

**Backend**:

- `WAPI_INSTANCE_ID`
- `WAPI_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

**Frontend**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 5. Testar o Deploy

- **Health Check**: `https://gym-control-server.onrender.com/health`
- **Frontend**: `https://gym-control-frontend.onrender.com`

## 🔍 Diferenças Principais

| Aspecto          | Vercel                 | Render                                |
| ---------------- | ---------------------- | ------------------------------------- |
| **Frontend**     | Static Site            | Static Site                           |
| **Backend**      | Serverless Functions   | Web Service (Express)                 |
| **Cron Jobs**    | Requer serviço externo | Integrado (node-cron)                 |
| **Plano Free**   | Sim, com limites       | Sim, com sleep após 15min inatividade |
| **Configuração** | vercel.json            | render.yaml                           |
| **Deploy**       | CLI ou Git push        | Blueprint ou manual                   |

## 💡 Vantagens do Render

✅ **Cron job integrado** - Não precisa de serviço externo
✅ **Backend persistente** - Express sempre rodando
✅ **WebSocket suporte** - Se precisar no futuro
✅ **SSH para debug** - Acesso direto ao container
✅ **Logs centralizados** - Dashboard unificado

## ⚠️ Considerações

1. **Sleep mode**: Render Free dorme após 15min de inatividade
   - Configure UptimeRobot ou similar para ping a cada 10min
2. **Cold start**: Primeira requisição após sleep pode demorar ~30s
   - Normal em plano gratuito

3. **Banco de dados**: Continua no Supabase (não muda nada)

4. **WhatsApp API**: Continua usando W-API (funciona igual)

## 📚 Recursos

- [Documentação Render](https://render.com/docs)
- [Render vs Vercel](https://render.com/render-vs-vercel-comparison)
- [Guia Blueprint](https://render.com/docs/blueprint-spec)

---

**Data da migração**: Abril 2026  
**Status**: ✅ Pronto para deploy

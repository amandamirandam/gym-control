import express from "express";
import { sendNotifications } from "../services/notificationService.js";

const router = express.Router();

// Rate limiting simples em memória (para wake-up e send-notifications)
// Previne múltiplas chamadas simultâneas durante cold start
const rateLimitMap = new Map();

function checkRateLimit(ip, endpoint, windowMs = 60000, maxRequests = 5) {
  const key = `${ip}-${endpoint}`;
  const now = Date.now();

  // Limpar registros antigos
  if (rateLimitMap.size > 1000) {
    rateLimitMap.clear();
  }

  let record = rateLimitMap.get(key);

  if (!record) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Reset se a janela expirou
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Incrementar contador
  record.count++;
  rateLimitMap.set(key, record);

  const remaining = Math.max(0, maxRequests - record.count);
  const allowed = record.count <= maxRequests;

  return { allowed, remaining, resetTime: record.resetTime };
}

// Handler compartilhado para GET e POST
const sendNotificationsHandler = async (req, res) => {
  const requestTime = new Date().toISOString();
  const requestIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  console.log(`\n⏰ [${requestTime}] Send-notifications chamado`);
  console.log(`   Método: ${req.method}`);
  console.log(`   IP: ${requestIp}`);

  // Rate limiting: máximo 2 requisições por 5 minutos por IP
  const rateLimit = checkRateLimit(requestIp, "send-notifications", 300000, 2);

  res.set({
    "X-RateLimit-Limit": "2",
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.resetTime
      ? new Date(rateLimit.resetTime).toISOString()
      : "",
  });

  if (!rateLimit.allowed) {
    console.log(`   ⚠️  RATE LIMIT excedido (${requestIp})`);
    console.log(
      `   📋 Aguarde até: ${new Date(rateLimit.resetTime).toISOString()}\n`,
    );
    return res.status(429).json({
      success: false,
      message: "Too Many Requests - aguarde 5 minutos",
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
    });
  }

  try {
    // Validar token de segurança (aceita header ou query param)
    const authHeader = req.headers.authorization;
    const tokenQuery = req.query.token; // Para cron-job.org via GET
    const cronSecret = process.env.CRON_SECRET || "change-me-in-production";

    // Extrair token do header "Bearer TOKEN" ou diretamente da query
    const providedToken = authHeader?.replace("Bearer ", "") || tokenQuery;

    if (!providedToken || providedToken !== cronSecret) {
      console.log(`   ❌ Autenticação falhou - token inválido\n`);
      return res.status(401).json({
        success: false,
        message: "Não autorizado - token inválido",
      });
    }

    console.log(`   ✅ Token validado`);
    console.log(`   🚀 Iniciando envio de notificações...\n`);

    // Executar envio de notificações
    const result = await sendNotifications();

    console.log(`\n   ✓ Notificações processadas`);
    console.log(
      `   📊 Stats: ${result.success || 0}/${result.total || 0} enviadas\n`,
    );

    res.json({
      success: true,
      message: "Notificações processadas com sucesso",
      timestamp: requestTime,
      stats: result || { total: 0, success: 0, failures: 0 },
    });
  } catch (error) {
    console.error(`   ❌ ERRO no cron job: ${error.message}\n`);
    res.status(500).json({
      success: false,
      message: "Erro ao processar notificações",
      error: error.message,
    });
  }
};

/**
 * GET/POST /api/cron/send-notifications
 * Endpoint para ser chamado por serviços externos de cron (cron-job.org, GitHub Actions, etc)
 * Protegido por token secreto
 *
 * Autenticação via:
 * - Header: Authorization: Bearer SEU_TOKEN
 * - Query: ?token=SEU_TOKEN
 */
router.get("/send-notifications", sendNotificationsHandler);
router.post("/send-notifications", sendNotificationsHandler);

/**
 * GET /api/cron/wake-up
 * Endpoint de "aquecimento" para acordar o servidor antes da execução do cron principal
 * Render gratuito hiberna após 15min de inatividade - este endpoint prepara o servidor
 *
 * Estratégia recomendada no cron-job.org:
 * 1. 08:58 - Chamar /api/cron/wake-up (acorda o servidor)
 * 2. 09:00 - Chamar /api/cron/send-notifications (executa o job)
 *
 * Não requer autenticação (apenas para wake-up)
 */
router.get("/wake-up", async (req, res) => {
  const requestTime = new Date().toISOString();
  const requestIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  console.log(`\n🔔 [${requestTime}] Wake-up chamado`);
  console.log(`   IP: ${requestIp}`);
  console.log(`   User-Agent: ${req.headers["user-agent"]}`);

  // Rate limiting: máximo 3 requisições por minuto por IP
  const rateLimit = checkRateLimit(requestIp, "wake-up", 60000, 3);

  // Adicionar headers de rate limit
  res.set({
    "X-RateLimit-Limit": "3",
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": rateLimit.resetTime
      ? new Date(rateLimit.resetTime).toISOString()
      : "",
  });

  if (!rateLimit.allowed) {
    console.log(`   ⚠️  RATE LIMIT excedido (${requestIp})`);
    console.log(
      `   📋 Aguarde até: ${new Date(rateLimit.resetTime).toISOString()}\n`,
    );
    return res.status(429).json({
      success: false,
      message: "Too Many Requests - aguarde 1 minuto",
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
      hint: "Configure o cron-job.org para não fazer retry automático ou aumente o timeout",
    });
  }

  try {
    const serverStartTime = Date.now();

    // Teste de conexão com Supabase
    let dbStatus = "unknown";
    let dbTime = 0;

    console.log(`   ⏳ Testando conexão com Supabase...`);

    try {
      const { default: supabase } = await import("../config/supabase.js");
      const dbStart = Date.now();
      const { error } = await supabase.from("students").select("id").limit(1);
      dbTime = Date.now() - dbStart;
      dbStatus = error ? "error" : "connected";

      if (error) {
        console.log(`   ❌ Supabase: ERRO - ${error.message}`);
      } else {
        console.log(`   ✅ Supabase: CONECTADO (${dbTime}ms)`);
      }
    } catch (err) {
      dbStatus = "error";
      console.log(`   ❌ Supabase: EXCEÇÃO - ${err.message}`);
    }

    const totalTime = Date.now() - serverStartTime;

    console.log(`   ⚡ Tempo total de aquecimento: ${totalTime}ms`);
    console.log(`   ✓ Wake-up concluído com sucesso\n`);

    res.json({
      success: true,
      message: "Servidor aquecido e pronto",
      timestamp: requestTime,
      uptime: process.uptime(),
      warmup: {
        totalTime: `${totalTime}ms`,
        database: {
          status: dbStatus,
          responseTime: `${dbTime}ms`,
        },
        recommendation:
          "Aguarde 1-2 minutos antes de chamar o endpoint principal",
      },
    });
  } catch (error) {
    console.error(`   ❌ ERRO no wake-up: ${error.message}\n`);
    res.status(500).json({
      success: false,
      message: "Erro ao aquecer servidor",
      error: error.message,
      timestamp: requestTime,
    });
  }
});

/**
 * GET /api/cron/status
 * Verifica se o serviço de cron está operacional
 */
router.get("/status", (req, res) => {
  const requestIp =
    req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  // Verificar status do rate limit para este IP
  const wakeupKey = `${requestIp}-wake-up`;
  const notifKey = `${requestIp}-send-notifications`;

  const wakeupLimit = rateLimitMap.get(wakeupKey);
  const notifLimit = rateLimitMap.get(notifKey);

  res.json({
    success: true,
    message: "Serviço de cron operacional",
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    uptime: `${Math.floor(process.uptime())}s`,
    rateLimits: {
      wakeup: wakeupLimit
        ? {
            requests: wakeupLimit.count,
            resetAt: new Date(wakeupLimit.resetTime).toISOString(),
          }
        : "Nenhuma requisição recente",
      notifications: notifLimit
        ? {
            requests: notifLimit.count,
            resetAt: new Date(notifLimit.resetTime).toISOString(),
          }
        : "Nenhuma requisição recente",
    },
  });
});

export default router;

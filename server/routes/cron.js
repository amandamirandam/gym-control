import express from "express";
import { sendNotifications } from "../services/notificationService.js";

const router = express.Router();

// Handler compartilhado para GET e POST
const sendNotificationsHandler = async (req, res) => {
  try {
    // Validar token de segurança (aceita header ou query param)
    const authHeader = req.headers.authorization;
    const tokenQuery = req.query.token; // Para cron-job.org via GET
    const cronSecret = process.env.CRON_SECRET || "change-me-in-production";

    // Extrair token do header "Bearer TOKEN" ou diretamente da query
    const providedToken = authHeader?.replace("Bearer ", "") || tokenQuery;

    if (!providedToken || providedToken !== cronSecret) {
      return res.status(401).json({
        success: false,
        message: "Não autorizado - token inválido",
      });
    }

    console.log(
      `${new Date().toISOString()} - Cron job disparado via ${req.method}`,
    );

    // Executar envio de notificações
    const result = await sendNotifications();

    res.json({
      success: true,
      message: "Notificações processadas com sucesso",
      timestamp: new Date().toISOString(),
      stats: result || { total: 0, success: 0, failures: 0 },
    });
  } catch (error) {
    console.error("Erro no cron job via HTTP:", error);
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
  try {
    const serverStartTime = Date.now();
    
    // Teste de conexão com Supabase
    let dbStatus = "unknown";
    let dbTime = 0;
    try {
      const { default: supabase } = await import("../config/supabase.js");
      const dbStart = Date.now();
      const { error } = await supabase.from("students").select("id").limit(1);
      dbTime = Date.now() - dbStart;
      dbStatus = error ? "error" : "connected";
    } catch (err) {
      dbStatus = "error";
      console.warn("Wake-up: Erro ao conectar com Supabase:", err.message);
    }

    const totalTime = Date.now() - serverStartTime;

    res.json({
      success: true,
      message: "Servidor aquecido e pronto",
      timestamp: new Date().toISOString(),
      warmup: {
        totalTime: `${totalTime}ms`,
        database: {
          status: dbStatus,
          responseTime: `${dbTime}ms`,
        },
        recommendation: "Aguarde 1-2 minutos antes de chamar o endpoint principal",
      },
    });
  } catch (error) {
    console.error("Erro no wake-up:", error.message);
    res.status(500).json({
      success: false,
      message: "Erro ao aquecer servidor",
      error: error.message,
    });
  }
});

/**
 * GET /api/cron/status
 * Verifica se o serviço de cron está operacional
 */
router.get("/status", (req, res) => {
  res.json({
    success: true,
    message: "Serviço de cron operacional",
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});

export default router;

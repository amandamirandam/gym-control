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
      `\n⏰ ${new Date().toISOString()} - Cron job disparado via HTTP (${req.method})`,
    );

    // Executar envio de notificações
    await sendNotifications();

    res.json({
      success: true,
      message: "Notificações processadas com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro no cron job via HTTP:", error);
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

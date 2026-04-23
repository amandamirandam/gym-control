import express from "express";
import { sendNotifications } from "../services/notificationService.js";

const router = express.Router();

/**
 * POST /api/cron/send-notifications
 * Endpoint para ser chamado por serviços externos de cron (cron-job.org, GitHub Actions, etc)
 * Protegido por token secreto
 */
router.post("/send-notifications", async (req, res) => {
  try {
    // Validar token de segurança
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET || "change-me-in-production";

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({
        success: false,
        message: "Não autorizado - token inválido",
      });
    }

    console.log(`\n ${new Date().toISOString()} - Cron job disparado via HTTP`);

    // Executar envio de notificações
    await sendNotifications();

    res.json({
      success: true,
      message: "Notificações processadas com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro no cron job via HTTP:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar notificações",
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

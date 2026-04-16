import express from "express";
import cors from "cors";
import { sendWhatsAppMessage } from "../services/wapiService.js";
import { validateWapiConfig } from "../config/wapi.js";

const router = express.Router();

/**
 * POST /api/whatsapp/send
 * Envia mensagem WhatsApp via W-API
 *
 * Body:
 * {
 *   "phone": string,
 *   "message": string,
 *   "studentName": string (opcional, para logs)
 * }
 */
router.post("/send", async (req, res) => {
  try {
    // Validar configuração da W-API
    validateWapiConfig();

    const { phone, message, studentName } = req.body;

    // Validar entrada
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: phone, message",
      });
    }

    // Enviar mensagem
    const result = await sendWhatsAppMessage(
      phone,
      message,
      studentName || "Aluno",
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Mensagem enviada com sucesso",
        data: result.data,
        timestamp: result.timestamp,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: "Falha ao enviar mensagem",
        details: result.error,
        timestamp: result.timestamp,
      });
    }
  } catch (error) {
    console.error("Erro no endpoint /api/whatsapp/send:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/whatsapp/health
 * Verifica se a configuração da W-API está correta
 */
router.get("/health", async (req, res) => {
  try {
    validateWapiConfig();
    return res.status(200).json({
      success: true,
      message: "W-API configurada corretamente",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

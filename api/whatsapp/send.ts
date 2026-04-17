import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

// Configuração W-API
const WAPI_CONFIG = {
  instanceId: process.env.WAPI_INSTANCE_ID!,
  token: process.env.WAPI_TOKEN!,
  baseURL: "https://api.w-api.app/v1",
};

function formatPhoneForWapi(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (!cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }

  if (cleaned.length === 13 && cleaned[4] === "9") {
    cleaned = cleaned.slice(0, 4) + cleaned.slice(5);
  }

  return cleaned;
}

async function sendWhatsAppMessage(
  phone: string,
  message: string,
  studentName: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formattedPhone = formatPhoneForWapi(phone);

    // W-API requer instanceId como query param na URL
    const url = `${WAPI_CONFIG.baseURL}/message/send-text?instanceId=${WAPI_CONFIG.instanceId}`;

    const response = await axios.post(
      url,
      {
        phone: formattedPhone,
        message: message,
        delayMessage: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${WAPI_CONFIG.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas POST é permitido
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { phone, message, studentName } = req.body;

    // Validar entrada
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: phone, message",
      });
    }

    console.log(
      `📤 Enviando mensagem manual para: ${studentName || "Aluno"} (${phone})`,
    );

    // Enviar mensagem
    const result = await sendWhatsAppMessage(
      phone,
      message,
      studentName || "Aluno",
    );

    if (result.success) {
      console.log("✅ Mensagem enviada com sucesso!");
      return res.status(200).json({
        success: true,
        message: "Mensagem enviada com sucesso",
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error("❌ Erro ao enviar:", result.error);
      return res.status(500).json({
        success: false,
        error: "Falha ao enviar mensagem",
        details: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error("❌ Erro no endpoint /api/whatsapp/send:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

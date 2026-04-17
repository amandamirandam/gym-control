import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

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
  instanceId: string,
  token: string,
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formattedPhone = formatPhoneForWapi(phone);

    // W-API requer instanceId como query param na URL
    const baseURL = "https://api.w-api.app/v1";
    const url = `${baseURL}/message/send-text?instanceId=${instanceId}`;

    const response = await axios.post(
      url,
      {
        phone: formattedPhone,
        message: message,
        delayMessage: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
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
    // Debug: verificar variáveis de ambiente
    console.log("=== DEBUG: Variáveis de Ambiente ===");
    console.log("Todas as env vars disponíveis:", Object.keys(process.env).filter(k => k.includes('WAPI') || k.includes('SUPABASE')));
    console.log(
      "WAPI_INSTANCE_ID:",
      process.env.WAPI_INSTANCE_ID || "UNDEFINED",
    );
    console.log(
      "WAPI_TOKEN:",
      process.env.WAPI_TOKEN ? "Configurado ✓" : "UNDEFINED",
    );
    console.log(
      "SUPABASE_URL:",
      process.env.SUPABASE_URL || "UNDEFINED",
    );
    console.log("====================================");

    // Validar variáveis de ambiente
    if (!process.env.WAPI_INSTANCE_ID || !process.env.WAPI_TOKEN) {
      console.error("❌ Variáveis de ambiente não configuradas!");
      return res.status(500).json({
        success: false,
        error:
          "Configuração do servidor incompleta. Variáveis de ambiente não encontradas.",
        details: {
          WAPI_INSTANCE_ID: process.env.WAPI_INSTANCE_ID ? "OK" : "MISSING",
          WAPI_TOKEN: process.env.WAPI_TOKEN ? "OK" : "MISSING",
        },
      });
    }

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
      process.env.WAPI_INSTANCE_ID!,
      process.env.WAPI_TOKEN!,
    );

    if (result.success) {
      console.log("Mensagem enviada com sucesso!");
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

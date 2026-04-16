import axios from "axios";
import { wapiConfig } from "../config/wapi.js";

/**
 * Formata o telefone para o padrão internacional da W-API
 * @param {string} phone - Telefone com ou sem formatação
 * @returns {string} - Telefone no padrão 55XXXXXXXXXX (sem +)
 */
function formatPhoneForWapi(phone) {
  // Remove todos os caracteres que não são dígitos
  let digits = phone.replace(/\D/g, "");

  // Se começar com 55 e tiver 13 dígitos (55 + DDD + 9 duplicado + 9 + 8), remover o 9 duplicado
  if (digits.startsWith("55") && digits.length === 13) {
    // Remove o primeiro 9 após o DDD (índice 4)
    digits = digits.slice(0, 4) + digits.slice(5);
  }

  // Se não começar com 55, adiciona 55 no início
  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

/**
 * Envia uma mensagem WhatsApp via W-API
 * @param {string} phone - Telefone do aluno (com ou sem formatação)
 * @param {string} message - Corpo da mensagem
 * @param {string} studentName - Nome do aluno (para logs)
 * @returns {Promise<Object>} - Resposta da API W-API
 */
export async function sendWhatsAppMessage(phone, message, studentName) {
  try {
    const formattedPhone = formatPhoneForWapi(phone);
    const timestamp = new Date().toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.log(
      `[${timestamp}] Iniciando envio para ${studentName} (${formattedPhone})`,
    );

    const url = `${wapiConfig.baseUrl}/message/send-text?instanceId=${wapiConfig.instanceId}`;

    const response = await axios.post(
      url,
      {
        phone: formattedPhone,
        message: message,
        delayMessage: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${wapiConfig.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      `[${new Date().toLocaleString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}] Mensagem enviada com sucesso - Response:`,
      response.data,
    );

    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorTimestamp = new Date().toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.error(
      `[${errorTimestamp}] Erro ao enviar mensagem para ${studentName}:`,
      error.response?.data || error.message,
    );

    return {
      success: false,
      error: error.response?.data || error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * [DESCONTINUADA] Mensagem de lembrete (1 dia antes)
 * Sistema NÃO envia mais antes do vencimento
 */
export function getRemitterMessage(studentName) {
  return `Olá ${studentName}! 👋\n\nPassando para lembrar que sua mensalidade vence amanhã.\n\nQualquer dúvida estou por aqui! 💪`;
}

/**
 * Mensagem de aviso (vence hoje)
 * Enviada automaticamente no DIA do vencimento
 */
export function getDueTodayMessage(studentName) {
  return `Olá ${studentName}! 👋\n\nSua mensalidade vence HOJE 📅\n\nSe já realizou o pagamento, pode desconsiderar. 💪`;
}

/**
 * Mensagem de cobrança (atrasado)
 * Enviada automaticamente 1 DIA APÓS o vencimento
 */
export function getOverdueMessage(studentName, daysOverdue) {
  return `Olá ${studentName}! 👋\n\nSua mensalidade está ${daysOverdue} ${daysOverdue === 1 ? "dia" : "dias"} em atraso 💰\n\nPor favor, regularize seu pagamento para continuar treinando! 💪`;
}

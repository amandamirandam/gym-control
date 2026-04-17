/**
 * Envia mensagem WhatsApp através da API do servidor
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  studentName: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Em produção (Vercel), usa URL relativa
    // Em dev local, usa backend Node.js em localhost:3001
    const apiUrl = import.meta.env.VITE_API_URL || "";

    const response = await fetch(`${apiUrl}/api/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        message,
        studentName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Falha ao enviar mensagem");
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Erro ao enviar mensagem WhatsApp:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar mensagem",
    };
  }
}

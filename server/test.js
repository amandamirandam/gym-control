import dotenv from "dotenv";
import { sendNotifications } from "./services/notificationService.js";
import {
  sendWhatsAppMessage,
  getRemitterMessage,
} from "./services/wapiService.js";

dotenv.config();

/**
 * Script de teste para enviar notificações manualmente
 *
 * Uso:
 * node test.js              # Enviar notificações para todos os alunos que precisam
 * node test.js --send-one   # Enviar para um aluno específico (configure no script)
 */

const args = process.argv.slice(2);

async function main() {
  try {
    if (args.includes("--send-one")) {
      // Teste: enviar para um aluno específico
      console.log("Enviando teste para um aluno...\n");

      const testPhone = "+5511987654321"; // Altere para seu número
      const testMessage = getRemitterMessage("Teste Aluno");

      const result = await sendWhatsAppMessage(
        testPhone,
        testMessage,
        "Teste Aluno",
      );

      console.log("\nResultado:", result);
    } else {
      // Padrão: enviar notificações
      console.log("Enviando notificações para todos os alunos...\n");

      const result = await sendNotifications();

      console.log("\nResumo:", result);
    }
  } catch (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

main();

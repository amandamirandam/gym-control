// Carregar e validar variáveis de ambiente ANTES de tudo
import "./config/env.js";
import express from "express";
import cors from "cors";
import whatsappRoutes from "./routes/whatsapp.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/whatsapp", whatsappRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Gym Control Server is running" });
});

// Wrapper async para usar await com dynamic imports
(async () => {
  const { scheduleDailyNotifications } = await import("./cron/scheduler.js");
  const { sendNotifications } =
    await import("./services/notificationService.js");

  console.log("Iniciando Gym Control Notification Server...\n");

  // Iniciar servidor Express
  app.listen(PORT, () => {
    console.log(`Servidor Express rodando na porta ${PORT}`);
    console.log(
      `Endpoint WhatsApp: http://localhost:${PORT}/api/whatsapp/send`,
    );
    console.log(`Health check: http://localhost:${PORT}/health\n`);
  });

  // Agendar notificações diárias
  scheduleDailyNotifications();

  // Opcional: enviar notificações imediatamente ao iniciar (para testes)
  if (process.env.SEND_ON_STARTUP === "true") {
    console.log("SEND_ON_STARTUP ativado - enviando notificações agora...\n");
    sendNotifications().catch((error) => {
      console.error("Erro ao enviar notificações:", error.message);
    });
  }

  console.log("Servidor iniciado e aguardando execução do cron job...\n");
})();

// Manter o processo ativo
process.on("SIGINT", () => {
  console.log("\nEncerrando servidor...");
  process.exit(0);
});

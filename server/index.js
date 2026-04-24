// Carregar e validar variáveis de ambiente ANTES de tudo
import "./config/env.js";
import express from "express";
import cors from "cors";
import whatsappRoutes from "./routes/whatsapp.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import cronRoutes from "./routes/cron.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração CORS - permite requisições do frontend
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:5173", // Vite dev
      "http://localhost:4173", // Vite preview
      "http://localhost:3000", // React dev alternativo
      "http://localhost:8080", // Dev server alternativo
      "https://gym-control-1.onrender.com", // Frontend produção
      /\.onrender\.com$/, // Qualquer subdomínio do Render
    ];

    // Checar se a origin está permitida
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/cron", cronRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Gym Control Server is running" });
});

console.log("Iniciando Gym Control Notification Server...\n");

// Iniciar servidor Express imediatamente (sem await de imports)
app.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === "production";
  const baseUrl = isProduction
    ? process.env.RENDER_EXTERNAL_URL || `https://gym-control-2.onrender.com`
    : `http://localhost:${PORT}`;

  console.log(`✅ Servidor Express rodando na porta ${PORT}`);
  console.log(`Ambiente: ${isProduction ? "PRODUÇÃO" : "DESENVOLVIMENTO"}`);
  console.log(`Health check: ${baseUrl}/health`);
  console.log(`Endpoints disponíveis: ${baseUrl}/api/\n`);
});

// Lazy load: carregar serviços apenas quando necessário (não no startup)
// Isso reduz o cold start em ~5-10 segundos

// Opcional: enviar notificações imediatamente ao iniciar (para testes)
if (process.env.SEND_ON_STARTUP === "true") {
  (async () => {
    console.log("SEND_ON_STARTUP ativado - enviando notificações...\n");
    const { sendNotifications } =
      await import("./services/notificationService.js");
    sendNotifications().catch((error) => {
      console.error("Erro ao enviar notificações:", error.message);
    });
  })();
}

console.log("Servidor pronto - aguardando requisições...\n");

// Manter o processo ativo
process.on("SIGINT", () => {
  console.log("\nEncerrando servidor...");
  process.exit(0);
});

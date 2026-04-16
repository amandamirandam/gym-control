import dotenv from "dotenv";

// Carregar e validar variáveis de ambiente ANTES de tudo
dotenv.config();

const requiredEnvVars = [
  "WAPI_INSTANCE_ID",
  "WAPI_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error(
    "Variáveis de ambiente obrigatórias ausentes:",
    missingVars.join(", "),
  );
  console.error(
    "Por favor, configure o arquivo .env com as variáveis necessárias",
  );
  process.exit(1);
}

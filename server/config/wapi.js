import dotenv from "dotenv";

dotenv.config();

/**
 * Configuração da W-API
 */
export const wapiConfig = {
  instanceId: process.env.WAPI_INSTANCE_ID,
  token: process.env.WAPI_TOKEN,
  baseUrl: "https://api.w-api.app/v1",
};

/**
 * Valida se as credenciais da W-API estão configuradas
 */
export function validateWapiConfig() {
  if (!wapiConfig.instanceId || !wapiConfig.token) {
    throw new Error(
      "W-API não configurada. Configure WAPI_INSTANCE_ID e WAPI_TOKEN no arquivo .env",
    );
  }
}

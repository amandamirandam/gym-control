import bcrypt from "bcryptjs";

/**
 * Script para gerar hash de senha para admin
 *
 * Uso:
 * node server/scripts/generate-password-hash.js SUA_SENHA_AQUI
 *
 * Exemplo:
 * node server/scripts/generate-password-hash.js admin123
 */

const password = process.argv[2];

if (!password) {
  console.error("Por favor, forneça uma senha:");
  console.error("   node server/scripts/generate-password-hash.js SUA_SENHA");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

console.log("\nHash gerado com sucesso!");
console.log("\nCopie este hash para usar na migration SQL:\n");
console.log(hash);
console.log("\n");

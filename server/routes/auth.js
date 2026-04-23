import express from "express";
import bcrypt from "bcryptjs";
import supabase from "../config/supabase.js";

const router = express.Router();

/**
 * POST /api/auth/login
 * Autentica o administrador
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Usuário e senha são obrigatórios",
      });
    }

    // Busca o usuário no banco
    const { data: user, error } = await supabase
      .from("admin_users")
      .select("id, username, password_hash, role, active")
      .eq("username", username)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Usuário ou senha incorretos",
      });
    }

    // Verifica se o usuário está ativo
    if (!user.active) {
      return res.status(401).json({
        success: false,
        message: "Usuário desativado",
      });
    }

    // Verifica a senha
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Usuário ou senha incorretos",
      });
    }

    // Login bem-sucedido
    res.json({
      success: true,
      message: "Login realizado com sucesso",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Erro no login:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao realizar login",
    });
  }
});

/**
 * POST /api/auth/change-password
 * Altera a senha do administrador
 */
router.post("/change-password", async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Todos os campos são obrigatórios",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "A nova senha deve ter no mínimo 6 caracteres",
      });
    }

    // Busca o usuário
    const { data: user, error } = await supabase
      .from("admin_users")
      .select("id, username, password_hash")
      .eq("username", username)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    // Verifica a senha atual
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Senha atual incorreta",
      });
    }

    // Gera hash da nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Atualiza a senha
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ password_hash: newPasswordHash })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao alterar senha:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao alterar senha",
    });
  }
});

export default router;

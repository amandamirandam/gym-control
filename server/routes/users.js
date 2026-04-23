import express from "express";
import bcrypt from "bcryptjs";
import supabase from "../config/supabase.js";

const router = express.Router();

/**
 * NOTA DE SEGURANÇA:
 * Estas rotas devem ser protegidas no frontend (AdminRoute).
 * Para produção, considere implementar JWT e middleware de autenticação.
 */

/**
 * GET /api/users
 * Lista todos os usuários (apenas para admin)
 */
router.get("/", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("admin_users")
      .select("id, username, role, active, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ success: true, users });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar usuários",
    });
  }
});

/**
 * POST /api/users
 * Cria um novo usuário (apenas para admin)
 */
router.post("/", async (req, res) => {
  try {
    const { username, password, role = "user", active = false } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Usuário e senha são obrigatórios",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "A senha deve ter no mínimo 6 caracteres",
      });
    }

    // Verifica se o usuário já existe
    const { data: existingUser } = await supabase
      .from("admin_users")
      .select("username")
      .eq("username", username)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Este usuário já existe",
      });
    }

    // Gera hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Cria o usuário
    const { data: newUser, error } = await supabase
      .from("admin_users")
      .insert({
        username,
        password_hash: passwordHash,
        role,
        active,
      })
      .select("id, username, role, active, created_at")
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      user: newUser,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar usuário",
    });
  }
});

/**
 * PUT /api/users/:id
 * Atualiza um usuário existente
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, active } = req.body;

    const updates = {};

    if (username) updates.username = username;
    if (role) updates.role = role;
    if (typeof active === "boolean") updates.active = active;

    // Se forneceu nova senha, gera o hash
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "A senha deve ter no mínimo 6 caracteres",
        });
      }
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    // Atualiza o usuário
    const { data: updatedUser, error } = await supabase
      .from("admin_users")
      .update(updates)
      .eq("id", id)
      .select("id, username, role, active, updated_at")
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Usuário atualizado com sucesso",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar usuário",
    });
  }
});

/**
 * DELETE /api/users/:id
 * Remove um usuário
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se não é o único admin
    const { data: user } = await supabase
      .from("admin_users")
      .select("role")
      .eq("id", id)
      .single();

    if (user?.role === "admin") {
      const { data: adminCount } = await supabase
        .from("admin_users")
        .select("id", { count: "exact" })
        .eq("role", "admin");

      if (adminCount?.length <= 1) {
        return res.status(400).json({
          success: false,
          message: "Não é possível remover o único administrador do sistema",
        });
      }
    }

    const { error } = await supabase.from("admin_users").delete().eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Usuário removido com sucesso",
    });
  } catch (error) {
    console.error("Erro ao remover usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover usuário",
    });
  }
});

export default router;

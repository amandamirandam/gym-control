import supabase from "../config/supabase.js";

/**
 * Middleware para verificar se o usuário é admin
 * Deve ser usado nas rotas que requerem privilégios de administrador
 */
export async function requireAdmin(req, res, next) {
  try {
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Não autorizado",
      });
    }

    // Busca o usuário no banco
    const { data: user, error } = await supabase
      .from("admin_users")
      .select("id, role, active")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "Usuário desativado",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Acesso negado. Privilégios de administrador necessários.",
      });
    }

    // Usuário é admin e está ativo
    req.user = user;
    next();
  } catch (error) {
    console.error("Erro no middleware de admin:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar permissões",
    });
  }
}

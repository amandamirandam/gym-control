import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute.tsx";
import { AdminRoute } from "@/components/AdminRoute.tsx";
import { useAuth } from "@/contexts/AuthContext.tsx";
import Index from "./pages/Index.tsx";
import PaymentHistory from "./pages/PaymentHistory.tsx";
import UserManagement from "./pages/UserManagement.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/" replace /> : <Login />
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/historico-pagamentos"
              element={
                <ProtectedRoute>
                  <PaymentHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

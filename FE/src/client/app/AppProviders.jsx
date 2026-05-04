import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CartProvider } from "@/client/features/cart/context/CartContext";
import { BuildProvider } from "@/client/features/build/context/BuildContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { FavoriteProvider } from "@/client/features/favorite/context/FavoriteContext";

const queryClient = new QueryClient();

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <NotificationProvider>
            <FavoriteProvider>
              <CartProvider>
                <BuildProvider>
                  <Toaster />
                  <Sonner />
                  {children}
                </BuildProvider>
              </CartProvider>
            </FavoriteProvider>
          </NotificationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CartProvider } from "@/client/features/cart/context/CartContext";
import { BuildProvider } from "@/client/features/build/context/BuildContext";

const queryClient = new QueryClient();

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <BuildProvider>
            <Toaster />
            <Sonner />
            {children}
          </BuildProvider>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

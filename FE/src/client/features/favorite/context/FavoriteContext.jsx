import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FavoriteContext = createContext(null);

export function FavoriteProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setFavorites([]);
    }
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/products/wishlist/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("pc-perfect-token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (productId) => {
    if (!isAuthenticated) return false;

    // Optimistic UI update
    const isCurrentlyFavorite = favorites.some((f) => f.id === productId);
    let previousFavorites = [...favorites];
    
    if (isCurrentlyFavorite) {
      setFavorites(favorites.filter((f) => f.id !== productId));
    } else {
      setFavorites([...favorites, { id: productId }]); 
    }

    try {
      // Find the slug. Since we are using product IDs in ComponentCard, we might need the slug.
      // ComponentCard has component.slug. If not, we can hit an API by slug or ID. 
      // Fortunately, the backend routes /api/products/:slug/wishlist actually use slug.
      // But the toggleFavorite is called with component.id. Wait!
      // Let's modify toggleFavorite to accept the full component object or just ID.
      // If we only have ID, we can hit a new endpoint or update the existing one.
      const res = await fetch(`/api/products/${productId}/wishlist-by-id`, {
        method: isCurrentlyFavorite ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("pc-perfect-token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to toggle favorite");
      
      await fetchFavorites();
      
      toast.success(
        isCurrentlyFavorite ? "Đã bỏ khỏi danh sách yêu thích" : "Đã thêm vào danh sách yêu thích"
      );
      
      return true;
    } catch (error) {
      console.error(error);
      setFavorites(previousFavorites);
      toast.error("Không thể cập nhật danh sách yêu thích");
      return false;
    }
  };



  const isFavorite = (productId) => {
    return favorites.some((f) => f.id === productId);
  };

  const favoriteCount = favorites.length;

  return (
    <FavoriteContext.Provider
      value={{
        favorites,
        isLoading,
        favoriteCount,
        toggleFavorite,
        isFavorite,
        refreshFavorites: fetchFavorites
      }}
    >
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorite() {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error("useFavorite must be used within a FavoriteProvider");
  }
  return context;
}

import { Navbar } from "@/components/Navbar";
import { useFavorite } from "@/client/features/favorite/context/FavoriteContext";
import { ComponentCard } from "@/components/ComponentCard";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function FavoritePage() {
  const { favorites, isLoading } = useFavorite();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-rose-100 p-3 rounded-full text-rose-500">
              <Heart className="w-8 h-8 fill-rose-500" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Sản phẩm yêu thích</h1>
              <p className="text-muted-foreground mt-1">Danh sách linh kiện máy tính bạn đã lưu lại</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-muted-foreground">Đang tải danh sách...</div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-20 bg-secondary/30 rounded-xl border border-border border-dashed">
              <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Chưa có sản phẩm nào</h2>
              <p className="text-muted-foreground mb-6">Bạn chưa thêm bất kỳ sản phẩm nào vào danh sách yêu thích.</p>
              <Link to="/components">
                <Button>Tiếp tục mua sắm</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favorites.map((item) => (
                <ComponentCard key={item.id} component={item} mode="shop" />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

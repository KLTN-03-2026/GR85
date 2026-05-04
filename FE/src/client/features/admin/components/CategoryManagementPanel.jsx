import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 10;

export function CategoryManagementPanel() {
  const { token, isAuthenticated, isHydrated } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) {
      return;
    }

    let cancelled = false;

    async function loadCategories() {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(pagination.page),
          pageSize: String(PAGE_SIZE),
          search,
          status,
        });

        const response = await fetch(`/api/admin/categories?${query.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Không tải được danh mục");
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        setItems(Array.isArray(payload.items) ? payload.items : []);
        setPagination((prev) => ({
          ...prev,
          ...(payload.pagination ?? {}),
        }));
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          toast({
            title: "Không tải được danh mục",
            description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, token, pagination.page, search, status, toast]);

  const editingCategory = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [editingId, items],
  );

  const selectedCategory = useMemo(
    () => items.find((item) => item.id === selectedCategoryId) ?? null,
    [items, selectedCategoryId],
  );

  useEffect(() => {
    if (selectedCategoryId === null) {
      return;
    }

    const exists = items.some((item) => item.id === selectedCategoryId);
    if (!exists) {
      setSelectedCategoryId(null);
    }
  }, [items, selectedCategoryId]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadProductsByCategory() {
      setIsProductsLoading(true);
      setProductsError("");
      try {
        const query = new URLSearchParams({
          page: "1",
          pageSize: "12",
          sort: "display_order",
        });

        if (selectedCategory?.slug) {
          query.set("category", selectedCategory.slug);
        }

        const response = await fetch(`/api/products?${query.toString()}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || "Không tải được danh sách sản phẩm");
        }

        if (cancelled) {
          return;
        }

        setCategoryProducts(Array.isArray(payload?.items) ? payload.items : []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCategoryProducts([]);
        setProductsError(error instanceof Error ? error.message : "Đã xảy ra lỗi khi tải sản phẩm");
      } finally {
        if (!cancelled) {
          setIsProductsLoading(false);
        }
      }
    }

    loadProductsByCategory();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, selectedCategory]);

  useEffect(() => {
    if (!editingCategory) {
      return;
    }

    setForm({
      name: editingCategory.name ?? "",
      description: editingCategory.description ?? "",
      isActive: Boolean(editingCategory.isActive),
    });
  }, [editingCategory]);

  async function handleSave() {
    if (!token) {
      return;
    }

    const name = form.name.trim();
    if (!name) {
      toast({
        title: "Tên danh mục là bắt buộc",
        variant: "destructive",
      });
      return;
    }

    setSavingId(editingId ?? "new");
    try {
      const response = await fetch(
        editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description: form.description.trim(),
            isActive: Boolean(form.isActive),
          }),
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Không lưu được danh mục");
      }

      toast({
        title: editingId ? "Đã cập nhật danh mục" : "Đã tạo danh mục",
        description: name,
      });

      setForm({
        name: "",
        description: "",
        isActive: true,
      });
      setEditingId(null);
      setPagination((prev) => ({ ...prev, page: 1 }));
      await refreshList();
    } catch (error) {
      toast({
        title: "Không lưu được danh mục",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(category) {
    if (!token) {
      return;
    }

    if (!window.confirm(`Xóa danh mục ${category.name}? Nếu danh mục có sản phẩm sẽ bị chặn.`)) {
      return;
    }

    setDeletingId(category.id);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Không xóa được danh mục");
      }

      toast({
        title: "Đã tạm ngừng danh mục",
        description: category.name,
      });

      if (editingId === category.id) {
        setEditingId(null);
        setForm({ name: "", description: "", isActive: true });
      }

      await refreshList();
    } catch (error) {
      toast({
        title: "Không thể xóa danh mục",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function refreshList() {
    if (!token) {
      return;
    }

    const query = new URLSearchParams({
      page: String(pagination.page),
      pageSize: String(PAGE_SIZE),
      search,
      status,
    });

    const response = await fetch(`/api/admin/categories?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    setItems(Array.isArray(payload.items) ? payload.items : []);
    setPagination((prev) => ({
      ...prev,
      ...(payload.pagination ?? {}),
    }));
  }

  function startEditing(category) {
    setEditingId(category.id);
    setSelectedCategoryId(category.id);
    setForm({
      name: category.name ?? "",
      description: category.description ?? "",
      isActive: Boolean(category.isActive),
    });
  }

  function clearForm() {
    setEditingId(null);
    setForm({ name: "", description: "", isActive: true });
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-white/85 p-3 shadow-sm">
      <div className="space-y-3 rounded-2xl border border-border/60 bg-background/80 p-3">
        <div className="grid gap-2 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <label className="mb-1 block text-xs font-medium">Tìm theo tên</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setSearch(searchInput.trim());
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }
                  }}
                  placeholder="Nhập tên danh mục..."
                  className="h-9 w-full rounded-xl border border-border/60 bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <Button
                variant="outline"
                className="h-9 px-3"
                onClick={() => {
                  setSearch(searchInput.trim());
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Tìm
              </Button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-medium">Trạng thái</label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end justify-end lg:col-span-2">
            <Button variant="outline" className="h-9 gap-2" onClick={clearForm}>
              <Plus className="h-4 w-4" />
              Tạo mới
            </Button>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-12">
          <div className="grid gap-1 lg:col-span-3">
            <label className="text-xs font-medium">Tên danh mục</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="h-9 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
              placeholder="Ví dụ: CPU, Mainboard..."
            />
          </div>
          <div className="grid gap-1 lg:col-span-5">
            <label className="text-xs font-medium">Mô tả</label>
            <input
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="h-9 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
              placeholder="Mô tả ngắn gọn cho danh mục"
            />
          </div>
          <div className="flex items-end lg:col-span-2">
            <label className="flex h-9 w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-3 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Active
            </label>
          </div>
          <div className="flex items-end justify-end gap-2 lg:col-span-2">
            <Button onClick={handleSave} disabled={savingId !== null} className="h-9 gap-2 px-3">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Cập nhật" : "Tạo"}
            </Button>
            <Button variant="outline" onClick={clearForm} disabled={savingId !== null} className="h-9 px-3">
              Hủy
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60">
          <div className="space-y-2 p-3">
            <div className="grid gap-2 lg:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background">
                <div className="border-b border-border/60 px-3 py-2">
                  <p className="text-sm font-semibold">Bảng danh mục</p>
                </div>
                <div className="h-[48vh] min-h-[300px] max-h-[460px] overflow-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5">Danh mục</th>
                        <th className="px-3 py-2.5">Số SP</th>
                        <th className="px-3 py-2.5">Trạng thái</th>
                        <th className="px-3 py-2.5">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        className={`cursor-pointer border-t border-border/60 ${selectedCategoryId === null ? "bg-emerald-50" : "hover:bg-muted/20"}`}
                        onClick={() => setSelectedCategoryId(null)}
                      >
                        <td className="px-3 py-2.5 font-semibold">Tất cả</td>
                        <td className="px-3 py-2.5">-</td>
                        <td className="px-3 py-2.5">-</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">Bộ lọc</td>
                      </tr>

                      {isLoading ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                            Đang tải danh mục...
                          </td>
                        </tr>
                      ) : items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                            Không có danh mục phù hợp.
                          </td>
                        </tr>
                      ) : (
                        items.map((category) => (
                          <tr
                            key={category.id}
                            className={`cursor-pointer border-t border-border/60 ${selectedCategoryId === category.id ? "bg-emerald-50" : "hover:bg-muted/20"}`}
                            onClick={() => setSelectedCategoryId(category.id)}
                          >
                            <td className="px-3 py-2.5 font-medium">{category.name}</td>
                            <td className="px-3 py-2.5">{category.productCount}</td>
                            <td className="px-3 py-2.5"><StatusBadge category={category} /></td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
                                <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => startEditing(category)}>
                                  <Pencil className="h-3 w-3" />
                                  Sửa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 px-2 text-xs text-rose-600"
                                  onClick={() => handleDelete(category)}
                                  disabled={deletingId === category.id}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Xóa
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedCategory ? `Bảng sản phẩm: ${selectedCategory.name}` : "Bảng sản phẩm: Tất cả"}
                    </p>
                  </div>
                  <span className="rounded-full border border-border/60 px-2 py-1 text-xs font-medium text-muted-foreground">
                    {categoryProducts.length}
                  </span>
                </div>

                {productsError ? (
                  <div className="m-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                    {productsError}
                  </div>
                ) : (
                  <div className="h-[48vh] min-h-[300px] max-h-[460px] overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2.5">Sản phẩm</th>
                          <th className="px-3 py-2.5">Mã</th>
                          <th className="px-3 py-2.5">Giá</th>
                          <th className="px-3 py-2.5">Tồn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isProductsLoading ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                              Đang tải sản phẩm...
                            </td>
                          </tr>
                        ) : categoryProducts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                              Không có sản phẩm trong danh mục này.
                            </td>
                          </tr>
                        ) : (
                          categoryProducts.map((product) => (
                            <tr key={product.id} className="border-t border-border/60">
                              <td className="max-w-[220px] px-3 py-2.5 font-medium">
                                <span className="line-clamp-1">{product.name}</span>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-muted-foreground">{product.productCode}</td>
                              <td className="px-3 py-2.5 font-semibold text-emerald-700">{formatCurrency(product.price)}</td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${Number(product.stockQuantity ?? 0) > 0
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                    }`}
                                >
                                  {Number(product.stockQuantity ?? 0) > 0
                                    ? Number(product.stockQuantity ?? 0)
                                    : "Hết"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Trang {pagination.page} / {pagination.totalPages} - {pagination.totalItems} mục
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.totalPages, prev.page + 1),
                }))
              }
            >
              Sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ category }) {
  const className = category.status === "ACTIVE"
    ? "bg-emerald-100 text-emerald-700"
    : category.status === "DELETED"
      ? "bg-rose-100 text-rose-700"
      : "bg-amber-100 text-amber-700";

  const label = category.status === "ACTIVE"
    ? "Active"
    : category.status === "DELETED"
      ? "Deleted"
      : "Inactive";

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function formatCurrency(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}


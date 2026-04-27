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
  const [topCategories, setTopCategories] = useState([]);
  const [summary, setSummary] = useState({
    totalCategories: 0,
    activeCategories: 0,
    inactiveCategories: 0,
  });
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
          throw new Error(payload?.message || "Khong tai duoc danh muc");
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        setItems(Array.isArray(payload.items) ? payload.items : []);
        setTopCategories(Array.isArray(payload.topCategories) ? payload.topCategories : []);
        setSummary(
          payload.summary ?? {
            totalCategories: 0,
            activeCategories: 0,
            inactiveCategories: 0,
          },
        );
        setPagination((prev) => ({
          ...prev,
          ...(payload.pagination ?? {}),
        }));
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setTopCategories([]);
          toast({
            title: "Khong tai duoc danh muc",
            description: error instanceof Error ? error.message : "Da xay ra loi",
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
        title: "Ten danh muc la bat buoc",
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
        throw new Error(payload?.message || "Khong luu duoc danh muc");
      }

      toast({
        title: editingId ? "Da cap nhat danh muc" : "Da tao danh muc",
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
        title: "Khong luu duoc danh muc",
        description: error instanceof Error ? error.message : "Da xay ra loi",
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

    if (!window.confirm(`Xoa danh muc ${category.name}? Neu danh muc co san pham se bi chan.`)) {
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
        throw new Error(payload?.message || "Khong xoa duoc danh muc");
      }

      toast({
        title: "Da tam ngung danh muc",
        description: category.name,
      });

      if (editingId === category.id) {
        setEditingId(null);
        setForm({ name: "", description: "", isActive: true });
      }

      await refreshList();
    } catch (error) {
      toast({
        title: "Khong the xoa danh muc",
        description: error instanceof Error ? error.message : "Da xay ra loi",
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
    setTopCategories(Array.isArray(payload.topCategories) ? payload.topCategories : []);
    setSummary(
      payload.summary ?? {
        totalCategories: 0,
        activeCategories: 0,
        inactiveCategories: 0,
      },
    );
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
    <div className="space-y-6 rounded-3xl border border-border/60 bg-white/85 p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard title="Tong danh muc" value={summary.totalCategories} />
        <StatCard title="Dang hoat dong" value={summary.activeCategories} />
        <StatCard title="Tam ngung / da xoa" value={summary.inactiveCategories} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Quan ly danh muc san pham</h3>
              <p className="text-sm text-muted-foreground">
                Tao moi, sua, tam ngung va tim kiem danh muc.
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={clearForm}>
              <Plus className="h-4 w-4" />
              Tao moi
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium">Tim theo ten</label>
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
                    placeholder="Nhap ten danh muc..."
                    className="w-full rounded-xl border border-border/60 bg-background py-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch(searchInput.trim());
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  Tim
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Trang thai</label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
              >
                <option value="all">Tat ca</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium">Ten danh muc</label>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                placeholder="Vi du: CPU, Mainboard..."
              />
            </div>
            <div className="grid gap-1 md:col-span-2">
              <label className="text-xs font-medium">Mo ta</label>
              <input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                placeholder="Mo ta ngan gon cho danh muc"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={savingId !== null} className="gap-2">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Cap nhat" : "Tao danh muc"}
            </Button>
            <Button variant="outline" onClick={clearForm} disabled={savingId !== null}>
              Huy
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60">
            <div className="space-y-4 p-4">
              <div>
                <h4 className="text-sm font-semibold">Danh muc</h4>
                <p className="text-xs text-muted-foreground">Danh sach loai san pham nhu CPU, RAM, SSD, Mainboard...</p>
              </div>

              {isLoading ? (
                <div className="rounded-xl border border-border/60 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                  Dang tai danh muc...
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                  Khong co danh muc phu hop.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      selectedCategoryId === null
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border/70 bg-background hover:border-emerald-300"
                    }`}
                  >
                    Tat ca
                  </button>

                  {items.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        selectedCategoryId === category.id
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border/70 bg-background hover:border-emerald-300"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-border/60 bg-background p-3 text-sm">
                {selectedCategory ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{selectedCategory.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedCategory.description || "Khong co mo ta"}</p>
                      </div>
                      <StatusBadge category={selectedCategory} />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/60 px-3 py-2">
                        <p className="text-xs text-muted-foreground">So san pham</p>
                        <p className="text-sm font-semibold">{selectedCategory.productCount}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Slug</p>
                        <p className="text-sm font-semibold">{selectedCategory.slug}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => startEditing(selectedCategory)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Sua danh muc
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-rose-600"
                        onClick={() => handleDelete(selectedCategory)}
                        disabled={deletingId === selectedCategory.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xoa danh muc
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Chon mot danh muc de xem chi tiet va thao tac nhanh.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Trang {pagination.page} / {pagination.totalPages} - {pagination.totalItems} muc
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                Truoc
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

        <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4">
          <div>
            <h3 className="text-lg font-semibold">Danh muc dung nhieu</h3>
            <p className="text-sm text-muted-foreground">Top danh muc theo so san pham</p>
          </div>

          <div className="space-y-3">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chua co du lieu</p>
            ) : (
              topCategories.map((category, index) => (
                <div key={category.id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{index + 1}. {category.name}</div>
                    <div className="text-xs text-muted-foreground">{category.status}</div>
                  </div>
                  <div className="text-sm font-semibold">{category.productCount}</div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            San pham van duoc gan danh muc trong man them/sua san pham.
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

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
const CATEGORY_MAP = {
  vga: "gpu",
  ssd: "storage",
  mainboard: "motherboard",
};

export function buildComponentDetail(component, payload, fallbackImage) {
  const categorySlug = String(payload?.category?.slug ?? component.category ?? "").toLowerCase();
  const normalizedCategory = (CATEGORY_MAP[categorySlug] ?? categorySlug) || component.category;
  const imageUrls = Array.isArray(payload?.images)
    ? payload.images.map((item) => item?.imageUrl).filter(Boolean)
    : [];

  return {
    ...component,
    id: payload?.id ?? component.id,
    slug: payload?.slug ?? component.slug,
    name: payload?.name ?? component.name,
    productCode: payload?.productCode ?? component.productCode,
    category: normalizedCategory,
    brand:
      payload?.specifications?.brand ||
      payload?.supplier?.name ||
      component.brand ||
      "PC Perfect",
    price: Number(payload?.price ?? component.price ?? 0),
    stock: Number(payload?.stockQuantity ?? component.stock ?? 0),
    specs: payload?.specifications ?? component.specs ?? {},
    image: payload?.imageUrl || imageUrls[0] || component.image || fallbackImage,
    images: imageUrls.length ? imageUrls : [payload?.imageUrl || component.image || fallbackImage],
    fullDescription: payload?.detail?.fullDescription || component.fullDescription || "",
    inTheBox: payload?.detail?.inTheBox || component.inTheBox || "",
    warrantyPolicy: payload?.detail?.warrantyPolicy || component.warrantyPolicy || "",
    manualUrl: payload?.detail?.manualUrl || component.manualUrl || null,
  };
}

export function getComponentGalleryImages(component, fallbackImage) {
  const list = Array.isArray(component?.images) ? component.images.filter(Boolean) : [];
  if (list.length > 0) {
    return list;
  }

  return [component?.image || fallbackImage];
}

export function getComponentIsInStock(component, stock) {
  if (typeof component?.inStock === "boolean") {
    return component.inStock;
  }

  if (typeof component?.isOutOfStock === "boolean") {
    return !component.isOutOfStock;
  }

  return stock > 0;
}

export function formatComponentPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}
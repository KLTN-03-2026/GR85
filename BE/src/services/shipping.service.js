import { serializeData } from "../utils/serialize.js";

const DEFAULT_CATEGORY_WEIGHT_GRAMS = {
  cpu: 300,
  gpu: 1200,
  ram: 150,
  storage: 200,
  motherboard: 800,
  psu: 2000,
  case: 7000,
  cooling: 700,
};

const PROVIDER_TABLE = {
  GHN: {
    baseFee: 18000,
    per500g: 4000,
    codSurcharge: 5000,
    etaDays: [1, 3],
  },
  VIETTEL_POST: {
    baseFee: 16000,
    per500g: 3500,
    codSurcharge: 4000,
    etaDays: [2, 4],
  },
};

export function estimateShippingFromCartItems(input = {}) {
  const provider = resolveProvider(input.provider);
  const cartItems = Array.isArray(input.cartItems) ? input.cartItems : [];
  const addressText = String(input.addressText ?? "").trim();
  const isCodOrder = Boolean(input.isCodOrder);

  const totalWeightGrams = cartItems.reduce((sum, item) => {
    const qty = Math.max(1, Number(item.quantity ?? 1));
    const grams = resolveProductWeightGrams(item.product);
    return sum + grams * qty;
  }, 0);

  const distanceFactor = estimateDistanceFactor(addressText);
  const providerConfig = PROVIDER_TABLE[provider];
  const stepUnits = Math.max(0, Math.ceil(Math.max(0, totalWeightGrams - 500) / 500));
  const base = providerConfig.baseFee + stepUnits * providerConfig.per500g;
  const distanceAdjusted = Math.round(base * distanceFactor);
  const codFee = isCodOrder ? providerConfig.codSurcharge : 0;
  const fee = distanceAdjusted + codFee;

  return serializeData({
    provider,
    currency: "VND",
    totalWeightGrams,
    estimatedFee: fee,
    feeBreakdown: {
      baseFee: providerConfig.baseFee,
      weightFee: stepUnits * providerConfig.per500g,
      distanceMultiplier: Number(distanceFactor.toFixed(2)),
      codSurcharge: codFee,
    },
    estimatedDeliveryDays: {
      min: providerConfig.etaDays[0],
      max: providerConfig.etaDays[1],
    },
    estimatedDeliveryText: `${providerConfig.etaDays[0]}-${providerConfig.etaDays[1]} ngày`,
  });
}

function resolveProvider(inputProvider) {
  const normalized = String(inputProvider ?? "GHN").trim().toUpperCase();
  if (normalized === "VIETTEL" || normalized === "VIETTELPOST") {
    return "VIETTEL_POST";
  }
  return normalized === "VIETTEL_POST" ? "VIETTEL_POST" : "GHN";
}

function resolveProductWeightGrams(product) {
  const specifications = product?.specifications ?? {};
  const directWeight = Number(
    specifications.weightGrams ?? specifications.weight ?? specifications.shippingWeight,
  );

  if (Number.isFinite(directWeight) && directWeight > 0) {
    return Math.round(directWeight);
  }

  const categorySlug = String(product?.category?.slug ?? "").toLowerCase();
  if (DEFAULT_CATEGORY_WEIGHT_GRAMS[categorySlug]) {
    return DEFAULT_CATEGORY_WEIGHT_GRAMS[categorySlug];
  }

  return 500;
}

function estimateDistanceFactor(addressText) {
  const normalized = normalizeText(addressText);
  if (!normalized) {
    return 1;
  }

  if (
    normalized.includes("ho chi minh") ||
    normalized.includes("hcm") ||
    normalized.includes("ha noi")
  ) {
    return 1;
  }

  if (
    normalized.includes("da nang") ||
    normalized.includes("can tho") ||
    normalized.includes("hai phong")
  ) {
    return 1.15;
  }

  return 1.3;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

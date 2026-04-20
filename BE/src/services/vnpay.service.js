import crypto from "node:crypto";
import QRCode from "qrcode";
import { env } from "../config/env.js";

const VNP_VERSION = "2.1.0";
const VNP_COMMAND = "pay";
const VNP_CURR_CODE = "VND";
const VNP_ORDER_TYPE = "other";

export function createVnpayPaymentUrl({
  amount,
  orderId,
  ipAddress,
  bankCode,
  locale = "vn",
}) {
  validateVnpConfig();

  const createDate = formatVnpDate(new Date());
  const expireDate = formatVnpDate(new Date(Date.now() + 15 * 60 * 1000));
  const txnRef = `ORDER_${orderId}_${Date.now()}`;

  const params = {
    vnp_Version: VNP_VERSION,
    vnp_Command: VNP_COMMAND,
    vnp_TmnCode: env.VNP_TMN_CODE,
    vnp_Amount: String(Math.round(Number(amount) * 100)),
    vnp_CurrCode: VNP_CURR_CODE,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
    vnp_OrderType: VNP_ORDER_TYPE,
    vnp_Locale: locale,
    vnp_ReturnUrl: env.VNP_RETURN_URL,
    vnp_IpAddr: normalizeIp(ipAddress),
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) {
    params.vnp_BankCode = bankCode;
  }

  const signedParams = signParams(params, env.VNP_HASH_SECRET);
  return {
    paymentUrl: `${env.VNP_URL}?${toQueryString(signedParams)}`,
    txnRef,
  };
}

export function verifyVnpayCallback(query) {
  validateVnpConfig();

  const secureHash = String(query?.vnp_SecureHash ?? "");
  const data = { ...query };
  delete data.vnp_SecureHash;
  delete data.vnp_SecureHashType;

  const signed = signParams(data, env.VNP_HASH_SECRET);
  const expectedHash = signed.vnp_SecureHash;

  return {
    isValidSignature:
      secureHash.toUpperCase() === String(expectedHash).toUpperCase(),
    payload: data,
  };
}

export function parseOrderIdFromTxnRef(txnRef) {
  const value = String(txnRef ?? "");
  const match = value.match(/^ORDER_(\d+)_\d+$/);
  return match ? Number(match[1]) : null;
}

function signParams(params, hashSecret) {
  const sorted = sortParams(params);
  const raw = toSignData(sorted);
  const secureHash = crypto
    .createHmac("sha512", hashSecret)
    .update(Buffer.from(raw, "utf-8"))
    .digest("hex");

  return {
    ...sorted,
    vnp_SecureHash: secureHash,
  };
}

function sortParams(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .reduce((result, key) => {
      result[key] = String(params[key]);
      return result;
    }, {});
}

function toSignData(sortedParams) {
  return Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${encodeValue(value)}`)
    .join("&");
}

function toQueryString(sortedParams) {
  return Object.entries(sortedParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function encodeValue(value) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function formatVnpDate(input) {
  const date = new Date(input);

  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ];

  return parts.join("");
}

function normalizeIp(ipAddress) {
  const ip = String(ipAddress ?? "").trim();
  if (!ip) {
    return "127.0.0.1";
  }

  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }

  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }

  return ip;
}

function validateVnpConfig() {
  if (!env.VNP_TMN_CODE || !env.VNP_HASH_SECRET || !env.VNP_URL || !env.VNP_RETURN_URL) {
    throw new Error("VNPAY configuration is incomplete");
  }
}

export function generateMockVnpayPaymentCode() {
  const prefix = "MOCK";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export async function createMockVnpayQrCode({
  paymentCode,
  orderId,
  amount,
  bankBin,
  bankName,
  accountNumber,
  accountName,
  transferContent,
  template,
}) {
  try {
    const normalizedAmount = Math.max(0, Math.round(Number(amount) || 0));
    const normalizedBin = String(bankBin ?? "").trim() || env.MOCK_QR_BANK_BIN;
    const normalizedBankName =
      String(bankName ?? "").trim() || env.MOCK_QR_BANK_NAME;
    const normalizedAccountNumber =
      String(accountNumber ?? "").trim() || env.MOCK_QR_ACCOUNT_NO;
    const normalizedAccountName =
      String(accountName ?? "").trim() || env.MOCK_QR_ACCOUNT_NAME;
    const normalizedTemplate =
      String(template ?? "").trim() || env.MOCK_QR_TEMPLATE;
    const normalizedTransferContent =
      String(transferContent ?? "").trim() || `TT DON ${orderId} ${paymentCode}`;

    const hasVietQrData = normalizedBin && normalizedAccountNumber;

    let qrCodeDataUrl = "";
    if (hasVietQrData) {
      qrCodeDataUrl = buildVietQrImageUrl({
        bankBin: normalizedBin,
        accountNumber: normalizedAccountNumber,
        accountName: normalizedAccountName,
        amount: normalizedAmount,
        addInfo: normalizedTransferContent,
        template: normalizedTemplate,
      });
    } else {
      const qrData = JSON.stringify({
        type: "VNPAY_MOCK",
        paymentCode,
        orderId,
        amount: normalizedAmount,
        timestamp: new Date().toISOString(),
      });

      qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: "H",
        type: "image/png",
        quality: 0.95,
        margin: 1,
        width: 300,
      });
    }

    return {
      paymentCode,
      qrCodeDataUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      bankTransfer: {
        bankBin: normalizedBin,
        bankName: normalizedBankName,
        accountNumber: normalizedAccountNumber,
        accountName: normalizedAccountName,
        transferContent: normalizedTransferContent,
        amount: normalizedAmount,
        template: normalizedTemplate,
        qrProvider: hasVietQrData ? "VietQR" : "MockQR",
        supportedApps: [
          "Vietcombank Digibank",
          "BIDV SmartBanking",
          "Agribank Plus",
          "VietinBank iPay",
          "MB Bank App",
          "Techcombank Mobile",
          "TPBank Mobile",
          "VPBank NEO",
          "ACB ONE",
          "Sacombank Pay",
          "MoMo",
          "ZaloPay",
        ],
      },
    };
  } catch (error) {
    console.error("Lỗi khi tạo mã QR:", error);
    throw new Error(`Không thể tạo mã QR: ${error.message}`);
  }
}

function buildVietQrImageUrl({
  bankBin,
  accountNumber,
  accountName,
  amount,
  addInfo,
  template,
}) {
  const normalizedAmount = Math.max(0, Math.round(Number(amount) || 0));
  const query = new URLSearchParams({
    amount: String(normalizedAmount),
    addInfo: String(addInfo ?? ""),
    accountName: String(accountName ?? ""),
  });

  return `https://img.vietqr.io/image/${encodeURIComponent(String(bankBin))}-${encodeURIComponent(
    String(accountNumber),
  )}-${encodeURIComponent(String(template || "compact2"))}.png?${query.toString()}`;
}

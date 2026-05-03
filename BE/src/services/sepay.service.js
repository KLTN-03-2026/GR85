import { env } from "../config/env.js";

export function createSepayQrCode({ orderId, amount, transferContent }) {
  // Use mock bank configs as default fallback if not configured for SePay specifically
  // In a real scenario, these would be specific SePay account details
  const bankBin = env.MOCK_QR_BANK_BIN || "970422"; 
  const bankAccount = env.MOCK_QR_ACCOUNT_NO || "19031111111111";
  
  // SePay QR generation URL
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankAccount}&bank=${bankBin}&amount=${amount}&des=${encodeURIComponent(transferContent)}`;
  
  return {
    qrCodeDataUrl: qrUrl,
    bankTransfer: {
      bankName: env.MOCK_QR_BANK_NAME || "MB Bank",
      accountNo: bankAccount,
      accountName: env.MOCK_QR_ACCOUNT_NAME || "TECHBUILTAI",
      content: transferContent,
      amount: amount
    }
  };
}

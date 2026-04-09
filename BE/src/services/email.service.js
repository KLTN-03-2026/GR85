import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL,
    pass: env.APP_PASSWORD,
  },
});

export async function sendPaymentCodeEmail(userEmail, { paymentCode, orderId, totalAmount, qrCodeDataUrl }) {
  try {
    const mailOptions = {
      from: `"PC Perfect" <${env.EMAIL}>`,
      to: userEmail,
      subject: `Mã thanh toán tạm thời - Đơn hàng #${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-bottom: 20px;">Thanh toán đơn hàng</h1>
            
            <p style="color: #4b5563; margin-bottom: 15px;">
              Cảm ơn bạn đã dùng dịch vụ của chúng tôi. Dưới đây là thông tin thanh toán tạm thời:
            </p>

            <div style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 10px 0; color: #374151;"><strong>Mã thanh toán:</strong></p>
              <p style="font-size: 24px; font-weight: bold; color: #10b981; margin: 10px 0; letter-spacing: 2px;">
                ${paymentCode}
              </p>
            </div>

            ${qrCodeDataUrl ? `
              <div style="text-align: center; margin: 25px 0;">
                <p style="color: #4b5563; margin-bottom: 10px;">Quét mã QR để xác nhận thanh toán:</p>
                <img src="${qrCodeDataUrl}" alt="Payment QR Code" style="width: 250px; height: 250px; border: 2px solid #e5e7eb; border-radius: 8px;" />
              </div>
            ` : ""}

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 5px 0; color: #1e40af;"><strong>Mã đơn hàng:</strong> #${orderId}</p>
              <p style="margin: 5px 0; color: #1e40af;"><strong>Tổng tiền:</strong> ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalAmount)}</p>
              <p style="margin: 5px 0; color: #1e40af; font-size: 12px;">Hãy giữ kín mã thanh toán này</p>
            </div>

            <p style="color: #6b7280; margin-top: 20px; font-size: 12px;">
              Đây là email tự động, vui lòng không trả lời. Nếu bạn có bất kỳ câu hỏi nào, hãy liên hệ với bộ phận hỗ trợ khách hàng.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send payment email: ${error.message}`);
  }
}

export async function sendOrderConfirmationEmail(userEmail, { orderId, totalAmount, shippingAddress }) {
  try {
    const mailOptions = {
      from: `"PC Perfect" <${env.EMAIL}>`,
      to: userEmail,
      subject: `Xác nhận đơn hàng - Đơn hàng #${orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-bottom: 20px;">Đơn hàng đã được xác nhận</h1>
            
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 5px 0; color: #065f46;"><strong>Mã đơn hàng:</strong> #${orderId}</p>
              <p style="margin: 5px 0; color: #065f46;"><strong>Tổng tiền:</strong> ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalAmount)}</p>
              <p style="margin: 5px 0; color: #065f46;"><strong>Địa chỉ giao hàng:</strong> ${shippingAddress}</p>
            </div>

            <p style="color: #6b7280; margin-top: 20px; font-size: 12px;">
              Cảm ơn bạn đã mặc hàng!
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    throw new Error(`Failed to send confirmation email: ${error.message}`);
  }
}

export async function sendWalletTopUpEmail(userEmail, { fullName, amount, balance, paymentCode, qrCodeDataUrl }) {
  try {
    const formattedAmount = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
    const formattedBalance = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(balance);

    const mailOptions = {
      from: `"PC Perfect" <${env.EMAIL}>`,
      to: userEmail,
      subject: `Xác nhận nạp tiền tài khoản${fullName ? ` - ${fullName}` : ""}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color: #1f2937; margin-bottom: 20px;">Bạn đã nạp tiền vào tài khoản</h1>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 5px 0; color: #1e40af;"><strong>Số tiền nạp:</strong> ${formattedAmount}</p>
              <p style="margin: 5px 0; color: #1e40af;"><strong>Số dư mới:</strong> ${formattedBalance}</p>
              <p style="margin: 5px 0; color: #1e40af;"><strong>Mã nạp tiền:</strong> ${paymentCode}</p>
            </div>

            ${qrCodeDataUrl ? `
              <div style="text-align: center; margin: 25px 0;">
                <p style="color: #4b5563; margin-bottom: 10px;">Quét mã QR để xác nhận nạp tiền:</p>
                <img src="${qrCodeDataUrl}" alt="Top up QR Code" style="width: 250px; height: 250px; border: 2px solid #e5e7eb; border-radius: 8px;" />
              </div>
            ` : ""}

            <p style="color: #6b7280; margin-top: 20px; font-size: 12px;">
              Email tự động này xác nhận giao dịch nạp tiền của bạn.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending wallet top-up email:", error);
    throw new Error(`Failed to send wallet top-up email: ${error.message}`);
  }
}

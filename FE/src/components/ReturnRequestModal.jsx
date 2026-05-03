import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Vietnamese banks list
const VIETNAMESE_BANKS = [
  { code: "VCB", name: "Ngân hàng Vietcombank" },
  { code: "BIDV", name: "Ngân hàng BIDV" },
  { code: "TCB", name: "Ngân hàng Techcombank" },
  { code: "MBB", name: "Ngân hàng MB" },
  { code: "ACB", name: "Ngân hàng ACB" },
  { code: "VPB", name: "Ngân hàng VP Bank" },
  { code: "STB", name: "Ngân hàng Sacombank" },
  { code: "HDB", name: "Ngân hàng HDBank" },
  { code: "TPB", name: "Ngân hàng TPBank" },
  { code: "VIB", name: "Ngân hàng VIB" },
  { code: "SHB", name: "Ngân hàng SHB" },
  { code: "EXB", name: "Ngân hàng Eximbank" },
  { code: "BAB", name: "Ngân hàng Bắc Á" },
  { code: "OJB", name: "Ngân hàng Ổn Định" },
  { code: "SEA", name: "Ngân hàng SeABank" },
];


export default function ReturnRequestModal({
  isOpen,
  onClose,
  order,
  onSubmit,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    reason: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  });

  const [errors, setErrors] = useState({});
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.reason || formData.reason.length < 10) {
      newErrors.reason = "Lý do trả hàng phải có ít nhất 10 ký tự";
    }

    if (!formData.bankName) {
      newErrors.bankName = "Vui lòng chọn ngân hàng";
    }

    if (
      !formData.bankAccountNumber ||
      formData.bankAccountNumber.length < 8
    ) {
      newErrors.bankAccountNumber = "Số tài khoản không hợp lệ (tối thiểu 8 ký tự)";
    }

    if (!formData.bankAccountName || formData.bankAccountName.length < 3) {
      newErrors.bankAccountName = "Tên chủ tài khoản không hợp lệ (tối thiểu 3 ký tự)";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        orderId: order.id,
        ...formData,
      });
      setFormData({
        reason: "",
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: "",
      });
      setErrors({});
      onClose();
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yêu cầu trả hàng</DialogTitle>
          <DialogDescription>
            Vui lòng cung cấp thông tin về lý do trả hàng và tài khoản ngân hàng
            để nhận tiền hoàn lại
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="rounded-lg bg-secondary/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mã đơn hàng:</span>
                <span className="font-semibold">#{order.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng tiền:</span>
                <span className="font-semibold text-primary">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trạng thái:</span>
                <span className="font-semibold">{order.orderStatus}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Lý do trả hàng <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Nhập lý do trả hàng (tối thiểu 10 ký tự)"
                  className="w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                />
                {errors.reason && (
                  <p className="text-xs text-red-500">{errors.reason}</p>
                )}
              </div>

              {/* Bank Name - Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tên ngân hàng <span className="text-red-500">*</span>
                </label>
                <select
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {VIETNAMESE_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
                {errors.bankName && (
                  <p className="text-xs text-red-500">{errors.bankName}</p>
                )}
              </div>

              {/* Bank Account Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Số tài khoản ngân hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleInputChange}
                  placeholder="ví dụ: 1234567890"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={isSubmitting}
                />
                {errors.bankAccountNumber && (
                  <p className="text-xs text-red-500">{errors.bankAccountNumber}</p>
                )}
              </div>

              {/* Bank Account Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tên chủ tài khoản <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="bankAccountName"
                    value={formData.bankAccountName}
                    onChange={handleInputChange}
                    placeholder="Nhập tên chủ tài khoản"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.bankAccountName && (
                  <p className="text-xs text-red-500">{errors.bankAccountName}</p>
                )}
              </div>

              {/* Info */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-900 dark:text-blue-100 space-y-1">
                <p className="font-semibold">Lưu ý:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Chỉ được yêu cầu trả hàng trong vòng 3 ngày sau khi giao</li>
                  <li>Tiền hoàn lại sẽ được chuyển vào tài khoản ngân hàng của bạn</li>
                  <li>Vui lòng kiểm tra thông tin tài khoản trước khi gửi</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const API_BASE = "/api";
const STORAGE_TOKEN_KEY = "pc-perfect-token";

function extractApiErrorMessage(error, fallbackMessage) {
  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  const fieldErrors = error.issues?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const firstMessage = Object.values(fieldErrors)
      .flat()
      .find((item) => typeof item === "string" && item.trim());
    if (firstMessage) {
      return firstMessage;
    }
  }

  const formErrors = error.issues?.formErrors;
  if (Array.isArray(formErrors)) {
    const firstFormError = formErrors.find(
      (item) => typeof item === "string" && item.trim(),
    );
    if (firstFormError) {
      return firstFormError;
    }
  }

  return fallbackMessage;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem(STORAGE_TOKEN_KEY)}`,
  };
}

export const profileApi = {
  getProfile: async () => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Không thể tải hồ sơ");
    return response.json();
  },

  updateProfile: async (data) => {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Không thể cập nhật hồ sơ");
    }
    return response.json();
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const response = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Không thể đổi mật khẩu");
    }
    return response.json();
  },

  getMyOrders: async () => {
    const response = await fetch(`${API_BASE}/auth/my-orders`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải đơn hàng");
    }

    return response.json();
  },

  getMyOrderDetail: async (orderId) => {
    const response = await fetch(`${API_BASE}/auth/my-orders/${orderId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải chi tiết đơn hàng");
    }

    return response.json();
  },

  getMyReviews: async () => {
    const response = await fetch(`${API_BASE}/auth/my-reviews`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải lịch sử đánh giá");
    }

    return response.json();
  },

  getAddresses: async () => {
    const response = await fetch(`${API_BASE}/auth/addresses`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải địa chỉ");
    }

    return response.json();
  },

  createAddress: async (data) => {
    const response = await fetch(`${API_BASE}/auth/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(extractApiErrorMessage(error, "Không thể tạo địa chỉ"));
    }

    return response.json();
  },

  updateAddress: async (addressId, data) => {
    const response = await fetch(`${API_BASE}/auth/addresses/${addressId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        extractApiErrorMessage(error, "Không thể cập nhật địa chỉ"),
      );
    }

    return response.json();
  },

  deleteAddress: async (addressId) => {
    const response = await fetch(`${API_BASE}/auth/addresses/${addressId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể xóa địa chỉ");
    }

    return response.json();
  },

  getWallet: async () => {
    const response = await fetch(`${API_BASE}/auth/wallet`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải ví");
    }

    return response.json();
  },

  topUpWallet: async (data) => {
    const response = await fetch(`${API_BASE}/auth/wallet/top-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể nạp tiền vào ví");
    }

    return response.json();
  },

  getMyReturnRequests: async () => {
    const response = await fetch(`${API_BASE}/auth/returns`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải yêu cầu hoàn trả");
    }

    return response.json();
  },

  requestReturn: async (data) => {
    const response = await fetch(`${API_BASE}/auth/returns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể yêu cầu hoàn trả");
    }

    return response.json();
  },

  getNotifications: async (limit = 20) => {
    const response = await fetch(
      `${API_BASE}/auth/notifications?limit=${limit}`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải thông báo");
    }

    return response.json();
  },

  markNotificationAsRead: async (notificationId) => {
    const response = await fetch(
      `${API_BASE}/auth/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể đánh dấu thông báo");
    }

    return response.json();
  },

  markAllNotificationsAsRead: async () => {
    const response = await fetch(
      `${API_BASE}/auth/notifications/mark-all-read`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể đánh dấu tất cả thông báo");
    }

    return response.json();
  },

  getMyReviews: async () => {
    const response = await fetch(`${API_BASE}/auth/my-reviews`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải lịch sử đánh giá");
    }

    return response.json();
  },

  getMyPendingReviews: async () => {
    const response = await fetch(`${API_BASE}/auth/my-reviews/pending`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải danh sách chưa đánh giá");
    }

    return response.json();
  },

  getMyReviewThread: async (reviewId) => {
    const response = await fetch(
      `${API_BASE}/auth/my-reviews/${reviewId}/thread`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Không thể tải hội thoại đánh giá");
    }

    return response.json();
  },

  replyToMyReview: async (reviewId, message) => {
    const response = await fetch(
      `${API_BASE}/auth/my-reviews/${reviewId}/reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ message }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(extractApiErrorMessage(error, "Không thể gửi phản hồi"));
    }

    return response.json();
  },
};

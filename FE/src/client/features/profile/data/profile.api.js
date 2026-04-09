const API_BASE = "/api";
const STORAGE_TOKEN_KEY = "pc-perfect-token";

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
    if (!response.ok) throw new Error("Failed to fetch profile");
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
      throw new Error(error.message || "Failed to update profile");
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
      throw new Error(error.message || "Failed to change password");
    }
    return response.json();
  },

  getMyOrders: async () => {
    const response = await fetch(`${API_BASE}/auth/my-orders`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to fetch orders");
    }

    return response.json();
  },

  getMyOrderDetail: async (orderId) => {
    const response = await fetch(`${API_BASE}/auth/my-orders/${orderId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to fetch order detail");
    }

    return response.json();
  },
};

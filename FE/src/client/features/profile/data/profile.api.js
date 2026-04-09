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

  getAddresses: async () => {
    const response = await fetch(`${API_BASE}/auth/addresses`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to fetch addresses");
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
      throw new Error(error.message || "Failed to create address");
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
      throw new Error(error.message || "Failed to update address");
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
      throw new Error(error.message || "Failed to delete address");
    }

    return response.json();
  },

  getWallet: async () => {
    const response = await fetch(`${API_BASE}/auth/wallet`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to fetch wallet");
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
      throw new Error(error.message || "Failed to top up wallet");
    }

    return response.json();
  },

  getMyReturnRequests: async () => {
    const response = await fetch(`${API_BASE}/auth/returns`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to fetch return requests");
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
      throw new Error(error.message || "Failed to request return");
    }

    return response.json();
  },
};

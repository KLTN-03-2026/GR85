const API_BASE = "/api/auth";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed");
  }

  return data;
}

export const authApi = {
  login(payload) {
    return request("/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  register(payload) {
    return request("/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  verifyEmail(payload) {
    return request("/verify-email", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  resendVerification(payload) {
    return request("/resend-verification", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  forgotPassword(payload) {
    return request("/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  resetPassword(payload) {
    return request("/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

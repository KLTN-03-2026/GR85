const API_BASE = "/api/chat";

function buildAuthHeaders(token, extra = {}) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function parseJsonResponse(response) {
  const raw = await response.text().catch(() => "");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

async function request(path, { token, method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: buildAuthHeaders(token, headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(String(payload?.message ?? "Không thể xử lý yêu cầu chat"));
  }

  return payload;
}

export function openChatRoom(token) {
  return request("/room/open", {
    token,
    method: "POST",
  });
}

export function listRoomMessages(token, roomId, page = 1, pageSize = 50) {
  return request(`/${roomId}?page=${page}&pageSize=${pageSize}`, {
    token,
  });
}

export function sendRoomMessage(token, payload) {
  return request("/send", {
    token,
    method: "POST",
    body: payload,
  });
}

export function markRoomRead(token, roomId) {
  return request(`/${roomId}/read`, {
    token,
    method: "POST",
  });
}

export function voteRoom(token, roomId, vote) {
  return request(`/${roomId}/vote`, {
    token,
    method: "POST",
    body: { vote },
  });
}

export function listAdminRooms(token) {
  return request("/admin/rooms", { token });
}

export function markAdminDone(token, roomId) {
  return request(`/admin/rooms/${roomId}/done`, {
    token,
    method: "POST",
  });
}

export function listModerationTerms(token) {
  return request("/admin/moderation/terms", { token });
}

export function createModerationTerm(token, term) {
  return request("/admin/moderation/terms", {
    token,
    method: "POST",
    body: { term },
  });
}

export function deleteModerationTerm(token, termId) {
  return request(`/admin/moderation/terms/${termId}`, {
    token,
    method: "DELETE",
  });
}

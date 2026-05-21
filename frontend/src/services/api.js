const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";

const API_BASE_URL = backendUrl
  ? backendUrl.endsWith("/api")
    ? backendUrl
    : `${backendUrl.replace(/\/$/, "")}/api`
  : "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}

export function fetchSeatStatus() {
  return request("/seats/status");
}

export function createBooking(payload) {
  return request("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminBookings(token) {
  return request("/admin/bookings", {
    headers: { "x-admin-token": token },
  });
}

export function fetchAdminStats(token) {
  return request("/admin/stats", {
    headers: { "x-admin-token": token },
  });
}

export function updateBookingStatus(id, status, token) {
  return request(`/admin/bookings/${id}/status`, {
    method: "PATCH",
    headers: { "x-admin-token": token },
    body: JSON.stringify({ status }),
  });
}

export function resetBookings(token) {
  return request("/admin/bookings", {
    method: "DELETE",
    headers: { "x-admin-token": token },
  });
}

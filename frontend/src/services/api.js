const API_BASE_URL = "/api";

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

export function fetchDiscountSetting(token) {
  return request("/admin/settings/discount", {
    headers: { "x-admin-token": token },
  });
}

export function updateDiscountSetting(discountEnabled, token) {
  return request("/admin/settings/discount", {
    method: "PATCH",
    headers: { "x-admin-token": token },
    body: JSON.stringify({ discountEnabled }),
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

export function signupUser(payload) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logoutUser() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export function fetchCurrentUser() {
  return request("/auth/me");
}

export function fetchUserBookings() {
  return request("/user/bookings");
}

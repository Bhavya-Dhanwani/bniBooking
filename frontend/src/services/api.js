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
    throw new Error(getSafeErrorMessage(payload.message));
  }

  if (response.status === 204) return null;
  return response.json();
}

function getSafeErrorMessage(message) {
  const text = String(message || "");
  const databaseErrorSignals = [
    "buffering timed out",
    "querySrv",
    "ECONNREFUSED",
    "Server selection timed out",
    "MONGO_URI",
    "mongodb",
    "mongoose",
  ];

  if (databaseErrorSignals.some((signal) => text.toLowerCase().includes(signal.toLowerCase()))) {
    return "Booking service is temporarily unavailable. Please try again in a few minutes.";
  }

  return text || "Request failed";
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

export function fetchSiteSetting(token) {
  return request("/admin/settings/site", {
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

export function updateSiteSetting(siteDown, token) {
  return request("/admin/settings/site", {
    method: "PATCH",
    headers: { "x-admin-token": token },
    body: JSON.stringify({ siteDown }),
  });
}

export function createNormalAdmin(displayName, password, token) {
  return request("/admin/access", {
    method: "POST",
    headers: { "x-admin-token": token },
    body: JSON.stringify({ displayName, password }),
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

export function updateUserBookingPhone(bookingId, phone) {
  return request("/user/bookings", {
    method: "PATCH",
    body: JSON.stringify({ bookingId, phone }),
  });
}

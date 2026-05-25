const ADMIN_TOKEN_KEY = "bniAdminToken";
const ADMIN_TOKEN_MAX_AGE_SECONDS = 2 * 60 * 60;

function getCookieValue(name) {
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return getCookieValue(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  document.cookie = `${ADMIN_TOKEN_KEY}=${encodeURIComponent(token)}; Max-Age=${ADMIN_TOKEN_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function clearAdminToken() {
  document.cookie = `${ADMIN_TOKEN_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
}

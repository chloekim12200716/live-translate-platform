const ADMIN_TOKEN_STORAGE_KEY = "adminToken";

export function getAdminToken() {
  if (typeof window === "undefined") return "";

  const tokenFromUrl = new URLSearchParams(window.location.search).get("adminToken")?.trim() ?? "";
  if (tokenFromUrl) {
    try {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, tokenFromUrl);
    } catch {
      // Ignore storage failures; the URL token can still be used for this page load.
    }
    return tokenFromUrl;
  }

  try {
    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function appendAdminTokenToUrl(url: string) {
  const adminToken = getAdminToken();
  if (!adminToken || typeof window === "undefined") return url;

  const nextUrl = new URL(url, window.location.href);
  nextUrl.searchParams.set("adminToken", adminToken);
  return nextUrl.toString();
}

export function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const adminToken = getAdminToken();
  if (!adminToken) return fetch(input, init);

  const headers = new Headers(init.headers);
  headers.set("x-admin-token", adminToken);
  return fetch(input, {
    ...init,
    headers
  });
}

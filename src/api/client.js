import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

// ---- Token helpers ----
let TOKEN = (localStorage.getItem("token") || "").trim();
export function setToken(t) {
  TOKEN = t || null;
  if (TOKEN) localStorage.setItem("token", TOKEN);
  else localStorage.removeItem("token");
}

// ---- Tenant helpers ----
export function getTenantSlug() {
  return localStorage.getItem("tenant") || null;
}
export function setTenantSlug(slug) {
  if (!slug) {
    localStorage.removeItem("tenant");
    return;
  }
  // sanitize to avoid “non ISO-8859-1 code point” header errors
  const safe = String(slug).replace(/[^\w.\-]/g, "");
  localStorage.setItem("tenant", safe);
}

// Default a tenant from env (so it "just works" now)
const DEFAULT_TENANT =
  process.env.REACT_APP_TENANT_SLUG ||
  (import.meta.env && import.meta.env.VITE_TENANT_SLUG);
if (!getTenantSlug() && DEFAULT_TENANT) {
  setTenantSlug(DEFAULT_TENANT);
}

// Attach headers
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (TOKEN) config.headers.Authorization = `Bearer ${TOKEN}`;
  const tenant = getTenantSlug();
  if (tenant) config.headers["X-Tenant"] = tenant;
  config.headers.Accept = "application/json";
  return config;
});

// after the request interceptor
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 419) {
      // token invalid/expired — clean up quietly
      try { localStorage.removeItem("token"); } catch {}
      try { localStorage.removeItem("tenant"); } catch {}
      // don't hard redirect here if you have flows in-flight; just return the error
    }
    return Promise.reject(error);
  }
);
export default api;

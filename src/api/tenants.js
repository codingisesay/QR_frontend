// src/api/tenants.js
import api from "./client";

export async function initTenantOnboarding(payload) {
  // payload: { name, slug, mode: 'wallet'|'invoice', plan_id?, topup_cents?, provider?: 'stripe'|'razorpay' }
  const { data } = await api.post("/tenants/init", payload);
  return data;
}

export async function getTenantStatus(id) {
  const { data } = await api.get(`/tenants/${id}/status`);
  return data; // { id, slug, status }
}

export async function listPlans() {
  const { data } = await api.get("/plans");
  return data;
}

// Optional: to decide where to redirect after login
export async function myTenants() {
  const { data } = await api.get("/auth/my-tenants");
  return data; // [{id, slug, status}, ...]
}

// export async function listPlans() {
//   const { data } = await api.get("/plans", { headers: { "X-Tenant": "" } });
//   return data;
// }

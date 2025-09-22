// src/api/users.js
import api from "./client";

// Tenant-scoped
export async function listUsers() {
  const { data } = await api.get("/users");
  return data;
}

export async function createUser(payload) {
  // { name, email, password?, role: 'admin' | 'viewer' }
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(id, payload) {
  // { name?, password?, role?, status? }
  const { data } = await api.patch(`/users/${id}`, payload);
  return data;
}

export async function removeUser(id) {
  const { data } = await api.delete(`/users/${id}`);
  return data;
}

// Superadmin-only (optional)
export async function adminListUsers() {
  const { data } = await api.get("/admin/users", { headers: { "X-Tenant": "" } });
  return data;
}

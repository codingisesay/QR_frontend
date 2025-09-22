// src/api/auth.js
import api, { setToken } from "./client";

export async function register(payload) {
  // { name, email, password, password_confirmation }
  const { data } = await api.post("/auth/register", payload);
  return data;
}


export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  setToken(data.token);
  return data; // { token, user, roles?, permissions? }
}

export async function logout() {
  try { await api.post("/auth/logout"); } finally { setToken(null); }
}

export async function me() {
  const { data } = await api.get("/auth/me");
  return data; // { user, roles, permissions }
}

export async function resendVerificationPublic(email) {
  const { data } = await api.post("/auth/resend-verification", { email });
  return data;
}

export async function forgotPassword(email) {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword({ email, token, password, password_confirmation }) {
  const { data } = await api.post("/auth/reset-password", {
    email, token, password, password_confirmation,
  });
  return data;
}

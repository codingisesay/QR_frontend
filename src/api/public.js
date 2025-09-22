import api from "./client";

export async function fetchPublicPlans() {
  const { data } = await api.get("/public/plans");
  return data?.plans || [];
}

export async function sendContact(payload) {
  // { name, email, message }
  await api.post("/public/contact", payload);
}

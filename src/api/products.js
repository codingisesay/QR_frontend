// src/api/products.js
// import api, { getTenantSlug } from "./client";
import api from "./client";

// Build per-tenant prefix if we have a slug/id; otherwise fall back to header-only calls
// function prefix() {
//   const slug = getTenantSlug();
//   return slug ? `/t/${encodeURIComponent(slug)}` : "";
// }

function prefix() { return ""; }
// List products
export async function listProducts(params = {}) {
  const { data } = await api.get(`${prefix()}/products`, { params });
  return data;
}

// Create product
// payload:
// { sku, name, type? ("standard"|"composite"), status? ("active"|"archived"),
//   components?: [{ sku, quantity? }] }
// If type is omitted but components present, backend infers "composite".
export async function createProduct(payload) {
  const { data } = await api.post(`${prefix()}/products`, payload);
  return data;
}

// Update product
// You can pass { name?, sku?, type?, status?, components? }.
// If components is present, backend replaces the whole BOM for that product.
export async function updateProduct(id, payload) {
  const { data } = await api.patch(`${prefix()}/products/${id}`, payload);
  return data;
}

// Archive (soft-delete style)
export async function removeProduct(id) {
  const { data } = await api.delete(`${prefix()}/products/${id}`);
  return data;
}

// (optional) QR minting, if/when you expose it
export async function mintProductCodes(productIdOrSku, payload) {
  const id = encodeURIComponent(String(productIdOrSku));
  const { data } = await api.post(`${prefix()}/products/${productIdOrSku}/codes/mint`, payload);
  return data;
}

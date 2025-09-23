// src/api/qr.js
import client from "./client";

/**
 * List codes for a product (by id or SKU)
 */
export async function getCodesByProduct(idOrSku, limit = 50) {
  const { data } = await client.get(`/products/${encodeURIComponent(idOrSku)}/codes`, {
    params: { limit },
  });
  return data;
}

/**
 * List batches created for a product (by id or SKU)
 */
export async function getBatchesByProduct(idOrSku) {
  const { data } = await client.get(`/products/${encodeURIComponent(idOrSku)}/batches`);
  return data;
}

/**
 * List print runs within a batch
 */
export async function getRunsByBatch(batchId) {
  const { data } = await client.get(`/batches/${encodeURIComponent(batchId)}/runs`);
  return data;
}

/**
 * Get plan stats/limits for QR issuing
 */
export async function getQrPlanStats() {
  const { data } = await client.get("/qr/plan-stats");
  return data;
}

/**
 * Download a print run as a ZIP of labels
 */
export function exportPrintRunZip(printRunId) {
  const url = `${client.defaults.baseURL}/print-runs/${encodeURIComponent(printRunId)}/qr.zip`;
  window.open(url, "_blank");
}

/**
 * Get all codes belonging to a specific print run
 */
export async function getCodesByPrintRun(printRunId, limit = 100) {
  const { data } = await client.get(`/print-runs/${encodeURIComponent(printRunId)}/codes`, {
    params: { limit },
  });
  return data;
}

/**
 * Bind a bunch of devices (Excel/CSV parsed rows) to a product's issued labels.
 * If allocate=true → server assigns next-available tokens (optionally restricted to batch_code).
 * If allocate=false → each row must provide token.
 */
export async function bulkBindDevices(idOrSku, payload) {
  const { data } = await client.post(
    `/products/${encodeURIComponent(idOrSku)}/devices/bind-bulk`,
    payload
  );
  return data;
}

/**
 * Label stats per product (available, bound, voided, total)
 */
export async function getLabelStats(idOrSku) {
  const { data } = await client.get(`/products/${encodeURIComponent(idOrSku)}/label-stats`);
  return data;
}

/**
 * ✅ NEW: Link a parent device to multiple children for composite interlinking,
 * while keeping the UX identical to "standard" (issue → bind via Excel).
 *
 * Server endpoint expected:
 *   POST /devices/{parentUid}/assembly
 *   Body: { children: [childUid1, childUid2, ...] }
 */
export async function linkAssembly(parentUid, childUids) {
  const { data } = await client.post(
    `/devices/${encodeURIComponent(parentUid)}/assembly`,
    { children: childUids }
  );
  return data;
}

// src/api/qr.js
import client from "./client";

/**
 * List QR codes for a product (by id or SKU)
 */
export async function getCodesByProduct(idOrSku, limit = 50, page = 1) {
  const { data } = await client.get(
    `/products/${encodeURIComponent(idOrSku)}/codes`,
    { params: { limit, page } }
  );
  return data; // { items, next_page? }
}

/**
 * List batches created for a product (by id or SKU)
 */
export async function getBatchesByProduct(idOrSku, limit = 50, page = 1) {
  const { data } = await client.get(
    `/products/${encodeURIComponent(idOrSku)}/batches`,
    { params: { limit, page } }
  );
  return data; // { items, ... }
}

/**
 * List runs in a batch
 */
export async function getRunsByBatch(batchId, limit = 50, page = 1) {
  const { data } = await client.get(
    `/batches/${encodeURIComponent(batchId)}/runs`,
    { params: { limit, page } }
  );
  return data; // { items, ... }
}

/**
 * List all codes in a print run
 */
export async function getCodesByPrintRun(printRunId, limit = 500, page = 1) {
  const { data } = await client.get(
    `/print-runs/${encodeURIComponent(printRunId)}/codes`,
    { params: { limit, page } }
  );
  return data; // { items, ... }
}

/**
 * Plan / quota stats for QR issuing (monthly, max per batch, used this month)
 * Tries a couple of likely endpoints for compatibility across backends.
 */
export async function getQrPlanStats() {
  const tryPaths = [
    "/qr/plan-stats",
    "/plan/qr/stats",
    "/plan/qr",       // some backends use this
  ];
  let lastErr;
  for (const path of tryPaths) {
    try {
      const { data } = await client.get(path);
      return data; // { used_this_month, qr_month_limit, qr_max_batch, ... }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/**
 * Download a print run as a ZIP of labels (sends auth + tenant headers)
 */
export async function exportPrintRunZip(printRunId) {
  try {
    const url = `/print-runs/${encodeURIComponent(printRunId)}/qr.zip`;
    const resp = await client.get(url, { responseType: "blob" });

    // Try to infer filename from Content-Disposition
    const dispo = resp.headers?.["content-disposition"] || "";
    let filename = `print-run-${printRunId}.zip`;
    const m = dispo.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (m && m[1]) {
      try { filename = decodeURIComponent(m[1]); } catch {}
    }

    const blob = new Blob([resp.data], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    // Fallback: open direct URL if server allows unauthenticated download
    const base = client?.defaults?.baseURL?.replace(/\/+$/, "") || "";
    window.open(`${base}/print-runs/${encodeURIComponent(printRunId)}/qr.zip`, "_blank");
  }
}

/**
 * Bulk bind devices for a product (by id or SKU)
 * If allocate=true → backend allocates next available tokens (by batch/channel filters if provided)
 * If allocate=false → each row must provide token.
 *
 * payload = {
 *   allocate: boolean,
 *   batch_code?: string,
 *   devices: [{ device_uid, token?, attrs? }, ...]
 * }
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
  const { data } = await client.get(
    `/products/${encodeURIComponent(idOrSku)}/label-stats`
  );
  return data; // { sku, available, bound, voided, total }
}

/**
 * Link a parent device to multiple children (composite assembly)
 * Server endpoint:
 *   POST /devices/{parentUid}/assembly
 *   Body: { children: [childUid1, childUid2, ...] }
 */
export async function linkAssembly(parentUid, childUids) {
  const { data } = await client.post(
    `/devices/${encodeURIComponent(parentUid)}/assembly`,
    { children: childUids }
  );
  return data; // { parent, linked, missing[] }
}

/**
 * (Optional helper) Fetch assembly graph for a device.
 * GET /devices/{deviceUid}/assembly?with_qr=1
 */
export async function getAssembly(deviceUid, withQr = true) {
  const { data } = await client.get(
    `/devices/${encodeURIComponent(deviceUid)}/assembly`,
    { params: withQr ? { with_qr: 1 } : {} }
  );
  return data; // { parent, children: [...], ... }
}

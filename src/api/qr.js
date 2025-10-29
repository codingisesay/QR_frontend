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

// availability for product (optionally filtered by batch_code)
export async function getAvailabilityByProductBatch(idOrSku, batchCode) {
  const params = batchCode ? { batch_code: batchCode } : {};
  const { data } = await client.get(`/products/${encodeURIComponent(idOrSku)}/availability`, { params });
  return data || { available: 0, issued: 0, bound: 0 };
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
  const url = `/print-runs/${encodeURIComponent(printRunId)}/qr.zip`;
  const resp = await client.get(url, { responseType: "blob" });   // stays on the authed axios client

  // basic sanity check so we don’t “download” an HTML error page
  const ct = (resp.headers?.["content-type"] || "").toLowerCase();
  if (!ct.includes("zip") && !ct.includes("application/octet-stream")) {
    const text = await resp.data.text?.().catch(() => "");
    throw new Error(text || "Unexpected response while downloading ZIP.");
  }

  let filename = `qr-print-run-${printRunId}.zip`;
  const dispo = resp.headers?.["content-disposition"] || "";
  const m = dispo.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (m?.[1]) { try { filename = decodeURIComponent(m[1]); } catch {} }

  const blob = new Blob([resp.data], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
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

export async function getTenantSettings() {
  // Expect backend to return an object keyed by `key` with parsed JSON values, e.g.:
  // {
  //   "verification.default_mode": {"mode": "qr_nfc"},
  //   "nfc.key.current": {"key_ref": "DEFAULT-20251017-PURT"},
  //   "puf.policy": {"require_puf_for_authentic": false, "alg": "ORBv1", "threshold": 85}
  // }
  const { data } = await client.get("/tenant/settings");
  return data || {};
}

// Download a print run as a single PDF of QR labels laid out on a page grid.
// opts: {
//   paper?: 'a4'|'letter'|'legal'|'custom',
//   width_mm?: number, height_mm?: number, // required if paper='custom'
//   margin_mm?: number,                     // uniform margin
//   cols?: number, rows?: number,           // grid
//   gap_mm?: number,                        // gap between cells
//   qr_mm?: number,                         // QR side in mm (inside each cell)
//   show_text?: 0|1,                        // show human code under QR
//   font_pt?: number,                       // text size
// }
export async function exportPrintRunPdf(printRunId, opts = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const url = `/print-runs/${encodeURIComponent(printRunId)}/qr.pdf?` + params.toString();
  const resp = await client.get(url, { responseType: "blob" });

  const ct = (resp.headers?.["content-type"] || "").toLowerCase();
  if (!ct.includes("pdf")) {
    const text = await resp.data.text?.().catch(() => "");
    throw new Error(text || "Unexpected response while downloading PDF.");
  }

  let filename = `qr-print-run-${printRunId}.pdf`;
  const dispo = resp.headers?.["content-disposition"] || "";
  const m = dispo.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (m?.[1]) { try { filename = decodeURIComponent(m[1]); } catch {} }

  const blob = new Blob([resp.data], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

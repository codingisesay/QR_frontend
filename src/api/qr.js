// src/api/qr.js
import client from "./client";

export async function getCodesByProduct(idOrSku, limit = 50) {
  const { data } = await client.get(`/products/${encodeURIComponent(idOrSku)}/codes`, {
    params: { limit },
  });
  return data;
}

export async function getBatchesByProduct(idOrSku) {
  const { data } = await client.get(`/products/${encodeURIComponent(idOrSku)}/batches`);
  return data;
}

export async function getRunsByBatch(batchId) {
  const { data } = await client.get(`/batches/${encodeURIComponent(batchId)}/runs`);
  return data;
}

export async function getQrPlanStats() {
  const { data } = await client.get("/qr/plan-stats");
  return data;
}

export function exportPrintRunZip(printRunId) {
  const url = `${client.defaults.baseURL}/print-runs/${encodeURIComponent(printRunId)}/qr.zip`;
  window.open(url, "_blank");
}

export async function getCodesByPrintRun(printRunId, limit = 100) {
  const { data } = await client.get(`/print-runs/${encodeURIComponent(printRunId)}/codes`, {
    params: { limit },
  });
  return data;
}

export async function bulkBindDevices(idOrSku, payload) {
  const { data } = await client.post(`/products/${encodeURIComponent(idOrSku)}/devices/bind-bulk`, payload);
  return data;
}

export async function getLabelStats(idOrSku) {
  const { data } = await client.get(`/products/${encodeURIComponent(idOrSku)}/label-stats`);
  return data;
}

/** NEW: one-click composite cascade (root + all BOM parts → devices + QR + assembly) */
export async function compositeMintAssemble(body) {
  // body: { root_sku, roots_qty, channel_code, batch_code?, print_vendor? }
  const { data } = await client.post("/qr/composite/mint-assemble", body);
  return data; // { print_run_id, root:{...}, roots:[...], minted:{...} }
}

/**
 * Link a parent device to multiple children (interlinking for composite).
 * POST /devices/{parentUid}/assembly  { children: [childUid1, childUid2, ...] }
 */
export async function linkAssembly(parentUid, childUids) {
  const { data } = await client.post(
    `/devices/${encodeURIComponent(parentUid)}/assembly`,
    { children: childUids }
  );
  return data;
}

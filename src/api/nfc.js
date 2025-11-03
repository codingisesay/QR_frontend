// src/api/nfc.js
import api from "./client";

// POST /nfc/provision/bulk (multipart/form-data)
export async function provisionNfcBulk({ file, tenant_id, default_key_ref, default_chip_family, default_status }) {
  const fd = new FormData();
  fd.append("file", file);
  if (tenant_id) fd.append("tenant_id", tenant_id);
  if (default_key_ref) fd.append("default_key_ref", default_key_ref);
  if (default_chip_family) fd.append("default_chip_family", default_chip_family);
  if (default_status) fd.append("default_status", default_status);

  const { data } = await api.post("/nfc/provision/bulk", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// POST /nfc/keys  (optional helper)
export async function createNfcKey(payload /* { key_ref, chip_family, status?, tenant_id? } */) {
  const { data } = await api.post("/nfc/keys", payload);
  return data;
}

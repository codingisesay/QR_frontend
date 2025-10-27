// src/layouts/qr/index.js
import { useEffect, useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";
import QRCode from "react-qr-code";
import client from "../../api/client";

// @mui
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import { IconButton, Tooltip, Snackbar } from "@mui/material";

// MD2 components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDSelect from "components/MDSelect";
import MDButton from "components/MDButton";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";

// API
import { listProducts, mintProductCodes } from "api/products";
import {
  getQrPlanStats,
  exportPrintRunZip,
  getBatchesByProduct,
  getRunsByBatch,
  bulkBindDevices,
  getLabelStats,
  getCodesByPrintRun,           // preview helper
  linkAssembly,                 // parent↔children linking
} from "api/qr";
import { getTenantSettings } from "api/qr";   // NEW: tenant defaults for mint

/* =========================
+   Human/Micro code helpers
+   ========================= */

function base32CrockfordFromBytes(bytes, outLen = 12) {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length && out.length < outLen; i += 5) {
    out += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}
function hcFromMicroHex(microHex) {
  if (!microHex || typeof microHex !== "string") return null;
  const hex = microHex.replace(/[^0-9a-f]/gi, "").slice(0, 16);
  if (hex.length < 2) return null;
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  return base32CrockfordFromBytes(bytes, 12);
}
function pickHumanCode(row) {
  const c =
    row?.human_code ||
    row?.micro_code ||
    row?.qr_human_code ||
    row?.qr_micro_code ||
    null;
  if (c) return String(c).toUpperCase();
  const derived = hcFromMicroHex(row?.micro_hex);
  return derived ? derived.toUpperCase() : null;
}

/* Build the base for public verify URLs (e.g., http://127.0.0.1:8000) */
function getVerifyBase() {
  const env =
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_VERIFY_BASE_URL
      ? process.env.REACT_APP_VERIFY_BASE_URL
      : "";

  if (typeof window !== "undefined" && window.__VERIFY_BASE__) {
    return String(window.__VERIFY_BASE__).replace(/\/+$/, "");
  }
  if (env) return env.replace(/\/+$/, "");

  try {
    const base = client?.defaults?.baseURL || "";
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return window.location.origin.replace(/\/+$/, "");
  }
}

function useQuery() {
  const { search } = window.location;
  return new URLSearchParams(search);
}

/* =========================
   Preview dialog (QR codes)
   ========================= */
function QrPreviewDialog({ open, onClose, printRunId }) {
  const isItemBound = (r) => {
    if (!r) return false;
    if (typeof r.is_bound !== "undefined") return r.is_bound === 1 || r.is_bound === true;
    if (typeof r.bound !== "undefined") return r.bound === 1 || r.bound === true;
    if (typeof r.bound_flag !== "undefined") return !!r.bound_flag;
    if (typeof r.bound_at !== "undefined") return !!r.bound_at;
    if (typeof r.bind_at !== "undefined") return !!r.bind_at;
    if (typeof r.boundOn !== "undefined") return !!r.boundOn;
    if (typeof r.boundAt !== "undefined") return !!r.boundAt;
    if (typeof r.device_uid !== "undefined") return !!r.device_uid;
    if (typeof r.deviceId !== "undefined") return !!r.deviceId;
    if (typeof r.device_id !== "undefined") return !!r.device_id;
    if (typeof r.bound_device_uid !== "undefined") return !!r.bound_device_uid;
    if (typeof r.linked_device_uid !== "undefined") return !!r.linked_device_uid;
    if (typeof r.status === "string") {
      const st = r.status.toLowerCase();
      if (st === "bound" || st === "activated" || st === "active" || st === "linked") return true;
      if (st === "issued" || st === "new" || st === "unbound") return false;
      return st !== "issued";
    }
    if (r.token && (r.uid || r.uid_hex || r.serial)) return true;
    return false;
  };

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [snack, setSnack] = useState("");
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("auto");
  const [grouped, setGrouped] = useState(true);
  const [assemblies, setAssemblies] = useState({});

  useEffect(() => {
    if (!open) return;
    setMode("auto");
    setGrouped(true);
    setFilter("all");
    setAssemblies({});
  }, [open, printRunId]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open || !printRunId) return;
      setLoading(true);
      setErr("");
      try {
        const data = await getCodesByPrintRun(printRunId, 500);
        const arr = (data.items || []).map(it => ({
          ...it,
          human_code: pickHumanCode(it),
        }));
        if (mounted) setItems(arr);
      } catch (e) {
        if (mounted)
          setErr(e?.response?.data?.message || e.message || "Failed to load QR codes.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [open, printRunId]);

  const inferredType = useMemo(() => {
    if (!items.length) return "standard";
    const hasParent = items.some((r) => r.role === "parent");
    const hasPart = items.some((r) => r.role === "part");
    return hasParent || hasPart ? "composite" : "standard";
  }, [items]);

  const effectiveType = mode === "auto" ? inferredType : mode;

  useEffect(() => {
    if (!items.length) return;
    const hasParent = items.some((r) => r.role === "parent");
    const hasPart = items.some((r) => r.role === "part");
    const isComposite = hasParent || hasPart;
    if (mode === "auto") {
      setGrouped(isComposite);
      setFilter("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    let cancel = false;
    async function fetchAssemblies() {
      if (effectiveType !== "composite" || !grouped) return;
      const parents = items.filter((r) => r.role === "parent" && r.device_uid);
      if (!parents.length) return;
      setLoading(true);
      try {
        const results = await Promise.all(
          parents.map(async (p) => {
            const { data } = await client.get(
              `/devices/${encodeURIComponent(p.device_uid)}/assembly?with_qr=1`
            );
            return [p.device_uid, data];
          })
        );
        if (!cancel) {
          const map = {};
          for (const [uid, data] of results) map[uid] = data;
          setAssemblies(map);
        }
      } catch (e) {
        if (!cancel)
          setErr(e?.response?.data?.message || e.message || "Failed to load assemblies.");
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    fetchAssemblies();
    return () => { cancel = true; };
  }, [effectiveType, grouped, items]);

  const buildUrl = (token, channel) => {
    const base = getVerifyBase();
    const ch = channel ? `?ch=${encodeURIComponent(channel)}` : "";
    return `${base}/v/${encodeURIComponent(token)}${ch}`;
  };

  const stdFiltered = items.filter((r) => {
    if (filter === "bound") return isItemBound(r);
    if (filter === "issued") return !isItemBound(r);
    return true;
  });

  const flatFiltered = items.filter((r) => {
    if (filter === "bound") return isItemBound(r);
    if (filter === "issued") return !isItemBound(r);
    if (filter === "parents") return r.role === "parent";
    if (filter === "parts") return r.role === "part";
    if (filter === "bom_missing") return r.role === "parent" && r.comp_ok === false;
    if (filter === "unassigned_parts")
      return r.role === "part" && !r.parent_device_uid;
    return true;
  });

  const Chip = ({ text, tone = "info" }) => {
    const map =
      {
        info: { fg: "#16537e", bg: "#e6f1fa", bd: "#c6e0f5" },
        ok: { fg: "#0a7a2a", bg: "#e9f9ef", bd: "#bfe8cb" },
        warn: { fg: "#9b6b00", bg: "#fff7e6", bd: "#ffe2a7" },
        danger: { fg: "#b03", bg: "#ffeef0", bd: "#ffd4d9" },
        part: { fg: "#4a2f7b", bg: "#efe7ff", bd: "#dacfff" },
        parent: { fg: "#184c2d", bg: "#e9f9ef", bd: "#bfe8cb" },
      }[tone] || { fg: "#16537e", bg: "#e6f1fa", bd: "#c6e0f5" };
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 999,
          fontSize: 12,
          color: map.fg,
          background: map.bg,
          border: `1px solid ${map.bd}`,
        }}
      >
        {text}
      </span>
    );
  };

  const QrTile = ({
    token,
    channel,
    sku,
    batch,
    seq,
    human,
    deviceUid,
    role,
    compCount,
    compReq,
    parentUid,
    isBound,
    composite = false,
  }) => {
    const hasToken = !!token;
    const url = hasToken ? buildUrl(token, channel) : null;
    const size = 148;
    const qs = new URLSearchParams();
    if (channel) qs.set("ch", channel);
    qs.set("w", String(size));
    const serverPng = hasToken ? `${getVerifyBase()}/qr/${encodeURIComponent(token)}.png?${qs.toString()}` : null;

    const shortPath = hasToken ? url.replace(getVerifyBase(), "") : "";
    const isParent = composite && role === "parent";
    const showRoleChip = composite;
    const showAssemblyLine = composite;

    const bomLabel = isParent
      ? compReq > 0
        ? `BOM: ${compCount || 0} / ${compReq}`
        : "BOM: —"
      : parentUid
      ? `IN ${parentUid}`
      : "UNASSIGNED";

    const bomTone = isParent
      ? compReq > 0
        ? Math.abs((compCount || 0) - (compReq || 0)) < 1e-9
          ? "ok"
          : "warn"
        : "info"
      : parentUid
      ? "ok"
      : "danger";

    return (
      <Card
        onClick={() => hasToken && window.open(url, "_blank", "noopener")}
        style={{
          padding: 12,
          cursor: hasToken ? "pointer" : "default",
          position: "relative",
          textAlign: "center",
          opacity: hasToken ? 1 : 0.75,
          border: isBound ? "1px solid #cfead8" : "1px solid #ffd4d9",
        }}
      >
        {showRoleChip && (
          <div style={{ position: "absolute", top: 8, left: 8 }}>
            <Chip text={isParent ? "ROOT" : "PART"} tone={isParent ? "parent" : "part"} />
          </div>
        )}

        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <Chip text={isBound ? "BOUND" : "ISSUED"} tone={isBound ? "ok" : "danger"} />
        </div>

        <div style={{ position: "relative", display: "inline-block" }}>
          {hasToken ? (
            <>
              {serverPng ? (
                <img
                  src={serverPng}
                  width={size}
                  height={size}
                  alt="QR"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.parentElement.querySelector(".__qr_fallback");
                    if (fallback) fallback.style.display = "block";
                  }}
                />
              ) : null}
              <div className="__qr_fallback" style={{ display: serverPng ? "none" : "block" }}>
                <QRCode value={url} size={148} />
              </div>

              {human && role === "parent" && (
                <div style={{ position: "absolute", right: 4, bottom: 4, background: "#fff", padding: 2, borderRadius: 4 }}>
                  <QRCode value={human} size={44} />
                </div>
              )}
              <div style={{ position: "absolute", right: 4, bottom: 4 }}>
                <Tooltip title="Copy verify URL">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(url);
                    }}
                    sx={{ background: "#fff", boxShadow: 1 }}
                  >
                    <Icon fontSize="small">content_copy</Icon>
                  </IconButton>
                </Tooltip>
              </div>
            </>
          ) : (
            <div
              style={{
                width: 148,
                height: 148,
                display: "grid",
                placeItems: "center",
                border: "1px dashed #bbb",
                borderRadius: 4,
              }}
            >
              <small>No QR bound</small>
            </div>
          )}
        </div>

        <MDTypography
          variant="caption"
          color="text"
          display="block"
          mt={1}
          sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
        >
          {(sku || "—")} • {(batch || "—")} • {seq ? `#${seq}` : ""}
        </MDTypography>
        {human && (
          <MDTypography
            variant="caption"
            color="text"
            display="block"
            sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
          >
            HC: {human}
          </MDTypography>
        )}
        <MDTypography variant="caption" color={isBound ? "success" : "text"} display="block">
          Device: {deviceUid || "—"}
        </MDTypography>

        {showAssemblyLine && (
          <MDBox mt={0.5}>
            <Chip text={bomLabel} tone={bomTone} />
          </MDBox>
        )}

        {hasToken && (
          <MDBox
            mt={0.75}
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}
          >
            <MDTypography
              variant="caption"
              color="text"
              sx={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, "_blank", "noopener");
              }}
              title={url}
            >
              {shortPath}
            </MDTypography>
            <Tooltip title="Copy URL">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(url);
                }}
              >
                <Icon fontSize="small">content_copy</Icon>
              </IconButton>
            </Tooltip>
          </MDBox>
        )}
      </Card>
    );
  };

  const GroupedComposite = () => {
    const roots = items.filter((r) => r.role === "parent");
    if (!roots.length)
      return <MDTypography variant="button" color="text">No root devices in this run.</MDTypography>;

    return (
      <MDBox sx={{ display: "grid", gap: 20 }}>
        {roots.map((root) => {
          const asm = assemblies[root.device_uid] || {};
          const children = asm.children || [];

          return (
            <div key={root.id} style={{ border: "1px solid #e6e8eb", borderRadius: 12, padding: 12 }}>
              <MDTypography variant="h6" mb={1}>
                Root: {root.sku} · {root.device_uid || "—"}
              </MDTypography>
              <MDBox sx={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
                <QrTile
                  token={root.token}
                  channel={root.channel}
                  sku={root.sku}
                  batch={root.batch}
                  seq={root.seq_in_run}
                  human={pickHumanCode(root)}
                  deviceUid={root.device_uid}
                  role="parent"
                  compCount={root.comp_count || 0}
                  compReq={root.comp_required || 0}
                  isBound={isItemBound(root)}
                  composite
                />
                <div>
                  <MDTypography variant="subtitle2" mb={1}>
                    Parts linked to this root
                  </MDTypography>
                  {children.length === 0 ? (
                    <MDTypography variant="button" color="text">
                      No parts assembled yet.
                    </MDTypography>
                  ) : (
                    <MDBox
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {children.map((ch, idx) => {
                        const token = ch.qr_token || "";
                        return (
                          <QrTile
                            key={`${root.device_uid}_${idx}`}
                            token={token}
                            channel={ch.qr_channel}
                            sku={ch.sku}
                            batch={null}
                            seq={null}
                            human={pickHumanCode(ch)}
                            deviceUid={ch.device_uid}
                            role="part"
                            compCount={0}
                            compReq={0}
                            parentUid={root.device_uid}
                            isBound={!!token}
                            composite
                          />
                        );
                      })}
                    </MDBox>
                  )}
                </div>
              </MDBox>
            </div>
          );
        })}
      </MDBox>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Preview QR Codes {printRunId ? `(Run #${printRunId})` : ""}</DialogTitle>
      <DialogContent dividers>
        {err && (
          <MDTypography color="error" variant="button" display="block" mb={1}>
            {err}
          </MDTypography>
        )}
        {loading && <LinearProgress />}

        <MDBox mb={1} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <MDTypography variant="button">View as:</MDTypography>
          <Tabs
            value={effectiveType}
            onChange={(_, v) => setMode(v)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab value="auto" label="Auto" />
            <Tab value="standard" label="Standard" />
            <Tab value="composite" label="Composite" />
          </Tabs>

        </MDBox>

        {effectiveType === "composite" && grouped ? (
          <GroupedComposite />
        ) : (
          <MDBox
            mt={1}
            sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}
          >
            {(effectiveType === "standard" ? stdFiltered : flatFiltered).map((r) => (
              <QrTile
                key={r.id}
                token={r.token}
                channel={r.channel}
                sku={r.sku}
                batch={r.batch}
                seq={r.seq_in_run}
                human={pickHumanCode(r)}
                deviceUid={r.device_uid}
                role={r.role}
                compCount={r.comp_count || 0}
                compReq={r.comp_required || 0}
                parentUid={r.parent_device_uid}
                isBound={r.status === "bound" || !!r.device_uid}
                composite={effectiveType === "composite"}
              />
            ))}
          </MDBox>
        )}
      </DialogContent>
      <DialogActions>
        <MDButton variant="outlined" color="secondary" onClick={onClose}>
          Close
        </MDButton>
        {printRunId && (
          <MDButton variant="gradient" color="info" onClick={() => exportPrintRunZip(printRunId)}>
            <Icon sx={{ mr: 0.5 }}>download</Icon> Download ZIP
          </MDButton>
        )}
      </DialogActions>

      <Snackbar
        open={!!snack}
        autoHideDuration={1600}
        onClose={() => setSnack("")}
        message={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Dialog>
  );
}

/* =========================
   Batches dialog
   ========================= */
function BatchesDialog({ open, onClose, product }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [batches, setBatches] = useState([]);
  const [selBatch, setSelBatch] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [previewRunId, setPreviewRunId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open || !product) return;
      setLoading(true);
      setErr("");
      setSelBatch(null);
      setRuns([]);
      try {
        const id = product.sku || product.id;
        const data = await getBatchesByProduct(id);
        if (mounted) setBatches(data.items || []);
      } catch (e) {
        if (mounted)
          setErr(e?.response?.data?.message || e.message || "Failed to load batches.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [open, product]);

  async function viewRuns(batch) {
    setSelBatch(batch);
    setRuns([]);
    setRunsLoading(true);
    try {
      const data = await getRunsByBatch(batch.batch_id);
      setRuns(data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load runs.");
    } finally {
      setRunsLoading(false);
    }
  }

  async function downloadBatchCSV(b, product) {
    const pidOrSku = product?.sku || product?.id;
    if (!pidOrSku || !b?.batch_code) throw new Error("Missing product or batch");
    const url = `/products/${encodeURIComponent(pidOrSku)}/batches/${encodeURIComponent(b.batch_code)}/bind-template`;
    const res = await client.get(url, { responseType: "blob" });
    const blob = new Blob([res.data], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const fname = `${(product?.sku || product?.id)}_bind_template_${b.batch_code}.csv`;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          Previous Batches — {product?.sku} {product?.name ? `• ${product.name}` : ""}
        </DialogTitle>
        <DialogContent dividers>
          {err && (
            <MDTypography color="error" variant="button" display="block" mb={1}>
              {err}
            </MDTypography>
          )}
          {loading && <LinearProgress />}

          {/* Batches table */}
          <MDBox mt={2} sx={{ border: "1px solid rgba(0,0,0,.08)", borderRadius: 1, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,.02)" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Batch Code</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Mfg Date</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Exp Date</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Issued Codes</th>
                  <th style={{ padding: 10, textAlign: "center" }}>Actions</th>
                  <th style={{ padding: 10, textAlign: "center" }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batch_id} style={{ borderTop: "1px solid rgba(0,0,0,.05)" }}>
                    <td style={{ padding: 10 }}>{b.batch_code}</td>
                    <td style={{ padding: 10 }}>{b.mfg_date || "—"}</td>
                    <td style={{ padding: 10 }}>{b.exp_date || "—"}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{b.issued_codes}</td>
                    <td style={{ padding: 10, textAlign: "center" }}>
                      <MDButton size="small" variant="outlined" color="info" onClick={() => viewRuns(b)}>
                        View Runs
                      </MDButton>
                    </td>
                    <td style={{ padding: 10, textAlign: "center" }}>
                      <MDButton size="small" variant="outlined" color="info" onClick={() => downloadBatchCSV(b, product)}>
                        Template CSV
                      </MDButton>
                    </td>
                  </tr>
                ))}
                {!loading && batches.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 12, textAlign: "center" }}>
                      No batches yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </MDBox>

          {/* Runs table */}
          {selBatch && (
            <MDBox mt={3}>
              <MDTypography variant="h6" fontWeight="medium">
                Runs in Batch “{selBatch.batch_code}”
              </MDTypography>
              {runsLoading && <LinearProgress sx={{ mt: 1 }} />}
              <MDBox mt={1} sx={{ border: "1px solid rgba(0,0,0,.08)", borderRadius: 1, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,.02)" }}>
                      <th style={{ padding: 10, textAlign: "left" }}>Run ID</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Channel</th>
                      <th style={{ padding: 10, textAlign: "right" }}>Planned</th>
                      <th style={{ padding: 10, textAlign: "right" }}>Issued</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Vendor</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Created</th>
                      <th style={{ padding: 10, textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.print_run_id} style={{ borderTop: "1px solid rgba(0,0,0,.05)" }}>
                        <td style={{ padding: 10 }}>{r.print_run_id}</td>
                        <td style={{ padding: 10 }}>{r.channel_code || "WEB"}</td>
                        <td style={{ padding: 10, textAlign: "right" }}>{r.qty_planned}</td>
                        <td style={{ padding: 10, textAlign: "right" }}>{r.issued_codes}</td>
                        <td style={{ padding: 10 }}>{r.vendor_name || "—"}</td>
                        <td style={{ padding: 10 }}>{r.created_at}</td>
                        <td style={{ padding: 10, textAlign: "center" }}>
                          <MDButton
                            size="small"
                            variant="text"
                            color="info"
                            onClick={() => setPreviewRunId(r.print_run_id)}
                          >
                            Preview
                          </MDButton>
                          <MDButton
                            size="small"
                            variant="text"
                            color="info"
                            onClick={() => exportPrintRunZip(r.print_run_id)}
                          >
                            Download
                          </MDButton>
                        </td>
                      </tr>
                    ))}
                    {!runsLoading && runs.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: 12, textAlign: "center" }}>
                          No runs in this batch.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </MDBox>
            </MDBox>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton variant="outlined" color="secondary" onClick={onClose}>
            Close
          </MDButton>
        </DialogActions>
      </Dialog>

      <QrPreviewDialog
        open={!!previewRunId}
        onClose={() => setPreviewRunId(null)}
        printRunId={previewRunId}
      />
    </>
  );
}

/* =========================
   Per-product mint dialog (WITH tenant settings)
   ========================= */
function MintDialog({ open, onClose, product }) {
  const [qty, setQty] = useState(100);
  const [channel, setChannel] = useState("WEB");
  const [batch, setBatch] = useState("");
  const [microMode, setMicroMode] = useState("hmac16");
  const [vendor, setVendor] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mfgDate, setMfgDate] = useState("");   // yyyy-mm-dd
  const [expDate, setExpDate] = useState("");   // yyyy-mm-dd

  // verification mode + optional overrides
  const [verificationMode, setVerificationMode] = useState("qr"); // qr | qr_nfc | qr_puf | qr_puf_nfc | puf_nfc
  const [nfcKeyRef, setNfcKeyRef] = useState("");      // optional override
  const [pufAlg, setPufAlg] = useState("");            // optional override
  const [pufThreshold, setPufThreshold] = useState(""); // optional override

  // Tenant defaults (to show helperText + prefill)
  const [tenantDefaults, setTenantDefaults] = useState({
    defaultMode: "qr",
    nfcKeyRef: "",
    pufAlg: "",
    pufThreshold: "",
  });

  // Load defaults when dialog opens
  useEffect(() => {
    let mounted = true;
    async function loadDefaults() {
      try {
        const s = await getTenantSettings();
        const defMode = s["verification.default_mode"]?.mode || "qr";
        const nfcRef  = s["nfc.key.current"]?.key_ref || s["nfc.key.current_ref"] || "";
        const pAlg    = s["puf.alg"] || s["puf.policy"]?.alg || "";
        const pThrVal = (s["puf.threshold"] ?? s["puf.policy"]?.threshold ?? "");

        if (!mounted) return;

        setTenantDefaults({
          defaultMode: defMode,
          nfcKeyRef: nfcRef,
          pufAlg: pAlg,
          pufThreshold: (pThrVal === null || pThrVal === undefined) ? "" : String(pThrVal),
        });

        // prefill UI
        setVerificationMode(defMode);
        setNfcKeyRef(nfcRef || "");
        setPufAlg(pAlg || "");
        setPufThreshold(pThrVal !== "" && pThrVal !== null && pThrVal !== undefined ? String(pThrVal) : "");
      } catch {
        // safe defaults
        setTenantDefaults({ defaultMode: "qr", nfcKeyRef: "", pufAlg: "", pufThreshold: "" });
        setVerificationMode("qr");
      }
    }

    if (open) {
      setErr("");
      setResult(null);
      setLoading(false);
      setPreviewOpen(false);
      loadDefaults();
    }
    return () => { mounted = false; };
  }, [open]);

  async function onMint() {
    setErr("");
    setLoading(true);
    try {
      const payload = {
        qty: Number(qty) || 0,
        channel_code: channel.trim(),
        batch_code: batch.trim() || undefined,
        micro_mode: microMode,
        create_print_run: true,
        print_vendor: vendor.trim() || undefined,

        // required by backend
        verification_mode: verificationMode,

        // batch-level adds
        ...(mfgDate ? { batch_mfg_date: mfgDate } : {}),
        ...(expDate ? { batch_exp_date: expDate } : {}),

        // OPTION: if you also want every QR to inherit exp date by default
        ...(expDate ? { expires_at: expDate } : {}),

        // optional overrides (omit when blank => backend uses tenant defaults)
        ...(nfcKeyRef.trim() ? { nfc_key_ref: nfcKeyRef.trim() } : {}),
        ...(pufAlg.trim() ? { puf_alg: pufAlg.trim() } : {}),
        ...(pufThreshold !== "" ? { puf_score_threshold: Number(pufThreshold) } : {}),
      };
      const data = await mintProductCodes(product?.sku || product?.id, payload);
      setResult(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to generate QR codes.");
    } finally {
      setLoading(false);
    }
  }

  const isComposite = (product?.type || "").toLowerCase() === "composite";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Generate QR — {product?.sku}</DialogTitle>
      <DialogContent dividers>
        {err && (
          <MDTypography color="error" variant="button" mb={1} display="block">
            {err}
          </MDTypography>
        )}

        <MDBox display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={2}>
          <MDInput
            type="number"
            label={isComposite ? "Roots Quantity" : "Quantity"}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputProps={{ min: 1, step: 1 }}
            required
          />
          <MDInput label="Channel Code" value={channel} onChange={(e) => setChannel(e.target.value)} required />
          <MDInput label="Batch Code (optional)" value={batch} onChange={(e) => setBatch(e.target.value)} />

          <MDInput
            type="date"
            label="Mfg Date (optional)"
            value={mfgDate}
            onChange={(e) => setMfgDate(e.target.value)}
          />

          <MDInput
            type="date"
            label="Exp Date (optional)"
            value={expDate}
            onChange={(e) => setExpDate(e.target.value)}
            helperText="If set, batch gets this Exp Date and each QR defaults to it"
          />

          {/* Verification mode select */}
          <MDSelect
            label="Verification Mode"
            value={verificationMode}
            onChange={(e) => setVerificationMode(e.target.value)}
            helperText="Choose how these codes will be verified"
          >
            <MenuItem value="qr">QR (basic)</MenuItem>
            <MenuItem value="qr_nfc">QR + NFC</MenuItem>
            <MenuItem value="qr_puf">QR + PUF</MenuItem>
            <MenuItem value="qr_puf_nfc">QR + PUF + NFC</MenuItem>
          </MDSelect>

          {/* Micro signal */}
          <MDSelect label="Micro Signal" value={microMode} onChange={(e) => setMicroMode(e.target.value)}>
            <MenuItem value="hmac16">HMAC16 (recommended)</MenuItem>
            <MenuItem value="none">None</MenuItem>
          </MDSelect>

          <MDInput label="Print Vendor (optional)" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </MDBox>

        {/* Conditional overrides */}
        <MDBox mt={2} display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={2}>
          {["qr_nfc","qr_puf_nfc","puf_nfc"].includes(verificationMode) && (
            <MDInput
              label="NFC key ref (optional override)"
              value={nfcKeyRef}
              onChange={(e) => setNfcKeyRef(e.target.value)}
              helperText={
                tenantDefaults.nfcKeyRef
                  ? `Blank = use tenant default: ${tenantDefaults.nfcKeyRef}`
                  : "If blank, backend will use tenant default"
              }
            />
          )}

          {["qr_puf","qr_puf_nfc","puf_nfc"].includes(verificationMode) && (
            <>
              <MDInput
                label="PUF algorithm (optional)"
                value={pufAlg}
                onChange={(e) => setPufAlg(e.target.value)}
                helperText={
                  tenantDefaults.pufAlg
                    ? `Blank = use tenant default: ${tenantDefaults.pufAlg}`
                    : "e.g., ORBv1"
                }
              />
              <MDInput
                type="number"
                label="PUF threshold (0–100, optional)"
                value={pufThreshold}
                onChange={(e) => setPufThreshold(e.target.value)}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                helperText={
                  tenantDefaults.pufThreshold
                    ? `Blank = use tenant default: ${tenantDefaults.pufThreshold}`
                    : "e.g., 85"
                }
              />
            </>
          )}
        </MDBox>

        {loading && (
          <MDBox mt={2}>
            <LinearProgress />
          </MDBox>
        )}

        {result && (
          <MDBox mt={2} p={2} sx={{ border: "1px dashed rgba(0,0,0,.2)", borderRadius: 1 }}>
            <MDTypography variant="button" fontWeight="medium" display="block">
              Issued: {result?.issued ?? 0}
            </MDTypography>
            {result?.print_run_id && (
              <MDBox display="flex" alignItems="center" gap={1} mt={1}>
                <MDTypography variant="caption" color="text">
                  Print Run ID: {result.print_run_id}
                </MDTypography>
                <MDButton size="small" variant="outlined" color="info" onClick={() => setPreviewOpen(true)}>
                  Preview
                </MDButton>
                <MDButton size="small" variant="outlined" color="info" onClick={() => exportPrintRunZip(result.print_run_id)}>
                  Download ZIP
                </MDButton>
              </MDBox>
            )}
          </MDBox>
        )}
      </DialogContent>
      <DialogActions>
        <MDButton variant="outlined" color="secondary" onClick={onClose}>
          Close
        </MDButton>
        <MDButton variant="gradient" color="info" onClick={onMint} disabled={loading}>
          <Icon sx={{ mr: 0.5 }}>qr_code_2</Icon> {loading ? "Generating…" : "Generate"}
        </MDButton>
      </DialogActions>

      <QrPreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} printRunId={result?.print_run_id} />
    </Dialog>
  );
}

/* =========================
   Bind Devices (Excel/CSV)
   ========================= */
function BindDevicesPanel({ products, labelStatsMap }) {
  const [sku, setSku] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [allocate, setAllocate] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const [extraStats, setExtraStats] = useState({});
  const [batches, setBatches] = useState([]);           // batches for selected product
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchAvail, setBatchAvail] = useState(null);   // available labels for selected batch (if API provided)

  const productOptions = useMemo(
    () => (products || []).map((p) => ({ sku: p.sku, name: p.name })),
    [products]
  );

  const bindableRows = useMemo(() => rows.filter((r) => !!r.device_uid), [rows]);

  // Compute availability (SKU level)
  const availableForSku = sku ? (labelStatsMap[sku]?.available ?? 0) : 0;

  const hasSkuInRows = rows.some((r) => !!r.sku);
  const countsBySku = useMemo(() => {
    const m = {};
    if (!rows.length) return m;
    if (hasSkuInRows) {
      rows.forEach((r) => {
        const s = r.sku || "";
        if (!s) return;
        m[s] = (m[s] || 0) + 1;
      });
    } else if (sku) {
      m[sku] = rows.length;
    }
    return m;
  }, [rows, hasSkuInRows, sku]);

  const getAvailFor = (s) =>
    (labelStatsMap[s]?.available ?? (extraStats[s]?.available ?? 0));

  const shortage = useMemo(() => {
    if (!allocate) return 0;
    let short = 0;
    for (const [s, cnt] of Object.entries(countsBySku)) {
      const avail = getAvailFor(s) || 0;
      if (cnt > avail) short += (cnt - avail);
    }
    return short;
  }, [allocate, countsBySku, extraStats, labelStatsMap]);

  // Pull in extra SKU stats as needed
  useEffect(() => {
    const needed = Object.keys(countsBySku)
      .filter((s) => s && labelStatsMap[s] == null && extraStats[s] == null);
    if (!needed.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        needed.map(async (s) => {
          try { const d = await getLabelStats(s); return [s, d]; }
          catch { return [s, { available: 0, bound: 0, total: 0 }]; }
        })
      );
      if (!cancelled) {
        setExtraStats((prev) => Object.fromEntries([
          ...Object.entries(prev), ...entries
        ]));
      }
    })();
    return () => { cancelled = true; };
  }, [countsBySku, labelStatsMap, extraStats]);

  // Load batches when product (sku) changes
  useEffect(() => {
    let cancel = false;
    async function loadBatches() {
      setBatches([]);
      setBatchCode("");
      setBatchAvail(null);
      if (!sku) return;
      setBatchesLoading(true);
      try {
        const data = await getBatchesByProduct(sku);
        if (!cancel) setBatches(data.items || []);
      } catch {
        if (!cancel) setBatches([]);
      } finally {
        if (!cancel) setBatchesLoading(false);
      }
    }
    loadBatches();
    return () => { cancel = true; };
  }, [sku]);

  // Fetch availability for a specific batch (if backend route exists)
  async function fetchBatchAvailability(skuArg, batch) {
    try {
      // Prefer dedicated endpoint if you implemented it:
      // GET /products/{idOrSku}/batches/{batchCode}/label-stats
      const url = `/products/${encodeURIComponent(skuArg)}/batches/${encodeURIComponent(batch)}/label-stats`;
      const { data } = await client.get(url);
      // Expect { available, bound, total } like the SKU stats
      if (data && typeof data.available !== "undefined") return data;
    } catch {
      // silently fall back
    }
    return null;
  }

  // When a batch is chosen, try to show its availability
  useEffect(() => {
    let cancel = false;
    async function run() {
      setBatchAvail(null);
      if (!sku || !batchCode) return;
      const info = await fetchBatchAvailability(sku, batchCode);
      if (!cancel) setBatchAvail(info);
    }
    run();
    return () => { cancel = true; };
  }, [sku, batchCode]);

  function parseWorkbook(wb) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const norm = json.map((r) => {
      const low = {};
      for (const k of Object.keys(r)) low[String(k).trim().toLowerCase()] = r[k];

      const uid    = String(low.device_uid || low.uid || low.serial || "").trim();
      const token  = String(low.token || "").trim() || undefined;
      const parent = String(low.parent_device_uid || low.parent || "").trim();
      const sku    = String(low.sku || low.product || low.product_sku || "").trim();

      const attrs = {};
      for (const [k, v] of Object.entries(low)) {
        if (["sku","product","product_sku","device_uid","uid","serial","token","parent_device_uid","parent"].includes(k)) continue;
        attrs[k] = v;
      }

      return {
        sku: sku || undefined,
        device_uid: uid,
        parent_device_uid: parent || undefined,
        token,
        attrs,
      };
    });

    return norm;
  }
  async function onFile(e) {
    setErr("");
    setRows([]);
    setResult(null);
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf);
      const norm = parseWorkbook(wb);
      if (!norm.length)
        throw new Error("No valid rows found. Need 'device_uid'. If Auto-allocate is OFF, include 'token'. Optional: 'sku' and 'parent_device_uid' for composite.");
      setRows(norm);
    } catch (ex) {
      setErr(ex.message || "Failed to parse file.");
    }
  }

  async function run() {
    setErr("");
    setResult(null);
    if (!sku) {
      setErr("Please select a product.");
      return;
    }
    if (!rows.length) {
      setErr("Please upload a CSV/XLSX first.");
      return;
    }
    if (!allocate) {
      const missingToken = rows.some((r) => !r.token);
      if (missingToken) {
        setErr("Auto-allocate is OFF: every row must have a 'token' column.");
        return;
      }
    }
    if (allocate && shortage > 0) {
      const parts = Object.entries(countsBySku).map(([s, cnt]) => {
        const avail = getAvailFor(s) || 0;
        const need = Math.max(0, cnt - avail);
        return need > 0 ? `${s}: short ${need} (need ${cnt}, avail ${avail})` : null;
      }).filter(Boolean);
      setErr(
        `Not enough available labels across all SKUs. ${parts.join(" • ")}. Use "By Product → Generate QR" to mint more.`
      );
      return;
    }

    setBusy(true);
    try {
      const payload = {
        allocate,
        batch_code: batchCode || undefined,
        devices: rows.map((r) => ({
          sku: r.sku || undefined,
          device_uid: (r.device_uid || r.parent_device_uid),
          parent_device_uid: r.parent_device_uid || undefined,
          token: r.token,
          attrs: r.attrs,
        })),
      };

      const data = await bulkBindDevices(sku, payload);

      const parentMap = new Map();
      for (const r of rows) {
        if (r.parent_device_uid && r.device_uid) {
          const arr = parentMap.get(r.parent_device_uid) || [];
          arr.push(r.device_uid);
          parentMap.set(r.parent_device_uid, arr);
        }
      }
      for (const [parentUid, children] of parentMap.entries()) {
        try { await linkAssembly(parentUid, children); } catch { /* ignore linking errors */ }
      }

      setResult(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Bind failed.");
    } finally {
      setBusy(false);
    }
  }

  // Helper to print a nice label for batch options
  function batchLabel(b) {
    const parts = [b.batch_code];
    const m = b.mfg_date ? `mfg:${b.mfg_date}` : null;
    const x = b.exp_date ? `exp:${b.exp_date}` : null;
    if (m || x) parts.push([m, x].filter(Boolean).join(" / "));
    if (typeof b.issued_codes !== "undefined") parts.push(`issued:${b.issued_codes}`);
    return parts.join(" • ");
  }

  const effectiveAvailable = batchAvail && typeof batchAvail.available === "number"
    ? batchAvail.available
    : availableForSku;

  return (
    <MDBox p={3}>
      {err && (
        <MDTypography color="error" variant="button" mb={2} display="block">
          {err}
        </MDTypography>
      )}

      <MDBox display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr 1fr" }} gap={2} mb={1.5}>
        <MDSelect label="Product (SKU)" value={sku} onChange={(e) => setSku(e.target.value)}>
          {productOptions.map((p) => (
            <MenuItem key={p.sku} value={p.sku}>
              {p.sku} — {p.name}
            </MenuItem>
          ))}
        </MDSelect>

        <MDSelect
          label={batchesLoading ? "Batch (loading…)" : "Batch (optional)"}
          value={batchCode}
          onChange={(e) => setBatchCode(e.target.value)}
          disabled={!sku || batchesLoading || batches.length === 0}
        >
          {batches.map((b) => (
            <MenuItem key={b.batch_id} value={b.batch_code}>
              {batchLabel(b)}
            </MenuItem>
          ))}
        </MDSelect>

        <FormControlLabel
          sx={{ ml: 1 }}
          control={<Switch checked={allocate} onChange={(e) => setAllocate(e.target.checked)} />}
          label="Auto-allocate next available tokens"
        />
      </MDBox>

      {sku && (
        <MDTypography variant="caption" color={effectiveAvailable > 0 ? "text" : "error"}>
          {batchCode
            ? <>Available labels for <b>{sku}</b> in batch <b>{batchCode}</b>: <b>{effectiveAvailable}</b></>
            : <>Available labels for <b>{sku}</b>: <b>{effectiveAvailable}</b></>}
        </MDTypography>
      )}

      <MDBox display="flex" alignItems="center" gap={1} mb={2} mt={1}>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} ref={fileRef} style={{ display: "none" }} />
        <MDButton variant="outlined" color="info" onClick={() => fileRef.current?.click()}>
          <Icon sx={{ mr: 0.5 }}>upload</Icon> Upload Devices (CSV/XLSX)
        </MDButton>
        {/* Template download intentionally removed from this section as requested */}
      </MDBox>

      {rows.length > 0 && (
        <MDBox>
          <MDTypography variant="button" fontWeight="medium" mb={1} display="block">
            Preview ({rows.length} rows) {allocate ? "• allocating tokens FIFO" : "• using provided tokens"}
          </MDTypography>
          <MDBox sx={{ maxHeight: 320, overflow: "auto", border: "1px solid rgba(0,0,0,.08)", borderRadius: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: 8, textAlign: "left" }}>device_uid (effective)</th>
                  <th style={{ padding: 8, textAlign: "left" }}>token</th>
                  <th style={{ padding: 8, textAlign: "left" }}>parent_device_uid</th>
                  <th style={{ padding: 8, textAlign: "left" }}>attrs…</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(0,0,0,.05)" }}>
                    <td style={{ padding: 8 }}>{r.device_uid || r.parent_device_uid}</td>
                    <td style={{ padding: 8 }}>{r.token || (allocate ? "⟶ auto" : "—")}</td>
                    <td style={{ padding: 8 }}>{r.parent_device_uid || "—"}</td>
                    <td style={{ padding: 8 }}>
                      {Object.keys(r.attrs || {}).length ? JSON.stringify(r.attrs) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MDBox>

          {allocate && shortage > 0 && (
            <MDTypography variant="caption" color="error" mt={1} display="block">
              Not enough available labels across all SKUs. Short by <b>{shortage}</b>. Use <b>By Product → Generate QR</b> to mint more.
            </MDTypography>
          )}

          <MDBox mt={2}>
            {busy && <LinearProgress />}
            <MDButton variant="gradient" color="info" onClick={run} disabled={busy || (allocate && shortage > 0)}>
              <Icon sx={{ mr: 0.5 }}>link</Icon> {busy ? "Binding…" : "Bind Devices"}
            </MDButton>
          </MDBox>

          {result && (
            <MDBox mt={2} p={2} sx={{ border: "1px dashed rgba(0,0,0,.2)", borderRadius: 1 }}>
              <MDTypography variant="button" fontWeight="medium" display="block">
                Bound successfully: {result.bound}
              </MDTypography>
              {(result.template_missing || []).length > 0 && (
                <MDBox mt={1}>
                  <MDTypography variant="caption" color="error" display="block" mb={1}>
                    Some rows were skipped due to missing required template fields:
                  </MDTypography>
                  <MDBox sx={{ border: "1px solid rgba(0,0,0,.08)", borderRadius: 1, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,.02)" }}>
                          <th style={{ padding: 8, textAlign: "left" }}>device_uid (effective)</th>
                          <th style={{ padding: 8, textAlign: "left" }}>missing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.template_missing.map((m, i) => (
                          <tr key={i} style={{ borderTop: "1px solid rgba(0,0,0,.05)" }}>
                            <td style={{ padding: 8 }}>{m.device_uid}</td>
                            <td style={{ padding: 8 }}>{(m.missing || []).join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MDBox>
                </MDBox>
              )}
            </MDBox>
          )}
        </MDBox>
      )}
    </MDBox>
  );
}

/* =========================
   Page
   ========================= */
export default function GenerateQrPage() {
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [labelStats, setLabelStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [batchesFor, setBatchesFor] = useState(null);

  const query = useQuery();
  useEffect(() => {
    const t = query.get("tab") || ""; if (t === "bind") setTab(1);
  }, []);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const data = await listProducts({ root_only: 1 });
      const items = Array.isArray(data) ? data : data?.items || [];
      setProducts(items);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    getQrPlanStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      if (!products.length) {
        setLabelStats({});
        return;
      }
      const slice = products.slice(0, 50);
      const entries = await Promise.all(
        slice.map(async (p) => {
          try {
            const s = await getLabelStats(p.sku);
            return [p.sku, s];
          } catch {
            return [p.sku, { available: 0, bound: 0, total: 0 }];
          }
        })
      );
      if (mounted) setLabelStats(Object.fromEntries(entries));
    }
    loadStats();
    return () => { mounted = false; };
  }, [products]);

  const table = useMemo(() => {
    const columns = [
      { Header: "SKU", accessor: "sku", width: "18%", align: "left" },
      { Header: "Name", accessor: "name", width: "28%", align: "left" },
      { Header: "Type", accessor: "type", align: "left" },
      { Header: "Status", accessor: "status", align: "center" },
      { Header: "Actions", accessor: "actions", align: "center" },
    ];

    const rows = products.map((p) => {
      const s = labelStats[p.sku] || { available: 0, bound: 0 };
      return {
        sku: (
          <MDTypography variant="button" fontWeight="medium">
            {p.sku}
          </MDTypography>
        ),
        name: (
          <MDTypography variant="button" fontWeight="regular">
            {p.name}
          </MDTypography>
        ),
        type: (
          <MDTypography variant="caption" color="text">
            {p.type || "standard"}
          </MDTypography>
        ),
        status: (
          <MDTypography variant="caption" color="text">
            {s.available} available · {s.bound} bound
          </MDTypography>
        ),
        actions: (
          <MDBox display="flex" alignItems="center" gap={1}>
            <MDButton variant="outlined" color="info" size="small" onClick={() => setSelected(p)}>
              <Icon sx={{ mr: 0.5 }}>qr_code_2</Icon> Generate QR
            </MDButton>
            <MDButton variant="text" color="info" size="small" onClick={() => setBatchesFor(p)}>
              <Icon sx={{ mr: 0.5 }}>inventory_2</Icon> Batches
            </MDButton>
          </MDBox>
        ),
      };
    });

    return { columns, rows };
  }, [products, labelStats]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <MDBox p={2} display="flex" alignItems="center" justifyContent="space-between">
                <MDTypography variant="h5" fontWeight="medium">
                  Generate & Bind QR
                </MDTypography>
                {stats && (
                  <MDTypography variant="button" color="text">
                    Monthly QR: {stats.used_this_month}/{stats.qr_month_limit ?? "∞"}
                    {stats.qr_max_batch ? ` · Max per batch: ${stats.qr_max_batch}` : ""}
                  </MDTypography>
                )}
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                  <Tab label="By Product" />
                  <Tab label="Bind Devices" />
                </Tabs>
              </MDBox>

              {tab === 0 && (
                <MDBox p={3}>
                  {err && (
                    <MDTypography color="error" variant="button" mb={2} display="block">
                      {err}
                    </MDTypography>
                  )}
                  {loading ? (
                    <MDTypography variant="button" color="text">
                      Loading…
                    </MDTypography>
                  ) : (
                    <DataTable table={table} isSorted={false} entriesPerPage={false} showTotalEntries={false} noEndBorder />
                  )}
                </MDBox>
              )}

              {tab === 1 && <BindDevicesPanel products={products} labelStatsMap={labelStats} />}
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      <MintDialog open={!!selected} onClose={() => setSelected(null)} product={selected} />
      <BatchesDialog open={!!batchesFor} onClose={() => setBatchesFor(null)} product={batchesFor} />
    </DashboardLayout>
  );
}

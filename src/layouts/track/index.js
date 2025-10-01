import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@mui/material/Icon";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Tooltip from "@mui/material/Tooltip";

// MD2 components/layout (same as your qr page)
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";


import { v4 as uuid } from "uuid";

// @mui


import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import { styled } from "@mui/material/styles";

// MD2

import MDBadge from "components/MDBadge";

// API client
import client from "api/client";

/* -----------------------------------------
   Small reusable bits
----------------------------------------- */
function Field({ label, value, mono, copy }) {
  return (
    <MDBox display="flex" alignItems="center" justifyContent="space-between" py={0.5}>
      <MDTypography variant="caption" color="text" sx={{ opacity: 0.8 }}>
        {label}
      </MDTypography>
      <MDBox display="flex" alignItems="center" gap={1}>
        <MDTypography
          variant="button"
          fontWeight="regular"
          sx={{ fontFamily: mono ? "monospace" : undefined }}
        >
          {value || "—"}
        </MDTypography>
        {copy && value && (
          <Tooltip title="Copy">
            <MDButton
              variant="text"
              color="info"
              size="small"
              onClick={() => navigator.clipboard.writeText(String(value))}
              sx={{ minWidth: "auto", p: 0.5 }}
            >
              <Icon>content_copy</Icon>
            </MDButton>
          </Tooltip>
        )}
      </MDBox>
    </MDBox>
  );
}

function PartCard({ item }) {
  const urlBase =
    process.env.REACT_APP_VERIFY_BASE_URL ||
    (import.meta.env && import.meta.env.VITE_VERIFY_BASE_URL) ||
    "https://verify.your-domain.com";

  const verifyUrl = item.qr_token ? `${urlBase}/v/${encodeURIComponent(item.qr_token)}` : null;

  return (
    <Card sx={{ p: 1.25, borderRadius: 2, height: "100%" }}>
      <MDTypography variant="button" fontWeight="medium">
        {item.sku || "—"}{" "}
        <MDTypography variant="caption" color="text">
          &nbsp;·&nbsp;
        </MDTypography>{" "}
        {item.name || "—"}
      </MDTypography>

      <MDBox mt={0.5}>
        <Field label="Device UID" value={item.device_uid} mono copy />
        <Field label="QR Token" value={item.qr_token} mono copy />
        <Field label="Channel" value={item.qr_channel} />
      </MDBox>

      {verifyUrl && (
        <MDBox mt={1} display="flex" gap={1}>
          <MDButton
            variant="outlined"
            color="info"
            size="small"
            onClick={() => window.open(verifyUrl, "_blank")}
          >
            <Icon sx={{ mr: 0.5 }}>open_in_new</Icon> Verify URL
          </MDButton>
        </MDBox>
      )}
    </Card>
  );
}

/* -----------------------------------------
   Page
----------------------------------------- */
export default function TrackQrPage() {
  const [mode, setMode] = useState("uid"); // "uid" | "token"
  const [deviceUid, setDeviceUid] = useState("");
  const [token, setToken] = useState("");
  const [withQr, setWithQr] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null); // { device_uid, parent, children: [...] }

  const tokenRef = useRef(null);
  const uidRef = useRef(null);

  useEffect(() => {
    setErr("");
    setData(null);
  }, [mode]);

  // Call your backend: GET /api/devices/{uid}/assembly?with_qr=1
  async function getAssembly(uid, includeQr) {
    const { data } = await client.get(`/devices/${encodeURIComponent(uid)}/assembly`, {
      params: { with_qr: includeQr ? 1 : 0 },
    });
    return data;
  }

  // Try to resolve device UID from a token (if you have any of these endpoints available)
  async function resolveByToken(tkn) {
    const candidates = [
      `/qr/codes/${encodeURIComponent(tkn)}/device`,
      `/qr/codes/${encodeURIComponent(tkn)}`, // may return { device_uid } or meta
      `/qr/track?token=${encodeURIComponent(tkn)}`,
    ];
    for (const path of candidates) {
      try {
        const { data } = await client.get(path);
        const dev =
          data?.device_uid ||
          data?.device?.device_uid ||
          data?.link?.device_uid ||
          null;
        if (dev) return dev;
      } catch (_) {}
    }
    return null;
  }

  async function run() {
    setErr("");
    setData(null);
    setLoading(true);
    try {
      if (mode === "uid") {
        if (!deviceUid.trim()) throw new Error("Enter a Device UID to track.");
        const res = await getAssembly(deviceUid.trim(), withQr);
        setData(res);
      } else {
        if (!token.trim()) throw new Error("Enter a QR token to track.");
        const dev = await resolveByToken(token.trim());
        if (!dev) {
          setData({
            device_uid: "—",
            parent: null,
            children: [],
            token_unbound: token.trim(),
          });
        } else {
          const res = await getAssembly(dev, withQr);
          setData(res);
        }
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to track.");
    } finally {
      setLoading(false);
    }
  }

  const parts = useMemo(() => (Array.isArray(data?.children) ? data.children : []), [data]);
  const totals = useMemo(() => {
    const bound = parts.filter((p) => !!p.qr_token).length;
    return { total: parts.length, bound, unbound: parts.length - bound };
  }, [parts]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        {err && (
          <MDTypography color="error" variant="button" mb={2} display="block">
            {err}
          </MDTypography>
        )}

        <Grid container spacing={2}>
          {/* Left: search form */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, borderRadius: 2 }}>
              <MDTypography variant="h6" fontWeight="medium" mb={1}>
                Track QR
              </MDTypography>
              <MDTypography variant="caption" color="text">
                Look up a device and all of its parts (N-level) and see which labels are bound.
              </MDTypography>

              <MDBox mt={2} display="flex" gap={1}>
                <MDButton
                  variant={mode === "uid" ? "gradient" : "outlined"}
                  color="info"
                  onClick={() => setMode("uid")}
                >
                  <Icon sx={{ mr: 0.5 }}>precision_manufacturing</Icon> By Device UID
                </MDButton>
                <MDButton
                  variant={mode === "token" ? "gradient" : "outlined"}
                  color="info"
                  onClick={() => setMode("token")}
                >
                  <Icon sx={{ mr: 0.5 }}>qr_code_2</Icon> By QR Token
                </MDButton>
              </MDBox>

              {mode === "uid" ? (
                <MDBox mt={2} display="grid" gap={1.25}>
                  <MDInput
                    label="Device UID"
                    inputRef={uidRef}
                    value={deviceUid}
                    onChange={(e) => setDeviceUid(e.target.value)}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Switch checked={withQr} onChange={(e) => setWithQr(e.target.checked)} />
                    }
                    label="Include QR details"
                  />
                  <MDButton variant="gradient" color="info" onClick={run} disabled={loading}>
                    <Icon sx={{ mr: 0.5 }}>travel_explore</Icon>{" "}
                    {loading ? "Loading…" : "Track"}
                  </MDButton>
                </MDBox>
              ) : (
                <MDBox mt={2} display="grid" gap={1.25}>
                  <MDInput
                    label="QR Token"
                    inputRef={tokenRef}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Switch checked={withQr} onChange={(e) => setWithQr(e.target.checked)} />
                    }
                    label="Include QR details"
                  />
                  <MDButton variant="gradient" color="info" onClick={run} disabled={loading}>
                    <Icon sx={{ mr: 0.5 }}>qr_code_scanner</Icon>{" "}
                    {loading ? "Loading…" : "Track"}
                  </MDButton>
                </MDBox>
              )}
            </Card>
          </Grid>

          {/* Right: result */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 2, borderRadius: 2 }}>
              <MDTypography variant="h6" fontWeight="medium">
                Result
              </MDTypography>

              {!data && (
                <MDTypography variant="caption" color="text">
                  Enter a Device UID or QR token and click <b>Track</b>.
                </MDTypography>
              )}

              {data && (
                <>
                  <MDBox mt={1.5} display="grid" gap={0.5}>
                    <Field label="Root Device UID" value={data.device_uid} mono copy />
                    <Field label="Parent (if any)" value={data.parent || "—"} mono copy />
                    {data.token_unbound && (
                      <MDTypography variant="caption" color="warning" mt={1}>
                        Token <b>{data.token_unbound}</b> appears <b>unbound</b>. Minted but not
                        linked to a device yet.
                      </MDTypography>
                    )}
                  </MDBox>

                  <Divider sx={{ my: 2 }} />

                  <MDBox display="flex" gap={2} alignItems="center" mb={1}>
                    <MDTypography variant="button" fontWeight="medium">
                      Parts ({totals.total})
                    </MDTypography>
                    <MDTypography variant="caption" color="success">
                      Bound: {totals.bound}
                    </MDTypography>
                    <MDTypography variant="caption" color={totals.unbound ? "error" : "text"}>
                      Unbound: {totals.unbound}
                    </MDTypography>
                  </MDBox>

                  {parts.length === 0 ? (
                    <MDTypography variant="caption" color="text">
                      No children found under this device.
                    </MDTypography>
                  ) : (
                    <Grid container spacing={1.5}>
                      {parts.map((p) => (
                        <Grid key={`${p.device_uid}-${p.sku}`} item xs={12} sm={6} md={4}>
                          <PartCard item={p} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </>
              )}
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

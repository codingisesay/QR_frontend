// src/layouts/nfc/index.js
import { useState } from "react";

// @mui
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";

// MD2 components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDSelect from "components/MDSelect";
import MDButton from "components/MDButton";
import MenuItem from "@mui/material/MenuItem";

// Layout
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// API
import { provisionNfcBulk, createNfcKey } from "api/nfc";
import { useAuth } from "auth/AuthProvider";

export default function NfcPage() {
  const { perms } = useAuth();
  const canWrite = !!perms?.includes("product.write");

  const [file, setFile] = useState(null);
  const [defaultKeyRef, setDefaultKeyRef] = useState("");
  const [defaultChipFamily, setDefaultChipFamily] = useState("NTAG424");
  const [defaultStatus, setDefaultStatus] = useState("new");

  const [tenantId, setTenantId] = useState(""); // if your backend resolves from auth, you can hide this
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function onUpload(e) {
    e.preventDefault();
    setErr(""); setMsg("");

    if (!file) {
      setErr("Please choose a CSV file first.");
      return;
    }
    try {
      const res = await provisionNfcBulk({
        file,
        tenant_id: tenantId || undefined,
        default_key_ref: defaultKeyRef || undefined,
        default_chip_family: defaultChipFamily || undefined,
        default_status: defaultStatus || undefined,
      });
      setMsg(
        `Import complete. Inserted/updated: ${res?.inserted_or_updated ?? 0}. ` +
        (Array.isArray(res?.errors) && res.errors.length ? `Errors: ${res.errors.length}` : "No row errors.")
      );
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to import NFC tags.");
    }
  }

  async function onCreateKey(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!defaultKeyRef) {
      setErr("Please enter a Key Ref to create/register.");
      return;
    }
    try {
      const data = await createNfcKey({
        key_ref: defaultKeyRef,
        chip_family: defaultChipFamily,
        status: "active",
        tenant_id: tenantId || undefined,
      });
      setMsg(data?.message || "Key reference stored.");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to create key.");
    }
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />

      <MDBox py={3}>
        <Grid container spacing={3}>

          {/* NFC: CSV upload card */}
          <Grid item xs={12}>
            <Card>
              <MDBox p={3}>
                <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <MDTypography variant="h5" fontWeight="medium">
                    NFC Tags — Bulk Provision
                  </MDTypography>
                  <MDTypography variant="button" color="text">
                    Import NFC UID inventory to map at batch creation
                  </MDTypography>
                </MDBox>

                {err && (
                  <MDTypography color="error" variant="button" mb={2} display="block">
                    {err}
                  </MDTypography>
                )}
                {msg && (
                  <MDTypography color="success" variant="button" mb={2} display="block">
                    {msg}
                  </MDTypography>
                )}

                <MDBox
                  component="form"
                  onSubmit={onUpload}
                  display="grid"
                  gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr 1fr 1fr auto" }}
                  gap={2}
                  alignItems="center"
                >
                  <MDInput
                    type="file"
                    inputProps={{ accept: ".csv" }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    required
                    label="CSV file (nfc_uid, nfc_key_ref, ...)"
                  />

                  <MDInput
                    label="Default Key Ref (optional)"
                    placeholder="KEY-B24-09"
                    value={defaultKeyRef}
                    onChange={(e)=>setDefaultKeyRef(e.target.value)}
                  />

                  <MDSelect
                    label="Default Chip Family"
                    value={defaultChipFamily}
                    onChange={(e)=>setDefaultChipFamily(e.target.value)}
                    size="small"
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="NTAG424">NTAG424</MenuItem>
                    <MenuItem value="DESFireEV3">DESFireEV3</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </MDSelect>

                  <MDSelect
                    label="Default Status"
                    value={defaultStatus}
                    onChange={(e)=>setDefaultStatus(e.target.value)}
                    size="small"
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="new">new</MenuItem>
                    <MenuItem value="qc_pass">qc_pass</MenuItem>
                    <MenuItem value="reserved">reserved</MenuItem>
                    <MenuItem value="bound">bound</MenuItem>
                    <MenuItem value="retired">retired</MenuItem>
                    <MenuItem value="revoked">revoked</MenuItem>
                  </MDSelect>

                  {/* Optional tenant if not from auth */}
                  <MDInput
                    label="Tenant ID (optional)"
                    placeholder="auto"
                    value={tenantId}
                    onChange={(e)=>setTenantId(e.target.value)}
                    type="number"
                  />

                  <MDButton type="submit" variant="gradient" color="info" disabled={!canWrite}>
                    <Icon sx={{ mr: 0.5 }}>upload_file</Icon>
                    Upload CSV
                  </MDButton>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

          {/* Key register helper (optional small card) */}
          <Grid item xs={12} md={6}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h6" fontWeight="medium" mb={1}>
                  Register / Store Key Reference
                </MDTypography>
                <MDTypography variant="button" color="text" mb={2} display="block">
                  Quick helper to add a key_ref before importing tags (optional).
                </MDTypography>

                <MDBox
                  component="form"
                  onSubmit={onCreateKey}
                  display="grid"
                  gridTemplateColumns={{ xs: "1fr 1fr auto" }}
                  gap={2}
                  alignItems="center"
                >
                  <MDInput
                    label="Key Ref"
                    placeholder="KEY-B24-09"
                    value={defaultKeyRef}
                    onChange={(e)=>setDefaultKeyRef(e.target.value)}
                    required
                  />

                  <MDSelect
                    label="Chip Family"
                    value={defaultChipFamily}
                    onChange={(e)=>setDefaultChipFamily(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="NTAG424">NTAG424</MenuItem>
                    <MenuItem value="DESFireEV3">DESFireEV3</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </MDSelect>

                  <MDButton type="submit" variant="gradient" color="success" disabled={!canWrite}>
                    <Icon sx={{ mr: 0.5 }}>key</Icon>
                    Save Key
                  </MDButton>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

// src/layouts/tenant/create/index.js
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { loadStripe } from "@stripe/stripe-js";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

import { initTenantOnboarding, listPlans } from "api/tenants";

// unified input styling so selects = inputs
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,            // ~16px
    height: 44,                 // match your text inputs
    "& .MuiSelect-select": {
      display: "flex",
      alignItems: "center",
      paddingTop: "10px",
      paddingBottom: "10px",
    },
  },
  "& .MuiFormHelperText-root": { marginLeft: 0 },
};

function OnboardTenant() {
  const navigate = useNavigate();

  // Basic org/billing
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [mode, setMode] = useState("invoice"); // wallet | invoice
  const [planId, setPlanId] = useState("");
  const [plans, setPlans] = useState([]);
  const [topup, setTopup] = useState(5000); // cents (₹50 default)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Security defaults
  const [defaultMode, setDefaultMode] = useState("qr"); // qr | qr_nfc | qr_puf | qr_puf_nfc | puf_nfc
  const [enableNfc, setEnableNfc] = useState(false);
  const [enablePuf, setEnablePuf] = useState(false);
  const [combineMode, setCombineMode] = useState("all"); // all | either

  // Switch disable states (driven by defaultMode)
  const [lockNfc, setLockNfc] = useState(false);
  const [lockPuf, setLockPuf] = useState(false);

  // --- unified behavior function ---
  function handleDefaultModeChange(mode) {
    setDefaultMode(mode);

    // reset first
    let nfc = false, puf = false, nfcLocked = false, pufLocked = false;

    switch (mode) {
      case "qr":          // QR only
        nfc = false; puf = false;
        nfcLocked = true; pufLocked = true;
        break;
      case "qr_nfc":      // QR + NFC
        nfc = true;  puf = false;
        nfcLocked = true; pufLocked = true;
        break;
      case "qr_puf":      // QR + PUF
        nfc = false; puf = true;
        nfcLocked = true; pufLocked = true;
        break;
      case "qr_puf_nfc":  // QR + PUF + NFC
      case "puf_nfc":     // PUF + NFC (no QR artwork) -> still both signals
        nfc = true;  puf = true;
        nfcLocked = true; pufLocked = true;
        break;
      default:
        break;
    }

    setEnableNfc(nfc);
    setEnablePuf(puf);
    setLockNfc(nfcLocked);
    setLockPuf(pufLocked);

    // if both on, keep combineMode, else default to 'all'
    if (!(nfc && puf)) setCombineMode("all");
  }

  // init: ensure switches match initial defaultMode
  useEffect(() => {
    handleDefaultModeChange(defaultMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-slugify from name (user can still edit)
  useEffect(() => {
    if (!name) return;
    const s = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
    setSlug((prev) => (prev ? prev : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Load plans for invoice mode
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listPlans();
        if (mounted) setPlans(data || []);
      } catch {/* ignore */}
    })();
    return () => { mounted = false; };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => String(p.id) === String(planId)),
    [plans, planId]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name,
        slug,
        mode, // wallet | invoice
        plan_id: mode === "invoice" ? Number(planId) || null : null,
        topup_cents: mode === "wallet" ? Number(topup) || 0 : undefined,
        provider: "stripe",

        // seed verification defaults on backend
        default_verification_mode: defaultMode,
        enable_nfc: !!enableNfc,
        enable_puf: !!enablePuf,
        combine_mode: enableNfc && enablePuf ? combineMode : "all",
      };

      const res = await initTenantOnboarding(payload);

      // Stripe checkout (unchanged)
      if (res?.provider === "stripe" && res?.checkout?.session_id && res?.checkout?.public_key) {
        const stripe = await loadStripe(res.checkout.public_key);
        await stripe.redirectToCheckout({ sessionId: res.checkout.session_id });
        return;
      }

      // Fallback
      navigate(`/t/${slug}/dashboard`, { replace: true });
    } catch (err) {
      const m = err?.response?.data?.message || err?.message || "Unable to start payment.";
      setError(m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8} lg={7}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h4" fontWeight="medium" mb={1}>
                  Create your organization
                </MDTypography>
                <MDTypography variant="button" color="text" mb={3}>
                  Set up billing and security defaults. You’ll be redirected to checkout.
                </MDTypography>

                {error && (
                  <MDBox mb={2}>
                    <MDTypography color="error" variant="button">
                      {error}
                    </MDTypography>
                  </MDBox>
                )}

                <MDBox component="form" onSubmit={onSubmit}>
                  <Grid container spacing={2}>
                    {/* Organization & Slug */}
                    <Grid item xs={12} md={8}>
                      <TextField
                        label="Organization name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        variant="outlined"
                        sx={inputSx}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Slug (subdomain)"
                        fullWidth
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        required
                        inputProps={{ maxLength: 60 }}
                        helperText="Lowercase, letters & numbers"
                        variant="outlined"
                        sx={inputSx}
                      />
                    </Grid>

                    {/* Billing mode */}
                    <Grid item xs={12}>
                      <MDTypography variant="button" color="text" mb={1} display="block">
                        Billing mode
                      </MDTypography>
                      <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value)}>
                        <FormControlLabel value="wallet" control={<Radio />} label="Wallet (pay-as-you-go)" />
                        <FormControlLabel value="invoice" control={<Radio />} label="Monthly invoice (plans)" />
                      </RadioGroup>
                    </Grid>

                    {/* Wallet top-up */}
                    {mode === "wallet" && (
                      <Grid item xs={12} md={5}>
                        <TextField
                          type="number"
                          label="Initial top-up (cents)"
                          fullWidth
                          value={topup}
                          onChange={(e) => setTopup(e.target.value)}
                          helperText="Example: 5000 = ₹50"
                          inputProps={{ min: 0, step: 100 }}
                          variant="outlined"
                          sx={inputSx}
                        />
                      </Grid>
                    )}

                    {/* Plan select */}
                    {mode === "invoice" && (
                      <Grid item xs={12} md={6}>
                        <TextField
                          select
                          fullWidth
                          label="Select plan"
                          value={planId}
                          onChange={(e) => setPlanId(e.target.value)}
                          required
                          variant="outlined"
                          sx={inputSx}
                          SelectProps={{
                            displayEmpty: false,
                            MenuProps: { PaperProps: { style: { maxHeight: 320 } } },
                          }}
                        >
                          {(plans || []).map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name} — {p.price_cents ? `₹${(p.price_cents / 100).toFixed(2)}` : p.price}
                            </MenuItem>
                          ))}
                        </TextField>
                        {selectedPlan && (
                          <MDTypography variant="caption" color="text">
                            Includes {selectedPlan.included_qr_per_month} QR/month. Overage ₹
                            {(selectedPlan.overage_price_cents / 100).toFixed(2)} per QR.
                          </MDTypography>
                        )}
                      </Grid>
                    )}

                    {/* Security defaults */}
                    <Grid item xs={12} mt={1}>
                      <MDTypography variant="button" color="text" display="block">
                        Security defaults
                      </MDTypography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        select
                        fullWidth
                        label="Default verification mode"
                        value={defaultMode}
                        onChange={(e) => handleDefaultModeChange(e.target.value)}
                        helperText="Pre-selected mode when minting new codes"
                        variant="outlined"
                        sx={inputSx}
                        SelectProps={{
                          displayEmpty: false,
                          MenuProps: { PaperProps: { style: { maxHeight: 320 } } },
                        }}
                      >
                        <MenuItem value="qr">QR (basic)</MenuItem>
                        <MenuItem value="qr_nfc">QR + NFC</MenuItem>
                        <MenuItem value="qr_puf">QR + PUF</MenuItem>
                        <MenuItem value="qr_puf_nfc">QR + PUF + NFC</MenuItem>
                        
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={enableNfc}
                            disabled={lockNfc}
                            onChange={(e) => setEnableNfc(e.target.checked)}
                          />
                        }
                        label="Enable NFC"
                      />
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={enablePuf}
                            disabled={lockPuf}
                            onChange={(e) => setEnablePuf(e.target.checked)}
                          />
                        }
                        label="Enable PUF"
                      />
                    </Grid>

                    {/* Combine policy only if both ON */}
                    {enableNfc && enablePuf && (
                      <Grid item xs={12} md={6}>
                        <TextField
                          select
                          fullWidth
                          label="Combine policy (NFC + PUF)"
                          value={combineMode}
                          onChange={(e) => setCombineMode(e.target.value)}
                          helperText="When both signals are present on a product"
                          variant="outlined"
                          sx={inputSx}
                          SelectProps={{
                            displayEmpty: false,
                            MenuProps: { PaperProps: { style: { maxHeight: 320 } } },
                          }}
                        >
                          <MenuItem value="all">Require both (AND)</MenuItem>
                          <MenuItem value="either">Either NFC or PUF (OR)</MenuItem>
                        </TextField>
                      </Grid>
                    )}

                    {/* Actions */}
                    <Grid item xs={12}>
                      <MDBox mt={2}>
                        <MDButton type="submit" variant="gradient" color="info" disabled={loading}>
                          {loading ? "Starting checkout..." : "Continue to payment"}
                        </MDButton>
                        <MDButton
                          variant="text"
                          color="secondary"
                          sx={{ ml: 2 }}
                          onClick={() => navigate(-1)}
                        >
                          Cancel
                        </MDButton>
                      </MDBox>
                    </Grid>
                  </Grid>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default OnboardTenant;

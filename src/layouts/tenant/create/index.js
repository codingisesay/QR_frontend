// src/layouts/tenant/create/index.js
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import { loadStripe } from "@stripe/stripe-js";

import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

import { initTenantOnboarding, listPlans } from "api/tenants";


function OnboardTenant() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [mode, setMode] = useState("wallet"); // wallet | invoice
  const [planId, setPlanId] = useState("");
  const [plans, setPlans] = useState([]);
  const [topup, setTopup] = useState(5000); // cents (₹50 default)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate slug from name (editable)
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
      } catch {}
    })();
    return () => {
      mounted = false;
    };
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
        mode,
        plan_id: mode === "invoice" ? Number(planId) || null : null,
        topup_cents: mode === "wallet" ? Number(topup) || 0 : undefined,
        provider: "stripe",
      };

      const res = await initTenantOnboarding(payload);

      if (res.provider === "stripe") {
        const stripe = await loadStripe(res.checkout.public_key);
        await stripe.redirectToCheckout({ sessionId: res.checkout.session_id });
        // After payment, Stripe will redirect to /tenant/thank-you?tenant=slug&tid=<id>
        return;
      }

      // Razorpay flow placeholder (if you add it)
      // else if (res.provider === "razorpay") { ... }

    } catch (err) {
      const m =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to start payment.";
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
                  Set up your tenant and billing preference to begin.
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
                    <Grid item xs={12} md={8}>
                      <MDInput
                        label="Organization name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <MDInput
                        label="Slug (subdomain)"
                        fullWidth
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        required
                        inputProps={{ maxLength: 60 }}
                        helperText="Lowercase, letters & numbers"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <MDTypography variant="button" color="text" mb={1} display="block">
                        Billing mode
                      </MDTypography>
                      <RadioGroup
                        row
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                      >
                        <FormControlLabel
                          value="wallet"
                          control={<Radio />}
                          label="Wallet (pay-as-you-go)"
                        />
                        <FormControlLabel
                          value="invoice"
                          control={<Radio />}
                          label="Monthly invoice (plans)"
                        />
                      </RadioGroup>
                    </Grid>

                    {mode === "wallet" && (
                      <Grid item xs={12} md={5}>
                        <MDInput
                          label="Initial top-up (cents)"
                          type="number"
                          fullWidth
                          value={topup}
                          onChange={(e) => setTopup(e.target.value)}
                          helperText="Example: 5000 = ₹50"
                          inputProps={{ min: 0, step: 100 }}
                        />
                      </Grid>
                    )}

                    {mode === "invoice" && (
                      <Grid item xs={12} md={6}>
                        <MDInput
                          select
                          label="Select plan"
                          fullWidth
                          value={planId}
                          onChange={(e) => setPlanId(e.target.value)}
                          required
                        >
                          {(plans || []).map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name} — {p.price_cents ? `₹${(p.price_cents/100).toFixed(2)}` : p.price}
                            </MenuItem>
                          ))}
                        </MDInput>
                        {selectedPlan && (
                          <MDTypography variant="caption" color="text">
                            Includes {selectedPlan.included_qr_per_month} QR/month.
                            Overage ₹{(selectedPlan.overage_price_cents/100).toFixed(2)} per QR.
                          </MDTypography>
                        )}
                      </Grid>
                    )}

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

import { useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";

import QrCode2Icon from "@mui/icons-material/QrCode2";
import SecurityIcon from "@mui/icons-material/Security";
import VerifiedIcon from "@mui/icons-material/Verified";
import InsightsIcon from "@mui/icons-material/Insights";
import SpeedIcon from "@mui/icons-material/Speed";
import LockIcon from "@mui/icons-material/Lock";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AppleIcon from "@mui/icons-material/Apple";
import AndroidIcon from "@mui/icons-material/Android";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import PublicLayout from "layouts/public/PublicLayout";

import { fetchPublicPlans, sendContact } from "api/public";
import { useAuth } from "auth/AuthProvider";

// ---- Company details (edit these) ----
const COMPANY = {
  email: "support@yourcompany.com",
  phone: "+1 (555) 555-5555",
  address: "221B Baker Street, London, NW1",
  hours: "Mon–Fri, 9:00–18:00",
  mapsHref:
    "https://maps.google.com/?q=221B+Baker+Street+London+NW1",
};

export default function HomePublic() {
  const { user, tenantSlug } = useAuth();

  // ---------- state ----------
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  // ---------- load plans ----------
  useEffect(() => {
    (async () => {
      try {
        setLoadingPlans(true);
        const list = await fetchPublicPlans();
        setPlans(list);
      } catch {
        // graceful fallback if backend isn't ready
        setPlans([
          { key: "starter", name: "Starter", price: 0, currency: "USD", interval: "month", features: ["500 scans / mo", "1 product line", "Email support"] },
          { key: "growth", name: "Growth", price: 29, currency: "USD", interval: "month", features: ["25k scans / mo", "Unlimited products", "Analytics dashboard"] },
          { key: "scale", name: "Scale", price: 99, currency: "USD", interval: "month", features: ["Unlimited scans", "SLA support", "SAML SSO"] },
        ]);
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  // ---------- handlers ----------
  const onContactSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk(false); setSending(true);
    try {
      await sendContact(contact);
      setOk(true);
      setContact({ name: "", email: "", message: "" });
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  // ---------- ui helpers ----------
  const planCtaHref = useMemo(
    () => (user ? "/tenant/create" : "/authentication/sign-up"),
    [user]
  );

  return (
    <PublicLayout>
      {/* ===== HERO ===== */}
      <MDBox
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 4,
          p: { xs: 5, md: 8 },
          mb: 8,
          background:
            "radial-gradient(1200px 400px at 20% -10%, rgba(64,123,255,0.25), transparent), radial-gradient(1200px 400px at 120% 10%, rgba(0,200,170,0.25), transparent), linear-gradient(135deg, rgba(240,247,255,1) 0%, rgba(245,252,255,1) 100%)",
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Chip
              label="Secure QR for product authenticity"
              color="info"
              variant="outlined"
              sx={{ mb: 2, fontWeight: 600 }}
            />
            <MDTypography variant="h2" fontWeight="bold" gutterBottom>
              Stop counterfeits with <span style={{ color: "#1a73e8" }}>Smart QR</span>
            </MDTypography>
            <MDTypography variant="h6" color="text" sx={{ maxWidth: 720, mb: 3 }}>
              Generate tamper-aware QR codes per product. Customers scan to verify authenticity.
              You get per-scan analytics, real-time fraud signals, and granular tenant-based control.
            </MDTypography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button size="large" variant="contained" href={planCtaHref} sx={{ color: 'common.white' }}  >
                Get started
              </Button>
              <Button size="large" variant="outlined" href="#apps" sx={{ color: 'common.black' }}>
                Our scanning apps
              </Button>
              <Button size="large" href="#pricing">Pricing</Button>
            </Box>

            {user && (
              <MDTypography variant="button" color="success" sx={{ display: "block", mt: 2 }}>
                Logged in{tenantSlug ? ` • tenant: ${tenantSlug}` : ""}.
              </MDTypography>
            )}

            <Grid container spacing={2} sx={{ mt: 4 }}>
              {[
                { k: "scans", v: "5M+", label: "Total scans" },
                { k: "uptime", v: "99.99%", label: "Uptime" },
                { k: "speed", v: "< 120ms", label: "Verify latency (p95)" },
              ].map((s) => (
                <Grid item key={s.k}>
                  <Card style={{ padding: 16, minWidth: 160 }}>
                    <MDTypography variant="h4" fontWeight="bold">{s.v}</MDTypography>
                    <MDTypography variant="button" color="text">{s.label}</MDTypography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(26,115,232,.15)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,.7) 100%)",
              }}
            >
              <MDTypography variant="h6" fontWeight="bold" gutterBottom>
                Live QR demo
              </MDTypography>
              <MDTypography variant="button" color="text">
                Scan this code with your phone camera:
              </MDTypography>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 3,
                  background:
                    "radial-gradient(250px 120px at 50% 0%, rgba(26,115,232,.08), transparent)",
                }}
              >
                {/* public QR API for demo only */}
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=DEMO-PRODUCT-12345"
                  width={180}
                  height={180}
                  alt="QR demo"
                  loading="lazy"
                  style={{ borderRadius: 12 }}
                />
              </Box>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6} display="flex" alignItems="center">
                  <QrCode2Icon fontSize="small" style={{ marginRight: 8 }} />
                  <MDTypography variant="button">Per-item codes</MDTypography>
                </Grid>
                <Grid item xs={12} sm={6} display="flex" alignItems="center">
                  <SecurityIcon fontSize="small" style={{ marginRight: 8 }} />
                  <MDTypography variant="button">Tamper aware</MDTypography>
                </Grid>
                <Grid item xs={12} sm={6} display="flex" alignItems="center">
                  <InsightsIcon fontSize="small" style={{ marginRight: 8 }} />
                  <MDTypography variant="button">Scan analytics</MDTypography>
                </Grid>
                <Grid item xs={12} sm={6} display="flex" alignItems="center">
                  <LockIcon fontSize="small" style={{ marginRight: 8 }} />
                  <MDTypography variant="button">RBAC by tenant</MDTypography>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      {/* ===== SCAN APPS (Public vs Private) ===== */}
      <section id="apps">
        <MDTypography variant="h4" fontWeight="bold" gutterBottom>
          Our scanning apps
        </MDTypography>
        <Grid container spacing={3}>
          {/* Public Verify App */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                height: "100%",
                border: "1px solid rgba(0,0,0,0.06)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,.9) 100%)",
              }}
            >
              <MDTypography variant="overline" color="info">
                Public app
              </MDTypography>
              <MDTypography variant="h5" fontWeight="bold" gutterBottom>
                Verify App — product authenticity for customers
              </MDTypography>
              <MDTypography variant="button" color="text">
                Anyone can scan QR codes to confirm authenticity and view product details.
                No login required. Designed for speed and trust.
              </MDTypography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item>
                  <Button variant="contained" color="dark" startIcon={<AppleIcon />}  >
                    App Store
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="outlined" startIcon={<AndroidIcon />} sx={{ color: 'common.black' }}>
                    Google Play
                  </Button>
                </Grid>
              </Grid>

              <MDBox mt={2}>
                <MDTypography variant="button" color="text">
                  Features:
                </MDTypography>
                <MDTypography variant="button" color="text" display="block">• One-tap scan</MDTypography>
                <MDTypography variant="button" color="text" display="block">• Authentic / Suspicious verdict</MDTypography>
                <MDTypography variant="button" color="text" display="block">• Brand story & warranty info</MDTypography>
              </MDBox>
            </Card>
          </Grid>

          {/* Private Ops App */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                height: "100%",
                border: "1px solid rgba(0,0,0,0.06)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.95) 0%, rgba(255,255,255,.9) 100%)",
              }}
            >
              <MDTypography variant="overline" color="info">
                Private app
              </MDTypography>
              <MDTypography variant="h5" fontWeight="bold" gutterBottom>
                Ops App — internal updates & inventory actions
              </MDTypography>
              <MDTypography variant="button" color="text">
                For authorized staff only. Scan to update product state (e.g., packaged, shipped,
                returned), add notes, or mark items as flagged. Enforces tenant roles & permissions.
              </MDTypography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item>
                  <Button variant="contained" color="dark" startIcon={<AppleIcon />}>
                    TestFlight
                  </Button>
                </Grid>
                <Grid item>
                  <Button variant="outlined" startIcon={<AndroidIcon />} sx={{ color: 'common.black' }}>
                    Internal APK
                  </Button>
                </Grid>
              </Grid>

              <MDBox mt={2}>
                <MDTypography variant="button" color="text">
                  Capabilities:
                </MDTypography>
                <MDTypography variant="button" color="text" display="block">• Role-gated actions (owner/admin)</MDTypography>
                <MDTypography variant="button" color="text" display="block">• Offline queue & sync</MDTypography>
                <MDTypography variant="button" color="text" display="block">• Scan history & operator ID</MDTypography>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" style={{ marginTop: 64 }}>
        <MDTypography variant="h4" fontWeight="bold" gutterBottom>
          How it works
        </MDTypography>
        <Grid container spacing={3}>
          {[
            {
              icon: <QrCode2Icon />,
              title: "Generate",
              desc: "Create unique, signed QR for each SKU or item with one click.",
            },
            {
              icon: <VerifiedIcon />,
              title: "Apply",
              desc: "Print & attach the code to your product or packaging.",
            },
            {
              icon: <SecurityIcon />,
              title: "Verify",
              desc: "Customer scans → we validate the signature & show authenticity.",
            },
            {
              icon: <InsightsIcon />,
              title: "Analyze",
              desc: "See locations, device types, repeat scans, and fraud signals.",
            },
          ].map((s, i) => (
            <Grid item xs={12} md={3} key={s.title}>
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  border: "1px solid rgba(0,0,0,0.06)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,.9) 0%, rgba(255,255,255,.8) 100%)",
                }}
              >
                <Chip
                  label={i + 1}
                  size="small"
                  color="info"
                  sx={{ mb: 1, fontWeight: 700, borderRadius: "999px" }}
                />
                <Box sx={{ color: "info.main", mb: 1 }}>{s.icon}</Box>
                <MDTypography variant="h6" fontWeight="medium">{s.title}</MDTypography>
                <MDTypography variant="button" color="text">{s.desc}</MDTypography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </section>

      {/* ===== FEATURE STRIP ===== */}
      <MDBox
        sx={{
          mt: 8,
          mb: 6,
          p: 3,
          borderRadius: 3,
          background:
            "linear-gradient(90deg, rgba(26,115,232,.07) 0%, rgba(0,200,170,.07) 100%)",
        }}
      >
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          {[
            { icon: <SpeedIcon />, text: "Fast verification APIs" },
            { icon: <SecurityIcon />, text: "Secure signature checks" },
            { icon: <LockIcon />, text: "Role-based access by tenant" },
          ].map((f, i) => (
            <Grid key={i} item sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box color="info.main">{f.icon}</Box>
              <MDTypography variant="button">{f.text}</MDTypography>
            </Grid>
          ))}
        </Grid>
      </MDBox>

      {/* ===== PRICING ===== */}
      <section id="pricing">
        <MDTypography variant="h4" fontWeight="bold" gutterBottom>
          Pricing
        </MDTypography>
        {loadingPlans && <MDTypography>Loading plans…</MDTypography>}

        <Grid container spacing={3}>
          {plans.map((p) => (
            <Grid item xs={12} md={4} key={p.key || p.id}>
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  border: "1px solid rgba(0,0,0,0.08)",
                  transition: "transform .15s ease, box-shadow .15s ease",
                  "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
                }}
              >
                <MDTypography variant="button" color="info">
                  {p.key ? p.key.toUpperCase() : p.name}
                </MDTypography>
                <MDTypography variant="h4" fontWeight="bold">
                  {p.currency || "USD"} {p.price}/{p.interval || "month"}
                </MDTypography>

                <Divider sx={{ my: 2 }} />
                <Box>
                  {(p.features || []).map((feat, i) => (
                    <MDTypography key={i} variant="button" color="text" display="block" sx={{ mb: .5 }}>
                      • {feat}
                    </MDTypography>
                  ))}
                </Box>

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  href={planCtaHref}
                  sx={{ mt: 2, color: 'common.white' }}
                
                >
                  {user ? "Choose plan" : "Get started"}
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={{ marginTop: 64 }}>
        <MDTypography variant="h4" fontWeight="bold" gutterBottom>
          Frequently asked questions
        </MDTypography>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <MDTypography variant="button" fontWeight="medium">How is the QR “secure”?</MDTypography>
          </AccordionSummary>
          <AccordionDetails>
            <MDTypography variant="button" color="text">
              Each code embeds a signed token we verify on scan. Tampering or copying attempts are surfaced in analytics and risk rules.
            </MDTypography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <MDTypography variant="button" fontWeight="medium">Do customers need an app?</MDTypography>
          </AccordionSummary>
          <AccordionDetails>
            <MDTypography variant="button" color="text">
              No — they can use the phone camera and our **Public Verify App** for richer experiences. Your team uses the **Private Ops App**.
            </MDTypography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <MDTypography variant="button" fontWeight="medium">Is multi-tenant access supported?</MDTypography>
          </AccordionSummary>
          <AccordionDetails>
            <MDTypography variant="button" color="text">
              Yes. Owner/Admin/Viewer roles per tenant; server-side permission middleware enforces access.
            </MDTypography>
          </AccordionDetails>
        </Accordion>
      </section>

      {/* ===== CONTACT (modern) ===== */}
      <section id="contact" style={{ marginTop: 64 }}>
        <MDTypography variant="h4" fontWeight="bold" gutterBottom>
          Contact us
        </MDTypography>

        <Grid container spacing={3}>
          {/* Company info panel */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                height: "100%",
                background:
                  "linear-gradient(180deg, rgba(26,115,232,.08) 0%, rgba(0,200,170,.08) 100%)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <MDTypography variant="h6" fontWeight="bold" gutterBottom>
                Get in touch
              </MDTypography>
              <MDTypography variant="button" color="text">
                We usually respond in 1 business day.
              </MDTypography>

              <MDBox mt={2} display="flex" alignItems="center" gap={1}>
                <EmailOutlinedIcon fontSize="small" color="info" />
                <MDTypography variant="button">{COMPANY.email}</MDTypography>
              </MDBox>
              <MDBox mt={1} display="flex" alignItems="center" gap={1}>
                <PhoneIphoneIcon fontSize="small" color="info" />
                <MDTypography variant="button">{COMPANY.phone}</MDTypography>
              </MDBox>
              <MDBox mt={1} display="flex" alignItems="center" gap={1}>
                <LocationOnOutlinedIcon fontSize="small" color="info" />
                <MDTypography variant="button">
                  <a href={COMPANY.mapsHref} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                    {COMPANY.address}
                  </a>
                </MDTypography>
              </MDBox>
              <MDBox mt={1} display="flex" alignItems="center" gap={1}>
                <AccessTimeIcon fontSize="small" color="info" />
                <MDTypography variant="button">{COMPANY.hours}</MDTypography>
              </MDBox>

              <Divider sx={{ my: 2 }} />
              <MDTypography variant="button" color="text">
                Prefer email? Send directly to <strong>{COMPANY.email}</strong>
              </MDTypography>
            </Card>
          </Grid>

          {/* Contact form (glass card) */}
          <Grid item xs={12} md={8}>
            {ok && <Alert severity="success" sx={{ mb: 2 }}>Thanks! We’ll get back to you soon.</Alert>}
            {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

            <Card
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.06)",
                backdropFilter: "blur(6px)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.85) 0%, rgba(255,255,255,.8) 100%)",
              }}
            >
              <Box component="form" onSubmit={onContactSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Your name"
                      value={contact.name}
                      onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                      fullWidth required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      type="email"
                      label="Email"
                      value={contact.email}
                      onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                      fullWidth required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="How can we help?"
                      multiline minRows={4}
                      value={contact.message}
                      onChange={(e) => setContact((c) => ({ ...c, message: e.target.value }))}
                      fullWidth required
                    />
                  </Grid>
                  <Grid item xs={12} display="flex" justifyContent="flex-end">
                    <Button type="submit" variant="contained" size="large" disabled={sending} sx={{ color: 'common.white' }}>
                      {sending ? "Sending..." : "Send message"}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </section>
    </PublicLayout>
  );
}

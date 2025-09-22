// src/layouts/tenant/thank-you/index.js
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

import { getTenantStatus } from "api/tenants";
import { useAuth } from "auth/AuthProvider";

export default function TenantThankYou() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { switchTenant } = useAuth();

  const tid = new URLSearchParams(search).get("tid");
  const slug = new URLSearchParams(search).get("tenant");

  const [status, setStatus] = useState("pending_payment");

  useEffect(() => {
    let timer = null;
    async function poll() {
      try {
        const s = await getTenantStatus(tid);
        setStatus(s.status);
        if (s.status === "active") {
          await switchTenant(slug);
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch {}
      timer = setTimeout(poll, 2000);
    }
    poll();
    return () => timer && clearTimeout(timer);
  }, [tid, slug, switchTenant, navigate]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8} lg={6}>
            <Card>
              <MDBox p={3} textAlign="center">
                <MDTypography variant="h4" fontWeight="medium" mb={1}>
                  Finalizing your setup…
                </MDTypography>
                <MDTypography variant="button" color="text">
                  Status: {status}
                </MDTypography>
                <MDTypography variant="caption" color="text" display="block" mt={1}>
                  We’ll redirect you to your dashboard as soon as payment is confirmed.
                </MDTypography>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

// src/layouts/authentication/logout/index.js
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const LOGIN_ROUTE = "/authentication/sign-in";

export default function Logout() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await auth?.logout?.();               // calls /api/auth/logout + clears token
      if (!cancelled) navigate(LOGIN_ROUTE, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [auth, navigate]);

  return (
    <MDBox p={3}>
      <MDTypography variant="h6">Signing out…</MDTypography>
    </MDBox>
  );
}

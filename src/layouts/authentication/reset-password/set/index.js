// src/layouts/authentication/reset-password/set/index.js
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "api/auth";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";

export default function SetNewPassword() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const token = useMemo(() => new URLSearchParams(search).get("token") || "", [search]);
  const email = useMemo(() => new URLSearchParams(search).get("email") || "", [search]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg(""); setErr("");
    try {
      await resetPassword({ email, token, password, password_confirmation: confirm });
      setMsg("Password updated. Redirecting to sign in…");
      setTimeout(() => navigate("/authentication/sign-in"), 1200);
    } catch (e) {
      setErr(e?.response?.data?.message || "Unable to reset password.");
    }
  };

  return (
    <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
      <Card style={{ padding: 24, width: 420 }}>
        <MDTypography variant="h4" fontWeight="bold" mb={2}>Set a new password</MDTypography>
        {msg && <MDTypography color="success">{msg}</MDTypography>}
        {err && <MDTypography color="error">{err}</MDTypography>}
        <form onSubmit={onSubmit}>
          <MDInput label="Email" type="email" fullWidth sx={{ mb: 2 }} value={email} disabled />
          <MDInput label="New password" type="password" fullWidth sx={{ mb: 2 }}
            value={password} onChange={(e)=>setPassword(e.target.value)} required />
          <MDInput label="Confirm password" type="password" fullWidth sx={{ mb: 2 }}
            value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
          <MDButton type="submit" variant="gradient" color="info" fullWidth>Update password</MDButton>
        </form>
      </Card>
    </MDBox>
  );
}

// src/layouts/authentication/sign-up/index.js
import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import CoverLayout from "layouts/authentication/components/CoverLayout";
import bgImage from "assets/images/bg-sign-up-cover.jpeg";

import { register } from "api/auth";

function Cover() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(""); setErr(""); setLoading(true);
    try {
      await register(form); // POST /auth/register
      setMsg("Account created. Please check your email to verify.");
      setForm({ name:"", email:"", password:"", password_confirmation:"" });
    } catch (error) {
      const m =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.email?.[0] ||
        "Unable to register.";
      setErr(m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <CoverLayout image={bgImage}>
      <Card>
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="success"
          mx={2}
          mt={-3}
          p={3}
          mb={1}
          textAlign="center"
        >
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
            Join us today
          </MDTypography>
          <MDTypography display="block" variant="button" color="white" my={1}>
            Enter your email and password to register
          </MDTypography>
        </MDBox>

        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form" onSubmit={onSubmit}>
            {msg && (
              <MDBox mb={2}>
                <MDTypography variant="button" color="success">{msg}</MDTypography>
              </MDBox>
            )}
            {err && (
              <MDBox mb={2}>
                <MDTypography variant="button" color="error">{err}</MDTypography>
              </MDBox>
            )}

            <MDBox mb={2}>
              <MDInput
                type="text"
                label="Name"
                variant="standard"
                fullWidth
                value={form.name}
                onChange={(e)=>setForm(f=>({...f, name:e.target.value}))}
                required
              />
            </MDBox>

            <MDBox mb={2}>
              <MDInput
                type="email"
                label="Email"
                variant="standard"
                fullWidth
                value={form.email}
                onChange={(e)=>setForm(f=>({...f, email:e.target.value}))}
                required
              />
            </MDBox>

            <MDBox mb={2}>
              <MDInput
                type="password"
                label="Password"
                variant="standard"
                fullWidth
                value={form.password}
                onChange={(e)=>setForm(f=>({...f, password:e.target.value}))}
                required
              />
            </MDBox>

            <MDBox mb={2}>
              <MDInput
                type="password"
                label="Confirm password"
                variant="standard"
                fullWidth
                value={form.password_confirmation}
                onChange={(e)=>setForm(f=>({...f, password_confirmation:e.target.value}))}
                required
              />
            </MDBox>

            {/* leave UI elements as-is */}
            {/* <MDBox display="flex" alignItems="center" ml={-1}>
              <Checkbox />
              <MDTypography
                variant="button"
                fontWeight="regular"
                color="text"
                sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
              >
                &nbsp;&nbsp;I agree the&nbsp;
              </MDTypography>
              <MDTypography
                component="a"
                href="#"
                variant="button"
                fontWeight="bold"
                color="info"
                textGradient
              >
                Terms and Conditions
              </MDTypography>
            </MDBox> */}

            <MDBox mt={4} mb={1}>
              <MDButton type="submit" variant="gradient" color="info" fullWidth disabled={loading}>
                {loading ? "Please wait…" : "sign in" /* keeping original label */}
              </MDButton>
            </MDBox>

            <MDBox mt={3} mb={1} textAlign="center">
              <MDTypography variant="button" color="text">
                Already have an account?{" "}
                <MDTypography
                  component={Link}
                  to="/authentication/sign-in"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  textGradient
                >
                  Sign In
                </MDTypography>
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </CoverLayout>
  );
}

export default Cover;

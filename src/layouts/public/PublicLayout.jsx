import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { Link as RouterLink } from "react-router-dom";
import MDTypography from "components/MDTypography";

export default function PublicLayout({ children }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="inherit" elevation={0}>
        <Toolbar>
          <MDTypography variant="h5" fontWeight="bold" color="info" sx={{ flexGrow: 1 }}>
            PayVance QR
          </MDTypography>

          <Button component="a" href="#features">Features</Button>
          <Button component="a" href="#pricing">Pricing</Button>
          <Button component="a" href="#contact">Contact</Button>

          <Box sx={{ ml: 2, '& .MuiButton-root': { color: 'common.white' } }}>
            <Button component={RouterLink} to="/authentication/sign-in" variant="contained" sx={{ mr: 1 }}>
              Sign in
            </Button>
            <Button component={RouterLink} to="/authentication/sign-up" variant="contained">
              Get started
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {children}
      </Container>

      <Box component="footer" sx={{ py: 4, textAlign: "center", opacity: 0.7 }}>
        <MDTypography variant="button">© {new Date().getFullYear()} SaaS QR</MDTypography>
      </Box>
    </Box>
  );
}
